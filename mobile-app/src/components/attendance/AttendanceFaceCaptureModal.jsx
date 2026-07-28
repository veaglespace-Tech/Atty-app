import React, { useState, useRef, useEffect } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, Image } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, RefreshCcw, ShieldCheck, X } from "lucide-react-native";
import Button from "@/components/ui/Button";









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
      // Increased quality to 0.8 for high-resolution images
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });

      if (photo?.base64) {
        setCapturedImage(`data:image/jpeg;base64,${photo.base64}`);
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
      <View className="flex-1 bg-black">
        <View className="flex-1 relative bg-slate-950">

          {/* Main Camera / Image View */}
          {capturedImage ? (
            <Image
              source={{ uri: capturedImage }}
              className="flex-1 w-full h-full"
              resizeMode="contain"
            />
          ) : !permission?.granted ? (
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-center text-sm font-medium text-slate-400 mb-4">
                Camera permission is required to capture attendance selfies.
              </Text>
              <Button variant="outline" onPress={requestPermission}>
                <Text>Grant Permission</Text>
              </Button>
            </View>
          ) : (
            <View className="flex-1 relative">
              <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="front"
              />
              <View className="absolute bottom-32 left-0 right-0 items-center">
                <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                  <ShieldCheck size={12} color="white" />
                  <Text className="text-[10px] font-bold text-white">Keep your face in frame</Text>
                </View>
              </View>
            </View>
          )}

          {/* Close Button Top Right */}
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="absolute right-6 top-14 z-10 h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md active:scale-95"
          >
            <X size={20} color="white" />
          </Pressable>

          {/* Header Info Top Left */}
          <View className="absolute left-6 top-14 z-10 bg-black/40 px-4 py-2 rounded-2xl backdrop-blur-md">
            <Text className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">
              Attendance Check
            </Text>
            <Text className="text-lg font-black text-white leading-tight">
              {actionLabel}
            </Text>
          </View>

          {/* Error Message */}
          {cameraError ? (
            <View className="absolute top-36 left-6 right-6 z-10 rounded-xl border border-rose-500 bg-rose-500/80 px-4 py-3 backdrop-blur-md">
              <Text className="text-sm font-bold text-white text-center">{cameraError}</Text>
            </View>
          ) : null}

          {/* Bottom Action Bar */}
          <View className="absolute bottom-0 left-0 right-0 p-6 pb-12 pt-20">
            <View className="flex-row gap-4">
              {!capturedImage ? (
                <Button
                  variant="primary"
                  className="flex-1 h-14 rounded-full"
                  disabled={isCapturing || isSubmitting || !permission?.granted}
                  onPress={captureSelfie}
                  leftIcon={isCapturing ? <ActivityIndicator size="small" color="white" /> : <Camera size={24} color="white" />}
                >
                  <Text className="text-base font-bold text-white ml-2">Capture Photo</Text>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 h-14 rounded-full border-white/30 bg-black/40"
                    disabled={isSubmitting}
                    onPress={() => setCapturedImage("")}
                    leftIcon={<RefreshCcw size={20} color="white" />}
                  >
                    <Text className="text-base font-bold text-white ml-2">Retake</Text>
                  </Button>

                  <Button
                    variant="primary"
                    className="flex-1 h-14 rounded-full"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    onPress={handleSubmit}
                    leftIcon={!isSubmitting && <ShieldCheck size={20} color="white" />}
                  >
                    <Text className="text-base font-bold text-white ml-2">Upload</Text>
                  </Button>
                </>
              )}
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );

}
