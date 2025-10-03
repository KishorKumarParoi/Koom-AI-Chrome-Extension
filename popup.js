// Get DOM element references
const recordTabBtn = document.getElementById('recordTab');
const recordScreenBtn = document.getElementById('recordScreen');
const stopRecordingBtn = document.getElementById('stopRecording');
const statusDiv = document.getElementById('status');

// Webcam option buttons
const webcamShowBtn = document.getElementById('webcamShow');
const webcamHideBtn = document.getElementById('webcamHide');
const webcamPreview = document.getElementById('webcamPreview');

// Live camera control buttons
const liveControlsDiv = document.getElementById('liveControls');
const toggleCameraLiveBtn = document.getElementById('toggleCameraLive');
const hideCameraLiveBtn = document.getElementById('hideCameraLive');
const showCameraLiveBtn = document.getElementById('showCameraLive');

// Webcam setting state
let webcamEnabled = true; // Default: show webcam

const injectCamera = async () => {
    // inject the content script into the current page
    const tab = await chrome.tabs.query({
        active: true,
        currentWindow: true
    })

    if (!tab || !tab[0]) return;

    const tabId = tab[0].id;
    console.log('inject into tab', tabId);

    // listen for messages from the content script
    await chrome.scripting.executeScript({
        files: ['content.js'],
        target: { tabId }
    })
}


const removeCamera = async () => {
    // inject the content script into the current page
    const tab = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab)
        return

    const tabId = tab[0].id;
    console.log('inject into tab', tabId);

    await chrome.scripting.executeScript({
        // content.js is the file that will be injected
        func: () => {
            const camera = document.querySelector("#koom-ai-chrome-extension")
            if (!camera) return
            document.querySelector('#koom-ai-chrome-extension').style.display = 'none'
        },
        target: {
            tabId
        }
    })
}


// check chrome storage if recording is on
const checkRecording = async () => {
    const recording = await chrome.storage.local.get(['recording', 'type'])
    const recordingStatus = recording.recording || false
    const recordingType = recording.type || ''
    console.log('recording status: ', recordingStatus, recordingType);
    return [recordingStatus, recordingType]
}


const updateRecording = async (type) => {
    console.log('Update recording', type);

    try {
        const recordingState = await checkRecording()
        if (recordingState[0] === true) {
            // stop recording
            chrome.runtime.sendMessage({
                action: 'stop-recording',
            });
            chrome.storage.local.set({ recording: false, type: '' });
            removeCamera()
        } else {
            chrome.runtime.sendMessage({
                action: 'start-recording',
                type
            });
            chrome.storage.local.set({ recording: true, type });
            injectCamera();
        }

        // close popup
        window.close()
    } catch (error) {
        console.error('Failed to start recording:', error);
    }
}

// Update webcam option UI
const updateWebcamOptions = (enabled) => {
    webcamEnabled = enabled;

    if (enabled) {
        webcamShowBtn.classList.add('active');
        webcamHideBtn.classList.remove('active');
        webcamPreview.textContent = '✅ Webcam will be visible during recording';
        webcamPreview.style.color = '#4CAF50';
    } else {
        webcamShowBtn.classList.remove('active');
        webcamHideBtn.classList.add('active');
        webcamPreview.textContent = '❌ Webcam will be hidden during recording';
        webcamPreview.style.color = '#f44336';
    }

    // Save preference
    chrome.storage.local.set({ webcamEnabled });
};

// Update UI based on recording state
const updateUI = (isRecording, recordingType = '') => {
    if (isRecording) {
        recordTabBtn.style.display = 'none';
        recordScreenBtn.style.display = 'none';
        stopRecordingBtn.style.display = 'block';
        liveControlsDiv.style.display = 'block';

        const webcamStatus = webcamEnabled ? '(Webcam Visible)' : '(Webcam Hidden)';
        statusDiv.textContent = `🔴 Recording ${recordingType}... ${webcamStatus}`;
        statusDiv.className = 'status recording';
    } else {
        recordTabBtn.style.display = 'block';
        recordScreenBtn.style.display = 'block';
        stopRecordingBtn.style.display = 'none';
        liveControlsDiv.style.display = 'none';
        statusDiv.textContent = 'Ready to Record';
        statusDiv.className = 'status idle';
    }
};

const init = async () => {
    console.log('Hello World!!!');

    if (!recordTabBtn || !recordScreenBtn) {
        console.error('Required DOM elements not found!');
        return;
    }

    // Check recording state
    const recordingState = await checkRecording();
    console.log('recording state', recordingState);

    // Update UI based on recording state
    if (recordingState[0] === false) {
        console.log("Not recording - ready to start");
        recordTabBtn.textContent = 'Record Tab';
        recordScreenBtn.textContent = 'Record Screen';
        stopRecordingBtn.disabled = true;
    } else {
        if (recordingState[0] && recordingState[1] !== '') {
            console.log("Currently recording:", recordingState[1]);
            recordTabBtn.disabled = true;
            recordScreenBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            statusDiv.textContent = `Recording ${recordingState[1]}...`;
            statusDiv.className = 'status recording';
        }
    }

    // Load saved webcam preference
    chrome.storage.local.get(['webcamEnabled'], (result) => {
        const enabled = result.webcamEnabled !== undefined ? result.webcamEnabled : true;
        updateWebcamOptions(enabled);
    });

    // Check recording state on popup open
    chrome.runtime.sendMessage({ action: 'get-recording-state' }, (response) => {
        if (response && response.success) {
            updateUI(response.isRecording, response.recordingType);
        }
    });

    // Add event listeners
    recordTabBtn.addEventListener('click', async () => {
        try {
            statusDiv.textContent = 'Starting tab recording...';

            const response = await chrome.runtime.sendMessage({
                action: 'start-recording',
                type: 'tab',
                webcamEnabled: webcamEnabled // Pass webcam preference
            });

            if (response && response.success) {
                updateUI(true, 'Tab');
            } else {
                statusDiv.textContent = 'Failed to start recording';
                console.error('Recording failed:', response);
            }
        } catch (error) {
            statusDiv.textContent = 'Error starting recording';
            console.error('Error:', error);
        }
    });

    recordScreenBtn.addEventListener('click', async () => {
        try {
            statusDiv.textContent = 'Starting screen recording...';

            const response = await chrome.runtime.sendMessage({
                action: 'start-recording',
                type: 'screen',
                webcamEnabled: webcamEnabled // Pass webcam preference
            });

            if (response && response.success) {
                updateUI(true, 'Screen');
            } else {
                statusDiv.textContent = 'Failed to start recording';
                console.error('Recording failed:', response);
            }
        } catch (error) {
            statusDiv.textContent = 'Error starting recording';
            console.error('Error:', error);
        }
    });

    stopRecordingBtn.addEventListener('click', async () => {
        try {
            statusDiv.textContent = 'Stopping recording...';

            const response = await chrome.runtime.sendMessage({
                action: 'stop-recording',
                type: 'all'
            });

            if (response && response.success) {
                updateUI(false);
            } else {
                statusDiv.textContent = 'Failed to stop recording';
                console.error('Stop failed:', response);
            }
        } catch (error) {
            statusDiv.textContent = 'Error stopping recording';
            console.error('Error:', error);
        }
    });

    // Webcam option event listeners
    webcamShowBtn.addEventListener('click', () => {
        updateWebcamOptions(true);
    });

    webcamHideBtn.addEventListener('click', () => {
        updateWebcamOptions(false);
    });

    // Live camera control event listeners
    toggleCameraLiveBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'get-camera-status'
            });

            if (response && response.success) {
                const newAction = response.isVisible ? 'hide-camera' : 'show-camera';
                await chrome.tabs.sendMessage(tab.id, { action: newAction });

                const newStatus = response.isVisible ? 'hidden' : 'visible';
                statusDiv.textContent = `🔴 Recording... (Webcam ${newStatus})`;
            }
        } catch (error) {
            console.error('Error toggling camera:', error);
        }
    });

    hideCameraLiveBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'hide-camera' });
            statusDiv.textContent = '🔴 Recording... (Webcam hidden)';
        } catch (error) {
            console.error('Error hiding camera:', error);
        }
    });

    showCameraLiveBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.tabs.sendMessage(tab.id, { action: 'show-camera' });
            statusDiv.textContent = '🔴 Recording... (Webcam visible)';
        } catch (error) {
            console.error('Error showing camera:', error);
        }
    });
}

// Wait for DOM to load before initializing
// document.addEventListener('DOMContentLoaded', init);
init()