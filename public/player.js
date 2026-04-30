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
  }

  function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    
    cleanup();
    title.textContent = camera.city + ' — LIVE';

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', ''); // Обязательно для autoplay
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    container.appendChild(video);
    currentVideo = video;

    const apiUrl = '/api/get-stream?source=' + camera.source + '&sourceParams=' + encodeURIComponent(JSON.stringify(camera.sourceParams));

    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      currentHls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30
      });
      
      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, function() {
        video.play().catch(function(e) {
          console.log('Autoplay blocked, waiting for interaction:', e);
          container.insertAdjacentHTML('beforeend', 
            '<button id="play-btn" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:12px 24px;font-size:16px;background:#fff;border:none;border-radius:8px;cursor:pointer">▶ Play</button>'
          );
          document.getElementById('play-btn').onclick = function() {
            this.remove();
            video.muted = false;
            video.play();
          };
        });
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
