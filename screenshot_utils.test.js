// Run with: node screenshot_utils.test.js
const assert = require("assert");
const { normalizeSelection, clampSelection, calculateCropRectangle } = require("./screenshot_utils.js");

// Drag top-left -> bottom-right
assert.deepStrictEqual(normalizeSelection(10, 20, 110, 220), { x: 10, y: 20, width: 100, height: 200 });
// Drag bottom-right -> top-left produces the same rectangle
assert.deepStrictEqual(normalizeSelection(110, 220, 10, 20), { x: 10, y: 20, width: 100, height: 200 });
// Zero-sized drag (a click)
assert.deepStrictEqual(normalizeSelection(50, 50, 50, 50), { x: 50, y: 50, width: 0, height: 0 });

// Fully inside the viewport is untouched
assert.deepStrictEqual(clampSelection({ x: 10, y: 10, width: 50, height: 50 }, 800, 600), { x: 10, y: 10, width: 50, height: 50 });
// Overflowing right/bottom edges is trimmed
assert.deepStrictEqual(clampSelection({ x: 700, y: 500, width: 300, height: 300 }, 800, 600), { x: 700, y: 500, width: 100, height: 100 });
// Negative origin (drag past the top-left edge) is pulled back
assert.deepStrictEqual(clampSelection({ x: -30, y: -20, width: 100, height: 100 }, 800, 600), { x: 0, y: 0, width: 100, height: 100 });
// Touching the edges exactly
assert.deepStrictEqual(clampSelection({ x: 0, y: 0, width: 800, height: 600 }, 800, 600), { x: 0, y: 0, width: 800, height: 600 });

const viewport = { viewportWidth: 800, viewportHeight: 600 };
// 1:1 screenshot
assert.deepStrictEqual(
  calculateCropRectangle({ x: 100, y: 50, width: 200, height: 100, ...viewport }, 800, 600),
  { x: 100, y: 50, width: 200, height: 100 }
);
// 2x device pixel ratio / zoom
assert.deepStrictEqual(
  calculateCropRectangle({ x: 100, y: 50, width: 200, height: 100, ...viewport }, 1600, 1200),
  { x: 200, y: 100, width: 400, height: 200 }
);
// Different horizontal and vertical scale factors
assert.deepStrictEqual(
  calculateCropRectangle({ x: 100, y: 50, width: 200, height: 100, ...viewport }, 1600, 900),
  { x: 200, y: 75, width: 400, height: 150 }
);
// Crop that would run past the image edge is clamped to the image
assert.deepStrictEqual(
  calculateCropRectangle({ x: 700, y: 550, width: 200, height: 200, ...viewport }, 800, 600),
  { x: 700, y: 550, width: 100, height: 50 }
);
// Zero-sized selection
assert.throws(() => calculateCropRectangle({ x: 10, y: 10, width: 0, height: 10, ...viewport }, 800, 600), /too small/);
// Selection entirely off the image
assert.throws(() => calculateCropRectangle({ x: 800, y: 10, width: 50, height: 50, ...viewport }, 800, 600), /too small/);
// Bogus viewport
assert.throws(() => calculateCropRectangle({ x: 0, y: 0, width: 10, height: 10, viewportWidth: 0, viewportHeight: 600 }, 800, 600), /Invalid viewport/);
// Empty screenshot
assert.throws(() => calculateCropRectangle({ x: 0, y: 0, width: 10, height: 10, ...viewport }, 0, 0), /empty/);

console.log("screenshot_utils: all tests passed");
