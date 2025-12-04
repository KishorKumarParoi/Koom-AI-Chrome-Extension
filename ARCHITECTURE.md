# 🏗️ KoomAI Chrome Extension — Manifest V3 Architecture

## 1. System Design & Architectural Context

`koom-ai-chrome-extension` is a high-performance browser screen recording extension engineered under the **Google Chrome Manifest V3 specification**. It overcomes Manifest V3's strict constraints (ephemeral service workers, no DOM access in service workers, restricted background media recording) using an **Offscreen Document Audio Mixing Pipeline**.

```mermaid
flowchart TD
    subgraph BrowserUI["🌐 Browser Context & Active Tabs"]
        TAB["Active Tab DOM\n(Web Page)"]
        CONTENT["content.js\n(Injected Floating Camera PIP)"]
        POPUP["popup.html / popup.js\n(Toolbar Quick Recorder Deck)"]
    end

    subgraph ServiceWorkerTier["⚙️ Background Service Worker (Manifest V3)"]
        WORKER["service_worker.js\n(Event-Driven State Machine)"]
        STORAGE["chrome.storage.local\n(State & Stream IDs)"]
    end

    subgraph OffscreenPipeline["🎧 Offscreen Media Document"]
        OFFSCREEN["offscreen.html / offscreen.js\n(DOM AudioContext & MediaRecorder)"]
        TAB_AUDIO["Tab Audio Stream\n(chrome.tabCapture)"]
        MIC_AUDIO["Microphone Stream\n(getUserMedia)"]
        MIXER["AudioContext Destination Mixer\n(Eliminates A/V drift)"]
        RECORDER["MediaRecorder Engine\n(video/webm; codecs=vp9)"]
    end

    subgraph ReviewStudio["🎬 Video Review & Cloud Sync"]
        VIDEO_STUDIO["video.html / video.js\n(Branded Review Cockpit)"]
        EXPRESS["KoomAI Express API (:5001)\n(/api/upload multipart endpoint)"]
        WEB_COCKPIT["KoomAI Web Dashboard (:3000)\n(/dashboard)"]
    end

    POPUP -->|start-recording| WORKER
    WORKER -->|chrome.scripting| CONTENT
    CONTENT -.->|Overlays on| TAB
    WORKER -->|createDocument| OFFSCREEN

    TAB_AUDIO --> MIXER
    MIC_AUDIO --> MIXER
    MIXER --> RECORDER
    RECORDER -->|Blob URL| VIDEO_STUDIO

    VIDEO_STUDIO -->|Base64 POST /api/upload| EXPRESS
    VIDEO_STUDIO -->|View in Cockpit| WEB_COCKPIT
```

---

## 2. Manifest V3 Technical Innovations

### ADR-01: Ephemeral Service Worker vs Persistent Media Stream
- **Challenge**: In Manifest V3, background scripts are replaced by ephemeral Service Workers that terminate after 30 seconds of inactivity and cannot access the DOM or `MediaRecorder`.
- **Solution**: The extension dynamically spawns an **Offscreen Document** (`chrome.offscreen.createDocument({ reasons: ['USER_MEDIA'], justification: 'Recording tab and mic audio' })`).
- **Outcome**: Uninterrupted, reliable recordings spanning hours without service worker termination.

### ADR-02: Zero-Latency Dual-Stream Audio Mixing
- **Challenge**: Capturing both tab audio (meeting sound, video playback) and microphone audio causes out-of-phase audio echoes or browser clipping.
- **Solution**: Blends streams using the Web Audio API inside `offscreen.js`:
  ```javascript
  const mixedContext = new AudioContext();
  const mixedDest = mixedContext.createMediaStreamDestination();
  mixedContext.createMediaStreamSource(microphone).connect(mixedDest);
  mixedContext.createMediaStreamSource(tabMedia).connect(mixedDest);
  ```
- **Outcome**: Studio-quality mixed audio with hardware echo cancellation and zero latency.

---

## 3. Communication & Message Flow

```mermaid
sequenceDiagram
    autonumber
    participant User as Browser User
    participant Popup as Extension Popup
    participant Worker as Service Worker
    participant Offscreen as Offscreen Doc
    participant Express as KoomAI Express (:5001)

    User->>Popup: Click "Start Recording"
    Popup->>Worker: chrome.runtime.sendMessage({ action: "start-recording" })
    Worker->>Worker: chrome.tabCapture.getMediaStreamId()
    Worker->>Offscreen: sendMessage({ type: "start-recording", streamId })
    Offscreen->>Offscreen: Mix tab audio + mic audio & record
    
    User->>Popup: Click "Stop Recording"
    Popup->>Worker: sendMessage({ action: "stop-recording" })
    Worker->>Offscreen: sendMessage({ type: "stop-recording" })
    Offscreen->>Worker: sendMessage({ type: "open-tab", url: blobUrl })
    Worker->>User: Open video.html preview
    
    User->>Express: Click "Upload to KoomAI Cloud"
    Express-->>User: HTTP 200 OK (Queued for Whisper transcription)
```

---

## 4. Permissions Matrix

| Permission | Justification |
| :--- | :--- |
| `tabCapture` | Captures high-definition audio and video from the user's active browser tab. |
| `desktopCapture` | Allows full desktop or application window screen recording. |
| `offscreen` | Spawns dedicated DOM context for real-time audio mixing and MediaRecorder. |
| `scripting` | Dynamically injects the circular webcam floating overlay (`content.js`). |
| `storage` | Preserves local recording state and temporary video object URLs. |
| `activeTab` | Grants temporary execution rights on the currently focused browser tab. |
