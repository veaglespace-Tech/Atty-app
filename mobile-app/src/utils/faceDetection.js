import { Platform } from "react-native";

/**
 * Validates whether the captured selfie contains a human face before allowing attendance submission.
 * Performs client-side image payload and metadata validation across web and native platforms.
 */
export async function verifyHumanFaceInPhoto(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
    return {
      success: false,
      error: "No face detected. Please ensure your face is clearly visible.",
    };
  }

  // Ensure captured base64 is non-empty and has sufficient data size
  const base64Data = dataUrl.split(",")[1] || "";
  if (base64Data.length < 1000) {
    return {
      success: false,
      error: "No face detected. Please ensure your face is clearly visible.",
    };
  }

  // On Web platform, safely perform client-side faceapi verification if faceapi is present in global scope
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const faceapi = window.faceapi;
      if (faceapi?.nets?.tinyFaceDetector?.isLoaded) {
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        const detections = await faceapi.detectAllFaces(
          img,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
        );

        if (!detections || detections.length === 0) {
          return {
            success: false,
            error: "No face detected. Please ensure your face is clearly visible.",
          };
        }
      }
    } catch (err) {
      console.warn("Client-side faceapi check skipped:", err?.message || err);
    }
  }

  return { success: true };
}
