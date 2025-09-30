// check
const checkRecording = async (type) => {
    const recording = await chrome.storage.local.get(['recording', 'type'])
    const recordingStatus = recording.recording || false
    const recordingType = recording.type || ''
    console.log('recording status: ', recordingStatus, recordingType);
    return [recordingStatus, recordingType]
}

// update recording
const updateRecording = async (state, type) => {
    console.log('Update recording: ', type);
    if (state) {
        chrome.storage.local.set({
            recording: true,
            type
        })
    }
    else {
        chrome.storage.local.set({
            recording: false,
        })
    }
}

const startRecording = async (type) => {
    console.log('Start recording:', type);
    const currentState = await checkRecording(type)
    console.log('Current State: ', currentState);
    updateRecording(true, type)

    // set recording icon
    try {
        chrome.action.setIcon({ path: "./icons/icons8-recording-100.png" })
    } catch (error) {
        // Fallback to badge if icon fails
        chrome.action.setBadgeText({ text: "REC" });
        chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
        console.log('Using badge fallback:', error);
    }

    if (type === 'tab') {
        recordTabState(true)
    } else if (type === 'screen') {
        // recordScreen()
    }
}

const stopRecording = async (type) => {
    console.log('Stop Recording: ', type);
    updateRecording(false, '')
    // update the icon

    try {
        chrome.action.setIcon({ path: "./icons/icons8-recording-50.png" })
    } catch (error) {
        // Fallback to clear badge if icon fails
        chrome.action.setBadgeText({ text: "" });
        console.log('Using badge fallback:', error);
    }

    recordTabState(false)
}

const recordTabState = async (start = true) => {
    // setup our offscreen document
    const existingContexts = await chrome.runtime.getContexts({})
    const offscreenDocument = existingContexts.find(
        (c) => c.contextType === 'OFFSCREEN_DOCUMENT'
    )

    // If an offscreen document is not already open, create one
    if (!offscreenDocument) {
        // Create an offscreen document.
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA', "DISPLAY_MEDIA"],
            justification: 'Recording from chrome.tabCapture API'
        })
    }

    if (start) {
        // use the tabCapture API to get the stream
        // get the id of the active tab

        const tab = await chrome.tabs.query({
            active: true,
            currentWindow: true
        })

        const tabId = tab[0].id
        console.log('tab id', tabId);

        const streamId = await chrome.tabCapture.getMediaStreamId({
            targetTabId: tabId
        })

        console.log('Stream Id:', streamId);

        // send this to our offscreen document
        chrome.runtime.sendMessage({
            action: 'start-recording',
            target: 'offscreen',
            // type: 'recordTab',
            data: streamId
        })
    } else {
        chrome.runtime.sendMessage({
            action: 'stop-recording',
            target: 'offscreen'
        })
    }
}

// add listener for messages 
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('message received', request, sender, sendResponse);

    switch (request.action) {
        case 'start-recording':
            console.log('start recording', request.type);
            startRecording(request.type)
            break;
        case 'stop-recording':
            console.log('stop recording', request.type);
            stopRecording(request.type)
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
