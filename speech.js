/** speech synthesis **/

let voice = undefined;
// trigger async load
speechSynthesis.getVoices();

window.speechSynthesis.onvoiceschanged = function() {
    const voices = speechSynthesis.getVoices();
    const offlineVoice = voices.find((v) =>
        v.localService === true && v.lang.indexOf('en') === 0 && (v.name.toLocaleLowerCase().includes('female') || v.name.toLocaleLowerCase().includes('Victoria')));

    const onlineBackup = voices.find((v) => v.lang.indexOf('en') === 0 && (v.name.toLocaleLowerCase().includes('female')));
    voice = offlineVoice || onlineBackup;
};


// store speechSynchesisUtterance object to migitate https://bugs.chromium.org/p/chromium/issues/detail?id=509488#c11
window.utterances = [];

/**
 * Called after doing asynchronous stuff.
 * @callback promiseFunction
 * @param {*} value
 * @return {Promise<*>}
 */

/**
 * A idle then composition. Suspends a promise chain by a given number of milliseconds and then repeats with the original value.
 * @param {number} millis
 * @return {promiseFunction}
 */
function idle(millis) {
    return function(value) {
        return new Promise((resolve) => {
            setTimeout(() => resolve(value), millis);
        });
    }
}

/**
 * @param sentence
 * @return Promise<any>
 */
function say(sentence) {

    console.info("saying " + sentence);

    const saying = new SpeechSynthesisUtterance(sentence);
    saying.lang = 'en-GB';
    if (voice) {
        saying.voice = voice;
    }
    saying.onmark = (mark) => console.info('saying.onMark', mark);

    window.utterances.push(saying);

    const promise = new Promise((resolve, reject) => {
        saying.onend = resolve;
        saying.onerror = reject
    });

    window.speechSynthesis.speak(saying);

    return promise;
}



/** speech recognition **/

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

/**

const mediaConstraints = { audio: true };

navigator.getUserMedia(mediaConstraints)
     .then((stream) => {
         console.info("I have a stream", stream);
         const mediaRecorder = new MediaRecorder(stream);
         mediaRecorder.mimeType = 'audio/webm';
         mediaRecorder.start();
     }).catch((e) => {
         console.error("Error using audio", e);
     });
**/
window.currentRecognition = undefined;


window.onload = function() {
    document.getElementById("mic").addEventListener('click', function(e) {

        const recognition = new SpeechRecognition();
        const start_timestamp = event.timeStamp;

        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function() {
            recognizing = true;
            document.getElementById("mic").classList.add("activated");
            recognition.stop();
        };

        recognition.onerror = function(event) {
            if (event.error === 'no-speech') {
                console.info('no-speech');
            }
            if (event.error === 'audio-capture') {
                console.info('audio-capture');
            }
            if (event.error === 'not-allowed') {
                if (event.timeStamp - start_timestamp < 100) {
                    console.info('info_blocked');
                } else {
                    console.info('info_denied');
                }
                ignore_onend = true;
            }
        };
        recognition.start();
    });
};

/**
 * @callback onProgressCallback
 * @
 */

/**
 * Let the user repeat all sentences.
 * @param {string | Array<string>} sentences
 * @param {onProgressCallback} onProgress
 * @param {Function} onSuccess - called when all sentences have been repeated successfully.
 * @param {Function<Promise<null>>} onMistake - called when the user makes a mistake. Continues when the promise returned by the mistake resolves.
 */
function repeatAfterMe(sentences, onProgress, onSuccess, onMistake) {
    if (sentences.length === 0) {
        onSuccess();
        return;
    }

    const [sentence, ...remainingSentences] = sentences;

    function onSentenceComplete() {
        onProgress(() => {
            repeatAfterMe(remainingSentences, onProgress, onSuccess, onMistake);
        });
    }
    function onSentenceError() {
        if (onMistake) {
            onMistake().then(() => repeatAfterMe(sentences, onProgress, onSuccess, onMistake));
        } else {
            setTimeout(() => repeatAfterMe(sentences, onProgress, onSuccess, onMistake),0);
        }
    }

    say(sentence)
        .then(() => choose([sentence], [onSentenceComplete], onSentenceError, true) );
}

/**
 * @callback chooseOnError
 * @param {string} the sentence that could not be recognized.
 */

/**
 * Recognizes one of the given expected sentences.
 * When the n-th sentence is recognized, the nth- onFinished callback is fired.
 * When no sentence is recognized, the onError callback is fired.
 * @param {string | Array<string>} expectedSentences
 * @param {Function | Array<Function>} onFinished
 * @param {chooseOnError} onError
 * @param {boolean?} stopOnError weather we should stop retrying to recognize after a failed attempt.
 * @return {Function} stopFunction
 */
function choose(expectedSentences, onFinished, onError, stopOnError) {

    if (!(expectedSentences instanceof Array)) {
        expectedSentences = [ expectedSentences ];
    }
    if (!(onFinished instanceof Array)) {
        onFinished = [ onFinished ];
    }



    const speechRecognitionList = new SpeechGrammarList();

    expectedSentences.forEach((expectedSentence) => {
        const grammar = `#JSGF V1.0; grammar phrase; public <phrase> = ${expectedSentence}`;
        speechRecognitionList.addFromString(grammar, 1);
    });

    const recognition = new SpeechRecognition();
    recognition.grammars = speechRecognitionList;
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    let haveResult = false;
    let haveAbort = false;

    recognition.onspeechstart = function(e) {
        document.getElementById("mic").classList.add("talking");
        console.info("onSpeechStart", e);
    };

    recognition.onspeechend = function(e) {
        document.getElementById("mic").classList.remove("talking");
        console.info("onSpeechEnd", e);
    };

    recognition.onend = function(endEvent) {
        console.info("endRecognition recognition: ", expectedSentences, endEvent);
        window.currentRecognition = undefined;
        document.getElementById("siri_end").play();
        document.getElementById("mic").classList.remove("active");
        if (!haveResult && !haveAbort) {
            recognition.start();
        }
    };

    recognition.onnomatch = function() {
        console.info('onnomatch');
    };

    recognition.onstart = function() {
        console.info("start recognition: ", expectedSentences);
        window.currentRecognition = recognition;
        document.getElementById("mic").classList.add("active");
        document.getElementById("siri_start").play();
    };

    recognition.onresult = function(event) {
        const idx = event.resultIndex;

        const speechResult = event.results[idx][0].transcript;

        const confidence = event.results[idx][0].confidence;
        console.info("onresult", [speechResult], event);

        expectedSentences.forEach((expectedSentence, i) => {
            if(speechResult.trim().toLocaleLowerCase() === expectedSentence.toLocaleLowerCase() && confidence > 0.6) {
                haveResult = true;
                recognition.stop();
                onFinished[i](speechResult, event.results[0][0].confidence);
            }
        });

        if (!haveResult && stopOnError === true) {
            haveAbort = true;
            recognition.stop();
        }

        if (!haveResult && !!onError) {
            onError(speechResult);
        }
    };

    recognition.start();
    return () => { return recognition.stop() };
}
