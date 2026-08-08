let audioCtx;
let sourceNode;
let lowEqNode, highEqNode, compressorNode, masterGainNode;
let audioBuffer = null;
let isPlaying = false;
let isBypassed = false;
let startTime = 0;
let pauseOffset = 0;

const audioInput = document.getElementById('audio-input');
const dropZone = document.getElementById('drop-zone');
const dashboard = document.getElementById('dashboard');
const fileNameDisplay = document.getElementById('file-name');
const playBtn = document.getElementById('play-btn');
const abBtn = document.getElementById('ab-btn');
const seekbar = document.getElementById('seekbar');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

audioInput.addEventListener('change', handleFile);
function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    initAudio();
    fileNameDisplay.textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(evt) {
        audioCtx.decodeAudioData(evt.target.result, function(buffer) {
            audioBuffer = buffer;
            dropZone.style.display = 'none';
            dashboard.style.display = 'block';
            seekbar.max = buffer.duration;
            setupAudioChain();
        });
    };
    reader.readAsArrayBuffer(file);
}

function setupAudioChain() {
    lowEqNode = audioCtx.createBiquadFilter();
    lowEqNode.type = 'lowshelf';
    lowEqNode.frequency.value = 100;

    highEqNode = audioCtx.createBiquadFilter();
    highEqNode.type = 'highshelf';
    highEqNode.frequency.value = 8000;

    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -16;
    compressorNode.knee.value = 10;
    compressorNode.ratio.value = 3;
    compressorNode.attack.value = 0.01;
    compressorNode.release.value = 0.1;

    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = 1.2;

    lowEqNode.connect(highEqNode);
    highEqNode.connect(compressorNode);
    compressorNode.connect(masterGainNode);
    masterGainNode.connect(audioCtx.destination);
}

playBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
});

function playAudio() {
    if (!audioBuffer) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;

    if (isBypassed) {
        sourceNode.connect(audioCtx.destination);
    } else {
        sourceNode.connect(lowEqNode);
    }

    sourceNode.start(0, pauseOffset);
    startTime = audioCtx.currentTime - pauseOffset;
    isPlaying = true;
    playBtn.textContent = '⏸ Pausa';
    updateSeekbar();
}

function pauseAudio() {
    if (sourceNode) {
        sourceNode.stop();
        pauseOffset = audioCtx.currentTime - startTime;
    }
    isPlaying = false;
    playBtn.textContent = '▶ Play';
}

abBtn.addEventListener('click', () => {
    isBypassed = !isBypassed;
    abBtn.textContent = isBypassed ? 'Master Processing [BYPASS]' : 'Master Processing [ON]';
    abBtn.style.borderColor = isBypassed ? '#ff4757' : '#00c6ff';
    abBtn.style.color = isBypassed ? '#ff4757' : '#00c6ff';

    if (isPlaying) {
        pauseAudio();
        playAudio();
    }
});

document.getElementById('warmth').addEventListener('input', (e) => {
    if (lowEqNode) lowEqNode.gain.value = (e.target.value - 50) / 5;
});

document.getElementById('clarity').addEventListener('input', (e) => {
    if (highEqNode) highEqNode.gain.value = (e.target.value - 50) / 5;
});

document.getElementById('loudness').addEventListener('input', (e) => {
    if (masterGainNode) masterGainNode.gain.value = 0.5 + (e.target.value / 50);
});

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const preset = e.target.dataset.preset;
        applyPreset(preset);
    });
});

function applyPreset(preset) {
    if (!lowEqNode) return;
    if (preset === 'balanced') {
        lowEqNode.gain.value = 1;
        highEqNode.gain.value = 1;
        compressorNode.threshold.value = -16;
    } else if (preset === 'warm') {
        lowEqNode.gain.value = 4;
        highEqNode.gain.value = -1;
        compressorNode.threshold.value = -14;
    } else if (preset === 'punchy') {
        lowEqNode.gain.value = 3;
        highEqNode.gain.value = 2;
        compressorNode.threshold.value = -20;
    } else if (preset === 'bright') {
        lowEqNode.gain.value = -1;
        highEqNode.gain.value = 5;
        compressorNode.threshold.value = -15;
    }
}

function updateSeekbar() {
    if (!isPlaying) return;
    const currentTime = audioCtx.currentTime - startTime;
    seekbar.value = currentTime;
    if (currentTime < audioBuffer.duration) {
        requestAnimationFrame(updateSeekbar);
    } else {
        isPlaying = false;
        playBtn.textContent = '▶ Play';
        pauseOffset = 0;
    }
}
// Funzione per l'esportazione in WAV
document.getElementById('export-btn').addEventListener('click', () => {
    if (!audioBuffer) {
        alert("Carica prima un file audio!");
        return;
    }

    // Renderizza l'audio elaborato offline per creare il file finale
    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const lowEq = offlineCtx.createBiquadFilter();
    lowEq.type = 'lowshelf';
    lowEq.frequency.value = 100;
    lowEq.gain.value = lowEqNode ? lowEqNode.gain.value : 0;

    const highEq = offlineCtx.createBiquadFilter();
    highEq.type = 'highshelf';
    highEq.frequency.value = 8000;
    highEq.gain.value = highEqNode ? highEqNode.gain.value : 0;

    const comp = offlineCtx.createDynamicsCompressor();
    comp.threshold.value = compressorNode ? compressorNode.threshold.value : -16;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.1;

    const gain = offlineCtx.createGain();
    gain.gain.value = masterGainNode ? masterGainNode.gain.value : 1.2;

    source.connect(lowEq);
    lowEq.connect(highEq);
    highEq.connect(comp);
    comp.connect(gain);
    gain.connect(offlineCtx.destination);

    source.start(0);

    offlineCtx.startRendering().then((renderedBuffer) => {
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        const url = URL.createObjectURL(wavBlob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'AuraMaster_' + (fileNameDisplay.textContent || 'master.wav');
        anchor.click();
    });
});

// Helper per convertire l'AudioBuffer in formato WAV
function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample,
        offset = 0,
        pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); 
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16);         // length = 16
    setUint16(1);          // PCM
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2);                      // block-align
    setUint16(16);                                 // 16-bit
    setUint32(0x61746164); // "data" chunk
    setUint32(length - pos - 4);

    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

    while (offset < len) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
}
