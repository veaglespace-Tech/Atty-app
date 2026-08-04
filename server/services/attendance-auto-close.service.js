const prisma = require("../lib/prisma");
const { todayKey } = require("./common.service");
const {
  buildDateTimeForDateKey,
  calculateAttendanceStatus,
  parseStartTimeMinutes,
  readAttendanceTimeConfig,
  resolveTimeOfDayMinutes,
} = require("./attendance-time.service");

const cron = require("node-cron");

let schedulerTimer = null;
let isRunning = false;

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
        // Missing punch out -> Mark ABSENT, with totalMinutesWorked = 0
        const shiftEndAt = buildDateTimeForDateKey({
          dateKey: today,
          time: endTime,
          timeZone: config.timeZone,
        });

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            punchOutAt: shiftEndAt, // Faked for structural integrity or keep null? We'll fake it to shift end.
            totalMinutesWorked: 0,
            status: "ABSENT",
            notes: "Auto-closed at shift end due to missing punch-out. Marked Absent.",
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

  // Schedule to run every day at 11:59 PM
  schedulerTimer = cron.schedule("59 23 * * *", () => {
    runAttendanceAutoCloseJob().catch(() => {});
  });
};

const stopAttendanceAutoCloseScheduler = () => {
  if (!schedulerTimer) return;
  schedulerTimer.stop();
  schedulerTimer = null;
};

module.exports = {
  runAttendanceAutoCloseJob,
  startAttendanceAutoCloseScheduler,
  stopAttendanceAutoCloseScheduler,
};
