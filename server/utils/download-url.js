const getDirectDownloadUrl = (url, options = {}) => {
  if (!url || typeof url !== "string") return "-";
  let trimmed = url.trim();
  if (!trimmed || trimmed === "-") return "-";

  // Force JPG format for ImageKit
  if (options.forceJpg && (trimmed.includes("ik.imagekit.io") || trimmed.includes("imagekit.io"))) {
    const sep = trimmed.includes("?") ? "&" : "?";
    trimmed = `${trimmed}${sep}tr=f-jpg`;
  }

  // Force JPG format for Cloudinary
  if (options.forceJpg && trimmed.includes("cloudinary.com") && trimmed.includes("/upload/")) {
    trimmed = trimmed.replace("/upload/", "/upload/f_jpg/");
  }

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
