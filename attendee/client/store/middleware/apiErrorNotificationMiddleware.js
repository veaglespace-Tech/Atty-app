import { isRejected } from "@reduxjs/toolkit";
import { addNotification } from "@/store/slices/notificationSlice";

const MAX_NOTIFICATION_MESSAGE_LENGTH = 180;

const toSingleLine = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeNotificationMessage = (value) => {
  const singleLine = toSingleLine(value);
  if (!singleLine) return "Something went wrong. Please try again.";

  const lower = singleLine.toLowerCase();
  if (
    lower.includes("invalid `prisma") ||
    lower.includes("unknown column") ||
    lower.includes("the column") ||
    lower.includes("does not exist in the current database")
  ) {
    return "Server settings are updating. Please refresh and try again in a moment.";
  }

  if (singleLine.length <= MAX_NOTIFICATION_MESSAGE_LENGTH) return singleLine;
  return `${singleLine.slice(0, MAX_NOTIFICATION_MESSAGE_LENGTH - 3)}...`;
};

const getErrorMessage = (action) => {
  const payload = action?.payload;
  const error = action?.error;

  return normalizeNotificationMessage(
    payload?.data?.message ||
      payload?.data?.error ||
      payload?.error ||
      error?.message ||
      "Something went wrong. Please try again."
  );
};

const shouldNotify = (action) => {
  if (!isRejected(action)) return false;
  if (action?.meta?.aborted || action?.meta?.condition) return false;

  // Only RTK Query actions have endpoint metadata here; this keeps the toast focused on API failures.
  const endpointName = action?.meta?.arg?.endpointName;
  if (!endpointName) return false;
  if (endpointName === "getMe") return false;

  return true;
};

export const apiErrorNotificationMiddleware = () => (next) => (action) => {
  const result = next(action);

  if (shouldNotify(action)) {
    const message = getErrorMessage(action);
    if (message) {
      next(
        addNotification({
          type: "error",
          title: "Action failed",
          message,
        })
      );
    }
  }

  return result;
};
