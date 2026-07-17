const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");
const { ensureOrganizationId } = require("../services/common.service");

const isProtectionBypassed = () =>
  process.env.NODE_ENV === "test" &&
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

const enforceAbac = (resourceType) => {
  return asyncHandler(async (req, res, next) => {
    if (isProtectionBypassed()) {
      return next();
    }

    const orgId = ensureOrganizationId(req, res);
    const role = resolveUserRole(req.user, orgId);

    // Global admins bypass object-level restrictions within their org scope
    if (role === "SUPER_ADMIN" || role === "ORG_ADMIN" || role === "SUB_ADMIN") {
      return next();
    }

    if (resourceType === "team") {
      const teamIdStr = req.params.teamId || req.query.teamId || req.body?.teamId;
      if (!teamIdStr) {
        // If no specific teamId is requested, we can't enforce object-level check here.
        // It's up to the controller to scope lists correctly.
        return next();
      }

      const teamId = Number(teamIdStr);
      if (!Number.isFinite(teamId)) {
        res.status(400);
        throw new Error("Invalid team ID");
      }

      const userId = Number(req.user.id);

      // Check if user is leader, creator, or member
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          orgId,
          deletedAt: null,
          OR: [
            { leaderId: userId },
            { createdById: userId },
            {
              members: {
                some: { userId },
              },
            },
          ],
        },
        select: { id: true, leaderId: true, createdById: true },
      });

      if (!team) {
        res.status(403);
        throw new Error("Access denied or resource not found");
      }

      // For mutations (PATCH, DELETE, POST), we enforce stricter checks.
      // e.g., Members can't modify the team. Only leader/creator can.
      const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      if (isMutation) {
        if (Number(team.leaderId) !== userId && Number(team.createdById) !== userId) {
          res.status(403);
          throw new Error("You can only modify teams assigned to you as a leader");
        }
      }

      // Attach verified team to req
      req.verifiedTeam = team;
      return next();
    }

    return next();
  });
};

module.exports = {
  enforceAbac,
};
