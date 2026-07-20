// Snipping-tool style region capture. Runs in the service worker; the drag
// overlay is injected into the active tab and resolves with CSS-pixel
// viewport coordinates that are then cropped out of captureVisibleTab().
//
// Requires screenshot_utils.js (importScripts'd by background.js).

/**
 * @typedef {import("./screenshot_utils.js")} _Geometry
 * @typedef {{ x:number, y:number, width:number, height:number, viewportWidth:number, viewportHeight:number }} ScreenshotSelection
 * @typedef {{ blob: Blob, dataUrl: string, width: number, height: number }} ScreenshotCaptureResult
 */

class ScreenshotSelectionCancelledError extends Error {
  constructor() {
    super("Screenshot selection was cancelled.");
    this.name = "ScreenshotSelectionCancelledError";
  }
}

const RESTRICTED_PAGE_MESSAGE =
  "This page cannot be captured by the extension. Open the question on a normal webpage and try again.";

const RESTRICTED_SCHEME = /^(chrome|chrome-extension|edge|about|devtools|view-source|moz-extension|file):/i;
const RESTRICTED_HOST = /^https?:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i;

function isRestrictedUrl(url) {
  if (!url) return false; // activeTab may withhold the URL; injection failure covers it
  return RESTRICTED_SCHEME.test(url) || RESTRICTED_HOST.test(url);
}

/**
 * Full flow: pick a region in the active tab and return it as a cropped PNG.
 * @returns {Promise<ScreenshotCaptureResult>}
 */
async function captureSelectedRegion() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab is available to capture.");
  }
  if (isRestrictedUrl(tab.url)) {
    throw new Error(RESTRICTED_PAGE_MESSAGE);
  }

  const tabId = tab.id;
  const windowId = tab.windowId;
  const originalUrl = tab.url;

  const selection = await runOverlay(tabId);
  if (!selection) throw new ScreenshotSelectionCancelledError();

  await assertTabStillCurrent(tabId, windowId, originalUrl);

  let screenshotDataUrl;
  try {
    screenshotDataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
  } catch (error) {
    throw new Error("Could not capture this tab. Make sure it is visible and try again.");
  }
  if (!screenshotDataUrl) throw new Error("Could not capture this tab. Make sure it is visible and try again.");

  return cropDataUrl(screenshotDataUrl, selection);
}

/**
 * Inject the geometry helpers plus the overlay, and await the user's choice.
 * @returns {Promise<ScreenshotSelection|null>} null when cancelled
 */
async function runOverlay(tabId) {
  let frames;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["screenshot_utils.js"] });
    frames = await chrome.scripting.executeScript({ target: { tabId }, func: selectionOverlay });
  } catch (error) {
    throw new Error(RESTRICTED_PAGE_MESSAGE);
  }

  const result = frames && frames[0] ? frames[0].result : undefined;
  if (result === undefined) throw new Error(RESTRICTED_PAGE_MESSAGE);
  return result;
}

async function assertTabStillCurrent(tabId, windowId, originalUrl) {
  const [current] = await chrome.tabs.query({ active: true, currentWindow: true });
  const sameTab = current && current.id === tabId && current.windowId === windowId;
  const samePage = !current || !current.url || !originalUrl || current.url === originalUrl;
  if (!sameTab || !samePage) {
    throw new ScreenshotSelectionCancelledError();
  }
}

/* ------------------------------------------------------------------ */
/* Image processing (service worker: OffscreenCanvas, no FileReader)   */
/* ------------------------------------------------------------------ */

/**
 * @param {string} dataUrl
 * @param {ScreenshotSelection} selection
 * @returns {Promise<ScreenshotCaptureResult>}
 */
async function cropDataUrl(dataUrl, selection) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(dataUrlToBlob(dataUrl));
  } catch (error) {
    throw new Error("The screenshot could not be decoded.");
  }

  try {
    const crop = globalThis.__aicheckerGeometry.calculateCropRectangle(selection, bitmap.width, bitmap.height);
    const canvas = new OffscreenCanvas(crop.width, crop.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The browser refused to create a drawing canvas.");

    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

    // PNG keeps text crisp for OCR.
    const blob = await canvas.convertToBlob({ type: "image/png" });
    return {
      blob,
      dataUrl: await blobToDataUrl(blob),
      width: crop.width,
      height: crop.height
    };
  } finally {
    bitmap.close();
  }
}

function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("The screenshot could not be decoded.");
  const mime = /:(.*?);/.exec(dataUrl.slice(0, comma));
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime ? mime[1] : "image/png" });
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000; // fromCharCode blows the stack on big spreads
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

/* ------------------------------------------------------------------ */
/* Injected overlay — runs in the page, must be fully self-contained   */
/* ------------------------------------------------------------------ */

/**
 * @returns {Promise<ScreenshotSelection|null>}
 */
function selectionOverlay() {
  const HOST_ID = "aichecker-screenshot-overlay";
  const MIN_SIZE = 20;
  const geometry = globalThis.__aicheckerGeometry;

  if (document.getElementById(HOST_ID) || !geometry) return null;

  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .root {
        position: fixed; inset: 0; z-index: 2147483647;
        cursor: crosshair; user-select: none; -webkit-user-select: none;
        font: 13px/1.4 system-ui, sans-serif;
      }
      .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.45); }
      .rect {
        position: absolute; display: none; border: 1px solid #89b4fa;
        box-shadow: 0 0 0 100vmax rgba(0,0,0,0.45);
      }
      .size {
        position: absolute; display: none; padding: 2px 6px; border-radius: 4px;
        background: #181825; color: #cdd6f4; white-space: nowrap;
      }
      .toolbar {
        position: absolute; display: none; gap: 6px; padding: 6px;
        border-radius: 6px; background: #1e1e2e; border: 1px solid #45475a;
        box-shadow: 0 6px 20px rgba(0,0,0,0.5); cursor: default;
      }
      .toolbar button {
        padding: 4px 10px; border-radius: 4px; border: 1px solid #45475a;
        background: #313244; color: #cdd6f4; font: inherit; cursor: pointer;
      }
      .toolbar button.primary { background: #89b4fa; color: #11111b; border-color: #89b4fa; }
      .toolbar button:focus-visible { outline: 2px solid #f9e2af; outline-offset: 2px; }
      .hint {
        position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
        padding: 6px 12px; border-radius: 6px; background: #1e1e2e;
        color: #cdd6f4; border: 1px solid #45475a;
      }
    `;

    const root = document.createElement("div");
    root.className = "root";
    root.setAttribute("role", "application");
    root.setAttribute("aria-label", "Screenshot region selection");

    const backdrop = document.createElement("div");
    backdrop.className = "backdrop";

    const rect = document.createElement("div");
    rect.className = "rect";

    const sizeLabel = document.createElement("div");
    sizeLabel.className = "size";
    sizeLabel.setAttribute("aria-live", "polite");

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Drag around the question · Enter to capture · Esc to cancel";

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";

    const captureBtn = document.createElement("button");
    captureBtn.type = "button";
    captureBtn.className = "primary";
    captureBtn.textContent = "Capture";
    captureBtn.setAttribute("aria-label", "Capture the selected region");

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    cancelBtn.setAttribute("aria-label", "Cancel screenshot selection");

    toolbar.append(captureBtn, cancelBtn);
    root.append(backdrop, rect, sizeLabel, toolbar, hint);
    shadow.append(style, root);

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.documentElement.appendChild(host);

    /** @type {{x:number,y:number,width:number,height:number}|null} */
    let selection = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;
    let settled = false;

    const viewportWidth = () => document.documentElement.clientWidth;
    const viewportHeight = () => document.documentElement.clientHeight;

    function paint() {
      if (!selection) return;
      backdrop.style.display = "none";
      rect.style.display = "block";
      rect.style.left = `${selection.x}px`;
      rect.style.top = `${selection.y}px`;
      rect.style.width = `${selection.width}px`;
      rect.style.height = `${selection.height}px`;

      sizeLabel.style.display = "block";
      sizeLabel.textContent = `${Math.round(selection.width)} × ${Math.round(selection.height)}`;
      sizeLabel.style.left = `${selection.x}px`;
      sizeLabel.style.top = `${Math.max(0, selection.y - 24)}px`;
    }

    function showToolbar() {
      if (!selection) return;
      toolbar.style.display = "flex";
      const top = selection.y + selection.height + 8;
      toolbar.style.left = `${Math.min(selection.x, viewportWidth() - 160)}px`;
      toolbar.style.top = `${Math.min(top, viewportHeight() - 44)}px`;
      captureBtn.focus();
    }

    function cleanup() {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown, true);
      host.remove();
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    }

    function finish(value) {
      if (settled) return;
      settled = true;
      cleanup();
      // Let the browser repaint without the overlay before the capture happens.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(value)));
    }

    function confirmSelection() {
      if (!selection || selection.width < MIN_SIZE || selection.height < MIN_SIZE) return;
      finish({
        x: selection.x,
        y: selection.y,
        width: selection.width,
        height: selection.height,
        viewportWidth: viewportWidth(),
        viewportHeight: viewportHeight()
      });
    }

    function onPointerDown(event) {
      // Must run before preventDefault(), which would swallow the button's click.
      if (toolbar.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      dragging = true;
      selection = null;
      toolbar.style.display = "none";
      backdrop.style.display = "block";
      rect.style.display = "none";
      sizeLabel.style.display = "none";
      startX = event.clientX;
      startY = event.clientY;
      root.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragging) return;
      event.preventDefault();
      selection = geometry.clampSelection(
        geometry.normalizeSelection(startX, startY, event.clientX, event.clientY),
        viewportWidth(),
        viewportHeight()
      );
      paint();
    }

    function onPointerUp(event) {
      if (!dragging) return;
      dragging = false;
      event.preventDefault();
      event.stopPropagation();
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
      if (!selection || selection.width < MIN_SIZE || selection.height < MIN_SIZE) {
        selection = null;
        backdrop.style.display = "block";
        rect.style.display = "none";
        sizeLabel.style.display = "none";
        return;
      }
      showToolbar();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(null);
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        confirmSelection();
      }
    }

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("click", (event) => {
      if (!toolbar.contains(event.target)) event.stopPropagation();
    }, true);
    window.addEventListener("keydown", onKeyDown, true);
    captureBtn.addEventListener("click", confirmSelection);
    cancelBtn.addEventListener("click", () => finish(null));
  });
}
