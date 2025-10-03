window.koomAI = window.koomAI || {
    cameraId: 'koom-ai-camera',
    containerId: 'koom-ai-chrome-extension'
}

const { cameraId, containerId } = window.koomAI

// Create main container if it doesn't exist
let container = document.getElementById(containerId)
if (!container) {
    container = document.createElement('div')
    container.id = containerId
    container.style.cssText = `
        all: initial;
        position: fixed;
        z-index: 9999998;
        pointer-events: none;
    `
    document.body.appendChild(container)
}

// Check if camera exists
let camera = document.getElementById(cameraId)
if (camera) {
    console.log('camera found', camera);
    container.style.display = 'block'
} else {
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
        pointer-events: auto;
        border: 3px solid #ff6b6b;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `)

    // set permissions on iframe - camera and microphone
    cameraElement.setAttribute('allow', 'camera; microphone')
    cameraElement.src = chrome.runtime.getURL('camera.html')

    container.appendChild(cameraElement)
    container.style.display = 'block'
}