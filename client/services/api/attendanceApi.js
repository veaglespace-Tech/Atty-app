import { createApi } from "@reduxjs/toolkit/query/react";
import { buildBaseQuery } from "./baseApi";
import { getTodayDateKey } from "@/utils/date";

const todayKey = getTodayDateKey;

const ensureSummaryEntry = (summary, label, fallbackValue) => {
  const existing = Array.isArray(summary) ? summary.find((item) => item?.label === label) : null;
  if (existing) return existing;

  const entry = { label, value: fallbackValue };
  summary.push(entry);
  return entry;
};

const patchTodaySummary = (summary, nextStatus) => {
  if (!Array.isArray(summary)) return;

  const todayStatus = ensureSummaryEntry(summary, "Today Status", "No Records");
  todayStatus.value = nextStatus;
};

const patchMyAttendanceCache = ({ dispatch, getState, recipe }) => {
  const reducerState = getState()?.[attendanceApi.reducerPath];
  const queryEntries = Object.values(reducerState?.queries || {});
  const seenArgs = new Set();
  const patchResults = [];

  for (const entry of queryEntries) {
    if (entry?.endpointName !== "getMyAttendance") continue;

    const arg = entry.originalArgs;
    const key = typeof arg === "undefined" ? "__undefined__" : JSON.stringify(arg);
    if (seenArgs.has(key)) continue;

    seenArgs.add(key);
    patchResults.push(dispatch(attendanceApi.util.updateQueryData("getMyAttendance", arg, recipe)));
  }

  return patchResults;
};

const applyPunchInOptimistic = (draft) => {
  if (!draft || !Array.isArray(draft.items)) return;

  const currentDay = todayKey();
  const nowIso = new Date().toISOString();
  const todayRecordIndex = draft.items.findIndex((item) => String(item?.date) === currentDay);

  if (todayRecordIndex >= 0) {
    const record = draft.items[todayRecordIndex];
    draft.items[todayRecordIndex] = {
      ...record,
      status: String(record?.status || "").trim() || "PRESENT",
      punchInAt: record?.punchInAt || nowIso,
    };
  } else {
    draft.items.unshift({
      id: `optimistic-punch-in-${Date.now()}`,
      date: currentDay,
      status: "PRESENT",
      punchInAt: nowIso,
      punchOutAt: null,
      punchInValid: true,
      punchOutValid: null,
      workedMinutes: 0,
      workedHours: 0,
      punchInCoordinates: null,
      punchOutCoordinates: null,
      punchInLocationMeta: null,
      punchOutLocationMeta: null,
      punchInSelfieUrl: null,
      punchOutSelfieUrl: null,
    });

    if (draft.meta && Number.isFinite(Number(draft.meta.totalRecords))) {
      draft.meta.totalRecords = Number(draft.meta.totalRecords) + 1;
    }
  }

  patchTodaySummary(draft.summary, "PRESENT");
};

const applyPunchOutOptimistic = (draft) => {
  if (!draft || !Array.isArray(draft.items)) return;

  const currentDay = todayKey();
  const nowIso = new Date().toISOString();
  const todayRecordIndex = draft.items.findIndex((item) => String(item?.date) === currentDay);

  if (todayRecordIndex >= 0) {
    const record = draft.items[todayRecordIndex];
    draft.items[todayRecordIndex] = {
      ...record,
      status: String(record?.status || "").trim() || "PRESENT",
      punchOutAt: nowIso,
    };
  }

  patchTodaySummary(draft.summary, "PRESENT");
};

export const attendanceApi = createApi({
  reducerPath: "attendanceApi",
  baseQuery: buildBaseQuery(),
  tagTypes: ["Attendance"],
  endpoints: (builder) => ({
    getAttendance: builder.query({
      query: (queryString = "") => `/attendance${queryString ? `?${queryString}` : ""}`,
      providesTags: (result) =>
        Array.isArray(result)
          ? [
              { type: "Attendance", id: "LIST" },
              ...result.map((item) => ({ type: "Attendance", id: String(item?._id || item?.userId) })),
            ]
          : [{ type: "Attendance", id: "LIST" }],
    }),
    getMyAttendance: builder.query({
      query: (limit = 12) => `/attendance/me?limit=${limit}`,
      providesTags: (result) =>
        Array.isArray(result?.items)
          ? [
              { type: "Attendance", id: "SELF" },
              ...result.items.map((item) => ({ type: "Attendance", id: String(item?.id || item?.date) })),
            ]
          : [{ type: "Attendance", id: "SELF" }],
    }),
    getAttendanceSummary: builder.query({
      query: () => "/attendance/summary",
      providesTags: [{ type: "Attendance", id: "SUMMARY" }],
    }),
    punchIn: builder.mutation({
      query: (payload) => ({
        url: "/attendance/punch-in",
        method: "POST",
        body: payload,
      }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const patchResults = patchMyAttendanceCache({
          dispatch,
          getState,
          recipe: applyPunchInOptimistic,
        });

        try {
          await queryFulfilled;
        } catch (_) {
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [
        { type: "Attendance", id: "LIST" },
        { type: "Attendance", id: "SELF" },
        { type: "Attendance", id: "SUMMARY" },
      ],
    }),
    punchOut: builder.mutation({
      query: (payload) => ({
        url: "/attendance/punch-out",
        method: "POST",
        body: payload,
      }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const patchResults = patchMyAttendanceCache({
          dispatch,
          getState,
          recipe: applyPunchOutOptimistic,
        });

        try {
          await queryFulfilled;
        } catch (_) {
          patchResults.forEach((patch) => patch.undo());
        }
      },
      invalidatesTags: [
        { type: "Attendance", id: "LIST" },
        { type: "Attendance", id: "SELF" },
        { type: "Attendance", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetMyAttendanceQuery,
  useGetAttendanceSummaryQuery,
  usePunchInMutation,
  usePunchOutMutation,
} = attendanceApi;

