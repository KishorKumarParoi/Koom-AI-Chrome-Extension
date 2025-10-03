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

// ✅ FIXED: Better video error handling
const handleVideoError = (event) => {
    const video = event.target;
    let errorMessage = 'Unknown video error';
    let errorDetails = '';

    if (video.error) {
        switch (video.error.code) {
            case video.error.MEDIA_ERR_ABORTED:
                errorMessage = 'Video loading aborted';
                errorDetails = 'The video loading was aborted by the user';
                break;
            case video.error.MEDIA_ERR_NETWORK:
                errorMessage = 'Network error';
                errorDetails = 'A network error occurred while loading the video';
                break;
            case video.error.MEDIA_ERR_DECODE:
                errorMessage = 'Video decode error';
                errorDetails = 'The video could not be decoded - format may be unsupported';
                break;
            case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = 'Video format not supported';
                errorDetails = 'The video format or MIME type is not supported';
                break;
            default:
                errorMessage = 'Unknown video error';
                errorDetails = `Error code: ${video.error.code}`;
        }

        if (video.error.message) {
            errorDetails += ` - ${video.error.message}`;
        }
    }

    console.error('Video error details:', {
        message: errorMessage,
        details: errorDetails,
        code: video.error?.code,
        src: video.src,
        currentVideoUrl: currentVideoUrl,
        videoElement: video
    });

    updateStatus(`${errorMessage}: ${errorDetails}`, 'error');
};

// ✅  Play video function with better error handling
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

        // Clear any existing event listeners to prevent multiple bindings
        video.removeEventListener('error', handleVideoError);

        // Handle base64 data
        if (message.base64 && !message.videoUrl) {
            console.log('Converting base64 to blob...');
            try {
                const blob = await base64ToBlob(message.base64);
                const blobUrl = URL.createObjectURL(blob);
                currentVideoUrl = blobUrl;
                currentBlob = blob;
                console.log('Base64 converted to blob URL:', blobUrl);
            } catch (blobError) {
                throw new Error(`Failed to convert base64 to blob: ${blobError.message}`);
            }
        } else {
            currentVideoUrl = url;
            console.log('Using direct video URL:', currentVideoUrl);
        }

        // ✅  Better validation of video URL
        if (!currentVideoUrl || currentVideoUrl === 'undefined') {
            throw new Error('Invalid video URL generated');
        }

        // Set video source
        video.src = currentVideoUrl;
        console.log('Video source set to:', video.src);

        // Save to storage
        await saveVideo(currentVideoUrl);

        // ✅  Add event listeners with better error handling
        video.addEventListener('loadstart', () => {
            console.log('Video load started');
            updateStatus('Loading video...', 'loading');
        });

        video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded', {
                duration: video.duration,
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight
            });
        });

        video.addEventListener('canplay', () => {
            console.log('Video can start playing');
            updateStatus('Video ready to play', 'success');
        });

        video.addEventListener('loadeddata', () => {
            console.log('Video data loaded');
            updateStatus('Video loaded successfully', 'success');

            // Auto-play with better error handling
            video.play().then(() => {
                console.log('Video started playing automatically');
            }).catch(playError => {
                console.log('Auto-play prevented by browser:', playError);
                updateStatus('Click play to start video', 'success');
            });
        });

        video.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                const buffered = video.buffered.end(0) / video.duration * 100;
                console.log(`Video buffered: ${buffered.toFixed(1)}%`);
            }
        });

        // ✅ FIXED: Better error event listener
        video.addEventListener('error', handleVideoError);

        // ✅ ADDED: Additional debugging events
        video.addEventListener('stalled', () => {
            console.warn('Video download stalled');
            updateStatus('Video loading stalled...', 'loading');
        });

        video.addEventListener('waiting', () => {
            console.log('Video waiting for more data');
            updateStatus('Buffering video...', 'loading');
        });

        video.addEventListener('playing', () => {
            console.log('Video is playing');
            updateStatus('Video playing', 'success');
        });

        console.log('Video setup completed');

    } catch (error) {
        console.error('Error in playVideo function:', error);
        updateStatus(`Setup Error: ${error.message}`, 'error');
    }
};

// ✅  Convert base64 to blob with better error handling
const base64ToBlob = async (base64Data) => {
    try {
        console.log('Converting base64 to blob, data length:', base64Data.length);

        // Remove data URL prefix if present
        const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

        if (!base64 || base64.length === 0) {
            throw new Error('Empty base64 data provided');
        }

        // Convert base64 to binary
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'video/webm' });

        console.log('Blob created successfully:', {
            size: blob.size,
            type: blob.type
        });

        return blob;

    } catch (error) {
        console.error('Error converting base64 to blob:', error);
        throw new Error(`Failed to convert video data: ${error.message}`);
    }
};

// ✅  Download video function
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
            console.log('Download initiated for:', currentVideoUrl);
        } else {
            updateStatus('No video to download', 'error');
            console.warn('No video available for download');
        }
    } catch (error) {
        console.error('Download failed:', error);
        updateStatus('Download failed', 'error');
    }
};

// ✅  Restart video function
const restartVideo = () => {
    if (video && video.src) {
        video.currentTime = 0;
        video.play().then(() => {
            updateStatus('Video restarted', 'success');
            console.log('Video restarted successfully');
        }).catch(error => {
            console.error('Failed to restart video:', error);
            updateStatus('Failed to restart video', 'error');
        });
    } else {
        updateStatus('No video to restart', 'error');
        console.warn('No video source available to restart');
    }
};

// ✅ ADDED: Fullscreen function
const toggleFullscreen = () => {
    try {
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
            video.msRequestFullscreen();
        } else {
            updateStatus('Fullscreen not supported', 'error');
            return;
        }
        console.log('Fullscreen requested');
    } catch (error) {
        console.error('Fullscreen failed:', error);
        updateStatus('Fullscreen failed', 'error');
    }
};

// ✅  Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Video player received message:', message);

    try {
        switch (message.type) {
            case 'play-video':
                playVideo(message).then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    console.error('Play video failed:', error);
                    sendResponse({ success: false, error: error.message });
                });
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

// ✅  Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Video player DOM loaded');
    updateStatus('Waiting for video...', 'loading');

    // ✅ ADDED: Check if video element exists
    if (!video) {
        console.error('Video element not found in DOM');
        updateStatus('Video element not found', 'error');
        return;
    }

    console.log('Video element found:', {
        id: video.id,
        tagName: video.tagName,
        controls: video.controls
    });

    // Check if there's a saved video in storage
    try {
        const result = await chrome.storage.local.get(['videoUrl']);
        if (result.videoUrl) {
            console.log('Found saved video in storage, loading:', result.videoUrl);
            await playVideo({ videoUrl: result.videoUrl });
        } else {
            console.log('No saved video found in storage');
        }
    } catch (error) {
        console.error('Error loading saved video:', error);
        updateStatus('Error loading saved video', 'error');
    }

    // Signal to service worker that page is ready
    try {
        await chrome.runtime.sendMessage({
            action: 'video-player-ready'
        });
        console.log('Signaled service worker that video player is ready');
    } catch (error) {
        console.log('Could not signal ready state:', error);
    }
});

// ✅ ADDED: Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (currentVideoUrl && currentVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentVideoUrl);
        console.log('Cleaned up blob URL on page unload');
    }
});

console.log('Video player script loaded and ready');