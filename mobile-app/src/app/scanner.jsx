import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap, ZapOff, QrCode } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);

  // If permission state is null, we are still waiting for it to initialize
  if (!permission) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <Text className="text-white font-bold">Initializing camera...</Text>
      </View>
    );
  }

  // If permission is denied
  if (!permission.granted) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-6">
        <View className="h-24 w-24 bg-slate-900 rounded-[32px] items-center justify-center mb-6">
          <QrCode size={48} color="#3b82f6" />
        </View>
        <Text className="text-white font-black text-2xl mb-3 text-center">Camera Access Required</Text>
        <Text className="text-slate-400 font-medium text-center mb-10 leading-6">
          We need access to your camera to scan QR codes for attendance verification.
        </Text>
        <Pressable 
          onPress={requestPermission}
          className="bg-blue-600 rounded-3xl py-4 w-full active:scale-95 transition-transform shadow-[0_10px_40px_rgba(37,99,235,0.3)]"
        >
          <Text className="text-white font-bold text-center text-base">Allow Camera Access</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-4 p-4">
          <Text className="text-slate-500 font-bold">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = ({ type, data }) => {
    setScanned(true);
    
    // Play a haptic feedback here ideally, but Alert is fine for now
    Alert.alert(
      "Scanned Successfully",
      `Payload: ${data}`,
      [
        {
          text: "Scan Another",
          onPress: () => setScanned(false)
        },
        {
          text: "Done",
          onPress: () => router.back(),
          style: "cancel"
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header Controls */}
      <View className="absolute z-10 top-12 w-full flex-row justify-between px-6 items-center">
        <Pressable 
          onPress={() => router.back()}
          className="h-12 w-12 rounded-full bg-black/60 items-center justify-center border border-white/10 active:opacity-70"
        >
          <ArrowLeft size={24} color="#ffffff" />
        </Pressable>
        
        <View className="bg-black/60 px-4 py-2 rounded-full border border-white/10">
          <Text className="text-white font-black tracking-widest uppercase text-[10px]">
            QR Scanner
          </Text>
        </View>

        <Pressable 
          onPress={() => setTorch(!torch)}
          className={`h-12 w-12 rounded-full items-center justify-center border active:opacity-70 ${
            torch ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-black/60 border-white/10'
          }`}
        >
          {torch ? <Zap size={20} color="#fbbf24" /> : <ZapOff size={20} color="#ffffff" />}
        </Pressable>
      </View>

      {/* Camera View */}
      <CameraView 
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center">
          {/* Scanning Box Outline */}
          <View className="w-[75%] aspect-square relative items-center justify-center">
            {/* The actual clear hole */}
            <View className="absolute inset-0 bg-transparent border-[0px] border-transparent" />
            
            {/* 4 Corner Accents */}
            <View className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-white rounded-tl-[32px]" />
            <View className="absolute top-0 right-0 w-12 h-12 border-t-8 border-r-8 border-white rounded-tr-[32px]" />
            <View className="absolute bottom-0 left-0 w-12 h-12 border-b-8 border-l-8 border-white rounded-bl-[32px]" />
            <View className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-white rounded-br-[32px]" />
            
            {/* Scan Line Animation (Static for now, but gives the look) */}
            {!scanned && (
              <View className="w-full h-0.5 bg-blue-500 absolute top-1/2 shadow-[0_0_10px_#3b82f6]" />
            )}
          </View>
          
          <Text className="text-white font-bold mt-16 px-10 text-center leading-6">
            {scanned 
              ? "Processing QR Code..." 
              : "Align the QR code within the frame to scan automatically."}
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}
