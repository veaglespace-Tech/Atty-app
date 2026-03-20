import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import { authApi } from "./api/authApi";
import { planApi } from "./api/planApi";
import { orgApi } from "./api/orgApi";
import { teamLeaderApi } from "./api/teamLeaderApi";
import { memberApi } from "./api/memberApi";
import { superAdminApi } from "./api/superAdminApi";
import { dashboardApi } from "./api/dashboardApi";
import { attendanceApi } from "./api/attendanceApi";
import { paymentApi } from "./api/paymentApi";
import { utilityApi } from "./api/utilityApi";

export const store = configureStore({
  reducer: {
    auth: authReducer,
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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      planApi.middleware,
      orgApi.middleware,
      teamLeaderApi.middleware,
      memberApi.middleware,
      superAdminApi.middleware,
      dashboardApi.middleware,
      attendanceApi.middleware,
      paymentApi.middleware,
      utilityApi.middleware
    ),
});
