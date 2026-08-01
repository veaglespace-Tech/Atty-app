import React, { useState, useRef, useEffect } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, Image, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, RefreshCcw, ShieldCheck, X, Loader2 } from "lucide-react-native";
import Button from "@/components/ui/Button";
import { verifyHumanFaceInPhoto } from "@/utils/faceDetection";
import { useAttendanceCamera } from "@/hooks/useAttendanceCamera";

const PREVIEW_SIZE = 640;

export default function AttendanceFaceCaptureModal({
  open,
  actionLabel,
  isSubmitting = false,
  onClose,
  onSubmit
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Native states
  const [isCapturingNative, setIsCapturingNative] = useState(false);
  const [capturedImageNative, setCapturedImageNative] = useState("");
  const [cameraErrorNative, setCameraErrorNative] = useState("");

  // Web states
  const {
    videoRef,
    cameraLoading,
    isCapturing: isCapturingWeb,
    cameraError: cameraErrorWeb,
    capturedImage: capturedImageWeb,
    startCamera,
    captureSelfie: captureSelfieWeb,
    handleRetake: handleRetakeWeb,
    handleClose: handleCloseWeb,
  } = useAttendanceCamera({ open: Platform.OS === 'web' ? open : false, onClose });

  useEffect(() => {
    if (Platform.OS !== 'web' && open && !permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [open, permission, requestPermission]);

  const handleClose = () => {
    if (Platform.OS === 'web') {
      handleCloseWeb();
    } else {
      setCapturedImageNative("");
      setCameraErrorNative("");
      onClose();
    }
  };

  const captureSelfieNative = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturingNative(true);
      setCameraErrorNative("");
      // Using quality 0.5 so base64 isn't too small to pass validation
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });

      if (photo?.base64) {
        const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
        const verification = await verifyHumanFaceInPhoto(dataUrl);
        if (!verification.success) {
          setCameraErrorNative(verification.error || "No face detected. Please ensure your face is clearly visible.");
          setIsCapturingNative(false);
          return;
        }
        setCapturedImageNative(dataUrl);
      } else {
        setCameraErrorNative("Failed to capture image.");
      }
    } catch (err) {
      console.error(err);
      setCameraErrorNative("Camera error occurred.");
    } finally {
      setIsCapturingNative(false);
    }
  };

  const [localSubmitting, setLocalSubmitting] = useState(false);

  const handleSubmit = async () => {
    const finalImage = Platform.OS === 'web' ? capturedImageWeb : capturedImageNative;
    if (!finalImage || localSubmitting) return;
    setLocalSubmitting(true);
    try {
      await onSubmit(finalImage);
    } finally {
      setLocalSubmitting(false);
    }
  };

  if (!open) return null;

  const isCapturing = Platform.OS === 'web' ? isCapturingWeb : isCapturingNative;
  const cameraError = Platform.OS === 'web' ? cameraErrorWeb : cameraErrorNative;
  const capturedImage = Platform.OS === 'web' ? capturedImageWeb : capturedImageNative;
  const hasPermission = Platform.OS === 'web' ? true : permission?.granted;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-center bg-black/50 p-4">
        <View className="overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          <View className="absolute right-4 top-4 z-10">
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/85 dark:border-slate-700 dark:bg-slate-950/85"
            >
              <X size={18} className="text-slate-600 dark:text-slate-300" />
            </Pressable>
          </View>

          <View className="pr-12 mb-5">
            <Text className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
              Attendance Face Check
            </Text>
            <Text className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              Selfie required for {actionLabel}
            </Text>
            <Text className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Capture a clear live selfie before marking attendance. This proof is visible in admin attendance logs.
            </Text>
          </View>

          {cameraError ? (
            <View className="mb-4 rounded-xl bg-rose-50 p-3 dark:bg-rose-900/30">
              <Text className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {cameraError}
              </Text>
            </View>
          ) : null}

          {!hasPermission ? (
            <View className="mb-4 items-center justify-center rounded-2xl bg-slate-100 p-6 dark:bg-slate-800">
              <Text className="mb-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                ATTY uses the camera to capture member photos and perform face recognition attendance.
              </Text>
              <Button variant="outline" onPress={requestPermission}>
                <Text>Continue</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="mb-5 h-[320px] w-full overflow-hidden rounded-[1.8rem] border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800">
                {capturedImage ? (
                  <Image
                    source={{ uri: capturedImage }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="flex-1 relative">
                    {Platform.OS === 'web' ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <CameraView
                        ref={cameraRef}
                        style={{ flex: 1, width: '100%', height: '100%' }}
                        facing="front"
                      />
                    )}
                    <View className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16 flex items-center justify-center pointer-events-none bg-black/10">
                      <View className="flex-row items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2">
                        <ShieldCheck size={14} color="white" />
                        <Text className="text-xs font-semibold text-white">Keep your face centered and well lit</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View className="flex-row gap-3">
                {!capturedImage ? (
                  Platform.OS === 'web' ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        disabled={cameraLoading || isCapturing || isSubmitting}
                        onPress={startCamera}
                        leftIcon={cameraLoading ? <ActivityIndicator size="small" color="#64748b" /> : <RefreshCcw size={16} className="text-slate-600 dark:text-slate-300" />}
                      >
                        Retry
                      </Button>
                      <Button
                        variant="primary"
                        className="flex-1"
                        disabled={cameraLoading || isCapturing || isSubmitting || Boolean(cameraError)}
                        onPress={captureSelfieWeb}
                        leftIcon={isCapturing ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" />}
                      >
                        Capture Selfie
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={isCapturing || isSubmitting || !hasPermission}
                      onPress={captureSelfieNative}
                      leftIcon={isCapturing ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" className="dark:text-slate-900" />}
                    >
                      Capture Selfie
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                      onPress={Platform.OS === 'web' ? handleRetakeWeb : () => setCapturedImageNative("")}
                      leftIcon={<RefreshCcw size={16} className="text-slate-600 dark:text-slate-300" />}
                    >
                      Retake
                    </Button>

                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={isSubmitting}
                      isLoading={isSubmitting}
                      onPress={handleSubmit}
                      leftIcon={!isSubmitting && <ShieldCheck size={18} color="white" />}
                    >
                      Submit
                    </Button>
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
