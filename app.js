let audioCtx;
let sourceNode;
let lowEqNode, highEqNode, compressorNode, masterGainNode;
let audioBuffer = null;
let isPlaying = false;
let isBypassed = false;
let startTime = 0;
let pauseOffset = 0;

// UI Elements
const audioInput = document.getElementById('audio-input');
const dropZone = document.getElementById('drop-zone');
const dashboard = document.getElementById('dashboard');
const fileNameDisplay = document.getElementById('file-name');
const playBtn = document.getElementById('play-btn');
const abBtn = document.getElementById('ab-btn');
const seekbar = document.getElementById('seekbar');
const reuploadBtn = document.getElementById('reupload-btn');

// Sliders and Readouts
const loudnessSlider = document.getElementById('loudness');
const warmthSlider = document.getElementById('warmth');
const claritySlider = document.getElementById('clarity');
const widthSlider = document.getElementById('width');

const valLoudness = document.getElementById('val-loudness');
const valWarmth = document.getElementById('val-warmth');
const valClarity = document.getElementById('val-clarity');
const valWidth = document.getElementById('val-width');

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

audioInput.addEventListener('change', handleFile);
reuploadBtn.addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    audioInput.click();
});

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
    
    // Apply initial slider values
    updateParameters();

    lowEqNode.connect(highEqNode);
    highEqNode.connect(compressorNode);
    compressorNode.connect(masterGainNode);
    masterGainNode.connect(audioCtx.destination);
}

function updateParameters() {
    if (!lowEqNode) return;
    
    const wVal = (warmthSlider.value - 50) / 5;
    const cVal = (claritySlider.value - 50) / 5;
    const lVal = 0.5 + (loudnessSlider.value / 50);

    lowEqNode.gain.value = wVal;
    highEqNode.gain.value = cVal;
    masterGainNode.gain.value = lVal;

    valWarmth.textContent = (wVal >= 0 ? '+' : '') + wVal.toFixed(1) + ' dB';
    valClarity.textContent = (cVal >= 0 ? '+' : '') + cVal.toFixed(1) + ' dB';
    valLoudness.textContent = '+' + ((lVal - 1) * 6).toFixed(1) + ' dB';
    valWidth.textContent = (widthSlider.value * 2) + '%';
}

// Slider Input Listeners
[warmthSlider, claritySlider, loudnessSlider, widthSlider].forEach(slider => {
    slider.addEventListener('input', updateParameters);
});

// Play / Pause Logic
playBtn.addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    else playAudio();
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
    playBtn.textContent = '⏸ PAUSE';
    updateSeekbar();
}

function pauseAudio() {
    if (sourceNode) {
        sourceNode.stop();
        pauseOffset = audioCtx.currentTime - startTime;
    }
    isPlaying = false;
    playBtn.textContent = '▶ PLAY';
}

// A/B Toggle
abBtn.addEventListener('click', () => {
    isBypassed = !isBypassed;
    if (isBypassed) {
        abBtn.textContent = 'Processing: BYPASSED';
        abBtn.classList.add('bypassed');
    } else {
        abBtn.textContent = 'Processing: ENGAGED';
        abBtn.classList.remove('bypassed');
    }

    if (isPlaying) {
        pauseAudio();
        playAudio();
    }
});

// Presets Configurator
const presets = {
    balanced:    { warmth: 50, clarity: 50, loudness: 55, width: 50 },
    warm_tape:   { warmth: 75, clarity: 35, loudness: 50, width: 45 },
    punchy_club: { warmth: 65, clarity: 65, loudness: 75, width: 60 },
    crisp_pop:   { warmth: 40, clarity: 80, loudness: 65, width: 55 },
    acoustic:    { warmth: 45, clarity: 60, loudness: 45, width: 50 },
    lofi:        { warmth: 85, clarity: 20, loudness: 40, width: 35 },
    heavy_metal: { warmth: 60, clarity: 70, loudness: 85, width: 65 },
    vocal_master:{ warmth: 35, clarity: 75, loudness: 60, width: 40 },
    trap_sub:    { warmth: 90, clarity: 55, loudness: 80, width: 55 },
    airy_vocal:  { warmth: 30, clarity: 90, loudness: 50, width: 50 },
    jazz:        { warmth: 60, clarity: 45, loudness: 40, width: 45 },
    stereo_widen:{ warmth: 50, clarity: 60, loudness: 50, width: 90 }
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const p = presets[e.target.dataset.preset];
        if (p) {
            warmthSlider.value = p.warmth;
            claritySlider.value = p.clarity;
            loudnessSlider.value = p.loudness;
            widthSlider.value = p.width;
            updateParameters();
        }
    });
});

function updateSeekbar() {
    if (!isPlaying) return;
    const currentTime = audioCtx.currentTime - startTime;
    seekbar.value = currentTime;
    if (currentTime < audioBuffer.duration) {
        requestAnimationFrame(updateSeekbar);
    } else {
        isPlaying = false;
        playBtn.textContent = '▶ PLAY';
        pauseOffset = 0;
    }
}

// High-Res WAV Export Engine
document.getElementById('export-btn').addEventListener('click', () => {
    if (!audioBuffer) {
        alert("Please load an audio track first!");
        return;
    }

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
        anchor.download = 'AuraMaster_HD_' + (fileNameDisplay.textContent || 'master.wav');
        anchor.click();
    });
});

function bufferToWave(abuffer, len) {
    let numOfChan = abuffer.numberOfChannels,
        length = len * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [], i, sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16);
    setUint32(0x61746164); setUint32(length - pos - 4);

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
