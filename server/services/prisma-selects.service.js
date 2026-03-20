const userManagementSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  mobileCountryCode: true,
  role: true,
  permissions: true,
  status: true,
  isActive: true,
  createdAt: true,
};

const attendanceUserSelect = {
  id: true,
  name: true,
  role: true,
};

const attendanceTeamSelect = {
  id: true,
  name: true,
};

const attendanceRecordSelect = {
  id: true,
  userId: true,
  teamId: true,
  date: true,
  punchInAt: true,
  punchInLatitude: true,
  punchInLongitude: true,
  punchInLocationMeta: true,
  punchOutAt: true,
  punchOutLatitude: true,
  punchOutLongitude: true,
  punchOutLocationMeta: true,
  punchInDistanceMeters: true,
  punchOutDistanceMeters: true,
  isPunchInValid: true,
  isPunchOutValid: true,
  totalMinutesWorked: true,
  lateMinutes: true,
  status: true,
  createdAt: true,
  user: {
    select: attendanceUserSelect,
  },
  team: {
    select: attendanceTeamSelect,
  },
};

const teamLeaderSelect = {
  id: true,
  name: true,
  role: true,
};

const teamListSelect = {
  id: true,
  name: true,
  description: true,
  leaderId: true,
  attendanceRadius: true,
  longitude: true,
  latitude: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  leader: {
    select: teamLeaderSelect,
  },
  _count: {
    select: {
      members: true,
    },
  },
};

const teamDetailSelect = {
  ...teamListSelect,
  members: {
    select: {
      userId: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  },
};

const organizationDashboardSelect = {
  organizationCode: true,
  subscriptionStatus: true,
  subscriptionExpiry: true,
  subscriptionId: true,
  plan: {
    select: {
      name: true,
    },
  },
};

const organizationSubscriptionSelect = {
  organizationCode: true,
  subscriptionStatus: true,
  subscriptionExpiry: true,
  attendanceRadius: true,
  plan: {
    select: {
      name: true,
    },
  },
};

const reportUserSelect = {
  id: true,
  name: true,
  role: true,
};

const reportPdfUserSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  mobileCountryCode: true,
};

module.exports = {
  userManagementSelect,
  attendanceRecordSelect,
  teamListSelect,
  teamDetailSelect,
  organizationDashboardSelect,
  organizationSubscriptionSelect,
  reportUserSelect,
  reportPdfUserSelect,
};
