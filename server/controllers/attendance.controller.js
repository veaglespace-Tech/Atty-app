const asyncHandler = require("express-async-handler");
const geolib = require("geolib");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");
const { resolveLocationPayload } = require("../services/location.service");
const {
  ensureOrganizationId,
  minutesToHoursValue,
  parseLimit,
  toSummaryItem,
  todayKey,
} = require("../services/common.service");
const { attendanceRecordSelect } = require("../services/prisma-selects.service");
const { mapAttendanceRecord } = require("../services/attendance-query.service");
const {
  calculateLateMinutes,
  resolveAttendanceLateMinutes,
} = require("../services/attendance-time.service");
const {
  deleteAttendanceSelfie,
  uploadAttendanceSelfie,
} = require("../services/attendance-selfie.service");

const attendanceTargetTeamSelect = {
  id: true,
  longitude: true,
  latitude: true,
  attendanceRadius: true,
};

const monthWindow = (date = new Date()) => {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
};

const getManagedAttendanceTeam = async ({ orgId, userId }) => {
  const teamMembership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        orgId,
        deletedAt: null,
      },
    },
    select: {
      team: {
        select: attendanceTargetTeamSelect,
      },
    },
  });

  if (teamMembership?.team) {
    return teamMembership.team;
  }

  const teamLedByUser = await prisma.team.findFirst({
    where: {
      orgId,
      deletedAt: null,
      leaderId: userId,
    },
    select: attendanceTargetTeamSelect,
    orderBy: {
      createdAt: "asc",
    },
  });

  if (teamLedByUser) {
    return teamLedByUser;
  }

  return prisma.team.findFirst({
    where: {
      orgId,
      deletedAt: null,
      createdById: userId,
    },
    select: attendanceTargetTeamSelect,
    orderBy: {
      createdAt: "asc",
    },
  });
};

const resolveAttendanceTarget = async ({
  orgId,
  userId,
  organization,
  fallbackTeamId = null,
}) => {
  let team = null;

  if (fallbackTeamId) {
    team = await prisma.team.findFirst({
      where: {
        id: Number(fallbackTeamId),
        orgId,
        deletedAt: null,
      },
      select: attendanceTargetTeamSelect,
    });
  }

  if (!team) {
    team = await getManagedAttendanceTeam({ orgId, userId });
  }

  let targetLocation = [organization.longitude, organization.latitude];
  let targetRadius = organization.attendanceRadius || 25;

  // Managed team geofence takes priority for members and team owners/leaders.
  if (team && team.latitude !== null && team.longitude !== null) {
    targetLocation = [team.longitude, team.latitude];
    targetRadius = team.attendanceRadius || 25;
  }

  return {
    teamId: team?.id || null,
    targetLocation,
    targetRadius,
  };
};

const buildSelfAttendancePayload = async ({ orgId, userId, limit = 45 }) => {
  const safeLimit = parseLimit(limit, 45, 365);
  const today = todayKey();
  const { from, to } = monthWindow(new Date());

  const [todayRecord, monthlyStatus, monthlyAggregate, recentRecords] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        orgId,
        userId,
        date: today,
        deletedAt: null,
      },
      select: attendanceRecordSelect,
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: {
        orgId,
        userId,
        deletedAt: null,
        date: {
          gte: from,
          lte: to,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.attendance.aggregate({
      where: {
        orgId,
        userId,
        deletedAt: null,
        date: {
          gte: from,
          lte: to,
        },
      },
      _sum: {
        totalMinutesWorked: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        orgId,
        userId,
        deletedAt: null,
      },
      select: attendanceRecordSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: safeLimit,
    }),
  ]);

  const statusCountMap = monthlyStatus.reduce((acc, entry) => {
    acc[entry.status] = Number(entry._count?._all || 0);
    return acc;
  }, {});

  const presentCount = Number(statusCountMap.PRESENT || 0);
  const halfDayCount = Number(statusCountMap.HALF_DAY || 0);
  const absentCount = Number(statusCountMap.ABSENT || 0);
  const workedHours = minutesToHoursValue(monthlyAggregate?._sum?.totalMinutesWorked || 0);

  return {
    summary: [
      toSummaryItem("Today Status", todayRecord?.status || "NO_RECORD"),
      toSummaryItem("Present This Month", presentCount + halfDayCount),
      toSummaryItem("Absent This Month", absentCount),
      toSummaryItem("Worked Hrs This Month", workedHours),
    ],
    items: recentRecords.map(mapAttendanceRecord),
    meta: {
      monthFrom: from,
      monthTo: to,
      today,
      totalRecords: recentRecords.length,
      limit: safeLimit,
    },
  };
};

exports.punchIn = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const locationPayload = resolveLocationPayload(input);
  const parsedLocation = locationPayload?.coordinates;
  const selfieImageDataUrl = String(input.selfieImageDataUrl || "").trim();
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

  const attendanceTarget = await resolveAttendanceTarget({
    orgId,
    userId,
    organization: org,
  });

  const distance = geolib.getDistance(
    { latitude: parsedLocation[1], longitude: parsedLocation[0] },
    {
      latitude: attendanceTarget.targetLocation[1],
      longitude: attendanceTarget.targetLocation[0],
    }
  );

  const isValid = distance <= attendanceTarget.targetRadius;

  if (!isValid) {
    res.status(403);
    throw new Error(
      `Location violation: You are ${distance}m away from the designated work area. Maximum allowed radius is ${attendanceTarget.targetRadius}m.`
    );
  }

  const punchInAt = new Date();
  const lateMinutes = calculateLateMinutes({ punchInAt });
  let uploadedSelfie = null;

  try {
    uploadedSelfie = await uploadAttendanceSelfie({
      userId,
      dateKey: today,
      stage: "punch-in",
      dataUrl: selfieImageDataUrl,
    });

    const attendance = await prisma.attendance.create({
      data: {
        orgId,
        teamId: attendanceTarget.teamId,
        userId,
        date: today,
        punchInAt,
        punchInLongitude: parsedLocation[0],
        punchInLatitude: parsedLocation[1],
        punchInLocationMeta: locationPayload?.meta || undefined,
        punchInSelfieUrl: uploadedSelfie.url,
        punchInSelfiePublicId: uploadedSelfie.publicId,
        punchInDistanceMeters: distance,
        isPunchInValid: isValid,
        lateMinutes,
        markedById: userId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Punched in successfully with face check.",
      data: attendance,
    });
  } catch (error) {
    if (uploadedSelfie?.publicId) {
      await deleteAttendanceSelfie(uploadedSelfie.publicId);
    }

    if (error?.statusCode) {
      res.status(error.statusCode);
      throw new Error(error.message);
    }

    throw error;
  }
});

exports.punchOut = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const locationPayload = resolveLocationPayload(input);
  const parsedLocation = locationPayload?.coordinates;
  const selfieImageDataUrl = String(input.selfieImageDataUrl || "").trim();
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
      teamId: true,
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

  const attendanceTarget = await resolveAttendanceTarget({
    orgId,
    userId,
    organization: org,
    fallbackTeamId: attendance.teamId,
  });

  const distance = geolib.getDistance(
    { latitude: parsedLocation[1], longitude: parsedLocation[0] },
    {
      latitude: attendanceTarget.targetLocation[1],
      longitude: attendanceTarget.targetLocation[0],
    }
  );

  const isValid = distance <= attendanceTarget.targetRadius;

  if (!isValid) {
    res.status(403);
    throw new Error(
      `Location violation: You are ${distance}m away from the assigned work area. Please be within ${attendanceTarget.targetRadius}m to punch out.`
    );
  }

  const punchOutAt = new Date();
  const diff = attendance.punchInAt ? Math.abs(punchOutAt - attendance.punchInAt) : 0;
  const totalMinutesWorked = Math.floor(diff / 1000 / 60);
  let uploadedSelfie = null;

  try {
    uploadedSelfie = await uploadAttendanceSelfie({
      userId,
      dateKey: today,
      stage: "punch-out",
      dataUrl: selfieImageDataUrl,
    });

    const updated = await prisma.attendance.update({
      where: {
        id: attendance.id,
      },
      data: {
        punchOutAt,
        punchOutLongitude: parsedLocation[0],
        punchOutLatitude: parsedLocation[1],
        punchOutLocationMeta: locationPayload?.meta || undefined,
        punchOutSelfieUrl: uploadedSelfie.url,
        punchOutSelfiePublicId: uploadedSelfie.publicId,
        punchOutDistanceMeters: distance,
        isPunchOutValid: isValid,
        totalMinutesWorked,
      },
    });

    res.status(200).json({
      success: true,
      message: "Punched out successfully with face check.",
      data: updated,
    });
  } catch (error) {
    if (uploadedSelfie?.publicId) {
      await deleteAttendanceSelfie(uploadedSelfie.publicId);
    }

    if (error?.statusCode) {
      res.status(error.statusCode);
      throw new Error(error.message);
    }

    throw error;
  }
});

exports.getMyAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  const payload = await buildSelfAttendancePayload({
    orgId,
    userId,
    limit: req.query.limit,
  });

  res.status(200).json({
    success: true,
    ...payload,
  });
});

exports.getAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { date } = req.query;
  const today = date || new Date().toISOString().split("T")[0];
  const currentUserRole = resolveUserRole(req.user, orgId);

  // 1. Fetch all members who should be present
  const userFilter = {
    memberships: { some: { orgId, isActive: true } },
    status: "APPROVED",
    isActive: true,
    deletedAt: null,
  };

  if (currentUserRole === "MEMBER") {
    userFilter.id = Number(req.user.id);
  }

  const users = await prisma.user.findMany({
    where: userFilter,
    select: {
      id: true,
      name: true,
      memberships: {
        where: { orgId },
        select: { role: true },
      },
    },
    orderBy: { name: "asc" },
  });

  // 2. Fetch existing attendance records for the day
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      orgId,
      date: today,
      deletedAt: null,
      ...(currentUserRole === "MEMBER" ? { userId: Number(req.user.id) } : {}),
    },
  });

  const attendanceMap = attendanceRecords.reduce((acc, record) => {
    acc[record.userId] = record;
    return acc;
  }, {});

  // 3. Merge and format
  const formattedData = users.map((user) => {
    const record = attendanceMap[user.id];
    const punchInMeta = record?.punchInLocationMeta || null;

    const locationName =
      punchInMeta?.areaLabel ||
      punchInMeta?.displayText ||
      (record?.punchInLatitude != null && record?.punchInLongitude != null
        ? `Lat: ${record.punchInLatitude.toFixed(2)}, Lng: ${record.punchInLongitude.toFixed(2)}`
        : record ? "Office" : "--");

    return {
      _id: record?.id || `absent-${user.id}-${today}`,
      userId: user.id,
      userName: user.name || "Unknown",
      userRole: user.memberships[0]?.role || "MEMBER",
      status: record ? (record.status === "PRESENT" ? "Present" : record.status === "HALF_DAY" ? "Half Day" : "Absent") : "Absent",
      checkIn: record?.punchInAt ? new Date(record.punchInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
      checkOut: record?.punchOutAt ? new Date(record.punchOutAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--",
      lateMinutes: record ? resolveAttendanceLateMinutes(record) : 0,
      locationName,
      locationMeta: punchInMeta,
      punchInSelfieUrl: record?.punchInSelfieUrl || null,
      punchOutSelfieUrl: record?.punchOutSelfieUrl || null,
    };
  });

  res.status(200).json(formattedData);
});

exports.getAttendanceSummary = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const today = new Date().toISOString().split("T")[0];

  const [todayAttendance, totalEligibleUsers] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        orgId,
        date: today,
        deletedAt: null,
      },
      select: {
        status: true,
        lateMinutes: true,
        punchInAt: true,
      },
    }),
    prisma.user.count({
      where: {
        memberships: { some: { orgId, isActive: true } },
        status: "APPROVED",
        isActive: true,
        deletedAt: null,
      },
    }),
  ]);

  const present = todayAttendance.filter((record) => record.status === "PRESENT").length;
  const halfDay = todayAttendance.filter((record) => record.status === "HALF_DAY").length;
  const late = todayAttendance.filter(
    (record) =>
      String(record.status || "").toUpperCase() !== "ABSENT" &&
      resolveAttendanceLateMinutes(record) > 0
  ).length;

  const absent = totalEligibleUsers - (present + halfDay);

  res.status(200).json({
    present,
    late,
    absent: Math.max(0, absent),
    leaves: 0,
  });
});
