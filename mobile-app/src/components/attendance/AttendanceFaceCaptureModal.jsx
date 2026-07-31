import React, { useState, useRef, useEffect } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, RefreshCcw, ShieldCheck, X } from "lucide-react-native";
import Button from "@/components/ui/Button";
import { verifyHumanFaceInPhoto } from "@/utils/faceDetection";

export default function AttendanceFaceCaptureModal({
  open,
  actionLabel,
  isSubmitting = false,
  onClose,
  onSubmit
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [cameraError, setCameraError] = useState("");

  useEffect(() => {
    if (open && !permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [open, permission, requestPermission]);

  const handleClose = () => {
    setCapturedImage("");
    setCameraError("");
    onClose();
  };

  const captureSelfie = async () => {
    if (!cameraRef.current) return;

    try {
      setIsCapturing(true);
      setCameraError("");
      // Lowered quality to 0.1 to prevent 413 Payload Too Large on the server
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });

      if (photo?.base64) {
        const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
        const verification = await verifyHumanFaceInPhoto(dataUrl);
        if (!verification.success) {
          setCameraError(verification.error || "No face detected. Please ensure your face is clearly visible.");
          setIsCapturing(false);
          return;
        }
        setCapturedImage(dataUrl);
      } else {
        setCameraError("Failed to capture image.");
      }
    } catch (err) {
      console.error(err);
      setCameraError("Camera error occurred.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async () => {
    if (!capturedImage) return;
    await onSubmit(capturedImage);
  };

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
      <View className="flex-1 justify-center bg-black/50 p-4">
        <View className="overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">
              {actionLabel}
            </Text>
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              className="rounded-full bg-slate-100 p-2 dark:bg-slate-800"
            >
              <X size={20} className="text-slate-500" />
            </Pressable>
          </View>

          {cameraError ? (
            <View className="mb-4 rounded-xl bg-rose-50 p-3 dark:bg-rose-900/30">
              <Text className="text-sm font-medium text-rose-600 dark:text-rose-400">
                {cameraError}
              </Text>
            </View>
          ) : null}

          {!permission?.granted ? (
            <View className="mb-4 items-center justify-center rounded-2xl bg-slate-100 p-6 dark:bg-slate-800">
              <Text className="mb-4 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                Camera permission is required to capture attendance selfies.
              </Text>
              <Button variant="outline" onPress={requestPermission}>
                <Text>Grant Permission</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="mb-4 aspect-[3/4] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950">
                {capturedImage ? (
                  <Image
                    source={{ uri: capturedImage }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <CameraView
                    ref={cameraRef}
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    facing="front"
                  />
                )}
              </View>

              <View className="flex-row gap-3">
                {!capturedImage ? (
                  <Button
                    variant="primary"
                    className="flex-1"
                    disabled={isCapturing || isSubmitting || !permission?.granted}
                    onPress={captureSelfie}
                    leftIcon={isCapturing ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" className="dark:text-slate-900" />}
                  >
                    Capture Selfie
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                      onPress={() => setCapturedImage("")}
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
