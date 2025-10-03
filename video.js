// to save the video to local storage
const saveVideo = async (videoUrl) => {
    try {
        await chrome.storage.local.set({ videoUrl });
        console.log('Video URL saved to storage:', videoUrl);
    } catch (error) {
        console.error('Error saving video URL:', error);
    }
};

const video = document.getElementById('recorder-video');
const statusDiv = document.getElementById('status');

let currentVideoUrl = null;
let currentBlob = null;

// Update status message
const updateStatus = (message, type = 'loading') => {
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${type}`;
    }
    console.log(`Status: ${message}`);
};

// ✅ FIXED: Play video function
const playVideo = async (message) => {
    try {
        console.log('Playing video with message:', message);

        if (!video) {
            throw new Error('Video element not found');
        }

        const url = message?.videoUrl || message?.base64;

        if (!url) {
            throw new Error('No video URL or base64 data provided');
        }

        updateStatus('Loading video...', 'loading');

        // Handle base64 data
        if (message.base64 && !message.videoUrl) {
            console.log('Converting base64 to blob...');
            const blob = await base64ToBlob(message.base64);
            const blobUrl = URL.createObjectURL(blob);
            currentVideoUrl = blobUrl;
            currentBlob = blob;
        } else {
            currentVideoUrl = url;
        }

        // Set video source
        video.src = currentVideoUrl;

        // Save to storage
        await saveVideo(currentVideoUrl);

        // Add event listeners
        video.addEventListener('loadstart', () => {
            updateStatus('Loading video...', 'loading');
        });

        video.addEventListener('canplay', () => {
            updateStatus('Video ready to play', 'success');
        });

        video.addEventListener('loadeddata', () => {
            updateStatus('Video loaded successfully', 'success');
            // Auto-play
            video.play().catch(error => {
                console.log('Auto-play prevented:', error);
                updateStatus('Click play to start video', 'success');
            });
        });

        video.addEventListener('error', (error) => {
            console.error('Video error:', error);
            updateStatus('Failed to load video', 'error');
        });

        console.log('Video setup completed');

    } catch (error) {
        console.error('Error playing video:', error);
        updateStatus(`Error: ${error.message}`, 'error');
    }
};

// ✅ ADDED: Convert base64 to blob
const base64ToBlob = async (base64Data) => {
    try {
        // Remove data URL prefix if present
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        // Convert base64 to binary
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'video/webm' });

    } catch (error) {
        console.error('Error converting base64 to blob:', error);
        throw new Error('Failed to convert video data');
    }
};

// ✅ ADDED: Download video function
const downloadVideo = () => {
    try {
        if (currentVideoUrl || currentBlob) {
            const a = document.createElement('a');
            a.href = currentVideoUrl;
            a.download = `koom-ai-recording-${new Date().getTime()}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            updateStatus('Download started!', 'success');
        } else {
            updateStatus('No video to download', 'error');
        }
    } catch (error) {
        console.error('Download failed:', error);
        updateStatus('Download failed', 'error');
    }
};

// ✅ ADDED: Restart video function
const restartVideo = () => {
    if (video && video.src) {
        video.currentTime = 0;
        video.play();
        updateStatus('Video restarted', 'success');
    }
};

// ✅ ADDED: Fullscreen function
const toggleFullscreen = () => {
    if (video.requestFullscreen) {
        video.requestFullscreen();
    } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
    } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
    }
};

// ✅ FIXED: Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Video player received message:', message);

    try {
        switch (message.type) {
            case 'play-video':
                playVideo(message);
                sendResponse({ success: true });
                break;
            default:
                console.log('Unknown message type:', message.type);
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    } catch (error) {
        console.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
    }

    return true; // Keep message channel open
});

// ✅ ADDED: Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Video player loaded');
    updateStatus('Waiting for video...', 'loading');

    // Check if there's a saved video in storage
    try {
        const result = await chrome.storage.local.get(['videoUrl']);
        if (result.videoUrl) {
            console.log('Found saved video, loading:', result.videoUrl);
            await playVideo({ videoUrl: result.videoUrl });
        }
    } catch (error) {
        console.error('Error loading saved video:', error);
    }

    // Signal to service worker that page is ready
    try {
        await chrome.runtime.sendMessage({
            action: 'video-player-ready'
        });
    } catch (error) {
        console.log('Could not signal ready state:', error);
    }
});

// ✅ ADDED: Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentVideoUrl && currentVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentVideoUrl);
    }
});

console.log('Video player script loaded');