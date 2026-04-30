// public/player.js
(function() {
  const select = document.getElementById('city-select');
  const container = document.getElementById('player-container');
  const title = document.getElementById('city-title');
  let currentHls = null;
  let currentVideo = null;
  let streams = [];

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
  }

  function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    
    cleanup();
    title.textContent = camera.city;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    container.appendChild(video);
    currentVideo = video;

    const overlay = document.createElement('div');
    overlay.className = 'play-overlay';
    overlay.innerHTML = '<button class="play-btn">Play</button>';
    container.appendChild(overlay);
    
    overlay.querySelector('.play-btn').addEventListener('click', function() {
      video.muted = false;
      video.play().catch(function(e) { console.log('Play error:', e); });
      container.classList.add('playing');
    });

    const apiUrl = '/api/get-stream?source=' + camera.source + '&sourceParams=' + encodeURIComponent(JSON.stringify(camera.sourceParams));

    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      currentHls = new Hls({
        enableWorker: true,          
        liveDurationInfinity: true,   
        liveSyncDuration: 18,        
        liveMaxLatencyDuration: 35,   
        maxBufferLength: 20,          
        maxMaxBufferLength: 40,      
        maxBufferSize: 120 * 1000 * 1000,
        
        nudgeOffset: 0.08,
        nudgeMaxRetry: 4,
        maxBufferHole: 1.5,           
        
        fragLoadingMaxRetry: 12,
        fragLoadingRetryDelay: 400,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        
        // Отключаем агрессивные оптимизации
        lowLatencyMode: false,
        testBandwidth: false,
        abrEwmaDefaultEstimate: 5000000,
        preferManagedMediaSource: false,
        stretchShortVideoTrack: false
      });
      
      currentHls.config.audioTrack = 0;
      
      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play().catch(function() {
          console.log('Autoplay blocked, waiting for user interaction');
        });
      });

      currentHls.on(Hls.Events.LEVEL_SWITCHED, function() {
        if (video.readyState >= 2) {
          const bufEnd = video.buffered.length > 0 ? video.buffered.end(0) : 0;
          if (Math.abs(bufEnd - video.currentTime) > 2) {
            video.currentTime = Math.max(0, bufEnd - 1.2);
          }
        }
      });

      currentHls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              currentHls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              currentHls.recoverMediaError();
              break;
            default:
              cleanup();
              title.textContent = camera.city;
          }
        }
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          setTimeout(() => {
            if (!video.paused && video.readyState >= 2) {
              const bufEnd = video.buffered.length > 0 ? video.buffered.end(0) : 0;
              if (bufEnd > video.currentTime + 1.5) {
                video.currentTime = bufEnd - 1.0;
              }
            }
          }, 800);
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = apiUrl;
      video.addEventListener('loadedmetadata', function() {
        video.play().catch(function(e) { console.log('Autoplay blocked:', e); });
      });
    } else {
      title.textContent = camera.city;
    }
  }

  select.addEventListener('change', function() { playCamera(select.value); });
  window.addEventListener('beforeunload', cleanup);
})();
