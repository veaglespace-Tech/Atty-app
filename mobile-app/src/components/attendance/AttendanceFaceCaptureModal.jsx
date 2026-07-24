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
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });

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
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/80 px-4">
        <View className="w-full max-w-sm rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          
          <Pressable
            onPress={handleClose}
            disabled={isSubmitting}
            className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:scale-95">
            
            <X size={16} className="text-slate-600 dark:text-slate-300" />
          </Pressable>

          <View className="pr-8 mb-4 mt-2">
            <Text className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
              Attendance Face Check
            </Text>
            <Text className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              Selfie for {actionLabel}
            </Text>
            <Text className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-snug">
              Capture a clear live selfie. This proof is visible in admin logs.
            </Text>
          </View>

          <View className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 aspect-[3/4] w-full mb-4">
            {capturedImage ?
            <Image
              source={{ uri: capturedImage }}
              className="h-full w-full"
              resizeMode="cover" /> :

            !permission?.granted ?
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                  Camera permission is required to capture attendance selfies.
                </Text>
                <Button variant="outline" onPress={requestPermission}>
                  <Text>Grant Permission</Text>
                </Button>
              </View> :

            <View className="flex-1 relative">
                <CameraView
                ref={cameraRef}
                style={{ flex: 1 }}
                facing="front" />
              
                <View className="absolute bottom-4 left-0 right-0 items-center">
                  <View className="flex-row items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                    <ShieldCheck size={12} color="white" />
                    <Text className="text-[10px] font-bold text-white">Keep your face centered</Text>
                  </View>
                </View>
              </View>
            }
          </View>

          {cameraError ?
          <View className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/50 dark:bg-rose-900/20">
              <Text className="text-xs font-bold text-rose-700 dark:text-rose-300">{cameraError}</Text>
            </View> :
          null}

          <View className="flex-row gap-3">
            {!capturedImage ?
            <Button
              variant="primary"
              className="flex-1"
              disabled={isCapturing || isSubmitting || !permission?.granted}
              onPress={captureSelfie}
              leftIcon={isCapturing ? <ActivityIndicator size="small" color="white" /> : <Camera size={18} color="white" className="dark:text-slate-900" />}
            >
              Capture Selfie
            </Button> :

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
            }
          </View>

        </View>
      </View>
    </Modal>);

}
