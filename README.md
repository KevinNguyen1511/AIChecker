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

🛠️ Step-by-Step Installation & Setup Guide
Follow these exact steps to download the extension from GitHub, load it into your browser, and securely attach your free API key.

Step 1: Download and Unpack from GitHub
Go to the repository page on GitHub.

Click the green Code button located near the top right of the file explorer.

Select Download ZIP from the dropdown menu.

Locate the downloaded file (usually named AIChecker-main.zip) in your computer's Downloads folder.

Extract/Unpack the ZIP file:

Windows: Right-click the ZIP file, select Extract All..., and then click Extract.

Mac: Double-click the ZIP file to automatically unpack it into a regular folder.

Step 2: Upload the Folder to Google Chrome
Open Google Chrome.

In the URL address bar, type chrome://extensions/ and press Enter.

In the top-right corner of the Extensions page, toggle the Developer mode switch to ON.

In the top-left corner, click the Load unpacked button.

Select the newly extracted folder (make sure you select the inner folder that contains manifest.json, background.js, etc.).

Click Select Folder (or Open). The extension card will now appear in your active list!

Step 3: Get Your Free Gemini API Key
Go to Google AI Studio.

Sign in using your standard Google/Gmail account.

Click the prominent Get API Key or Create API Key button.

If prompted, agree to the terms of service for the free tier.

Click Create API Key in new project.

Copy the long string of characters provided (it will start with AIzaSy...). Keep this safe and do not share it.

Step 4: Paste the Key into Your Extension Options
In the top-right corner of your Chrome browser window, click the Extensions puzzle piece icon.

Find Gemini Quiz Assistant in the list.

Click the three vertical dots next to it, and select Options. (Alternatively, click Details on the extension's card under chrome://extensions/, scroll down, and click Extension options).

A settings page will open in a new tab. Paste your copied AIzaSy... key directly into the input text box.

Click the Save Key button.

A popup notification will state "API Key Saved Successfully!". Click OK.

🎯 How To Use
Navigate to any website or quiz portal (if the page was already open, hit Refresh so the script can load into the page).

Highlight a question or prompt with your mouse cursor.

Either press Alt + S on your keyboard OR right-click the text and select "Solve with Gemini".

The floating assistant window will pop up with your answer! Click the header bar of the popup to drag it around your screen out of the way, or click the ✕ to dismiss it.

🔒 Security & Git Best Practices
This extension uses an Options Page Pattern. Your private key is saved directly inside your local Chrome profile storage. Because of this:

You never type your API key into any of the text files in this project folder.

You can push this repository directly to GitHub (public or private) without changing the code. Anyone else cloning your code will simply need to add their own AI Studio API key via their extension options menu to make it work.