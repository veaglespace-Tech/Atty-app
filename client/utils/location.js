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
    hostname === "[::1]" ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)
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

const requestCurrentPosition = (options) =>
  new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 150) {
          reject(new Error(`Location accuracy is too low (${Math.round(position.coords.accuracy)}m). Please turn on GPS and go near a window or outside.`));
        } else {
          resolve(position);
        }
      },
      reject,
      options
    );
  });

const coordinatesFromPosition = (position) => [
  Number(position.coords.longitude.toFixed(6)),
  Number(position.coords.latitude.toFixed(6)),
];

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

  try {
    const position = await requestCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
    });
    return coordinatesFromPosition(position);
  } catch (error) {
    throw new Error(mapGeolocationError(error));
  }
};
