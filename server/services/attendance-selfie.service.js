const {
  createImageUploadError,
  uploadImageDataUrl,
  deleteCloudinaryImage,
} = require("./image-upload.service");
const { todayKey } = require("./common.service");

const ATTENDANCE_SELFIE_FOLDER = String(
  process.env.CLOUDINARY_ATTENDANCE_SELFIE_FOLDER || "veagle-attendee/attendance-selfies"
).trim();
const MAX_ATTENDANCE_SELFIE_BYTES = Number(
  process.env.ATTENDANCE_SELFIE_MAX_BYTES || 3 * 1024 * 1024
);

const createAttendanceSelfieError = (message, statusCode = 400) =>
  createImageUploadError(message, statusCode);

const uploadAttendanceSelfie = async ({ userId, dateKey, stage, dataUrl }) => {
  const resolvedUserId = Number(userId);
  if (!Number.isFinite(resolvedUserId) || resolvedUserId <= 0) {
    throw createAttendanceSelfieError(
      "A valid user id is required for attendance face capture.",
      400
    );
  }

  const normalizedStage = String(stage || "").trim().toLowerCase();
  if (!["punch-in", "punch-out"].includes(normalizedStage)) {
    throw createAttendanceSelfieError("A valid attendance face capture stage is required.", 400);
  }

  const normalizedDateKey = String(dateKey || "").trim() || todayKey();

  return uploadImageDataUrl({
    dataUrl,
    folder: ATTENDANCE_SELFIE_FOLDER,
    publicId: `${normalizedStage}-${resolvedUserId}-${normalizedDateKey}-${Date.now()}`,
    maxBytes: MAX_ATTENDANCE_SELFIE_BYTES,
    missingConfigMessage: "Attendance face capture is not configured on the server.",
    invalidMessage: "Capture a valid face selfie before marking attendance.",
    unsupportedMessage: "Only JPG, PNG, WEBP, or GIF selfies are supported.",
    emptyMessage: "Attendance selfie is empty. Please capture it again.",
    tooLargeMessage: "Attendance selfie must be 3 MB or smaller.",
    uploadFailureMessage: "Failed to upload attendance selfie. Please try again.",
    errorFactory: createAttendanceSelfieError,
    transformation: [
      {
        width: 720,
        height: 720,
        crop: "fill",
        gravity: "face",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
};

const deleteAttendanceSelfie = async (publicId) => deleteCloudinaryImage(publicId);

module.exports = {
  MAX_ATTENDANCE_SELFIE_BYTES,
  createAttendanceSelfieError,
  uploadAttendanceSelfie,
  deleteAttendanceSelfie,
};
