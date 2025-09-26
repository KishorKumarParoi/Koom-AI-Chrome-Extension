const runCode = async () => {
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

// check chrome storage if recording is on
const checkRecording = async () => {
    const recording = await chrome.storage.local.get(['recording', 'type'])
    const recordingStatus = recording.recording || false
    const recordingType = recording.type || ''
    console.log('recording status: ', recordingStatus, recordingType);
    return [recordingStatus, recordingType]
}

const startRecording = async (type) => {
    console.log('start recording', type);
    try {
        await chrome.runtime.sendMessage({
            action: 'startRecording',
            type: type
        })
        // Update UI after starting recording
        await chrome.storage.local.set({ recording: true, type: type });
    } catch (error) {
        console.error('Failed to start recording:', error);
    }
}

const init = async () => {
    console.log('Hello World!!!');

    // Get DOM element references
    const recordTab = document.getElementById('recordTab');
    const recordScreen = document.getElementById('recordScreen');
    const stopBtn = document.getElementById('stopRecording');
    const statusDiv = document.getElementById('status');

    // Debug: Check if elements exist
    console.log('recordTab:', recordTab);
    console.log('recordScreen:', recordScreen);
    console.log('stopBtn:', stopBtn);
    console.log('statusDiv:', statusDiv);

    if (!recordTab || !recordScreen) {
        console.error('Required DOM elements not found!');
        return;
    }

    // Run the content script injection
    await runCode();

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
        console.log("Currently recording:", recordingState[1]);
        recordTab.disabled = true;
        recordScreen.disabled = true;
        stopBtn.disabled = false;
        statusDiv.textContent = `Recording ${recordingState[1]}...`;
        statusDiv.className = 'status recording';
    }

    // Add event listeners
    recordTab.addEventListener('click', () => {
        console.log('record tab clicked');
        startRecording('tab');
    });

    recordScreen.addEventListener('click', () => {
        console.log('record screen clicked');
        startRecording('screen');
    });

    stopBtn.addEventListener('click', async () => {
        console.log('stop recording clicked');
        try {
            await chrome.runtime.sendMessage({ action: 'stopRecording' });
            await chrome.storage.local.set({ recording: false, type: '' });
            // Refresh the popup
            window.location.reload();
        } catch (error) {
            console.error('Failed to stop recording:', error);
        }
    });
}

// Wait for DOM to load before initializing
// document.addEventListener('DOMContentLoaded', init);
init()