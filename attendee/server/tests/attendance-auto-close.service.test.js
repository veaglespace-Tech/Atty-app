process.env.NODE_ENV = "test";

jest.mock("../lib/prisma", () => ({
  organization: {
    findMany: jest.fn(),
  },
  attendance: {
    findMany: jest.fn(),
    update: jest.fn(),
    createMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
}));

jest.mock("../services/common.service", () => ({
  todayKey: jest.fn(() => "2026-05-20"),
}));

jest.mock("../services/attendance-time.service", () => ({
  readAttendanceTimeConfig: jest.fn(() => ({
    timeZone: "Asia/Kolkata",
    startTime: "10:00",
    endTime: "19:00",
    graceMinutes: 0,
  })),
  resolveTimeOfDayMinutes: jest.fn((value) => {
    if (value instanceof Date) return 19 * 60 + 125;
    return 10 * 60;
  }),
  parseStartTimeMinutes: jest.fn(() => 19 * 60),
  calculateAttendanceStatus: jest.fn(() => "PRESENT"),
  buildDateTimeForDateKey: jest.fn(() => new Date("2026-05-20T13:30:00.000Z")),
}));

const prisma = require("../lib/prisma");
const {
  runAttendanceAutoCloseJob,
} = require("../services/attendance-auto-close.service");

describe("attendance auto close scheduler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("auto-closes open punches at shift end timestamp", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 12,
        attendanceStartTime: "10:00",
        attendanceEndTime: "19:00",
      },
    ]);
    prisma.attendance.findMany
      .mockResolvedValueOnce([
        { id: 101, punchInAt: new Date("2026-05-20T04:30:00.000Z") },
      ])
      .mockResolvedValueOnce([{ userId: 55 }]);
    prisma.user.findMany.mockResolvedValue([{ id: 55 }]);
    prisma.attendance.update.mockResolvedValue({});
    prisma.attendance.createMany.mockResolvedValue({ count: 0 });

    await runAttendanceAutoCloseJob();

    expect(prisma.attendance.update).toHaveBeenCalledTimes(1);
    expect(prisma.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({
          totalMinutesWorked: expect.any(Number),
          punchOutAt: new Date("2026-05-20T13:30:00.000Z"),
        }),
      })
    );
  });

  it("creates absent rows for eligible users with no attendance row", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 22,
        attendanceStartTime: "10:00",
        attendanceEndTime: "19:00",
      },
    ]);
    prisma.attendance.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 1 }]);
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    prisma.attendance.update.mockResolvedValue({});
    prisma.attendance.createMany.mockResolvedValue({ count: 2 });

    await runAttendanceAutoCloseJob();

    expect(prisma.attendance.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.attendance.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
        data: expect.arrayContaining([
          expect.objectContaining({ orgId: 22, userId: 2, status: "ABSENT" }),
          expect.objectContaining({ orgId: 22, userId: 3, status: "ABSENT" }),
        ]),
      })
    );
  });
});
