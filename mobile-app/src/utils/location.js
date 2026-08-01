import * as Location from "expo-location";

const GEOLOCATION_UNSUPPORTED_MESSAGE = "Geolocation is not supported on this device.";
const GEOLOCATION_DENIED_MESSAGE = "Location access is blocked. Allow it in settings and try again.";
const GEOLOCATION_UNAVAILABLE_MESSAGE = "Current location is unavailable right now. Check GPS and try again.";

export const getGeolocationPermissionState = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status;
  } catch (_) {
    return "unknown";
  }
};

export const getCurrentCoordinates = async () => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(GEOLOCATION_DENIED_MESSAGE);
  }

  return new Promise((resolve, reject) => {
    let locationSubscription = null;
    let bestLocation = null;
    let timeoutId = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (locationSubscription) {
        locationSubscription.remove();
        locationSubscription = null;
      }
    };

    const startLocationCollection = async () => {
      try {
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (location) => {
            // Keep the reading with the best (lowest) accuracy value
            if (!bestLocation || location.coords.accuracy < bestLocation.coords.accuracy) {
              bestLocation = location;
            }

            // Early exit if we get a highly accurate reading (< 12 meters)
            if (bestLocation && bestLocation.coords.accuracy <= 12) {
              cleanup();
              resolve([
                Number(bestLocation.coords.longitude.toFixed(6)),
                Number(bestLocation.coords.latitude.toFixed(6)),
              ]);
            }
          }
        );

        // Collect readings for 6 seconds, then pick the best one
        timeoutId = setTimeout(() => {
          cleanup();
          if (bestLocation) {
            // If the best accuracy we could get is still very poor (> 35 meters)
            if (bestLocation.coords.accuracy > 35) {
              reject(new Error("Location signal is weak. Please move to an open area or closer to a window and try again."));
            } else {
              resolve([
                Number(bestLocation.coords.longitude.toFixed(6)),
                Number(bestLocation.coords.latitude.toFixed(6)),
              ]);
            }
          } else {
            // Fallback if no locations were yielded in 6 seconds
            Location.getLastKnownPositionAsync().then(lastKnown => {
              if (lastKnown && lastKnown.coords.accuracy <= 40) {
                resolve([
                  Number(lastKnown.coords.longitude.toFixed(6)),
                  Number(lastKnown.coords.latitude.toFixed(6)),
                ]);
              } else {
                reject(new Error(GEOLOCATION_UNAVAILABLE_MESSAGE));
              }
            }).catch(() => reject(new Error(GEOLOCATION_UNAVAILABLE_MESSAGE)));
          }
        }, 6000);
      } catch (error) {
        cleanup();
        reject(new Error(GEOLOCATION_UNAVAILABLE_MESSAGE));
      }
    };

    startLocationCollection();
  });
};
