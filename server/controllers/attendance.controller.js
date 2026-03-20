const asyncHandler = require("express-async-handler");
const geolib = require("geolib");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { resolveLocationPayload } = require("../services/location.service");
const { ensureOrganizationId } = require("../services/common.service");

exports.punchIn = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const locationPayload = resolveLocationPayload(input);
  const parsedLocation = locationPayload?.coordinates;
  const userId = Number(req.user.id);
  const orgId = ensureOrganizationId(req, res);

  if (!parsedLocation) {
    res.status(400);
    throw new Error("Invalid location data. Provide coordinates as [lng, lat] or location object");
  }

  const org = await prisma.organization.findUnique({
    where: {
      id: orgId,
    },
    select: {
      longitude: true,
      latitude: true,
      attendanceRadius: true,
    },
  });

  if (!org) {
    res.status(404);
    throw new Error("Organization not found");
  }

  if (!Number.isFinite(org.longitude) || !Number.isFinite(org.latitude)) {
    res.status(400);
    throw new Error("Organization location is not configured");
  }

  const today = new Date().toISOString().split("T")[0];
  const existingRecord = await prisma.attendance.findFirst({
    where: {
      orgId,
      userId,
      date: today,
      deletedAt: null,
    },
    select: {
      id: true,
      punchOutAt: true,
    },
  });

  if (existingRecord) {
    res.status(409);
    throw new Error(existingRecord.punchOutAt ? "Attendance already completed for today" : "You already punched in for today");
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        orgId,
        deletedAt: null,
      },
    },
    select: {
      team: {
        select: {
          id: true,
          longitude: true,
          latitude: true,
          attendanceRadius: true,
        },
      },
    },
  });

  let targetLocation = [org.longitude, org.latitude];
  let targetRadius = org.attendanceRadius || 25;

  // Team location takes priority if configured
  if (
    teamMember?.team &&
    teamMember.team.latitude !== null &&
    teamMember.team.longitude !== null
  ) {
    targetLocation = [teamMember.team.longitude, teamMember.team.latitude];
    targetRadius = teamMember.team.attendanceRadius || 25;
  }

  const distance = geolib.getDistance(
    { latitude: parsedLocation[1], longitude: parsedLocation[0] },
    { latitude: targetLocation[1], longitude: targetLocation[0] }
  );

  const isValid = distance <= targetRadius;

  if (!isValid) {
    res.status(403);
    throw new Error(`Location violation: You are ${distance}m away from the designated work area. Maximum allowed radius is ${targetRadius}m.`);
  }

  const attendance = await prisma.attendance.create({
    data: {
      orgId,
      teamId: teamMember?.team?.id || null,
      userId,
      date: today,
      punchInAt: new Date(),
      punchInLongitude: parsedLocation[0],
      punchInLatitude: parsedLocation[1],
      punchInLocationMeta: locationPayload?.meta || undefined,
      punchInDistanceMeters: distance,
      isPunchInValid: isValid,
      markedById: userId,
    },
  });

  res.status(201).json({
    success: true,
    message: "Punched in successfully!",
    data: attendance,
  });
});

exports.punchOut = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const locationPayload = resolveLocationPayload(input);
  const parsedLocation = locationPayload?.coordinates;
  const userId = Number(req.user.id);
  const orgId = ensureOrganizationId(req, res);
  const today = new Date().toISOString().split("T")[0];

  if (!parsedLocation) {
    res.status(400);
    throw new Error("Invalid location data. Provide coordinates as [lng, lat] or location object");
  }

  const attendance = await prisma.attendance.findFirst({
    where: {
      orgId,
      userId,
      date: today,
      deletedAt: null,
    },
    select: {
      id: true,
      punchInAt: true,
      punchOutAt: true,
    },
  });

  if (!attendance) {
    res.status(404);
    throw new Error("Punch-in record not found for today");
  }

  if (attendance.punchOutAt) {
    res.status(409);
    throw new Error("You already punched out for today");
  }

  const org = await prisma.organization.findUnique({
    where: {
      id: orgId,
    },
    select: {
      longitude: true,
      latitude: true,
      attendanceRadius: true,
    },
  });

  if (!org || !Number.isFinite(org.longitude) || !Number.isFinite(org.latitude)) {
    res.status(400);
    throw new Error("Organization location is not configured");
  }

  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        orgId,
        deletedAt: null,
      },
    },
    select: {
      team: {
        select: {
          id: true,
          longitude: true,
          latitude: true,
          attendanceRadius: true,
        },
      },
    },
  });

  let targetLocation = [org.longitude, org.latitude];
  let targetRadius = org.attendanceRadius || 25;

  // Team-specific settings override organization defaults
  if (
    teamMember?.team &&
    teamMember.team.latitude !== null &&
    teamMember.team.longitude !== null
  ) {
    targetLocation = [teamMember.team.longitude, teamMember.team.latitude];
    targetRadius = teamMember.team.attendanceRadius || 25;
  }

  const distance = geolib.getDistance(
    { latitude: parsedLocation[1], longitude: parsedLocation[0] },
    { latitude: targetLocation[1], longitude: targetLocation[0] }
  );

  const isValid = distance <= targetRadius;

  if (!isValid) {
    res.status(403);
    throw new Error(`Location violation: You are ${distance}m away from the assigned work area. Please be within ${targetRadius}m to punch out.`);
  }

  const punchOutAt = new Date();
  const diff = attendance.punchInAt ? Math.abs(punchOutAt - attendance.punchInAt) : 0;
  const totalMinutesWorked = Math.floor(diff / 1000 / 60);

  const updated = await prisma.attendance.update({
    where: {
      id: attendance.id,
    },
    data: {
      punchOutAt,
      punchOutLongitude: parsedLocation[0],
      punchOutLatitude: parsedLocation[1],
      punchOutLocationMeta: locationPayload?.meta || undefined,
      punchOutDistanceMeters: distance,
      isPunchOutValid: isValid,
      totalMinutesWorked,
    },
  });

  res.status(200).json({
    success: true,
    message: "Punched out successfully!",
    data: updated,
  });
});

exports.getAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { date } = req.query;
  const today = date || new Date().toISOString().split("T")[0];
  const role = normalizeRole(req.user.role);

  const filter = {
    orgId,
    date: today,
    deletedAt: null,
  };

  if (role === "MEMBER") {
    filter.userId = Number(req.user.id);
  }

  const attendanceList = await prisma.attendance.findMany({
    where: filter,
    select: {
      id: true,
      status: true,
      punchInAt: true,
      punchOutAt: true,
      punchInLatitude: true,
      punchInLongitude: true,
      punchInLocationMeta: true,
      user: {
        select: {
          name: true,
          role: true,
        },
      },
    },
    orderBy: {
      punchInAt: "desc",
    },
  });

  const formattedData = attendanceList.map((record) => {
    const punchInMeta = record.punchInLocationMeta || null;
    const locationName =
      punchInMeta?.areaLabel ||
      punchInMeta?.displayText ||
      (record.punchInLatitude != null && record.punchInLongitude != null
        ? `Lat: ${record.punchInLatitude.toFixed(2)}, Lng: ${record.punchInLongitude.toFixed(2)}`
        : "Office");

    return {
      _id: record.id,
      userName: record.user?.name || "Unknown",
      userRole: record.user?.role || "MEMBER",
      status: record.status === "PRESENT" ? "Present" : record.status === "HALF_DAY" ? "Half Day" : "Absent",
      checkIn: record.punchInAt ? new Date(record.punchInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
      checkOut: record.punchOutAt ? new Date(record.punchOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
      locationName,
      locationMeta: punchInMeta,
    };
  });

  res.status(200).json(formattedData);
});

exports.getAttendanceSummary = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const today = new Date().toISOString().split("T")[0];

  const [present, halfDay, totalUsers] = await Promise.all([
    prisma.attendance.count({
      where: {
        orgId,
        date: today,
        status: "PRESENT",
        deletedAt: null,
      },
    }),
    prisma.attendance.count({
      where: {
        orgId,
        date: today,
        status: "HALF_DAY",
        deletedAt: null,
      },
    }),
    prisma.user.count({
      where: {
        orgId,
        role: {
          not: "SUPER_ADMIN",
        },
        deletedAt: null,
      },
    }),
  ]);

  const absent = totalUsers - (present + halfDay);

  res.status(200).json({
    present,
    late: 0,
    absent: Math.max(0, absent),
    leaves: 0,
  });
});
