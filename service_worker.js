// check
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  console.log("recording status", recordingStatus, recordingType);
  return [recordingStatus, recordingType];
};

// update recording state
const updateRecording = async (state, type) => {
  console.log("update recording", type);
  chrome.storage.local.set({ recording: state, type });
};

const injectCamera = async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  await chrome.scripting.executeScript({
    files: ["content.js"],
    target: { tabId },
  });
};

const removeCamera = async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("remove camera from tab", tabId);
  await chrome.scripting.executeScript({
    func: () => {
      const camera = document.querySelector("#koom-ai-camera");
      if (!camera) return;
      camera.style.display = "none";
    },
    target: { tabId },
  });
};

// listen for changes to the focused / current tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log("tab activated", activeInfo);

  const activeTab = await chrome.tabs.get(activeInfo.tabId);
  if (!activeTab) return;
  const tabUrl = activeTab.url;

  if (
    tabUrl.startsWith("chrome://") ||
    tabUrl.startsWith("chrome-extension://")
  ) {
    console.log("chrome or extension page - exiting");
    return;
  }

  const [recording, recordingType] = await checkRecording();

  console.log("recording check after tab change", {
    recording,
    recordingType,
    tabUrl,
  });

  if (recording && recordingType === "screen") {
    injectCamera();
  } else {
    removeCamera();
  }
});

const startRecording = async (type, webcamEnabled = true) => {
  console.log("start recording", type, "webcam:", webcamEnabled);
  const currentstate = await checkRecording();
  console.log("current state", currentstate);
  updateRecording(true, type);

  // update the icon
  try {
    chrome.action.setIcon({ path: "icons/icons8-recording-50.png" });
  } catch (error) {
    console.warn("Could not update icon:", error);
  }

  if (type === "tab") {
    recordTabState(true, webcamEnabled);
  }
  if (type === "screen") {
    recordScreenState(true);
  }
};

const stopRecording = async () => {
  console.log("stop recording");

  const [recording, recordingType] = await checkRecording();

  updateRecording(false, "");

  // update the icon
  try {
    chrome.action.setIcon({ path: "icons/icons8-recording-50.png" });
  } catch (error) {
    console.warn("Could not update icon:", error);
  }

  if (recordingType === "tab") {
    recordTabState(false);
  } else if (recordingType === "screen") {
    recordScreenState(false);
  }
};

// ========================================
// TAB RECORDING (with webcam support)
// ========================================
const recordTabState = async (start = true, webcamEnabled = true) => {
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

  if (!offscreenDocument) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
      justification: "Recording from chrome.tabCapture API",
    });
  }

  if (start) {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const tabId = tab[0].id;
    console.log("tab id", tabId);

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    console.log("stream id", streamId, "webcam:", webcamEnabled);

    // ✅ Pass webcamEnabled to offscreen
    chrome.runtime.sendMessage({
      type: "start-recording",
      target: "offscreen",
      data: streamId,
      webcamEnabled: webcamEnabled,
    });

    // ✅ Only inject camera if webcam enabled
    if (webcamEnabled) {
      await injectCamera();
    }
  } else {
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "offscreen",
    });
  }
};

// ========================================
// SCREEN RECORDING (using offscreen document)
// ========================================
const recordScreenState = async (start = true) => {
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

  if (!offscreenDocument) {
    await chrome.offscreen.createDocument({
      url: "desktopRecord.html",
      reasons: ["DISPLAY_MEDIA", "USER_MEDIA"],
      justification: "Recording screen with chrome.desktopCapture API",
    });
    console.log("✅ Offscreen document created for screen recording");
  }

  if (start) {
    console.log("📺 Starting screen recording");

    // Update storage
    await chrome.storage.local.set({
      recording: true,
      type: "screen",
    });

    // Send message to offscreen document
    chrome.runtime.sendMessage({
      type: "start-screen-recording",
      target: "offscreen-desktop",
    });
  } else {
    console.log("⏹️ Stopping screen recording");

    await chrome.storage.local.set({
      recording: false,
      type: "",
    });

    chrome.runtime.sendMessage({
      type: "stop-screen-recording",
      target: "offscreen-desktop",
    });
  }
};

const openTabWithVideo = async (message) => {
  console.log("request to open tab with video", message);

  const { url: videoUrl, base64 } = message;

  if (!videoUrl && !base64) return;

  const url = chrome.runtime.getURL("video.html");
  const newTab = await chrome.tabs.create({ url });

  setTimeout(() => {
    chrome.tabs.sendMessage(newTab.id, {
      type: "play-video",
      videoUrl,
      base64,
    });
  }, 500);
};

async function takeScreenshot() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs || tabs.length === 0) return;
  const tab = tabs[0];

  const imageUri = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: "png",
    quality: 100,
  });

  console.log("Screenshot captured, size", imageUri.length);

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .replace(/\..+/, "");

  const filename = `koom-screenshot-${timestamp}.png`;

  const downloadId = await chrome.downloads.download({
    url: imageUri,
    filename: filename,
    saveAs: true,
  });

  console.log("Download started with ID:", downloadId);
}

// ========================================
// MESSAGE LISTENER
// ========================================
chrome.runtime.onMessage.addListener(function (request, sender) {
  console.log("message received", request, sender);

  switch (request.type) {
    case "open-tab":
      openTabWithVideo(request);
      break;
    case "start-recording":
      startRecording(request.recordingType, request.webcamEnabled);
      break;
    case "stop-recording":
      stopRecording();
      break;
    case "take-screenshot":
      takeScreenshot();
      break;
    default:
      console.log("default");
  }

  return true;
});
