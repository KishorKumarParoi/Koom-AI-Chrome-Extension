// Get DOM element references
const recordTab = document.getElementById('recordTab');
const recordScreen = document.getElementById('recordScreen');
const stopBtn = document.getElementById('stopRecording');
const statusDiv = document.getElementById('status');

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

const init = async () => {
    console.log('Hello World!!!');

    if (!recordTab || !recordScreen) {
        console.error('Required DOM elements not found!');
        return;
    }

    // Check recording state
    const recordingState = await checkRecording();
    console.log('recording state', recordingState);

    // Update UI based on recording state
    if (recordingState[0] === false) {
        console.log("Not recording - ready to start");
        recordTab.textContent = 'Record Tab';
        recordScreen.textContent = 'Record Screen';
        stopBtn.disabled = true;
    } else {
        if (recordingState[0] && recordingState[1] !== '') {
            console.log("Currently recording:", recordingState[1]);
            recordTab.disabled = true;
            recordScreen.disabled = true;
            stopBtn.disabled = false;
            statusDiv.textContent = `Recording ${recordingState[1]}...`;
            statusDiv.className = 'status recording';
        }
    }

    // Add event listeners
    recordTab.addEventListener('click', () => {
        console.log('record tab clicked');
        updateRecording('tab');
    });

    recordScreen.addEventListener('click', () => {
        console.log('record screen clicked');
        updateRecording('screen');
    });

    stopBtn.addEventListener('click', async () => {
        console.log('stop recording clicked');
        try {
            chrome.runtime.sendMessage({ action: 'stop-recording' });
            chrome.storage.local.set({ recording: false, type: '' });
            // await removeCamera(); 
            window.location.reload();
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    });
}

// Wait for DOM to load before initializing
// document.addEventListener('DOMContentLoaded', init);
init()