document.addEventListener('DOMContentLoaded', () => {

  // --- Element Selectors ---
  const audioInput = document.getElementById('audioInput');
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const playBtn = document.getElementById('playBtn');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const waveformBox = document.getElementById('waveformBox');
  const scrubberProgress = document.getElementById('scrubberProgress');
  const scrubberHandle = document.getElementById('scrubberHandle');
  const timeDisplay = document.getElementById('timeDisplay');
  const skinSelector = document.getElementById('skinSelector');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const generateIgBtn = document.getElementById('generateIgBtn');

  // --- Web Audio Context & State ---
  let audioCtx = null;
  let audioBuffer = null;
  let sourceNode = null;
  let isPlaying = false;
  let startTime = 0;
  let pauseOffset = 0;
  let isDraggingScrubber = false;

  // --- 1. File Upload Handler (Browser Direct Fix) ---
  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      fileNameDisplay.textContent = `Loaded: ${file.name}`;
      loadAudioFile(file);
    }
  });

  function loadAudioFile(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      audioCtx.decodeAudioData(evt.target.result, (buffer) => {
        audioBuffer = buffer;
        pauseOffset = 0;
        drawWaveform(buffer);
        updateTimeReadout(0, buffer.duration);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // --- 2. Waveform Canvas Rendering ---
  function drawWaveform(buffer) {
    const ctx = waveformCanvas.getContext('2d');
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    const rawData = buffer.getChannelData(0);
    const step = Math.ceil(rawData.length / width);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#06b6d4';

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = rawData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(i, (1 + min) * (height / 2), 1, Math.max(1, (max - min) * (height / 2)));
    }
  }

  // --- 3. Interactive Waveform Scrubbing ---
  function setScrubPosition(clientX) {
    if (!audioBuffer) return;
    const rect = waveformBox.getBoundingClientRect();
    let x = clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;

    const ratio = x / rect.width;
    pauseOffset = ratio * audioBuffer.duration;
    
    const pct = ratio * 100;
    scrubberProgress.style.width = `${pct}%`;
    scrubberHandle.style.left = `${pct}%`;

    updateTimeReadout(pauseOffset, audioBuffer.duration);

    if (isPlaying) {
      stopAudio();
      startAudio();
    }
  }

  waveformBox.addEventListener('mousedown', (e) => {
    isDraggingScrubber = true;
    setScrubPosition(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingScrubber) {
      setScrubPosition(e.clientX);
    }
  });

  window.addEventListener('mouseup', () => {
    isDraggingScrubber = false;
  });

  // --- 4. Audio Playback Control ---
  playBtn.addEventListener('click', () => {
    if (!audioBuffer) {
      alert('Please upload an audio file first!');
      return;
    }
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  });

  function startAudio() {
    if (!audioCtx) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(audioCtx.destination);
    sourceNode.start(0, pauseOffset);
    startTime = audioCtx.currentTime - pauseOffset;
    isPlaying = true;
    playBtn.textContent = 'PAUSE';
    requestAnimationFrame(updatePlaybackProgress);
  }

  function stopAudio() {
    if (sourceNode) {
      sourceNode.stop();
      sourceNode.disconnect();
    }
    pauseOffset = audioCtx.currentTime - startTime;
    isPlaying = false;
    playBtn.textContent = 'PLAY / PAUSE';
  }

  function updatePlaybackProgress() {
    if (!isPlaying || !audioBuffer) return;
    const current = audioCtx.currentTime - startTime;
    if (current >= audioBuffer.duration) {
      stopAudio();
      pauseOffset = 0;
      return;
    }
    const ratio = current / audioBuffer.duration;
    const pct = ratio * 100;
    scrubberProgress.style.width = `${pct}%`;
    scrubberHandle.style.left = `${pct}%`;
    updateTimeReadout(current, audioBuffer.duration);
    requestAnimationFrame(updatePlaybackProgress);
  }

  function updateTimeReadout(cur, dur) {
    const format = (sec) => {
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };
    timeDisplay.textContent = `${format(cur)} / ${format(dur)}`;
  }

  // --- 5. Preset Mappings (20 Trending Styles) ---
  const presetData = {
    'nu-soul': { subCut: 25, bass: 4.0, air: 2.5, lufs: -10.0 },
    'bossa-nova': { subCut: 20, bass: 1.5, air: 1.0, lufs: -14.0 },
    'techno-raw': { subCut: 35, bass: 6.0, air: 3.0, lufs: -7.5 },
    'dnb-liquid': { subCut: 30, bass: 5.5, air: 3.5, lufs: -8.0 },
    'funkie-groove': { subCut: 25, bass: 3.5, air: 2.5, lufs: -9.0 },
    'american-pop': { subCut: 30, bass: 3.0, air: 4.0, lufs: -8.5 },
    'flamenco-fusion': { subCut: 20, bass: 1.0, air: 2.0, lufs: -12.0 },
    'reggaeton-urban': { subCut: 30, bass: 6.5, air: 3.0, lufs: -8.0 },
    'ethiopian-fusion': { subCut: 25, bass: 4.5, air: 2.0, lufs: -10.0 },
    'cantautorato': { subCut: 20, bass: 2.0, air: 1.5, lufs: -12.5 },
    'chitarra-voce': { subCut: 20, bass: 0.5, air: 1.0, lufs: -14.0 },
    'trap-heavy': { subCut: 35, bass: 8.0, air: 3.0, lufs: -7.0 },
    'indie-rock': { subCut: 25, bass: 3.0, air: 2.0, lufs: -9.5 },
    'synthwave-80s': { subCut: 25, bass: 4.0, air: 3.5, lufs: -9.0 },
    'deep-house': { subCut: 30, bass: 5.0, air: 2.5, lufs: -8.5 },
    'afrobeats': { subCut: 25, bass: 5.0, air: 3.0, lufs: -8.5 },
    'lofi-chill': { subCut: 20, bass: 3.0, air: 0.5, lufs: -13.0 },
    'cinematic': { subCut: 20, bass: 2.5, air: 2.0, lufs: -14.0 },
    'phonk': { subCut: 35, bass: 7.5, air: 4.0, lufs: -7.0 },
    'ganzo-signature': { subCut: 25, bass: 4.5, air: 3.0, lufs: -9.0 }
  };

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const pKey = btn.getAttribute('data-preset');
      const cfg = presetData[pKey];
      if (cfg) {
        document.getElementById('subCut').value = cfg.subCut;
        document.getElementById('subCutVal').textContent = `${cfg.subCut} Hz`;

        document.getElementById('bassEnhance').value = cfg.bass;
        document.getElementById('bassVal').textContent = `+${cfg.bass.toFixed(1)} dB`;

        document.getElementById('airExciter').value = cfg.air;
        document.getElementById('airVal').textContent = `+${cfg.air.toFixed(1)} dB`;

        document.getElementById('lufsTarget').value = cfg.lufs;
        document.getElementById('lufsVal').textContent = `${cfg.lufs.toFixed(1)} LUFS`;
      }
    });
  });

  // --- 6. Hardware Skin Selector ---
  skinSelector.addEventListener('change', (e) => {
    document.body.className = e.target.value;
  });

  // --- 7. Instagram Badge Promo Trigger ---
  generateIgBtn.addEventListener('click', () => {
    alert('📸 Instagram Badge generated! Tag @ganzosuiprati on your IG Story to get featured in our daily artists showcase.');
  });

});
