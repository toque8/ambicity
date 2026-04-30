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
        liveSyncDuration: 10,
        liveMaxLatencyDuration: 20,
        maxBufferLength: 12,
        maxMaxBufferLength: 25,
        maxBufferSize: 60 * 1000 * 1000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 500,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        maxBufferHole: 0.2,
        startFragPrefetch: true,
        lowLatencyMode: false,
        testBandwidth: false,
        abrEwmaDefaultEstimate: 5000000
      });
      
      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play().catch(function() {
          console.log('Autoplay blocked, waiting for user interaction');
        });
      });

      currentHls.on(Hls.Events.FRAG_BUFFERED, function(event, data) {
        if (data.type === 'audio' && currentVideo && !currentVideo.paused) {
          const end = currentVideo.buffered.end(0);
          const cur = currentVideo.currentTime;
          if (end - cur > 1.5) {
            currentVideo.currentTime = end - 1.0;
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
