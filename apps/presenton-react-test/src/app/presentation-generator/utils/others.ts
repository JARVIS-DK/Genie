// ✅ Returns proper icon based on file extension
export const getIconFromFile = (file: string = ""): string => {
  const ext = file.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "pdf":
      return "/pdf.svg";
    case "docx":
      return "/report.png";
    case "pptx":
      return "/ppt.svg";
    default:
      return "/report.png";
  }
};

// ✅ Detects if a hex color is dark based on luminance
export function isDarkColor(hex: string): boolean {
  if (!hex) return false;

  // Remove "#" and normalize shorthand colors (#abc → aabbcc)
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.replace(/./g, (char) => char + char);
  }

  if (hex.length !== 6) return false;

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 128;
}

// ✅ Removes an appended UUID from filenames (only when UUID exists)
export function removeUUID(fileName: string): string {
  if (!fileName) return "";

  const extIndex = fileName.lastIndexOf(".");
  if (extIndex === -1) return fileName;

  // Look for "-<uuid>" before extension (UUID 36 chars + 1 dash)
  const nameWithoutExt = fileName.slice(0, extIndex);
  const ext = fileName.slice(extIndex);

  const uuidPattern = /-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidPattern.test(nameWithoutExt)) {
    return nameWithoutExt.replace(uuidPattern, "") + ext;
  }

  return fileName;
}

// ✅ Secure filename sanitizer (no traversal, no reserved names, safe for Windows/Linux/Mac)
export function sanitizeFilename(
  input: string | null | undefined,
  replacement = ""
): string {
  let sanitized = (input ?? "").toString().replace(/\0/g, ""); // remove null bytes

  // Remove direct traversal attempts
  sanitized = sanitized.replace(/\.\./g, replacement);

  const illegalRe = /[\?<>\\:\*\|"]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
  const windowsTrailingRe = /[\. ]+$/;

  // Clean each path segment safely
  sanitized = sanitized
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .split("/")
    .map((segment) =>
      segment
        .replace(reservedRe, replacement)
        .replace(windowsReservedRe, replacement)
        .replace(windowsTrailingRe, replacement)
        .replace(/\.\./g, replacement)
    )
    .join("/");

  sanitized = sanitized.replace(/\/+/g, "/"); // collapse repeated slashes

  if (sanitized.length === 0) return "file";

  return sanitized;
}

// ✅ Builds a static URL like: /static/user/file.png
export function getStaticFileUrl(filepath: string): string {
  if (!filepath) return "/static";

  const segments = filepath.split("/");
  // removing first 2 segments: /user_uploads/... → ... or /storage/test → test
  const cleaned = segments.slice(2).join("/");

  return `/static/${cleaned}`;
}
