# 🧩 KoomAI Chrome Extension — Manifest V3 Screen Recorder

[![Chrome Web Store](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![WebRTC](https://img.shields.io/badge/WebRTC-MediaRecorder-333333?logo=webrtc&logoColor=white)](https://webrtc.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![KoomAI Platform](https://img.shields.io/badge/KoomAI-Cloud_Sync-7928CA?logo=next.js&logoColor=white)](http://localhost:3000)

> Lightweight, high-performance browser screen recording extension engineered under the **Chrome Manifest V3** standard for the **KoomAI Enterprise Video Platform**. Features zero-latency tab and microphone audio mixing via offscreen documents, draggable circular webcam overlay, and direct 1-click cloud sync with the KoomAI Express Backend.

---

## ⚡ Quickstart & Installation Runbook

### 1. Verification & Build
```bash
./deploy.sh
```

### 2. Install Unpacked Extension in Chrome / Brave / Edge
1. Open your browser and navigate to:
   ```
   chrome://extensions
   ```
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click the **Load unpacked** button.
4. Select this directory:
   ```
   /Users/kishorkumarparoi/job-project/koom-ai-chrome-extension
   ```
5. Pin the **KoomAI** icon to your browser toolbar!

### 3. Package for Chrome Web Store Distribution
```bash
./deploy.sh --package
```
Creates a distribution-ready `.zip` archive excluding development artifacts.

---

## 🔗 Platform Connectivity

- **Media Ingestion Engine**: Directly uploads recordings to `http://localhost:5001/api/upload`.
- **Web App Cockpit**: Instant redirection to view uploaded and transcribed videos on `http://localhost:3000/dashboard`.
- **Microphone & Tab Capture**: Synchronized Web Audio mixing prevents echo and out-of-phase audio degradation.

---

## 🏛️ Architecture & Manifest V3 Design
For deep-dive documentation on service worker lifecycles and offscreen document audio mixing, read [ARCHITECTURE.md](file:///Users/kishorkumarparoi/job-project/koom-ai-chrome-extension/ARCHITECTURE.md).
