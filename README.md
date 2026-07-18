# AIChecker# ⚡ Gemini Quiz Assistant

A lightweight, secure Google Chrome extension powered by the free **Gemini 2.5 Flash API** from Google AI Studio. This extension allows you to instantly extract, solve, and explain highlighted quiz questions on any webpage via a right-click context menu or a quick keyboard shortcut.

---

## ✨ Features

*   **Dual Activation Modes:**
    *   **Keyboard Shortcut:** Highlight a question and press `Alt + S` (or `Option + S` on Mac) to instantly process it.
    *   **Context Menu:** Highlight text, right-click, and select **"Solve with Gemini"**.
*   **Draggable Popup UI:** Answers appear in an isolated, elegant, modern dark-themed popup card that you can click and drag anywhere on your screen.
*   **Tailored Quiz Behavior:** Hardcoded system instructions ensure Gemini provides rapid, highly concise answers. For multiple-choice questions, it immediately returns the correct choice/letter with a maximum of a one-sentence explanation.
*   **Zero-Leak Security Architecture:** Built following Manifest V3 security standards. Your API key is stored locally inside your browser's sandboxed storage (`chrome.storage.local`). No secrets are ever hardcoded in the source files, making it **100% safe to upload to a public GitHub repository**.

---

## 📂 Project Directory Structure

```text
AIChecker-main/
├── manifest.json       # Extension configuration, permissions, and keyboard commands
├── background.js      # Core background script handling API communication and shortcuts
├── content.js         # Isolated script injected into pages to manage text capture and the draggable UI
├── options.html       # The configuration screen interface for setting your API key
└── options.js         # Secure backend script to save the API key without inline-script violations