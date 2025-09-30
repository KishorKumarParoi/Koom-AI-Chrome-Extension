// listen for messages from the service worker

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[offscreen] message received', message, sender);

    switch (message.action) {
        case 'start-recording':
            // startRecording(message.type)
            console.log(('offscreen start recording tab', message.action));
            break;
        case 'stop-recording':
            // stopRecording(message.action)
            console.log('offscreen stop recording tab', message.action);
            break;
        default:
            console.log('default');
    }
})