import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const downloadAndShareBlob = async (blob, filename) => {
  return new Promise((resolve, reject) => {
    // If running on the web, use standard HTML5 anchor download
    if (Platform.OS === 'web') {
      try {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        resolve(url);
      } catch (err) {
        console.error('Error downloading on web:', err);
        reject(err);
      }
      return;
    }

    // For mobile (iOS/Android), use Expo FileSystem and Sharing
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // reader.result will be a base64 encoded data URI
        const base64Data = reader.result.split(',')[1] || reader.result;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          console.log('Sharing is not available on this platform');
        }
        resolve(fileUri);
      } catch (err) {
        console.error('Error saving or sharing file:', err);
        reject(err);
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};
