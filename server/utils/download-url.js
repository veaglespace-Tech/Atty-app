const getDirectDownloadUrl = (url) => {
  if (!url || typeof url !== "string") return "-";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "-") return "-";

  if (trimmed.includes("ik.imagekit.io") || trimmed.includes("imagekit.io")) {
    if (trimmed.includes("ik-attachment")) return trimmed;
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}ik-attachment=true`;
  }

  if (trimmed.includes("cloudinary.com") && trimmed.includes("/upload/")) {
    if (trimmed.includes("fl_attachment")) return trimmed;
    return trimmed.replace("/upload/", "/upload/fl_attachment/");
  }

  if (trimmed.includes("/uploads/")) {
    if (trimmed.includes("download=true") || trimmed.includes("attachment=true")) return trimmed;
    const sep = trimmed.includes("?") ? "&" : "?";
    return `${trimmed}${sep}download=true`;
  }

  return trimmed;
};

module.exports = { getDirectDownloadUrl };
