// public/player.js
(async function() {
  const select = document.getElementById('city-select');
  const container = document.getElementById('player-container');
  const title = document.getElementById('city-title');
  let currentHls = null;
  let currentVideo = null;

  const streams = await fetch('/streams.json').then(r => r.json());
  
  streams.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = camera.city;
    select.appendChild(option);
  });

  function cleanup() {
    if (currentHls) {
      currentHls.destroy();
      currentHls = null;
    }
    if (currentVideo) {
      currentVideo.pause();
      currentVideo.src = '';
      currentVideo.load();
      currentVideo.remove();
      currentVideo = null;
    }
  }

  function createHlsConfig(authHeaders) {
    return {
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      xhrSetup: function(xhr, url) {
        // Добавляем заголовки к каждому запросу (манифест и сегменты)
        if (authHeaders?.referer) {
          xhr.setRequestHeader('Referer', authHeaders.referer);
        }
        if (authHeaders?.userAgent) {
          xhr.setRequestHeader('User-Agent', authHeaders.userAgent);
        }
        xhr.setRequestHeader('Origin', authHeaders?.referer?.replace(/\/$/, '') || 'https://www.earthcam.com');
      }
    };
  }

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    
    cleanup();
    title.textContent = `${camera.city} — LIVE`;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', ''); // Обязательно для autoplay в браузерах
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    container.appendChild(video);
    currentVideo = video;

    const apiUrl = `/api/get-stream?source=${camera.source}&sourceParams=${encodeURIComponent(JSON.stringify(camera.sourceParams))}`;

    let authHeaders = null;
    try {
      const preflight = await fetch(apiUrl, { method: 'HEAD' });
      const authHeader = preflight.headers.get('X-Stream-Auth');
      if (authHeader) {
        authHeaders = JSON.parse(authHeader);
      }
    } catch (e) {
      console.warn('Could not fetch auth headers, proceeding without:', e);
    }

    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      currentHls = new Hls(createHlsConfig(authHeaders));
      
      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Autoplay blocked:', e));
      });
      
      currentHls.on(Hls.Events.ERROR, (event, data) => {
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
              title.textContent = `${camera.city} — OFFLINE`;
          }
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = apiUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log('Autoplay blocked:', e));
      });
    } else {
      title.textContent = `${camera.city} — UNSUPPORTED`;
      console.error('HLS not supported in this browser');
    }
  }

  select.addEventListener('change', () => playCamera(select.value));
  if (streams.length > 0) playCamera(0);
  
  window.addEventListener('beforeunload', cleanup);
})();
