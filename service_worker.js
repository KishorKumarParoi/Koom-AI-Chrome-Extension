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
            type: ''
        })
    }
}

const injectCamera = async () => {
    try {
        // inject the content script into the current page
        const tab = await chrome.tabs.query({
            active: true, currentWindow: true
        })

        if (!tab || tab.length === 0) return false
        const tabId = tab[0].id;
        const tabUrl = tab[0].url;

        console.log('inject into tab', tabId, tabUrl);

        // Check for restricted URLs
        if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('about:')) {
            console.log('Cannot inject into restricted URL:', tabUrl);
            return false;
        }

        await chrome.scripting.executeScript({
            files: ["content.js"],
            target: { tabId }
        })

        return true;
    } catch (error) {
        console.error('Error injecting camera:', error);
        return false;
    }
}

const removeCamera = async () => {
    try {
        // inject the content script into the current page
        const tab = await chrome.tabs.query({ active: true, currentWindow: true })
        if (!tab || tab.length === 0) return false

        const tabId = tab[0].id;
        const tabUrl = tab[0].url;
        console.log('remove camera from tab', tabId, tabUrl);

        // Check for restricted URLs
        if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://') || tabUrl.startsWith('about:')) {
            console.log('Cannot remove camera from restricted URL:', tabUrl);
            return false;
        }

        await chrome.scripting.executeScript({
            func: () => {
                // Remove camera elements properly
                const camera = document.getElementById('koom-ai-camera');
                if (camera) {
                    camera.remove();
                    console.log('Camera removed');
                }

                const container = document.getElementById('koom-ai-chrome-extension');
                if (container && container.children.length === 0) {
                    container.remove();
                    console.log('Container removed');
                }
            },
            target: { tabId }
        })

        return true;
    } catch (error) {
        console.error('Error removing camera:', error);
        return false;
    }
}

// listen for changes to the focused / current tab
chrome.tabs.onActivated.addListener(async (activeInfo, tab) => {
    console.log('tab activated', activeInfo);

    try {
        // grab the tab
        const activeTab = await chrome.tabs.get(activeInfo.tabId)
        if (!activeTab) {
            return
        }

        const tabUrl = activeTab.url;
        // if chrome or extension page, return
        if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('chrome-extension://')) {
            console.log('chrome or extension page - exiting');
            return
        }

        // check if we are recording & if we are recording the screen
        const [recording, recordingType] = await checkRecording()

        if (recording && recordingType === 'tab') {  // ✅ FIXED: Changed 'screen' to 'tab'
            // inject the camera for tab recording
            await injectCamera()
        } else {
            // remove the camera
            await removeCamera()
        }
    } catch (error) {
        console.error('Error in tab activation listener:', error);
    }
})

const startRecording = async (type, webcamEnabled = true) => {
    try {
        console.log('Start recording:', type, 'Webcam enabled:', webcamEnabled);
        const currentState = await checkRecording(type)
        console.log('Current State: ', currentState);
        await updateRecording(true, type)

        // Save webcam preference for this recording session
        await chrome.storage.local.set({ currentWebcamEnabled: webcamEnabled });

        // set recording icon
        try {
            await chrome.action.setIcon({ path: "./icons/icons8-recording-100.png" })
        } catch (error) {
            // Fallback to badge if icon fails
            await chrome.action.setBadgeText({ text: "REC" });
            await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
            console.log('Using badge fallback:', error);
        }

        if (type === 'tab') {
            await recordTabState(true)

            // Handle webcam based on user preference
            if (webcamEnabled) {
                await injectCamera(); // Show webcam
                console.log('📹 Webcam overlay enabled for recording');
            } else {
                await hideCamera(); // Hide webcam
                console.log('🙈 Webcam overlay disabled for recording');
            }
        } else if (type === 'screen') {
            await recordScreen()
        }

        return { success: true, type, webcamEnabled };
    } catch (error) {
        console.error('Error starting recording:', error);
        await updateRecording(false, '');
        throw error;
    }
}

const stopRecording = async (type) => {
    try {
        console.log('Stop Recording: ', type);
        await updateRecording(false, '')

        // Get the webcam preference for this session
        const result = await chrome.storage.local.get(['currentWebcamEnabled']);
        const wasWebcamEnabled = result.currentWebcamEnabled !== undefined ? result.currentWebcamEnabled : true;

        // update the icon
        try {
            await chrome.action.setIcon({ path: "./icons/icons8-recording-50.png" })
        } catch (error) {
            // Fallback to clear badge if icon fails
            await chrome.action.setBadgeText({ text: "" });
            console.log('Using badge fallback:', error);
        }

        await recordTabState(false)

        // Show webcam again after recording (default behavior)
        if (wasWebcamEnabled) {
            await injectCamera(); // Show webcam again
            console.log('📹 Webcam overlay restored after recording');
        } else {
            await removeCamera(); // Remove webcam completely
            console.log('🗑️ Webcam overlay removed after recording');
        }

        // Clear session preference
        await chrome.storage.local.remove(['currentWebcamEnabled']);

        return { success: true, type };
    } catch (error) {
        console.error('Error stopping recording:', error);
        throw error;
    }
}

const recordScreen = async () => {
    try {
        console.log('Starting screen recording...');

        // create a pinned focused tab - with an index of 0
        const desktopRecordPath = chrome.runtime.getURL("desktopRecord.html")
        const currentTab = await chrome.tabs.query({ active: true, currentWindow: true })
        const currentTabId = currentTab[0].id;

        const newTab = await chrome.tabs.create({
            url: desktopRecordPath,
            pinned: true,
            active: true,
            index: 0
        })

        console.log('Desktop record tab created:', newTab.id);

        await waitForTabLoad(newTab.id);

        // Send message to start recording
        const response = await chrome.tabs.sendMessage(newTab.id, {
            type: 'start-recording',
            focusedTabId: currentTabId
        });

        console.log('Screen recording message sent:', response);
        return { success: true, tabId: newTab.id };

    } catch (error) {
        console.error('Error starting screen recording:', error);
        await updateRecording(false, '');
        throw error;
    }
}

const waitForTabLoad = (tabId) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('Tab load timeout after 10 seconds'));
        }, 10000);

        const listener = (updatedTabId, changeInfo, tab) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                clearTimeout(timeout);
                chrome.tabs.onUpdated.removeListener(listener);

                // Additional delay to ensure scripts are loaded
                setTimeout(() => {
                    resolve(tab);
                }, 1000);  // Increased delay for better reliability
            }
        };

        chrome.tabs.onUpdated.addListener(listener);
    });
};

const recordTabState = async (start = true) => {
    try {
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
            const response = await chrome.runtime.sendMessage({
                action: 'start-recording',
                target: 'offscreen',
                data: streamId
            })

            console.log('Offscreen recording started:', response);
        } else {
            const response = await chrome.runtime.sendMessage({
                action: 'stop-recording',
                target: 'offscreen'
            })

            console.log('Offscreen recording stopped:', response);
        }

        return { success: true };
    } catch (error) {
        console.error('Error in recordTabState:', error);
        throw error;
    }
}

const openTabWithVideo = async (message) => {
    try {
        console.log('🎬 Opening video tab with:', message);

        // Validate message has video data
        const { url: videoUrl, base64 } = message;
        if (!videoUrl && !base64) {
            console.error('❌ No video URL or base64 provided');
            throw new Error('No video URL or base64 provided');
        }

        // Create video player tab
        const videoPlayerUrl = chrome.runtime.getURL('video.html');
        console.log('📄 Creating video tab with URL:', videoPlayerUrl);

        const newTab = await chrome.tabs.create({
            url: videoPlayerUrl,
            active: true
        });

        console.log('✅ Video tab created with ID:', newTab.id);

        // Wait for tab to load properly
        console.log('⏳ Waiting for tab to load...');
        await waitForTabLoad(newTab.id);

        // Send video data to the tab
        console.log('📤 Sending video data to tab...');
        const response = await chrome.tabs.sendMessage(newTab.id, {
            type: 'play-video',
            videoUrl: videoUrl,
            base64: base64,
            storage: message.storage || 'local',
            source: message.source || 'recording'
        });

        console.log('✅ Video data sent successfully:', response);
        return { success: true, tabId: newTab.id };

    } catch (error) {
        console.error('❌ Error opening video tab:', error);

        // Show error feedback
        try {
            await chrome.action.setBadgeText({ text: "✗" });
            await chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });

            setTimeout(async () => {
                await chrome.action.setBadgeText({ text: "" });
            }, 3000);
        } catch (badgeError) {
            console.error('Error setting badge:', badgeError);
        }

        throw error;
    }
};

// add listener for messages 
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('message received', request, sender);

    const handleAsync = async () => {
        try {
            switch (request.action) {
                case 'open-tab':
                    const openResult = await openTabWithVideo(request);
                    sendResponse({ success: true, ...openResult });
                    break;
                case 'start-recording':
                    console.log('start recording', request.type, 'webcam:', request.webcamEnabled);
                    const startResult = await startRecording(request.type, request.webcamEnabled);
                    sendResponse({ success: true, ...startResult });
                    break;
                case 'stop-recording':
                    console.log('stop recording', request.type);
                    const stopResult = await stopRecording(request.type);
                    console.log('Recording stopped successfully');
                    sendResponse({ success: true, ...stopResult });
                    break;
                case 'get-recording-state':
                    const [isRecording, recordingType] = await checkRecording();
                    const webcamResult = await chrome.storage.local.get(['currentWebcamEnabled']);
                    sendResponse({
                        success: true,
                        isRecording,
                        recordingType,
                        webcamEnabled: webcamResult.currentWebcamEnabled !== undefined ? webcamResult.currentWebcamEnabled : true
                    });
                    break;
                case 'desktop-record-ready':
                    console.log('Desktop record page is ready');
                    sendResponse({ success: true });
                    break;
                default:
                    console.log('Unknown action:', request.action);
                    sendResponse({
                        success: false,
                        error: `Unknown action: ${request.action}`
                    });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    };

    handleAsync();
    return true; // Keep message channel open for async response
})

chrome.runtime.onInstalled.addListener(() => {
    console.log('Koom AI Extension installed');
});
