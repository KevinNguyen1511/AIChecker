// Pure geometry helpers for screenshot selection.
// Loaded three ways: importScripts() in the service worker, chrome.scripting
// injection into the page, and require() from screenshot_utils.test.js.

/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 * @typedef {Rect & { viewportWidth: number, viewportHeight: number }} ScreenshotSelection
 */

/**
 * Turn two drag corners into a positive-sized rectangle (drag in any direction).
 * @returns {Rect}
 */
function normalizeSelection(startX, startY, endX, endY) {
  return {
    x: Math.min(startX, endX),
    y: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY)
  };
}

/**
 * Keep a rectangle inside the viewport, shrinking it if it overflows.
 * @param {Rect} rect
 * @returns {Rect}
 */
function clampSelection(rect, viewportWidth, viewportHeight) {
  const x = Math.max(0, Math.min(rect.x, viewportWidth));
  const y = Math.max(0, Math.min(rect.y, viewportHeight));
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width, viewportWidth - x)),
    height: Math.max(0, Math.min(rect.height, viewportHeight - y))
  };
}

/**
 * Map a CSS-pixel selection onto the captured image.
 * The image is not 1:1 with CSS pixels — browser zoom, display scaling and
 * devicePixelRatio all shift the ratio — so derive the scale from the actual
 * screenshot size instead of assuming devicePixelRatio.
 * @param {ScreenshotSelection} selection
 * @returns {Rect}
 */
function calculateCropRectangle(selection, screenshotWidth, screenshotHeight) {
  if (selection.viewportWidth <= 0 || selection.viewportHeight <= 0) {
    throw new Error("Invalid viewport size reported by the page.");
  }
  if (screenshotWidth <= 0 || screenshotHeight <= 0) {
    throw new Error("The captured screenshot is empty.");
  }

  const scaleX = screenshotWidth / selection.viewportWidth;
  const scaleY = screenshotHeight / selection.viewportHeight;

  const x = Math.min(Math.max(Math.round(selection.x * scaleX), 0), screenshotWidth);
  const y = Math.min(Math.max(Math.round(selection.y * scaleY), 0), screenshotHeight);
  const width = Math.min(Math.max(Math.round(selection.width * scaleX), 0), screenshotWidth - x);
  const height = Math.min(Math.max(Math.round(selection.height * scaleY), 0), screenshotHeight - y);

  if (width <= 0 || height <= 0) {
    throw new Error("The selected area is too small to capture.");
  }
  return { x, y, width, height };
}

// Namespace so the injected overlay can find these in the isolated world.
globalThis.__aicheckerGeometry = {
  normalizeSelection,
  clampSelection,
  calculateCropRectangle
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.__aicheckerGeometry;
}
