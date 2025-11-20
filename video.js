// KoomAI Chrome Extension — Video Preview & Cloud Sync Controller
let currentVideoBlobUrl = null;

const videoElement = document.querySelector("#recorded-video");
const durationElement = document.querySelector("#video-time");
const uploadBtn = document.querySelector("#btn-upload");
const downloadBtn = document.querySelector("#btn-download");
const webAppBtn = document.querySelector("#btn-web-app");
const toast = document.querySelector("#upload-toast");

const saveVideo = (videoUrl) => {
  chrome.storage.local.set({ videoUrl });
};

const playVideo = (message) => {
  const url = message?.videoUrl || message?.base64 || message;
  if (!url) return;

  currentVideoBlobUrl = url;
  saveVideo(url);

  videoElement.src = url;
  videoElement.play().catch((e) => console.log("Autoplay prevented:", e));
};

// Check for video URL on page load
chrome.storage.local.get(["videoUrl"], (result) => {
  if (result.videoUrl) {
    playVideo(result.videoUrl);
  }
});

// Update duration once metadata is loaded
videoElement.addEventListener("loadedmetadata", () => {
  const duration = Math.round(videoElement.duration);
  if (!isNaN(duration) && duration > 0) {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    durationElement.textContent = `Duration: ${mins}:${secs < 10 ? "0" : ""}${secs}`;
  } else {
    durationElement.textContent = "Duration: Ready";
  }
});

// Message listener from background worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "play-video") {
    playVideo(message);
  }
});

// Download WebM Button
downloadBtn.addEventListener("click", () => {
  if (!currentVideoBlobUrl) {
    alert("No recorded video available to download.");
    return;
  }
  const a = document.createElement("a");
  a.href = currentVideoBlobUrl;
  a.download = `koomai-capture-${Date.now()}.webm`;
  a.click();
});

// Open Next.js Dashboard
webAppBtn.addEventListener("click", () => {
  window.open("https://koom-ai-web.onrender.com/dashboard", "_blank");
});

// Upload to KoomAI Cloud Engine (Render API with localhost fallback)
uploadBtn.addEventListener("click", async () => {
  if (!currentVideoBlobUrl) {
    alert("No video stream found to upload.");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<span>⏳ Uploading to KoomAI Cloud...</span>`;
  toast.className = "";
  toast.style.display = "block";
  toast.textContent = "Connecting to KoomAI Real-Time Media Engine...";

  try {
    const response = await fetch(currentVideoBlobUrl);
    const blob = await response.blob();

    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    reader.onloadend = async () => {
      const base64Data = reader.result.split(",")[1];
      const filename = `chrome-ext-${Date.now()}.webm`;

      // Smart target discovery: try production Render API first, then local fallback
      const uploadTargets = [
        "https://koom-ai-express.onrender.com/api/upload",
        "http://localhost:5001/api/upload",
      ];

      let lastError = null;
      let uploadedSuccessfully = false;

      for (const targetUrl of uploadTargets) {
        try {
          console.log(`[Upload] Attempting cloud dispatch to ${targetUrl}...`);
          const uploadRes = await fetch(targetUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename,
              userId: "chrome-extension-user",
              base64Data,
            }),
          });

          if (uploadRes.ok) {
            uploadedSuccessfully = true;
            toast.className = "success";
            toast.innerHTML = `✅ Successfully uploaded to KoomAI Cloud (File: <strong>${filename}</strong>)! AI Whisper transcription queued. <a href="https://koom-ai-web.onrender.com" target="_blank" style="color: #10b981; font-weight: bold; text-decoration: underline; margin-left: 8px;">View in Cockpit</a>`;
            uploadBtn.innerHTML = `<span>✅ Uploaded!</span>`;
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`[Upload Warning] Failed to upload to ${targetUrl}:`, err.message);
        }
      }

      if (!uploadedSuccessfully) {
        toast.className = "error";
        toast.innerHTML = `⚠️ Cloud upload failed: ${lastError?.message || "All endpoints unreachable"}.`;
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = `<span>🚀 Retry Upload</span>`;
      }
    };
  } catch (err) {
    toast.className = "error";
    toast.textContent = `Error reading video stream: ${err.message}`;
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `<span>🚀 Upload to KoomAI Cloud</span>`;
  }
});

