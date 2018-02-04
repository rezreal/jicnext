/** speech synthesis **/

let voice = undefined;
// trigger async load
speechSynthesis.getVoices();

window.speechSynthesis.onvoiceschanged = function() {
    const voices = speechSynthesis.getVoices();
    console.info(voices);
    const offlineVoice = voices.find((v) =>
        v.localService === true && v.lang.indexOf('en') === 0 && (v.name.toLocaleLowerCase().includes('female') || v.name.toLocaleLowerCase().includes('Victoria')));

    const onlineBackup = voices.find((v) => v.lang.indexOf('en') === 0 && (v.name.toLocaleLowerCase().includes('female')));
    voice = offlineVoice || onlineBackup;
};




// store speechSynchesisUtterance object to migitate https://bugs.chromium.org/p/chromium/issues/detail?id=509488#c11
window.utterances = [];

function say(sentence, andThen) {
    console.info("saying " + sentence, andThen);

    const saying = new SpeechSynthesisUtterance(sentence);
    saying.lang = 'en-GB';
    if (voice) {
        saying.voice = voice;
    }
    saying.onmark = (mark) => console.info('saying.onMark', mark);

    window.utterances.push(saying);

    saying.onend = (e) => {
        currentSaying = undefined;
        if (andThen) {
            andThen(e);
        }
    }

    saying.onstart = (e) => {
        currentSaying = saying;
    }

    window.speechSynthesis.speak(saying);

}

var currentSaying = undefined;



/** speech recognition **/

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;



const mediaConstraints = {
    audio: true
};

/**
 navigator.getUserMedia(mediaConstraints, onAudioStream, (err) => console.info("could not access audio", err));

 function onAudioStream(stream) {

	console.info("have the stream", stream);
	const mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.mimeType = 'audio/webm';
	mediaRecorder.start();
}
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
            if (event.error == 'no-speech') {
                console.info('no-speech');
            }
            if (event.error == 'audio-capture') {
                console.info('audio-capture');
            }
            if (event.error == 'not-allowed') {
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


function repeatAfterMe(expectedSentence, onFinished, onError) {

    console.info("start recognition: ", expectedSentence);
    const grammar = '#JSGF V1.0; grammar phrase; public <phrase> = ' + expectedSentence +';';
    const recognition = new SpeechRecognition();
    const speechRecognitionList = new SpeechGrammarList();
    let haveResult = false;
    speechRecognitionList.addFromString(grammar, 1);
    recognition.grammars = speechRecognitionList;
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onspeechstart = function(e) {
        document.getElementById("mic").classList.add("talking");
        console.info("onSpeechStart", e);
    };

    recognition.onspeechend = function(e) {
        document.getElementById("mic").classList.remove("talking");
        console.info("onSpeechEnd", e);
        //recognition.stop();
    };

    recognition.onend = function() {
        document.getElementById("siri_end").play();
        document.getElementById("mic").classList.remove("active");
        if (!haveResult) {
            recognition.start();
        }
    };

    recognition.onstart = function() {
        document.getElementById("mic").classList.add("active");
        document.getElementById("siri_start").play();
    };

    recognition.onresult = function(event) {

        const speechResult = event.results[event.results.length - 1][0].transcript;
        const confidence = event.results[event.results.length - 1][0].confidence;
        console.info("onresult", speechResult, event);

        if(speechResult.trim() === expectedSentence && confidence > 0.7) {
            onFinished(speechResult, event.results[0][0].confidence);
            haveResult = true;
            recognition.stop();
        } else {
            if (onError) {
                onError(speechResult);
            }
        }

    };

    window.currentRecognition = recognition;
    recognition.start();
    return recognition.stop;
}
