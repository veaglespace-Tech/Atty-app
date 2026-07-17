const membershipSelect = {
  orgId: true,
  role: true,
  isActive: true,
  joinedAt: true,
};

const userManagementSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  mobileCountryCode: true,
  emergencyContact: true,
  currentAddress: true,
  permanentAddress: true,
  permissions: true,
  profileImageUrl: true,
  status: true,
  isActive: true,
  createdAt: true,
  memberships: {
    select: membershipSelect,
  },
};

const userProfileSelect = {
  ...userManagementSelect,
  updatedAt: true,
  lastLoginAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  teamMemberships: {
    select: {
      createdAt: true,
      team: {
        select: {
          id: true,
          name: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  },
  teamsLed: {
    select: {
      id: true,
      name: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
    },
  },
};

const attendanceUserSelect = {
  id: true,
  name: true,
  memberships: {
    select: membershipSelect,
  },
};

const attendanceTeamSelect = {
  id: true,
  name: true,
  isActive: true,
  deletedAt: true,
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
  punchInSelfieUrl: true,
  punchOutAt: true,
  punchOutLatitude: true,
  punchOutLongitude: true,
  punchOutLocationMeta: true,
  punchOutSelfieUrl: true,
  reachedHomeAt: true,
  reachedHomeLatitude: true,
  reachedHomeLongitude: true,
  reachedHomeLocationMeta: true,
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
  memberships: {
    select: membershipSelect,
  },
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
      maxUsers: true,
      memberLimit: true,
    },
  },
};

const organizationSubscriptionSelect = {
  name: true,
  organizationCode: true,
  subscriptionStatus: true,
  subscriptionExpiry: true,
  attendanceRadius: true,
  plan: {
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      durationInDays: true,
      memberLimit: true,
      maxUsers: true,
      maxTeams: true,
      maxLocations: true,
    },
  },
};

const reportUserSelect = {
  id: true,
  name: true,
  memberships: {
    select: membershipSelect,
  },
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
  userProfileSelect,
  attendanceRecordSelect,
  teamListSelect,
  teamDetailSelect,
  organizationDashboardSelect,
  organizationSubscriptionSelect,
  reportUserSelect,
  reportPdfUserSelect,
  membershipSelect,
};
