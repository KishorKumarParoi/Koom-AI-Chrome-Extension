// add listener for messages 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('message received', request, sender, sendResponse);

    switch (request.action) {
        case 'start-recording':
            console.log(('start recording', request.type));
            break;
        case 'stop-recording':
            console.log('stop recording', request.type);
            console.log('helooooooooo');
            break;
        default:
            console.log('default');
    }

    return true
})

chrome.runtime.onInstalled.addListener(() => {
    console.log('Koom AI Extension installed');
});

// let recording = false;
// let mediaRecorder = null;
// let recordedChunks = [];

// chrome.runtime.onInstalled.addListener(() => {
//     console.log('Koom AI Extension installed');
// });

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//     switch (message.action) {
//         case 'startRecording':
//             await startRecording(message.type);
//             break;
//         case 'stopRecording':
//             await stopRecording();
//             break;
//     }
// });

// async function startRecording(type) {
//     try {
//         if (recording) {
//             console.log('Already recording');
//             return;
//         }

//         let stream;

//         if (type === 'tab') {
//             // Get current tab
//             const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//             stream = await chrome.tabCapture.capture({
//                 audio: true,
//                 video: true
//             });
//         } else if (type === 'screen') {
//             // Request screen capture
//             const streamId = await new Promise((resolve, reject) => {
//                 chrome.desktopCapture.chooseDesktopMedia(['screen', 'window'], (streamId) => {
//                     if (streamId) {
//                         resolve(streamId);
//                     } else {
//                         reject(new Error('User cancelled screen sharing'));
//                     }
//                 });
//             });

//             // Create offscreen document for screen capture
//             await createOffscreenDocument();

//             // Send message to offscreen document to start capture
//             const response = await chrome.runtime.sendMessage({
//                 action: 'startScreenCapture',
//                 streamId: streamId
//             });

//             if (!response.success) {
//                 throw new Error('Failed to start screen capture');
//             }

//             recording = true;
//             await chrome.storage.local.set({ recording: true });
//             updateIcon(true);
//             notifyRecordingStatus(true, `Recording ${type}...`);
//             return;
//         }

//         if (stream) {
//             mediaRecorder = new MediaRecorder(stream);
//             recordedChunks = [];

//             mediaRecorder.ondataavailable = (event) => {
//                 if (event.data.size > 0) {
//                     recordedChunks.push(event.data);
//                 }
//             };

//             mediaRecorder.onstop = async () => {
//                 const blob = new Blob(recordedChunks, { type: 'video/webm' });
//                 const url = URL.createObjectURL(blob);

//                 // Download the recording
//                 await chrome.downloads.download({
//                     url: url,
//                     filename: `recording-${Date.now()}.webm`
//                 });
//             };

//             mediaRecorder.start();
//             recording = true;
//             await chrome.storage.local.set({ recording: true });
//             updateIcon(true);
//             notifyRecordingStatus(true, `Recording ${type}...`);
//         }
//     } catch (error) {
//         console.error('Error starting recording:', error);
//         notifyRecordingStatus(false, 'Error starting recording');
//     }
// }

// async function stopRecording() {
//     if (!recording) return;

//     try {
//         if (mediaRecorder && mediaRecorder.state === 'recording') {
//             mediaRecorder.stop();
//             mediaRecorder.stream.getTracks().forEach(track => track.stop());
//         }

//         // Also stop offscreen recording if it exists
//         try {
//             await chrome.runtime.sendMessage({ action: 'stopScreenCapture' });
//         } catch (e) {
//             // Offscreen might not exist, ignore error
//         }

//         recording = false;
//         await chrome.storage.local.set({ recording: false });
//         updateIcon(false);
//         notifyRecordingStatus(false, 'Recording stopped');
//     } catch (error) {
//         console.error('Error stopping recording:', error);
//     }
// }

// async function createOffscreenDocument() {
//     if (await chrome.offscreen.hasDocument()) return;

//     await chrome.offscreen.createDocument({
//         url: chrome.runtime.getURL('offscreen.html'),
//         reasons: ['USER_MEDIA'],
//         justification: 'Recording screen content'
//     });
// }

// function updateIcon(isRecording) {
//     const iconPath = isRecording ? 'icons/recording.png' : 'icons/not-recording.png';
//     chrome.action.setIcon({ path: iconPath });
// }

// function notifyRecordingStatus(isRecording, status) {
//     // Notify popup about status change
//     chrome.runtime.sendMessage({
//         action: 'recordingStatusChanged',
//         recording: isRecording,
//         status: status
//     }).catch(() => {
//         // Popup might be closed, ignore error
//     });
// }