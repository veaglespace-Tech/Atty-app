import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import notificationReducer from "./slices/notificationSlice";
import { apiErrorNotificationMiddleware } from "./middleware/apiErrorNotificationMiddleware";
import { authApi } from "@/services/api/authApi";
import { planApi } from "@/services/api/planApi";
import { orgApi } from "@/services/api/orgApi";
import { teamLeaderApi } from "@/services/api/teamLeaderApi";
import { memberApi } from "@/services/api/memberApi";
import { superAdminApi } from "@/services/api/superAdminApi";
import { dashboardApi } from "@/services/api/dashboardApi";
import { attendanceApi } from "@/services/api/attendanceApi";
import { paymentApi } from "@/services/api/paymentApi";
import { utilityApi } from "@/services/api/utilityApi";
import { postApi } from "@/services/api/postApi";
import { attyApi } from "@/services/api/attyApi";
import { partnerReferralApi } from "@/services/api/partnerReferralApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationReducer,
    [authApi.reducerPath]: authApi.reducer,
    [planApi.reducerPath]: planApi.reducer,
    [orgApi.reducerPath]: orgApi.reducer,
    [teamLeaderApi.reducerPath]: teamLeaderApi.reducer,
    [memberApi.reducerPath]: memberApi.reducer,
    [superAdminApi.reducerPath]: superAdminApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [attendanceApi.reducerPath]: attendanceApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [utilityApi.reducerPath]: utilityApi.reducer,
    [postApi.reducerPath]: postApi.reducer,
    [attyApi.reducerPath]: attyApi.reducer,
    [partnerReferralApi.reducerPath]: partnerReferralApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(
      apiErrorNotificationMiddleware,
      authApi.middleware,
      planApi.middleware,
      orgApi.middleware,
      teamLeaderApi.middleware,
      memberApi.middleware,
      superAdminApi.middleware,
      dashboardApi.middleware,
      attendanceApi.middleware,
      paymentApi.middleware,
      utilityApi.middleware,
      postApi.middleware,
      attyApi.middleware,
      partnerReferralApi.middleware
    ),
});
