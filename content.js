if (!window.koomAIContentLoaded) {
    // ✅ MARK AS LOADED
    window.koomAIContentLoaded = true;

    window.koomAI = window.koomAI || {
        cameraId: 'koom-ai-camera',
        containerId: 'koom-ai-chrome-extension',
        isVisible: false,
        initialized: false
    }

    const { cameraId, containerId } = window.koomAI

    try {
        // Create main container if it doesn't exist
        let container = document.getElementById(containerId)
        if (!container) {
            container = document.createElement('div')
            container.id = containerId
            container.style.cssText = `
            all: initial;
            position: fixed;
            top: 0;
            right: 0;
            z-index: 9999998;
            pointer-events: none;
        `
            document.body.appendChild(container)
            console.log('Container created');
        }

        // Check if camera exists
        let camera = document.getElementById(cameraId)
        if (camera) {
            console.log('camera found', camera);
            container.style.display = 'block'
            window.koomAI.isVisible = true;
            window.koomAI.initialized = true;
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
            opacity: 0.9;
            transition: all 0.3s ease;
        `)

            // set permissions on iframe - camera and microphone
            cameraElement.setAttribute('allow', 'camera; microphone')
            cameraElement.src = chrome.runtime.getURL('camera.html')

            // ✅ ADD HOVER EFFECTS
            cameraElement.addEventListener('mouseenter', () => {
                cameraElement.style.opacity = '1';
                cameraElement.style.transform = 'scale(1.05)';
            });

            cameraElement.addEventListener('mouseleave', () => {
                cameraElement.style.opacity = '0.9';
                cameraElement.style.transform = 'scale(1)';
            });

            container.appendChild(cameraElement)
            container.style.display = 'block'
            window.koomAI.isVisible = true;
            window.koomAI.initialized = true;

            console.log('Camera created and added to page');
        }

        // ✅ ADD UTILITY FUNCTIONS
        window.koomAI.showCamera = () => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'block';
                window.koomAI.isVisible = true;
                return true;
            }
            return false;
        };

        window.koomAI.hideCamera = () => {
            const container = document.getElementById(containerId);
            if (container) {
                container.style.display = 'none';
                window.koomAI.isVisible = false;
                return true;
            }
            return false;
        };

        window.koomAI.removeCamera = () => {
            const camera = document.getElementById(cameraId);
            const container = document.getElementById(containerId);

            if (camera) {
                camera.remove();
                console.log('Camera element removed');
            }

            if (container && container.children.length === 0) {
                container.remove();
                console.log('Empty container removed');
            }

            window.koomAI.isVisible = false;
            window.koomAI.initialized = false;
            return true;
        };

    } catch (error) {
        console.error('Error initializing camera:', error);
    }

} else {
    console.log('Koom AI content script already loaded');

    // Show existing camera if it exists
    if (window.koomAI && window.koomAI.isVisible) {
        const container = document.getElementById(window.koomAI.containerId);
        if (container) {
            container.style.display = 'block';
        }
    }
}

// ✅ ADD MESSAGE LISTENER
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    try {
        if (!window.koomAI) {
            sendResponse({ success: false, error: 'koomAI not initialized' });
            return true;
        }

        switch (message.action) {
            case 'show-camera':
                const showResult = window.koomAI.showCamera();
                sendResponse({ success: showResult });
                break;

            case 'hide-camera':
                const hideResult = window.koomAI.hideCamera();
                sendResponse({ success: hideResult });
                break;

            case 'remove-camera':
                const removeResult = window.koomAI.removeCamera();
                sendResponse({ success: removeResult });
                break;

            case 'get-camera-status':
                sendResponse({
                    success: true,
                    isVisible: window.koomAI.isVisible,
                    initialized: window.koomAI.initialized
                });
                break;

            default:
                sendResponse({ success: false, error: `Unknown action: ${message.action}` });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }

    return true;
});

console.log('Koom AI content script loaded');