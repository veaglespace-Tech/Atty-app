export const getCurrentCoordinates = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([
          Number(position.coords.longitude.toFixed(6)),
          Number(position.coords.latitude.toFixed(6)),
        ]);
      },
      () => reject(new Error("Location permission is required for attendance")),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
