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
