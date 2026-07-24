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
        // Find the current user role to navigate to the correct tab
        const state = store.getState();
        const role = state.auth?.user?.currentRole;
        
        let basePath = '/member';
        if (role === 'SUPER_ADMIN') basePath = '/super-admin';
        else if (role === 'ORG_ADMIN') basePath = '/org';
        else if (role === 'TEAM_LEADER') basePath = '/team-leader';
        
        // Navigate to the notifications tab when clicked
        router.push(`${basePath}/notifications`);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
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
