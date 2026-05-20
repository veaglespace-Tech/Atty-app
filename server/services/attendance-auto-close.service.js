const prisma = require("../lib/prisma");
const { todayKey } = require("./common.service");
const {
  buildDateTimeForDateKey,
  calculateAttendanceStatus,
  parseStartTimeMinutes,
  readAttendanceTimeConfig,
  resolveTimeOfDayMinutes,
} = require("./attendance-time.service");

const DEFAULT_INTERVAL_MINUTES = 10;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

let schedulerTimer = null;
let isRunning = false;

const resolveIntervalMinutes = () => {
  const raw = Number(process.env.ATTENDANCE_AUTO_CLOSE_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES);
  if (!Number.isFinite(raw)) return DEFAULT_INTERVAL_MINUTES;
  return Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Math.floor(raw)));
};

const runAttendanceAutoCloseJob = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const config = readAttendanceTimeConfig();
    const today = todayKey(config.timeZone);
    const nowMinutes = resolveTimeOfDayMinutes(new Date(), config.timeZone);
    if (nowMinutes === null) return;

    const organizations = await prisma.organization.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        isBlocked: false,
      },
      select: {
        id: true,
        attendanceStartTime: true,
        attendanceEndTime: true,
      },
    });

    for (const organization of organizations) {
      const startTime = organization?.attendanceStartTime || config.startTime;
      const endTime = organization?.attendanceEndTime || config.endTime;
      const endMinutes = parseStartTimeMinutes(endTime);

      if (nowMinutes < endMinutes) {
        continue;
      }

      const openRecords = await prisma.attendance.findMany({
        where: {
          orgId: organization.id,
          date: today,
          deletedAt: null,
          punchInAt: { not: null },
          punchOutAt: null,
        },
        select: {
          id: true,
          punchInAt: true,
        },
      });

      const [eligibleUsers, existingAttendanceRows] = await Promise.all([
        prisma.user.findMany({
          where: {
            memberships: { some: { orgId: organization.id, isActive: true } },
            status: "APPROVED",
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        prisma.attendance.findMany({
          where: {
            orgId: organization.id,
            date: today,
            deletedAt: null,
          },
          select: {
            userId: true,
          },
        }),
      ]);

      for (const record of openRecords) {
        const punchInMinutes = resolveTimeOfDayMinutes(record.punchInAt, config.timeZone);
        const totalMinutesWorked =
          punchInMinutes === null ? 0 : Math.max(Math.min(endMinutes - punchInMinutes, 24 * 60), 0);
        const status = calculateAttendanceStatus({
          totalMinutesWorked,
          startTime,
          endTime,
        });
        const shiftEndAt = buildDateTimeForDateKey({
          dateKey: today,
          time: endTime,
          timeZone: config.timeZone,
        });

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            punchOutAt: shiftEndAt,
            totalMinutesWorked,
            status,
            notes: "Auto-closed at shift end due to missing punch-out.",
          },
        });
      }

      const existingUserIdSet = new Set(
        existingAttendanceRows
          .map((row) => Number(row.userId))
          .filter((userId) => Number.isFinite(userId) && userId > 0)
      );
      const absentRows = eligibleUsers
        .map((user) => Number(user.id))
        .filter((userId) => Number.isFinite(userId) && userId > 0 && !existingUserIdSet.has(userId))
        .map((userId) => ({
          orgId: organization.id,
          userId,
          date: today,
          status: "ABSENT",
          totalMinutesWorked: 0,
          lateMinutes: 0,
          isPunchInValid: false,
          isPunchOutValid: false,
          notes: "Auto-marked absent at shift end due to missing punch-in.",
        }));

      if (absentRows.length > 0) {
        await prisma.attendance.createMany({
          data: absentRows,
          skipDuplicates: true,
        });
      }
    }
  } catch (error) {
    console.error("[AttendanceAutoClose] Job failed:", error?.message || error);
  } finally {
    isRunning = false;
  }
};

const startAttendanceAutoCloseScheduler = () => {
  if (schedulerTimer) return;

  const intervalMinutes = resolveIntervalMinutes();
  const intervalMs = intervalMinutes * 60 * 1000;

  runAttendanceAutoCloseJob().catch(() => {});
  schedulerTimer = setInterval(() => {
    runAttendanceAutoCloseJob().catch(() => {});
  }, intervalMs);
};

const stopAttendanceAutoCloseScheduler = () => {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
};

module.exports = {
  runAttendanceAutoCloseJob,
  startAttendanceAutoCloseScheduler,
  stopAttendanceAutoCloseScheduler,
};
