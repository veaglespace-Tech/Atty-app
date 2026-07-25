import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api/baseApi';
import { store } from '@/store';

// Set global notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token! Permission denied by Android.');
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get the Expo Push Token using project ID from app config
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "d782f29a-35b0-49b7-9d97-eedd9d486a98";
      
    if (!projectId) {
      alert('Error: Project ID not found!');
      console.log('Project ID not found. Ensure app.json has an eas.projectId');
      return;
    }

    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      // alert('Success! Token generated: ' + token.substring(0, 15) + '...');
    } catch (e) {
      alert('Expo Push Token Error: ' + e.message);
      console.error('Error fetching push token:', e);
    }
  } else {
    alert('Must use physical device for Push Notifications');
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushTokenToServer(pushToken) {
  try {
    const token = await AsyncStorage.getItem('token');
    
    // In some environments, we might want to check if the token changed
    // before sending it to save server requests, but for now we just send it
    const res = await fetch(`${API_BASE_URL}/auth/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pushToken }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert('Failed to save token to server: ' + res.status + ' ' + text);
    } else {
      alert('SUCCESS! Token saved to Live Server!');
    }
  } catch (error) {
    alert('Network Error saving token: ' + error.message);
    console.error('Failed to send push token to server:', error);
  }
}
