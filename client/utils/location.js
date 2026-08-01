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
    return error?.message || GEOLOCATION_UNAVAILABLE_MESSAGE;
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

const requestBestPosition = (options, maxWaitTime = 7000) =>
  new Promise((resolve, reject) => {
    let bestPosition = null;
    let watchId = null;
    let timeoutId = null;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };

    timeoutId = setTimeout(() => {
      cleanup();
      if (bestPosition) {
        // We reject if the best accuracy we found is still worse than 50 meters
        if (bestPosition.coords.accuracy > 50) {
          reject(new Error(`Location accuracy is too low (${Math.round(bestPosition.coords.accuracy)}m). Please step outside or near a window for better GPS signal.`));
        } else {
          resolve(bestPosition);
        }
      } else {
        reject(new Error(GEOLOCATION_TIMEOUT_MESSAGE));
      }
    }, maxWaitTime);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        // Early exit if accuracy is very good (<= 20m)
        if (bestPosition.coords.accuracy <= 20) {
          cleanup();
          resolve(bestPosition);
        }
      },
      (error) => {
        // If permission denied (code 1) or we have no position, reject immediately
        if (error.code === 1 || !bestPosition) {
            cleanup();
            reject(error);
        }
      },
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

  try {
    const position = await requestBestPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Force fresh location, don't use cache
    });
    return coordinatesFromPosition(position);
  } catch (error) {
    // If it's a custom error (like low accuracy string), throw it directly
    if (error.message && error.message.includes("Location accuracy is too low")) {
      throw error;
    }
    throw new Error(mapGeolocationError(error));
  }
};
