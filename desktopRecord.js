// // listen for messages from the service worker
// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//     console.log('🖥️ Desktop recorder received message:', request, sender);

//     try {
//         switch (request.type) {
//             case 'start-recording':
//                 console.log('🎬 Starting recording with focusedTabId:', request.focusedTabId);
//                 // Send immediate response to prevent channel closure
//                 sendResponse({ success: true, message: 'Recording start initiated' });

//                 // Start recording asynchronously
//                 setTimeout(() => {
//                     startRecording(request.focusedTabId);
//                 }, 100);
//                 break;

//             case 'stop-recording':
//                 console.log('🛑 Stopping recording...');
//                 sendResponse({ success: true, message: 'Recording stop initiated' });

//                 // Stop recording asynchronously
//                 setTimeout(() => {
//                     stopRecording();
//                 }, 100);
//                 break;

//             default:
//                 console.log('❓ Unknown message type:', request.type);
//                 sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
//         }
//     } catch (error) {
//         console.error('❌ Error handling message:', error);
//         sendResponse({ success: false, error: error.message });
//     }

//     return false; // ✅ Don't keep channel open since we respond immediately
// });

// let recorder;
// let data = [];

// const stopRecording = () => {
//     console.log('🛑 Stopping desktop recording...');

//     if (recorder && recorder.state === 'recording') {
//         recorder.stop();

//         // stop all streams
//         if (recorder.stream) {
//             recorder.stream.getTracks().forEach((track) => {
//                 track.stop();
//                 console.log('🔇 Track stopped:', track.kind);
//             });
//         }

//         console.log('✅ Desktop recording stopped');
//     } else {
//         console.log('⚠️ No active recording to stop');
//     }
// };

// const startRecording = async (focusedTabId) => {
//     try {
//         console.log('🎥 Starting desktop recording...');

//         // use desktopCapture to get the screen stream
//         chrome.desktopCapture.chooseDesktopMedia(
//             ["screen", "window"],
//             async function (streamId) {
//                 try {
//                     // if (streamId === null) {
//                     //     console.log('❌ No stream selected - user cancelled');

//                     //     // ✅ Return focus and stop recording on cancel
//                     //     if (focusedTabId) {
//                     //         try {
//                     //             await chrome.tabs.update(focusedTabId, { active: true });
//                     //             console.log('🔄 Focus returned to original tab after cancel');
//                     //         } catch (tabError) {
//                     //             console.warn('⚠️ Could not return focus to tab after cancel:', tabError);
//                     //         }
//                     //     }

//                     //     // Stop the recording in service worker
//                     //     await chrome.runtime.sendMessage({
//                     //         action: 'stop-recording',
//                     //         type: 'screen'
//                     //     });

//                     //     return;
//                     // }

//                     if (streamId === null) {
//                         return
//                     }

//                     console.log('✅ Stream ID from desktop capture:', streamId);

//                     const stream = await navigator.mediaDevices.getUserMedia({
//                         audio: {
//                             mandatory: {
//                                 chromeMediaSource: "desktop",
//                                 chromeMediaSourceId: streamId
//                             }
//                         },
//                         video: {
//                             mandatory: {
//                                 chromeMediaSource: 'desktop',
//                                 chromeMediaSourceId: streamId
//                             }
//                         }
//                     });

//                     console.log('✅ Desktop stream obtained:', stream);

//                     // ✅ IMPROVED: Try to get microphone (optional, with better error handling)
//                     let combinedStream = stream;

//                     try {
//                         const microphone = await navigator.mediaDevices.getUserMedia({
//                             audio: {
//                                 echoCancellation: false
//                             }
//                         });

//                         // check that the microphone stream has audio tracks
//                         if (microphone.getAudioTracks().length > 0) {
//                             combinedStream = new MediaStream([
//                                 ...stream.getVideoTracks(),
//                                 ...microphone.getAudioTracks()
//                             ]);
//                             console.log('🎤 Microphone added to combined stream');
//                         }
//                     } catch (micError) {
//                         console.log('⚠️ Microphone access denied or unavailable:', micError);
//                         console.log('📹 Continuing with video-only recording');
//                     }

//                     console.log('🎬 Final combined stream:', combinedStream);

//                     // ✅ IMPROVED: Better codec specification
//                     recorder = new MediaRecorder(combinedStream, {
//                         mimeType: "video/webm;codecs=vp9,opus"
//                     });

//                     data = []; // Reset data array

//                     // listen for data
//                     recorder.ondataavailable = (event) => {
//                         console.log('📊 Data available:', event.data.size, 'bytes');
//                         if (event.data.size > 0) {
//                             data.push(event.data);
//                         }
//                     };

//                     // ✅ FIXED: Proper onstop handler with service worker integration
//                     recorder.onstop = async () => {
//                         console.log('⏹️ Desktop recording stopped, processing data...');

//                         try {
//                             console.log('📤 Sending data to service worker, chunks:', data.length);

//                             const blobFile = new Blob(data, { type: "video/webm" });
//                             console.log('✅ Blob created:', blobFile.size, 'bytes');

//                             const url = URL.createObjectURL(blobFile);
//                             console.log('🔗 Object URL created:', url);

//                             // ✅ FIXED: Use proper action name for service worker
//                             const response = await chrome.runtime.sendMessage({
//                                 action: 'open-tab',
//                                 url: url,
//                                 source: 'desktop-recording',
//                                 storage: 'local'
//                             });

//                             console.log('📤 Video sent to service worker:', response);

//                             // ✅ OPTIONAL: Also create base64 for backup/compatibility
//                             try {
//                                 const base64 = await convertBlobToBase64(blobFile);
//                                 console.log('💾 Base64 conversion completed, length:', base64.length);

//                                 // Store base64 in local storage as backup
//                                 await chrome.storage.local.set({
//                                     lastRecording: base64,
//                                     lastRecordingUrl: url,
//                                     recordingTimestamp: Date.now()
//                                 });
//                                 console.log('💾 Recording saved to storage');
//                             } catch (base64Error) {
//                                 console.warn('⚠️ Base64 conversion failed:', base64Error);
//                             }

//                             // Reset data
//                             data = [];

//                         } catch (error) {
//                             console.error('❌ Error processing recording:', error);
//                         }
//                     };

//                     recorder.onerror = (error) => {
//                         console.error('❌ Recorder error:', error);
//                     };

//                     // ✅ IMPROVED: Start recording with data collection interval
//                     recorder.start(1000); // Collect data every second
//                     console.log('✅ Desktop recording started');

//                     // ✅ IMPROVED: Better focus management - return focus immediately
//                     if (focusedTabId) {
//                         try {
//                             await chrome.tabs.update(focusedTabId, { active: true });
//                             console.log('🔄 Focus returned to original tab:', focusedTabId);
//                         } catch (tabError) {
//                             console.warn('⚠️ Could not return focus to tab:', tabError);
//                         }
//                     }

//                 } catch (error) {
//                     console.error('❌ Error in desktop capture callback:', error);
//                 }
//             }
//         );
//     } catch (error) {
//         console.error('❌ Error starting desktop recording:', error);
//     }
// };

// // ✅ IMPROVED: Multiple ready signals for better reliability
// console.log('🖥️ Desktop recorder script starting...');

// // Signal readiness function
// const signalReady = () => {
//     chrome.runtime.sendMessage({
//         action: 'desktop-record-ready'
//     }).then(response => {
//         console.log('✅ Ready signal sent successfully:', response);
//     }).catch(error => {
//         console.log('⚠️ Ready signal failed:', error.message);
//     });
// };

// // Signal immediately when script loads
// signalReady();

// // Signal again on DOM ready
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => {
//         console.log('🖥️ Desktop recorder DOM ready');
//         setTimeout(signalReady, 500);
//     });
// } else {
//     console.log('🖥️ DOM already ready');
//     setTimeout(signalReady, 500);
// }

// // Signal again at intervals for extra reliability
// setTimeout(signalReady, 1000);
// setTimeout(signalReady, 2000);
// setTimeout(signalReady, 3000);

// console.log('🖥️ Desktop recorder script loaded and ready');

const convertBlobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const base64data = reader.result;
      resolve(base64data);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

const fetchBlob = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64 = await convertBlobToBase64(blob);
    return base64;
  } catch (error) {
    console.error("Error fetching blob:", error);
    throw error;
  }
};

// listen for messages from the service worker - start and stop recording

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("message received in desktopRecord.js", request, sender);

  switch (request.action) {
    case "start-recording":
      console.log(
        "🎬 Starting recording with focusedTabId:",
        request.focusedTabId
      );
      // Send immediate response to prevent channel closure
      sendResponse({ success: true, message: "Recording start initiated" });

      // Start recording asynchronously
      setTimeout(() => {
        startRecording(request.focusedTabId);
      }, 100);
      break;

    case "stop-recording":
      console.log("🛑 Stopping recording...");
      sendResponse({ success: true, message: "Recording stop initiated" });

      // Stop recording asynchronously
      setTimeout(() => {
        stopRecording();
      }, 100);
      break;

    default:
      console.log("❓ Unknown message type:", request.type);
      sendResponse({
        success: false,
        error: `Unknown message type: ${request.type}`,
      });
  }

  return true;
});

let recorder;
let data = [];

const stopRecording = () => {
  console.log("🛑 Stopping desktop recording...");

  if (recorder && recorder.state === "recording") {
    recorder.stop();
    // stop all streams
    if (recorder.stream) {
      recorder.stream.getTracks().forEach((track) => {
        track.stop();
        console.log("🔇 Track stopped:", track.kind);
      });
    }

    console.log("✅ Desktop recording stopped");
  } else {
    console.log("⚠️ No active recording to stop");
  }
};

async function startRecording(focusedTabId) {
  // use desktopCapture to get the screen stream
  chrome.desktopCapture.chooseDesktopMedia(
    ["screen", "window"],
    async function (streamId) {
      try {
        if (streamId === null) {
          return;
        }
        // have stream id, get the stream
        console.log("stream id from desktop capture", streamId);

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: streamId,
            },
          },
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: streamId,
            },
          },
        });

        console.log("desktop stream obtained", stream);

        // get the microphone stream
        const microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
          },
        });

        // check that the microphone stream has audio tracks
        if (microphone.getAudioTracks().length > 0) {
          const combinedStream = new MediaStream([
            ...stream.getVideoTracks()[0],
            ...microphone.getAudioTracks()[0],
          ]);
          console.log("🎤 Microphone added to combined stream");
        }

        console.log("final combined stream", combinedStream);

        recorder = new MediaRecorder(combinedStream, {
          mimeType: "video/webm;codecs=vp9,opus",
        });

        data = []; // reset data array

        // listen for data
        recorder.ondataavailable = (event) => {
          console.log("data available", event.data.size, "bytes");
          if (event.data.size > 0) {
            data.push(event.data);
          }
        };

        recorder.onstop = async () => {
          console.log("recording stopped, processing data");

          try {
            console.log("sending data to service worker, chunks:", data);

            const blobFile = new Blob(data, { type: "video/webm" });
            console.log("blob created", blobFile.size, "bytes");

            const url = URL.createObjectURL(blobFile);
            console.log("object url created", url);

            const base64 = await convertBlobToBase64(url);

            // window.open(url, "_blank");

            chrome.runtime.sendMessage({
              action: "open-tab",
              base64: base64,
              url: url,
              source: "desktop-recording",
              storage: "local",
            });

            console.log("video sent to service worker", response);

            // reset data
            data = [];
          } catch (error) {
            console.error("error processing recording", error);
          }
        };

        // set focus back to previous tab
        if (focusedTabId) {
          try {
            await chrome.tabs.update(focusedTabId, { active: true });
            console.log("focus returned to original tab", focusedTabId);
          } catch (tabError) {
            console.warn("could not return focus to tab", tabError);
          }
        }
      } catch (error) {
        console.error("error in desktop capture callback", error);
      }
    }
  );
}
