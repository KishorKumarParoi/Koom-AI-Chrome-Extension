// let mediaRecorder;
// let recordedChunks = [];

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   console.log("📨 Offscreen received message:", message);

//   if (message.target !== "offscreen") {
//     return;
//   }

//   try {
//     switch (message.action) {
//       case "start-recording":
//         startRecording(message.data);
//         sendResponse({ success: true });
//         break;

//       case "stop-recording":
//         stopRecording();
//         sendResponse({ success: true });
//         break;

//       default:
//         sendResponse({ success: false, error: "Unknown action" });
//     }
//   } catch (error) {
//     console.error("❌ Error in offscreen:", error);
//     sendResponse({ success: false, error: error.message });
//   }

//   return true;
// });

// async function startRecording(streamId) {
//   try {
//     console.log("🎥 Starting offscreen recording with stream ID:", streamId);

//     // Get the media stream from the stream ID
//     const stream = await navigator.mediaDevices.getUserMedia({
//       audio: {
//         mandatory: {
//           chromeMediaSource: "tab",
//           chromeMediaSourceId: streamId,
//         },
//       },
//       video: {
//         mandatory: {
//           chromeMediaSource: "tab",
//           chromeMediaSourceId: streamId,
//         },
//       },
//     });

//     console.log("✅ Stream obtained:", stream);

//     mediaRecorder = new MediaRecorder(stream, {
//       mimeType: "video/webm;codecs=vp9,opus",
//     });

//     recordedChunks = [];

//     mediaRecorder.ondataavailable = (event) => {
//       console.log("📊 Data available:", event.data.size, "bytes");
//       if (event.data.size > 0) {
//         recordedChunks.push(event.data);
//       }
//     };

//     mediaRecorder.onstop = async () => {
//       console.log("⏹️ Recording stopped, processing data...");

//       try {
//         const blob = new Blob(recordedChunks, { type: "video/webm" });
//         console.log("✅ Blob created:", blob.size, "bytes");

//         const url = URL.createObjectURL(blob);
//         console.log("🔗 Object URL created:", url);

//         // Send to service worker to open video player
//         const response = await chrome.runtime.sendMessage({
//           action: "open-tab",
//           url: url,
//           source: "tab-recording",
//           storage: "local",
//         });

//         console.log("📤 Video sent to service worker:", response);
//       } catch (error) {
//         console.error("❌ Error processing recording:", error);
//       }
//     };

//     mediaRecorder.start(1000); // Collect data every second
//     console.log("✅ Tab recording started");
//   } catch (error) {
//     console.error("❌ Error starting recording:", error);
//   }
// }

// function stopRecording() {
//   console.log("🛑 Stopping recording...");

//   if (mediaRecorder && mediaRecorder.state === "recording") {
//     mediaRecorder.stop();

//     // Stop all tracks
//     if (mediaRecorder.stream) {
//       mediaRecorder.stream.getTracks().forEach((track) => {
//         track.stop();
//         console.log("🔇 Track stopped:", track.kind);
//       });
//     }

//     console.log("✅ Tab recording stopped");
//   } else {
//     console.log("⚠️ No active recording to stop");
//   }
// }

let data = [];
let recorder = null;

async function stopRecording() {
  if (recorder?.state === "recording") {
    recorder.stop();
    // stop all tracks
    recorder.stream.getTracks().forEach((track) => track.stop());
    console.log("Recording stopped from offscreen");
  } else {
    console.log("No active recording to stop from offscreen");
  }
}

async function startRecording(streamId) {
  if (recorder?.state === "recording") {
    throw new Error("Recording already in progress");
  }

  console.log("Starting recording with stream ID:", streamId);

  // use the tab capture stream id to get the media stream
  const media = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
  });

  // get microphone audio and combine with tab audio
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false },
  });

  // combine the two audio streams
  const mixedContext = new AudioContext();
  const destination = mixedContext.createMediaStreamDestination();

  mixedContext.createMediaStreamSource(mic).connect(destination);
  mixedContext.createMediaStreamSource(media).connect(destination);

  const combinedStream = new MediaStream([
    ...media.getVideoTracks()[0],
    ...destination.stream.getAudioTracks()[0],
  ]);

  console.log("Media stream obtained:", combinedStream);

  recorder = new MediaRecorder(combinedStream, {
    mimeType: "video/webm;codecs=vp9,opus",
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      data.push(event.data);
      console.log("Data available:", event.data.size, "bytes");
    }
  };

  recorder.onstop = async () => {
    console.log("Recording stopped, processing data...");

    // create a blob from the recorded data
    const blob = new Blob(data, { type: "video/webm" });
    console.log("Blob created:", blob.size, "bytes");

    // create an object url from the blob
    const url = URL.createObjectURL(blob);
    console.log("Object URL created:", url);

    // open the url in a new tab
    // window.open(url, "_blank");

    // send this to service worker to open in new tab
    chrome.runtime.sendMessage({
      action: "open-tab",
      url: url,
      source: "offscreen-recording",
      storage: "local",
    });

    // console.log("Video sent to service worker:", response);

    // clear recorded data
    data = [];
  };

  recorder.start(1000); // collect data every second
  console.log("Recording started");
  return true;
}

// listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Offscreen received message:", message, sender, sendResponse);

  switch (message.action) {
    case "start-recording":
      console.log("Starting recording with stream ID:", message.data);
      startRecording(message.data);
      break;
    case "stop-recording":
      console.log("Stopping recording");
      stopRecording();
      break;
    default:
      console.warn("Unknown action in offscreen:", message.action);
  }

  return true;
});
