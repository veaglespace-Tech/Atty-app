const GEOLOCATION_UNSUPPORTED_MESSAGE =
  "Geolocation is not supported in this browser.";
const GEOLOCATION_INSECURE_MESSAGE =
  "Current location works only on localhost or HTTPS. Open this page securely and try again.";
const GEOLOCATION_DENIED_MESSAGE =
  "Location access is blocked for this site. Allow it in browser settings and try again.";
const GEOLOCATION_UNAVAILABLE_MESSAGE =
  "Current location is unavailable right now. Check GPS and internet, then try again.";
const GEOLOCATION_TIMEOUT_MESSAGE =
  "Location request timed out. Turn on GPS and try again.";

const isSecureLocationContext = () => {
  if (typeof window === "undefined") return false;

  const hostname = window.location?.hostname || "";
  return (
    window.isSecureContext ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
};

const mapGeolocationError = (error) => {
  if (!error || typeof error.code !== "number") {
    return GEOLOCATION_UNAVAILABLE_MESSAGE;
  }

  switch (error.code) {
    case 1:
      return GEOLOCATION_DENIED_MESSAGE;
    case 2:
      return GEOLOCATION_UNAVAILABLE_MESSAGE;
    case 3:
      return GEOLOCATION_TIMEOUT_MESSAGE;
    default:
      return GEOLOCATION_UNAVAILABLE_MESSAGE;
  }
};

export const getGeolocationPermissionState = async () => {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return "unsupported";
  }

  if (!isSecureLocationContext()) {
    return "insecure";
  }

  if (!navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const permissionStatus = await navigator.permissions.query({
      name: "geolocation",
    });
    return permissionStatus.state;
  } catch (_) {
    return "unknown";
  }
};

export const getCurrentCoordinates = async () => {
  if (typeof window === "undefined" || !navigator.geolocation) {
    throw new Error(GEOLOCATION_UNSUPPORTED_MESSAGE);
  }

  if (!isSecureLocationContext()) {
    throw new Error(GEOLOCATION_INSECURE_MESSAGE);
  }

  const permissionState = await getGeolocationPermissionState();
  if (permissionState === "denied") {
    throw new Error(GEOLOCATION_DENIED_MESSAGE);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([
          Number(position.coords.longitude.toFixed(6)),
          Number(position.coords.latitude.toFixed(6)),
        ]);
      },
      (error) => reject(new Error(mapGeolocationError(error))),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};
