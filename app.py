from flask import Flask, request, render_template, jsonify
from transformers import pipeline, Wav2Vec2ForCTC, AutoProcessor
import scipy.io.wavfile
import torchaudio
import subprocess
import tempfile
import torch
import base64
import time


app = Flask(__name__)

# === USAGE OF GPU ===
print(torch.backends.mps.is_available())
mps_device = torch.device("mps")
print(mps_device)
print(torch.ones(1, device=mps_device))


# === TEMPLATES ===
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/text-to-speech')
def tts(): 
    return render_template('tts.html')

@app.route('/speech-to-text')
def stt():
    return render_template('stt3.html')


# === CONVERT THE WEBM AUDIO TO WAV ===
def convert_to_wav(audio_bytes):
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
        temp_file.write(audio_bytes)
        tempfile_path = temp_file.name
    
    output_file_path = tempfile_path.replace('.webm', '.wav')

    command = f'ffmpeg -i {tempfile_path} -ar 16000 -ac 2 {output_file_path}'
    subprocess.run(command, shell=True)

    print("===============================================================================")
    print("Output file path:", output_file_path)
    print("===============================================================================")

    return output_file_path


# === TEXT-TO-SPEECH ===
@app.route("/text-to-speech/", methods=['POST'])
def text_to_speech():
    start = time.time()
    text = request.form['text']
    synthesizer = pipeline("text-to-speech", "facebook/mms-tts-quz", device=mps_device)  

    otro = synthesizer(text)
    audio_file = "output.wav"
    scipy.io.wavfile.write(audio_file, rate=otro["sampling_rate"], data=otro["audio"].T)

    with open(audio_file, "rb") as f:
        audio_data = base64.b64encode(f.read()).decode("utf-8")  # -> open and reading the content...

    # For displaying it on the webpage:
    audio_html = f'<audio controls><source src="data:audio/wav;base64,{audio_data}" type="audio/wav">Your browser does not support the audio element.</audio>'
    print(time.time() - start)
    return jsonify(audio=audio_html)


# === SPEECH-TO-TEXT ===
@app.route("/speech_to_text/", methods=['POST'])
def speech_to_text():
    start = time.time()
    audio_file = request.files['audio_file']
    audio_bytes = audio_file.read() 
    audio_data = convert_to_wav(audio_bytes)

    model_id = "facebook/mms-1b-all"
    processor = AutoProcessor.from_pretrained(model_id)
    model = Wav2Vec2ForCTC.from_pretrained(model_id)
    audio_data, sampling_rate = torchaudio.load(audio_data)

    processor.tokenizer.set_target_lang("quz")
    model.load_adapter("quz")
    inputs = processor(audio_data.numpy(), sampling_rate=sampling_rate, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs).logits

    ids = torch.argmax(outputs, dim=-1)[0]
    transcription = processor.decode(ids)
    print(time.time() - start)

    return jsonify(transcription=transcription)


if __name__ == '__main__':
    app.run(debug=True)
