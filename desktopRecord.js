const convertBlobToBase64 = (blob) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const bas64data = reader.result;
            resolve(bas64data)
        }
    })
}

const fetchBlob = async (url) => {
    const response = await fetch(url)
    const blob = await response.blob()
    const base64 = await convertBlobToBase64(blob)
    return base64;
}



// listen for messages from the service worker - start recording - stop recording
chrome.runtime.onMessage.addListener(function (request, sender) {
    switch (request.type) {
        case 'start-recording':
            startRecording(request.focusedTabId)
            break;
        case 'stop-recording':
            stopRecording()
            break;
        default:
            console.log('default');
    }

    return true
})


let recorder;
let data = []

const stopRecording = () => {
    console.log('stop recording');
    if (recorder?.state === 'recording') {
        recorder.stop();

        // stop all streams 
        recorder.stream.getTracks().forEach((t) => t.stop())
    }
}

const startRecording = async (focusedTabId) => {
    // use desktopCapture to get the screen stream
    chrome.desktopCapture.chooseDesktopMedia(
        ["screen", "window"],
        async function (streamId) {
            if (streamId === null) {
                return
            }

            // have stream id
            console.log('Stream id from desktop capture', streamId);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    mandatory: {
                        chromeMediaSource: "desktop",
                        chromeMediaSourceId: streamId
                    }
                },
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: streamId
                    }
                }
            });

            console.log('stream from desktop capture: ', stream);

            // get the microphone stream
            const microphone = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false
                }
            })

            // check that the microphone stream has audio tracks
            if (microphone.getAudioTracks().length !== 0) {
                const combinedStream = new MediaStream([
                    stream.getVideoTracks()[0],
                    microphone.getAudioTracks()[0]
                ])

                console.log('combined stream: ', combinedStream);

                recorder = new MediaRecorder(combinedStream, {
                    mimeType: "video/webm"
                })

                // listen for data
                recorder.ondataavailable = (event) => {
                    console.log('Data Available: ', event);
                    data.push(event.data)
                }

                // listen for when recording stops
                recording.onstop = async () => {
                    console.log('recording stopped');

                    // send the data to the service worker
                    console.log('Sending data to service worker', data);

                    const blobFile = new Blob(data, { type: "video/webm" })
                    const base64 = await fetchBlob(URL.createObjectURL(blobFile))

                    // send message to service worker to open tab
                    console.log('Send message to open tab', base64);
                    chrome.runtime.sendMessage({ type: 'open-tab', base64 })

                    // convert this into a blog and a open window
                    const blob = new Blob(data, { type: "video/webm" })
                    const url = URL.createObjectURL(blob)
                    window.open(url)

                    data = []
                }

                // start recording
                recorder.start();

                // set focus back to the previous tab
                if (focusedTabId) {
                    chrome.tabs.update(focusedTabId, { active: true })
                }
            }

        }
    )
}