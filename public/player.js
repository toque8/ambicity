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
    title.textContent = camera.city + ' — LIVE';

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
    overlay.innerHTML = '<button class="play-btn">Play</button><span class="play-hint">Click to enable sound</span>';
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
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 30 * 1000 * 1000,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 3,
        startFragPrefetch: true,
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
      
      currentHls.on(Hls.Events.AUDIO_TRACK_SWITCHED, function() {
        console.log('Audio track switched');
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
              title.textContent = camera.city + ' — OFFLINE';
          }
        }
        if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR) {
          video.currentTime += 0.1;
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = apiUrl;
      video.addEventListener('loadedmetadata', function() {
        video.play().catch(function(e) { console.log('Autoplay blocked:', e); });
      });
    } else {
      title.textContent = camera.city + ' — UNSUPPORTED';
    }
  }

  select.addEventListener('change', function() { playCamera(select.value); });
  window.addEventListener('beforeunload', cleanup);
})();
