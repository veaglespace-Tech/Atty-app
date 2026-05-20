import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
  },
  reducers: {
    addNotification: {
      reducer: (state, action) => {
        state.items = [action.payload, ...state.items].slice(0, 4);
      },
      prepare: ({ type = "error", title = "Something went wrong", message }) => ({
        payload: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type,
          title,
          message,
        },
      }),
    },
    removeNotification: (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearNotifications: (state) => {
      state.items = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationSlice.actions;
export default notificationSlice.reducer;
