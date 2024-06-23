const dropZone = document.getElementById('drop-zone')
const fileInput = document.getElementById('file-input')
const transcriptionDiv = document.getElementById('transcription')
const recordButton = document.getElementById('record-button')
let stream
let mediaRecorder
let isRecording = false  // -> for allowing the user self-recording

dropZone.addEventListener('click', () => {
    fileInput.click()
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    handleFileUpload(file)
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.style.border = '2px dashed #aaaaaa'
});

dropZone.addEventListener('dragleave', () => {
    dropZone.style.border = '2px dashed #cccccc'
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    handleFileUpload(file)
});

recordButton.addEventListener('click', () => {
    if (!isRecording) {
        startRecording()
    } else {
        stopRecording()
    }
});

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })  // -> asking for allowance on recording
        .then(streamData => {
            stream = streamData
            mediaRecorder = new MediaRecorder(stream)  // -> provides access to record

            mediaRecorder.addEventListener('dataavailable', (event) => { 
                if (event.data.size > 0) {  // (ensuring there is no 'empty' audio)
                    uploadRecording(event.data)  // -> uploads the recorded audio data to the server (declaration below)
                }
            });

            mediaRecorder.start()
            isRecording = true
            recordButton.textContent = 'Stop Recording'
        })
        .catch(error => {
            console.error('Error:', error)
        });
}

function stopRecording() {
    mediaRecorder.stop()
    stream.getTracks().forEach(track => track.stop())  // -> Iterates over all tracks obtained from the microphone, until the stop was pressed
    isRecording = false
    recordButton.textContent = 'Start Recording'
}

function handleFileUpload(file) {
    if (file.type !== 'audio/wav') {
        alert('Please upload a .wav audio file.')
        return;
    }

    const formData = new FormData()
    formData.append('audio_file', file)

    fetch('/speech_to_text/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        transcriptionDiv.textContent = data.transcription
    })
    .catch(error => console.error('Error:', error))
}

function uploadRecording(blob) {
    const formData = new FormData()
    formData.append('audio_file', blob, 'recorded_audio.webm')  // -> specify the .webm type file this time

    fetch('/speech_to_text/', {  // -> calls the endpoint, with its respective method and data
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        transcriptionDiv.textContent = data.transcription
        stopRecording()
    })
    .catch(error => {
        console.error('Error:', error)
        stopRecording()
    });
}