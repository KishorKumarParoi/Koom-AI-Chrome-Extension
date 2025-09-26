const cameraId = 'koom-ai-camera'
const camera = document.getElementById(cameraId)

// check if camera exists
if (camera) {
    console.log('camera found', camera);
}
else {
    const cameraElement = document.createElement('iframe')
    cameraElement.id = cameraId
    cameraElement.setAttribute('style', `
        all: initial;
        position: fixed;
        width: 200px;
        height: 200px;
        top: 10px;
        right: 10px;
        border-radius: 100px;
        background: black;
        z-index: 9999999;
        `)

    // set permissions on iframe - camera and microphone
    cameraElement.setAttribute('allow', 'camera; microphone')

    cameraElement.src = chrome.runtime.getURL('camera.html')
    document.body.appendChild(cameraElement)
}