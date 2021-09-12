

/**
 @typedef VideoStreamRecord
 @type {object}
 @property {string} id - the stream id.
 @property {HTMLVideoElement} videoElement
 @property {MediaStream} stream
 @property {MediaStreamTrack} track
 /*



 /**
 * @param {MediaStreamTrack} video
 * @param {MediaStreamTrack?} audio
 * @param {number} durationMillis
 **/
async function recordClip(video, audio, durationMillis) {

    return new Promise((resolve) => {
        const mediaStream = new MediaStream();
        mediaStream.addTrack(video);
        if (audio) {
            mediaStream.addTrack(audio);
        }

        const options = {
            audioBitsPerSecond : 128000,
            videoBitsPerSecond : 500000,
            mimeType : 'video/webm;codecs=vp8,vp9,opus'
        };
        const recorder = new MediaRecorder(mediaStream, options);



// start recording here...
        recorder.start();
        window.setTimeout(() => recorder.stop(), durationMillis);

        recorder.addEventListener('dataavailable', (e) => {
            const videoData = [ e.data ];
            const blob = new Blob(videoData, { 'type': 'video/webm' });
            console.info("recorded a clip with size: " + (blob.size / 1024) + "kB");
            const videoURL = URL.createObjectURL(blob);
            resolve(videoURL);
        });
    });

}

/**
 * @param {HTMLVideoElement} videoElement
 */
function togglePip(videoElement) {

    if (!document.pictureInPictureEnabled || videoElement.disablePictureInPicture) {
        return;
    }
    // If there is no element in Picture-in-Picture yet, let’s request
    // Picture-in-Picture for the video, otherwise leave it.
    if (!document.pictureInPictureElement) {
        videoElement.requestPictureInPicture()
            .catch(error => {
                // Video failed to enter Picture-in-Picture mode.
            });
    } else {
        document.exitPictureInPicture()
            .catch(error => {
                // Video failed to leave Picture-in-Picture mode.
            });
    }
}