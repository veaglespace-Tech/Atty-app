import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.textWhite}>Initializing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Camera Access Required</Text>
        <Text style={styles.subtitle}>We need access to your camera to scan QR codes.</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Allow Camera Access</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    
    Alert.alert(
      "Scanned Successfully",
      `Payload: ${data}`,
      [
        { text: "Scan Another", onPress: () => setScanned(false) },
        { text: "Done", onPress: () => router.back(), style: "cancel" }
      ]
    );
  };

  return (
    <View style={styles.flex1}>
      <CameraView 
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <SafeAreaView style={styles.overlay}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Text style={styles.scanText}>
              {scanned ? "Processing..." : "Align QR Code inside"}
            </Text>
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, backgroundColor: 'black' },
  centerContainer: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', padding: 24 },
  textWhite: { color: 'white', fontWeight: 'bold' },
  title: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  button: { backgroundColor: '#2563eb', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 24, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 24, padding: 16 },
  backButtonText: { color: '#64748b', fontWeight: 'bold' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  closeButton: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 8 },
  closeButtonText: { color: 'white', fontWeight: 'bold' },
  scanArea: { width: 250, height: 250, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: 'white' },
  topLeft: { top: 0, left: 0, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 20 },
  topRight: { top: 0, right: 0, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 20 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 20 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 20 },
  scanText: { color: 'white', fontWeight: 'bold', marginTop: 100, textAlign: 'center' },
});
