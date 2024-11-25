/**
 * Escapes special characters in text for use in FFmpeg's drawtext filter.
 * @param {string} text - The text to be escaped.
 * @returns {string} - The escaped text.
 */
export function escapeFFmpegText(text) {
  if (!text) return "";

  // Escape backslashes and colons
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/:/g, "\\:") // Escape colons
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\[/g, "\\[") // Escape square brackets
    .replace(/\]/g, "\\]") // Escape square brackets
    .replace(/%/g, "\\%"); // Escape percentage signs
}
