/**
 * @param {MediaStreamTrack} video
 * @param {MediaStreamTrack?} audio
 * @param {Promise} stopper when resolved, stop recording and return the clip
 * @return {Promise<Blob>} the recorded video
 **/
async function recordClip(video, audio, stopper) {

    const mediaStream = new MediaStream();
    mediaStream.addTrack(video);
    if (audio) {
        mediaStream.addTrack(audio);
    }

    const options = {
        audioBitsPerSecond : 128000,
        videoBitsPerSecond : 500000,
        mimeType : 'video/webm;codecs=vp8,opus'
    };
    const recorder = new MediaRecorder(mediaStream, options);

    // start recording here...
    recorder.start();

    const result =  new Promise((resolve) => {

        recorder.addEventListener('dataavailable', (e) => {
            const videoData = [ e.data ];
            const blob = new Blob(videoData, { 'type': 'video/webm' });
            console.info("recorded a clip with size: " + (blob.size / 1024) + "kB");
            resolve(blob);
        });
    });
    await stopper;
    recorder.stop();
    return result;
}
