import React, { useEffect, useRef, useState } from "react";
import { Provider, useSelector } from "react-redux";
import { store } from "@/store";
import { hydrateFromStorage, loadPersistedSession } from "@/store/slices/authSlice";
import { registerForPushNotificationsAsync, sendPushTokenToServer } from "@/services/notifications";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Helper component that can access Redux state
function NotificationSetup({ children }) {
  const token = useSelector((state) => state.auth.token);
  const responseListener = useRef();

  useEffect(() => {
    // Only register push token if the user is authenticated
    if (token) {
      registerForPushNotificationsAsync().then((pushToken) => {
        if (pushToken) {
          sendPushTokenToServer(pushToken);
        }
      });
    }
  }, [token]);

  useEffect(() => {
    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.postId) {
        // Navigate to the post or notifications tab when clicked
        // Example: router.push(`/member/notifications`);
        console.log("Notification clicked with data:", data);
      }
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return children;
}

export function StoreProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    // Load async storage for React Native
    loadPersistedSession().then((payload) => {
      store.dispatch(hydrateFromStorage(payload));
      setHydrated(true);
    });
  }, []);

  if (!hydrated) {
    // Optionally return a loading splash screen here while Redux loads
    return null;
  }

  return (
    <Provider store={store}>
      <NotificationSetup>
        {children}
      </NotificationSetup>
    </Provider>
  );
}
