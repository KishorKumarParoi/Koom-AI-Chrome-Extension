const recordTab = document.querySelector("#tab");
const recordScreen = document.querySelector("#screen");
const screenshot = document.getElementById("screenshot");
const webcamToggle = document.getElementById("webcamToggle");
const webcamStatus = document.getElementById("webcamStatus");

let webcamEnabled = true;

// ========================================
// URL VALIDATION
// ========================================

const isRestrictedUrl = (url) => {
  if (!url) return true;

  const restrictedPrefixes = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "about:",
    "view-source:",
    "data:",
    "javascript:",
    "file://",
    "chrome-search://",
    "chrome-devtools://",
  ];

  return restrictedPrefixes.some((prefix) => url.startsWith(prefix));
};

const checkCurrentTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) {
    return { valid: false, url: null };
  }

  const tab = tabs[0];
  const url = tab.url;

  if (isRestrictedUrl(url)) {
    return { valid: false, url };
  }

  return { valid: true, url };
};

const showError = (message) => {
  // Create error overlay
  const errorDiv = document.createElement("div");
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(244, 67, 54, 0.95);
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    text-align: center;
    max-width: 250px;
  `;
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);

  // Remove after 3 seconds
  setTimeout(() => {
    errorDiv.style.opacity = "0";
    errorDiv.style.transition = "opacity 0.3s";
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
};

// ========================================
// WEBCAM TOGGLE FUNCTIONALITY
// ========================================

const updateWebcamUI = (enabled) => {
  const statusEl = document.getElementById("webcamStatus");

  if (enabled) {
    webcamToggle.classList.add("active");
    statusEl.textContent = "ON";
    statusEl.style.color = "#4CAF50";
  } else {
    webcamToggle.classList.remove("active");
    statusEl.textContent = "OFF";
    statusEl.style.color = "#ff6b6b";
  }
  console.log("🎥 Webcam UI updated:", enabled ? "ON" : "OFF");
};

const loadWebcamState = async () => {
  try {
    const result = await chrome.storage.local.get(["webcamEnabled"]);
    webcamEnabled =
      result.webcamEnabled !== undefined ? result.webcamEnabled : true;

    console.log("📷 Webcam state loaded:", webcamEnabled);
    updateWebcamUI(webcamEnabled);
  } catch (error) {
    console.error("❌ Error loading webcam state:", error);
    webcamEnabled = true;
    updateWebcamUI(true);
  }
};

const setupWebcamToggle = () => {
  if (!webcamToggle) {
    console.error("❌ Webcam toggle element not found");
    return;
  }

  webcamToggle.addEventListener("click", async () => {
    // Toggle the state
    webcamEnabled = !webcamEnabled;

    console.log("📷 Webcam toggle clicked, new state:", webcamEnabled);

    // Update UI
    updateWebcamUI(webcamEnabled);

    // Save to chrome storage
    try {
      await chrome.storage.local.set({ webcamEnabled });
      console.log("✅ Webcam preference saved:", webcamEnabled);
    } catch (error) {
      console.error("❌ Error saving webcam preference:", error);
    }
  });

  console.log("✅ Webcam toggle listener attached");
};

// ========================================
// CHECK RECORDING STATE
// ========================================

const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  console.log("recording status", recordingStatus, recordingType);
  return [recordingStatus, recordingType];
};

// ========================================
// RECORDING FUNCTIONS
// ========================================

const init = async () => {
  // Load webcam state first
  await loadWebcamState();

  // Setup webcam toggle listener
  setupWebcamToggle();

  const recordingState = await checkRecording();

  console.log("recording state", recordingState);

  if (recordingState[0] === true) {
    if (recordingState[1] === "tab") {
      recordTab.innerText = "⏹️ Stop Recording";
    } else {
      recordScreen.innerText = "⏹️ Stop Recording";
    }
  }

  const updateRecording = async (type) => {
    console.log("start recording", type, "webcam:", webcamEnabled);

    const recordingState = await checkRecording();

    if (recordingState[0] === true) {
      // stop recording - no response needed
      chrome.runtime.sendMessage({ type: "stop-recording" });
    } else {
      if (type === "tab") {
        const tabCheck = await checkCurrentTab();

        if (!tabCheck.valid) {
          console.error("❌ Cannot record restricted page:", tabCheck.url);
          showError(
            "Cannot record this page. Please navigate to a regular website."
          );
          return;
        }
      }

      // start recording - no response needed
      chrome.runtime.sendMessage({
        type: "start-recording",
        recordingType: type,
        webcamEnabled: webcamEnabled,
      });
    }

    window.close();
  };

  recordTab.addEventListener("click", async () => {
    console.log("Record tab clicked, webcam:", webcamEnabled);
    updateRecording("tab");
  });

  recordScreen.addEventListener("click", async () => {
    console.log("Record screen clicked");
    updateRecording("screen");
  });

  screenshot.addEventListener("click", async () => {
    console.log("Screenshot clicked");

    const tabCheck = await checkCurrentTab();

    if (!tabCheck.valid) {
      console.error("❌ Cannot screenshot restricted page:", tabCheck.url);
      showError(
        "Cannot screenshot this page. Please navigate to a regular website."
      );
      return;
    }

    // send message - no response needed
    chrome.runtime.sendMessage({ type: "take-screenshot" });
    window.close();
  });
};

init();

console.log("✅ Popup script loaded");
