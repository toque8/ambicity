// public/player.js
(function() {
  const select = document.getElementById('city-select');
  const container = document.getElementById('player-container');
  const title = document.getElementById('city-title');
  let currentHls = null;
  let currentVideo = null;
  let streams = [];
  let audioContext = null;
  let audioSource = null;
  let audioGain = null;

  const controlsBar = document.createElement('div');
  controlsBar.className = 'bottom-controls';
  controlsBar.innerHTML = `
    <button id="btn-pause" class="control-btn" title="Pause/Play">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
    </button>
    <button id="btn-mute" class="control-btn" title="Toggle Sound">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    </button>
  `;
  container.appendChild(controlsBar);

  const btnPause = document.getElementById('btn-pause');
  const btnMute = document.getElementById('btn-mute');

  const svgPause = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  const svgPlay = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const svgMuteOn = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  const svgMuteOff = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;

  function updateControls() {
    if (!currentVideo) return;
    btnPause.innerHTML = currentVideo.paused ? svgPlay : svgPause;
    btnMute.innerHTML = (currentVideo.muted || (audioGain && audioGain.gain.value === 0)) ? svgMuteOff : svgMuteOn;
  }

  btnPause.addEventListener('click', () => {
    if (!currentVideo) return;
    currentVideo.paused ? currentVideo.play().catch(()=>{}) : currentVideo.pause();
    updateControls();
  });

  btnMute.addEventListener('click', () => {
    if (!currentVideo) return;
    toggleMute();
    updateControls();
  });

  function toggleMute() {
    if (audioGain) {
      const newVal = audioGain.gain.value === 0 ? 1 : 0;
      audioGain.gain.setTargetAtTime(newVal, audioContext.currentTime, 0.1);
    }
    currentVideo.muted = !currentVideo.muted;
  }

  function initWebAudio(video) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioSource) audioSource.disconnect();
      
      audioSource = audioContext.createMediaElementSource(video);
      audioGain = audioContext.createGain();
      audioGain.gain.value = 1;
      
      audioSource.connect(audioGain).connect(audioContext.destination);
      
      audioGain.gain.setValueAtTime(0, audioContext.currentTime);
      audioGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.3);
      
      return true;
    } catch (e) {
      console.warn('Web Audio init failed:', e);
      return false;
    }
  }

  fetch('/streams.json')
    .then(r => r.json())
    .then(data => {
      streams = data;
      streams.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = camera.city;
        select.appendChild(option);
      });
      if (streams.length > 0) playCamera(0);
    });

  function cleanup() {
    if (audioSource) { audioSource.disconnect(); audioSource = null; }
    if (audioGain) { audioGain.disconnect(); audioGain = null; }
    if (currentHls) { currentHls.destroy(); currentHls = null; }
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.src = '';
      currentVideo.load();
      currentVideo.remove();
      currentVideo = null;
    }
    const overlay = container.querySelector('.play-overlay');
    if (overlay) overlay.remove();
    container.classList.remove('playing');
    title.style.opacity = '1';
    updateControls();
  }

  function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;

    cleanup();
    title.textContent = camera.city;
    title.style.opacity = '1';

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', ''); 
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.disableRemotePlayback = true;
    container.appendChild(video);
    currentVideo = video;

    const overlay = document.createElement('div');
    overlay.className = 'play-overlay';
    overlay.innerHTML = '<button class="play-btn">Play</button>';
    container.appendChild(overlay);

    overlay.querySelector('.play-btn').addEventListener('click', async function() {
      if (initWebAudio(video)) {
        video.muted = true; // Оставляем muted, звук идёт через Web Audio
        await video.play().catch(e => console.log('Play error:', e));
        container.classList.add('playing');
        this.parentElement.remove();
        updateControls();
      }
    });

    video.addEventListener('play', () => {
      const ov = container.querySelector('.play-overlay');
      if (ov) ov.remove();
      container.classList.add('playing');
      title.style.opacity = '0';
      updateControls();
    });
    video.addEventListener('pause', updateControls);

    const apiUrl = `/api/get-stream?source=${camera.source}&sourceParams=${encodeURIComponent(JSON.stringify(camera.sourceParams))}`;

    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      currentHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveDurationInfinity: true,
        liveSyncDuration: 20,
        liveMaxLatencyDuration: 40,
        maxBufferLength: 30,
        maxMaxBufferLength: 50,
        maxBufferSize: 200 * 1000 * 1000,
        backBufferLength: 30,
        
        nudgeMaxRetry: 0,
        nudgeOffset: 0,
        maxBufferHole: 2.0,
        maxAudioFramesDrift: 20,
        forceKeyFrameOnDemuxerError: false,
        stretchShortVideoTrack: false,
        preferManagedMediaSource: false,
        liveSyncOnStalledError: false,
        
        testBandwidth: false,
        startLevel: 0,
        maxAutoLevel: 0,
        capLevelToPlayerSize: false,
        abrEwmaDefaultEstimate: 5000000,
        
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 800,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2
      });

      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
      });
      
      currentHls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: currentHls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: currentHls.recoverMediaError(); break;
            default: cleanup(); title.textContent = camera.city; title.style.opacity = '1';
          }
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = apiUrl;
      video.addEventListener('loadedmetadata', () => {
        initWebAudio(video);
        video.play().catch(()=>{});
      });
    }
  }

  select.addEventListener('change', function() { playCamera(this.value); });
  window.addEventListener('beforeunload', cleanup);
})();
