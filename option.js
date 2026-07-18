// Load existing key when the options page opens
chrome.storage.local.get("geminiKey", (data) => {
  if (data.geminiKey) {
    document.getElementById('apiKey').value = data.geminiKey;
  }
});

// Save new key when the button is clicked
document.getElementById('save').addEventListener('click', () => {
  const key = document.getElementById('apiKey').value.trim();
  chrome.storage.local.set({ geminiKey: key }, () => {
    alert('API Key Saved Successfully!');
  });
});