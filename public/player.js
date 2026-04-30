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

  class HeaderInjectLoader extends Hls.DefaultConfig.loader {
    constructor(config) {
      super(config);
      const load = this.load.bind(this);
      this.load = function(context, config, callbacks) {
        if (context.type === 'manifest' || context.type === 'segment') {
          const originalOnSuccess = callbacks.onSuccess;
          callbacks.onSuccess = function(response, stats, context) {
            // Можно логировать, если нужно
            return originalOnSuccess(response, stats, context);
          };
        }
        load(context, config, callbacks);
      };
    }
  }

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    
    cleanup();
    title.textContent = `${camera.city} — LIVE`;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', ''); 
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    container.appendChild(video);
    currentVideo = video;

    const apiUrl = `/api/get-stream?source=${camera.source}&sourceParams=${encodeURIComponent(JSON.stringify(camera.sourceParams))}`;

    const preflight = await fetch(apiUrl, { method: 'HEAD' });
    const streamHeaders = preflight.headers.get('X-Stream-Headers');
    const headersConfig = streamHeaders ? JSON.parse(streamHeaders) : {};

    if (Hls && Hls.isSupported()) {
      currentHls = new Hls({
        loader: HeaderInjectLoader,
        xhrSetup: function(xhr, url) {
          if (headersConfig.referer) {
            xhr.setRequestHeader('Referer', headersConfig.referer);
          }
          if (headersConfig.userAgent) {
            xhr.setRequestHeader('User-Agent', headersConfig.userAgent);
          }
          xhr.setRequestHeader('Origin', headersConfig.referer || 'https://www.earthcam.com');
        },
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30
      });

      currentHls.loadSource(apiUrl);
      currentHls.attachMedia(video);
      
      currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(e => console.log('Autoplay prevented:', e));
      });
      
      currentHls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          // Пробуем восстановиться
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
      // Native HLS для Safari
      video.src = apiUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(e => console.log('Autoplay prevented:', e));
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
