import { useEffect, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";

const PREVIEW_SIZE = 640;

const stopMediaStream = (stream) => {
  stream?.getTracks?.().forEach((track) => track.stop());
};

const getCameraErrorMessage = (error) => {
  const errorName = String(error?.name || "").trim();

  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Camera permission is required for attendance face check.";
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return "Camera is busy in another app. Close it and try again.";
  }

  return error?.message || "Unable to access the camera for attendance face check.";
};

export function useAttendanceCamera({ open, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face detection models", err);
      }
    };
    loadModels();
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported in this browser.");
      return;
    }

    try {
      setCameraLoading(true);
      setCameraError("");
      stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
    } catch (error) {
      setCameraError(getCameraErrorMessage(error));
    } finally {
      setCameraLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setCapturedImage("");
      setCameraError("");
      stopStream();
      return undefined;
    }

    let cancelled = false;

    const openCamera = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) {
          setCameraError("Camera access is not supported in this browser.");
        }
        return;
      }

      try {
        setCameraLoading(true);
        setCameraError("");
        stopStream();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 720 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => { });
        }
      } catch (error) {
        if (!cancelled) {
          setCameraError(getCameraErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setCameraLoading(false);
        }
      }
    };

    openCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  const captureSelfie = async () => {
    if (!videoRef.current) {
      setCameraError("Camera preview is not ready yet.");
      return;
    }

    if (!modelsLoaded) {
      setCameraError("Face detection models are still loading. Please wait...");
      return;
    }

    try {
      setIsCapturing(true);
      const detections = await faceapi.detectAllFaces(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 })
      );
      
      if (detections.length === 0) {
        setCameraError("No face detected. Please ensure your face is clearly visible.");
        setIsCapturing(false);
        return;
      }
    } catch (err) {
      console.error("Face detection error:", err);
      setCameraError("Face detection failed. Please try again.");
      setIsCapturing(false);
      return;
    }

    const video = videoRef.current;
    const sourceWidth = Number(video.videoWidth || 0);
    const sourceHeight = Number(video.videoHeight || 0);
    if (!sourceWidth || !sourceHeight) {
      setCameraError("Camera preview is not ready yet.");
      return;
    }

    const sourceSize = Math.min(sourceWidth, sourceHeight);
    const offsetX = Math.max(0, Math.floor((sourceWidth - sourceSize) / 2));
    const offsetY = Math.max(0, Math.floor((sourceHeight - sourceSize) / 2));
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError("Unable to capture attendance selfie on this device.");
      return;
    }

    context.drawImage(
      video,
      offsetX,
      offsetY,
      sourceSize,
      sourceSize,
      0,
      0,
      PREVIEW_SIZE,
      PREVIEW_SIZE
    );

    setCapturedImage(canvas.toDataURL("image/jpeg", 0.82));
    setCameraError("");
    setIsCapturing(false);
    stopStream();
  };

  const handleRetake = async () => {
    setCapturedImage("");
    await startCamera();
  };

  const handleClose = () => {
    setCapturedImage("");
    setCameraError("");
    stopStream();
    onClose?.();
  };

  return {
    videoRef,
    cameraLoading,
    isCapturing,
    cameraError,
    capturedImage,
    startCamera,
    captureSelfie,
    handleRetake,
    handleClose,
  };
}
