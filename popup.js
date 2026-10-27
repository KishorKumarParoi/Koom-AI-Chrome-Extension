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

  // ========================================
  // POMODORO, TAB TRACKER & MEDITATION
  // ========================================
  const tabNavRecord = document.getElementById("tabNavRecord");
  const tabNavPomo = document.getElementById("tabNavPomo");
  const tabNavZen = document.getElementById("tabNavZen");
  const panelRecord = document.getElementById("panelRecord");
  const panelPomo = document.getElementById("panelPomo");
  const panelZen = document.getElementById("panelZen");

  function switchTab(activeBtn, activePanel) {
    [tabNavRecord, tabNavPomo, tabNavZen].forEach(b => b && b.classList.remove("active"));
    [panelRecord, panelPomo, panelZen].forEach(p => p && p.classList.remove("active"));
    if (activeBtn) activeBtn.classList.add("active");
    if (activePanel) activePanel.classList.add("active");
  }

  if (tabNavRecord) tabNavRecord.onclick = () => switchTab(tabNavRecord, panelRecord);
  if (tabNavPomo) tabNavPomo.onclick = () => {
    switchTab(tabNavPomo, panelPomo);
    updateTabCount();
  };
  if (tabNavZen) tabNavZen.onclick = () => switchTab(tabNavZen, panelZen);

  function updateTabCount() {
    if (typeof chrome !== "undefined" && chrome?.tabs?.query) {
      chrome.tabs.query({}, (tabs) => {
        const countElem = document.getElementById("openTabsCount");
        if (countElem && tabs) countElem.innerText = `${tabs.length} tabs`;
      });
    }
  }
  updateTabCount();

  let pomoSeconds = 25 * 60;
  let pomoInterval = null;
  const pomoTimeElem = document.getElementById("pomoTime");

  function updatePomoDisplay() {
    const mins = Math.floor(pomoSeconds / 60);
    const secs = pomoSeconds % 60;
    if (pomoTimeElem) {
      pomoTimeElem.innerText = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
  }

  const btnPomoStart = document.getElementById("btnPomoStart");
  const btnPomoPause = document.getElementById("btnPomoPause");
  const btnPomoReset = document.getElementById("btnPomoReset");

  if (btnPomoStart) {
    btnPomoStart.onclick = () => {
      if (pomoInterval) clearInterval(pomoInterval);
      pomoInterval = setInterval(() => {
        if (pomoSeconds > 0) {
          pomoSeconds--;
          updatePomoDisplay();
        } else {
          clearInterval(pomoInterval);
          alert("🎉 Pomodoro Focus Sprint complete! Take a mindful 5-minute break.");
        }
      }, 1000);
    };
  }
  if (btnPomoPause) {
    btnPomoPause.onclick = () => {
      if (pomoInterval) clearInterval(pomoInterval);
    };
  }
  if (btnPomoReset) {
    btnPomoReset.onclick = () => {
      if (pomoInterval) clearInterval(pomoInterval);
      pomoSeconds = 25 * 60;
      updatePomoDisplay();
    };
  }

  let audioCtx = null;
  let osc = null;
  let isZenPlaying = false;
  const btnZenAudio = document.getElementById("btnZenAudio");
  const breathCircle = document.getElementById("breathCircle");

  if (btnZenAudio) {
    btnZenAudio.onclick = () => {
      if (!isZenPlaying) {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioCtx = new AudioContext();
          osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(432, audioCtx.currentTime);
          gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.start();

          isZenPlaying = true;
          btnZenAudio.innerText = "Pause 432Hz Soundscape";
          if (breathCircle) breathCircle.style.transform = "scale(1.2)";
        } catch (e) {
          console.error("Audio error", e);
        }
      } else {
        if (osc) osc.stop();
        if (audioCtx) audioCtx.close();
        isZenPlaying = false;
        btnZenAudio.innerText = "Start 432Hz Soundscape";
        if (breathCircle) breathCircle.style.transform = "scale(1)";
      }
    };
  }
};

init();

console.log("✅ Popup script loaded with Pomodoro, Tab Tracker & Meditation");

