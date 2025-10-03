let mediaRecorder;
let recordedChunks = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Offscreen received message:', message);

    if (message.target !== 'offscreen') {
        return;
    }

    try {
        switch (message.action) {
            case 'start-recording':
                startRecording(message.data);
                sendResponse({ success: true });
                break;

            case 'stop-recording':
                stopRecording();
                sendResponse({ success: true });
                break;

            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('❌ Error in offscreen:', error);
        sendResponse({ success: false, error: error.message });
    }

    return true;
});

async function startRecording(streamId) {
    try {
        console.log('🎥 Starting offscreen recording with stream ID:', streamId);

        // Get the media stream from the stream ID
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        });

        console.log('✅ Stream obtained:', stream);

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            console.log('📊 Data available:', event.data.size, 'bytes');
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log('⏹️ Recording stopped, processing data...');

            try {
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                console.log('✅ Blob created:', blob.size, 'bytes');

                const url = URL.createObjectURL(blob);
                console.log('🔗 Object URL created:', url);

                // Send to service worker to open video player
                const response = await chrome.runtime.sendMessage({
                    action: 'open-tab',
                    url: url,
                    source: 'tab-recording',
                    storage: 'local'
                });

                console.log('📤 Video sent to service worker:', response);

            } catch (error) {
                console.error('❌ Error processing recording:', error);
            }
        };

        mediaRecorder.start(1000); // Collect data every second
        console.log('✅ Tab recording started');

    } catch (error) {
        console.error('❌ Error starting recording:', error);
    }
}

function stopRecording() {
    console.log('🛑 Stopping recording...');

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();

        // Stop all tracks
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => {
                track.stop();
                console.log('🔇 Track stopped:', track.kind);
            });
        }

        console.log('✅ Tab recording stopped');
    } else {
        console.log('⚠️ No active recording to stop');
    }
}