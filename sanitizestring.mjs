export function sanitizeString(input, replacement = "_") {
  // Define invalid characters for filenames on most filesystems
  const invalidChars = /[<>:"\/\\|?*\x00-\x1F]/g;

  // Replace invalid characters with the specified replacement
  let sanitized = input.replace(invalidChars, replacement);

  // Trim leading and trailing spaces or dots
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, "");

  // Limit the length (optional, e.g., 255 for most filesystems)
  const maxLength = 255; // Common filename length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}
