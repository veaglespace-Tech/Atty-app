const sanitizeText = (value, maxLength = 80) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

const sanitizeCode = (value, maxLength = 40) => {
  if (typeof value !== "string") return "";
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, maxLength);
};

const sanitizeFormat = (value, fallback = "NEW2") => {
  const normalized = String(value || fallback)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);
  return normalized || fallback;
};

const parseCoordinates = (rawCoordinates) => {
  let longitude;
  let latitude;

  if (Array.isArray(rawCoordinates) && rawCoordinates.length === 2) {
    longitude = Number(rawCoordinates[0]);
    latitude = Number(rawCoordinates[1]);
  } else if (rawCoordinates && typeof rawCoordinates === "object") {
    longitude = Number(rawCoordinates.longitude ?? rawCoordinates.lng ?? rawCoordinates.lon);
    latitude = Number(rawCoordinates.latitude ?? rawCoordinates.lat);
  } else {
    return null;
  }

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return null;
  }

  return [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))];
};

const resolveLocationPayload = (body = {}) => {
  const locationObject =
    body.location && typeof body.location === "object" ? body.location : null;

  const coordinatesFromStructured = locationObject
    ? parseCoordinates(locationObject.coordinates || locationObject)
    : null;
  const coordinatesFromLegacy = parseCoordinates(body.userLocation);
  const coordinates = coordinatesFromStructured || coordinatesFromLegacy;

  if (!coordinates) {
    return null;
  }

  const meta = locationObject
    ? {
        inputFormat: sanitizeFormat(locationObject.inputFormat, "NEW2"),
        mode: sanitizeCode(locationObject.mode || "AUTO", 20) || "AUTO",
        source: sanitizeCode(locationObject.source || "APP", 30) || "APP",
        areaKey: sanitizeCode(locationObject.areaKey),
        areaLabel: sanitizeText(locationObject.areaLabel),
        displayText:
          sanitizeText(locationObject.displayText, 120) ||
          `Lat: ${coordinates[1].toFixed(5)}, Lng: ${coordinates[0].toFixed(5)}`,
      }
    : {
        inputFormat: "LEGACY_ARRAY",
        mode: "AUTO",
        source: "LEGACY_ARRAY",
        areaKey: "",
        areaLabel: "",
        displayText: `Lat: ${coordinates[1].toFixed(5)}, Lng: ${coordinates[0].toFixed(5)}`,
      };

  return { coordinates, meta };
};

const normalizeCoordinatesInput = (payload = {}) => {
  if (Array.isArray(payload)) return parseCoordinates(payload);
  if (Array.isArray(payload.coordinates)) return parseCoordinates(payload.coordinates);
  if (payload && typeof payload === "object") return parseCoordinates(payload);
  return null;
};

module.exports = {
  parseCoordinates,
  resolveLocationPayload,
  normalizeCoordinatesInput,
};

