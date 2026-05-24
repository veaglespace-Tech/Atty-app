"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, RefreshCcw, ShieldCheck, X } from "lucide-react";

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

export default function AttendanceFaceCaptureModal({
  open,
  actionLabel,
  isSubmitting = false,
  onClose,
  onSubmit,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState("");

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

  const captureSelfie = () => {
    if (!videoRef.current) {
      setCameraError("Camera preview is not ready yet.");
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

  const handleSubmit = async () => {
    if (!capturedImage || typeof onSubmit !== "function") return;
    await onSubmit(capturedImage);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-sm">
      <div className="light-glow-card-static relative w-full max-w-2xl rounded-[2rem] p-5 sm:p-6">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-300 dark:hover:text-white"
          aria-label="Close attendance face capture"
        >
          <X size={18} />
        </button>

        <div className="pr-12">
          <p className="brand-kicker">Attendance Face Check</p>
          <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            Selfie required for {actionLabel}
          </h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
            Capture a clear live selfie before marking attendance. This proof is visible in admin
            attendance logs.
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.8rem] border border-slate-200 bg-slate-950 shadow-[0_26px_70px_rgba(15,23,42,0.22)] dark:border-slate-800">
          {capturedImage ? (
            <Image
              src={capturedImage}
              alt="Captured attendance selfie preview"
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              unoptimized
              className="h-[320px] w-full object-cover sm:h-[420px]"
            />
          ) : (
            <div className="relative h-[320px] sm:h-[420px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent px-5 pb-5 pt-16">
                <div className="mx-auto flex max-w-xs items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
                  <ShieldCheck size={14} />
                  Keep your face centered and well lit
                </div>
              </div>
            </div>
          )}
        </div>

        {cameraError ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {cameraError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          {!capturedImage ? (
            <>
              <button
                type="button"
                onClick={startCamera}
                disabled={cameraLoading || isSubmitting}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                {cameraLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCcw size={16} />
                )}
                Retry Camera
              </button>
              <button
                type="button"
                onClick={captureSelfie}
                disabled={cameraLoading || isSubmitting || Boolean(cameraError)}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {cameraLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                Capture Selfie
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                disabled={isSubmitting}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                <RefreshCcw size={16} />
                Retake
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                Submit {actionLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
