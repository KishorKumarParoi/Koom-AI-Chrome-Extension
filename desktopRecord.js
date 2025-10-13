console.log("🖥️ Desktop Record script loaded");

let recorder;
let data = [];

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[desktop-record] message received", message);

  // ✅ Check for target to avoid conflicts
  if (message.target && message.target !== "offscreen-desktop") {
    return;
  }

  switch (message.type) {
    case "start-screen-recording":
      console.log("[desktop-record] Starting screen recording");
      startScreenRecording();
      break;
    case "stop-screen-recording":
      console.log("[desktop-record] Stopping screen recording");
      stopScreenRecording();
      break;
    default:
      console.log("[desktop-record] Unknown message type:", message.type);
  }

  return true;
});

async function startScreenRecording() {
  try {
    console.log("[desktop-record] Requesting screen capture...");

    // ✅ Use getDisplayMedia instead of desktopCapture
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: true,
    });

    console.log("[desktop-record] ✅ Screen capture granted");

    // Get microphone
    let micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true },
      });
      console.log("[desktop-record] ✅ Microphone access granted");
    } catch (error) {
      console.warn(
        "[desktop-record] ⚠️ Microphone not available:",
        error.message
      );
    }

    // Combine streams
    let combinedStream = stream;

    if (micStream) {
      const audioContext = new AudioContext();
      const dest = audioContext.createMediaStreamDestination();

      // Mix audio from screen and microphone
      if (stream.getAudioTracks().length > 0) {
        audioContext.createMediaStreamSource(stream).connect(dest);
      }
      audioContext.createMediaStreamSource(micStream).connect(dest);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = dest.stream.getAudioTracks()[0];

      combinedStream = new MediaStream([videoTrack, audioTrack]);
    }

    // Create recorder
    recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        data.push(event.data);
        console.log(
          "[desktop-record] Data chunk received:",
          event.data.size,
          "bytes"
        );
      }
    };

    recorder.onstop = async () => {
      console.log("[desktop-record] Recording stopped");

      // Stop all tracks
      combinedStream.getTracks().forEach((track) => {
        track.stop();
        console.log("[desktop-record] Stopped track:", track.kind);
      });

      // Create blob and URL
      const blob = new Blob(data, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      console.log("[desktop-record] Video blob created:", blob.size, "bytes");

      // Send message to open new tab with video
      chrome.runtime.sendMessage({
        type: "open-tab",
        url: url,
      });

      // Reset
      data = [];
    };

    // Start recording
    recorder.start();
    console.log("[desktop-record] ✅ Recording started");
  } catch (error) {
    console.error("[desktop-record] ❌ Error starting recording:", error);

    // Notify user
    chrome.runtime.sendMessage({
      type: "recording-error",
      error: error.message,
    });
  }
}

function stopScreenRecording() {
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    console.log("[desktop-record] ✅ Recorder stopped");
  } else {
    console.warn("[desktop-record] ⚠️ No active recording to stop");
  }
}
