document.addEventListener('DOMContentLoaded', () => {
  
  // Element References
  const waveformContainer = document.getElementById('waveformContainer');
  const waveformProgress = document.getElementById('waveformProgress');
  const waveformHandle = document.getElementById('waveformHandle');
  const timeDisplay = document.getElementById('timeDisplay');
  const playBtn = document.getElementById('playBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  
  // Controls
  const subsonicCut = document.getElementById('subsonicCut');
  const subsonicValue = document.getElementById('subsonicValue');
  const bassBoost = document.getElementById('bassBoost');
  const bassValue = document.getElementById('bassValue');
  const targetLufs = document.getElementById('targetLufs');
  const lufsValue = document.getElementById('lufsValue');

  // Playback State
  let isPlaying = false;
  let isDragging = false;
  let trackDuration = 210; // Default mockup duration (3:30 in seconds)
  let currentPositionRatio = 0.0; // 0.0 to 1.0

  // 1. Interactive Waveform Scrubbing
  function updateScrubbingPosition(clientX) {
    const rect = waveformContainer.getBoundingClientRect();
    let offsetX = clientX - rect.left;
    
    // Constrain within bounds
    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    currentPositionRatio = offsetX / rect.width;
    const progressPercent = currentPositionRatio * 100;

    waveformProgress.style.width = `${progressPercent}%`;
    waveformHandle.style.left = `${progressPercent}%`;

    updateTimeDisplay();
  }

  function updateTimeDisplay() {
    const currentSeconds = Math.floor(currentPositionRatio * trackDuration);
    const totalMinutes = Math.floor(trackDuration / 60);
    const totalRemSec = Math.floor(trackDuration % 60);
    const curMinutes = Math.floor(currentSeconds / 60);
    const curRemSec = Math.floor(currentSeconds % 60);

    const pad = (num) => String(num).padStart(2, '0');
    timeDisplay.textContent = `${pad(curMinutes)}:${pad(curRemSec)} / ${pad(totalMinutes)}:${pad(totalRemSec)}`;
  }

  // Pointer Events for Dragging Handle
  waveformContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    updateScrubbingPosition(e.clientX);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      updateScrubbingPosition(e.clientX);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
    }
  });

  // Play/Pause Simulation
  playBtn.addEventListener('click', () => {
    isPlaying = !isPlaying;
    playBtn.textContent = isPlaying ? 'PAUSE' : 'PLAY';
  });

  // 2. Preset Selection Engine
  const presetConfigurations = {
    'nu-soul': { subsonic: 25, bass: 4.0, lufs: -10.0 },
    'bossa-nova': { subsonic: 20, bass: 1.5, lufs: -14.0 },
    'techno': { subsonic: 35, bass: 6.0, lufs: -7.5 },
    'dnb': { subsonic: 30, bass: 5.5, lufs: -8.0 },
    'funkie-hit': { subsonic: 25, bass: 3.5, lufs: -9.0 },
    'american-pop': { subsonic: 30, bass: 3.0, lufs: -8.5 },
    'flamenco': { subsonic: 20, bass: 1.0, lufs: -12.0 },
    'reggaeton': { subsonic: 30, bass: 6.5, lufs: -8.0 },
    'ethiopian-reggae': { subsonic: 25, bass: 4.5, lufs: -10.0 },
    'cantautorato': { subsonic: 20, bass: 2.0, lufs: -12.5 },
    'chitarra-voce': { subsonic: 20, bass: 0.5, lufs: -14.0 },
    'ganzo-rnb': { subsonic: 25, bass: 4.0, lufs: -9.5 }
  };

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetKey = btn.getAttribute('data-preset');
      const config = presetConfigurations[presetKey];

      if (config) {
        subsonicCut.value = config.subsonic;
        subsonicValue.textContent = `${config.subsonic} Hz`;

        bassBoost.value = config.bass;
        bassValue.textContent = `+${config.bass.toFixed(1)} dB`;

        targetLufs.value = config.lufs;
        lufsValue.textContent = `${config.lufs.toFixed(1)} LUFS`;
      }
    });
  });

  // 3. Slider Value Readout Binding
  subsonicCut.addEventListener('input', (e) => {
    subsonicValue.textContent = `${e.target.value} Hz`;
  });

  bassBoost.addEventListener('input', (e) => {
    bassValue.textContent = `+${parseFloat(e.target.value).toFixed(1)} dB`;
  });

  targetLufs.addEventListener('input', (e) => {
    lufsValue.textContent = `${parseFloat(e.target.value).toFixed(1)} LUFS`;
  });

  // Initial setup
  updateTimeDisplay();
});
