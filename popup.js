// Get DOM element references
const recordTabBtn = document.getElementById("recordTab");
const recordScreenBtn = document.getElementById("recordScreen");
const stopRecordingBtn = document.getElementById("stopRecording");
const statusDiv = document.getElementById("status");

// Webcam option buttons
const webcamShowBtn = document.getElementById("webcamShow");
const webcamHideBtn = document.getElementById("webcamHide");
const webcamPreview = document.getElementById("webcamPreview");

// ✅ ADDED: Live camera control buttons (during recording)
const liveCameraToggleBtn = document.getElementById("liveCameraToggle");
const liveCameraShowBtn = document.getElementById("liveCameraShow");
const liveCameraHideBtn = document.getElementById("liveCameraHide");

// ✅ ADDED: State management variables
let currentRecordingState = {
  isRecording: false,
  recordingType: "",
  webcamEnabled: true,
};

// inject the content script into the current page
const injectCamera = async () => {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  console.log("tab: ", tab);

  await chrome.scripting.executeScript({
    // content.js is the file that will be injected
    files: ["content.js"],
    target: { tabId },
  });
};

// check chrome storage if recording is on
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || null;
  return [recordingStatus, recordingType];
};

const init = async () => {
  const [recordingStatus, recordingType] = await checkRecording();
  console.log("recording status: ", recordingStatus, recordingType);

  if (recordingStatus) {
    if (recordingType === "tab") {
      recordTabBtn.innerText = "⏹️ Stop Recording";
    } else if (recordingType === "screen") {
      recordScreenBtn.innerText = "⏹️ Stop Recording";
    }
  }

  const updateRecording = async (type) => {
    console.log("Updated recording of type:", type);

    // send message to service worker to start recording
    if (recordingStatus) {
      chrome.runtime.sendMessage({ action: "stop-recording" });
    } else {
      chrome.runtime.sendMessage({
        action: "start-recording",
        type: type,
      });
      injectCamera();
    }

    window.close();
  };

  recordTabBtn.addEventListener("click", async () => {
    console.log("Record tab clicked!");
    updateRecording("tab");
  });

  recordScreenBtn.addEventListener("click", async () => {
    console.log("Record screen clicked!");
    updateRecording("screen");
  });

  stopRecordingBtn.addEventListener("click", async () => {
    chrome.runtime.sendMessage({ action: "stop-recording" });
    console.log("Stop recording clicked!");
  });
};

checkRecording().then((res) => {
  init();
});
