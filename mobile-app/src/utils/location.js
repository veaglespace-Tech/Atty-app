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

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    // Return format [longitude, latitude] to match the backend expectation
    return [
      Number(location.coords.longitude.toFixed(6)),
      Number(location.coords.latitude.toFixed(6)),
    ];
  } catch (error) {
    throw new Error(GEOLOCATION_UNAVAILABLE_MESSAGE);
  }
};
