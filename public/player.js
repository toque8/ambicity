(async function() {
  const select = document.getElementById('city-select');
  const video = document.getElementById('video');
  const title = document.getElementById('city-title');
  let hls = null;

  // Загружаем каталог камер
  const streams = await fetch('/streams.json').then(r => r.json());
  
  streams.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = camera.city;
    select.appendChild(option);
  });

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;

    title.textContent = `${camera.city} — LIVE`;

    const params = new URLSearchParams({
      source: camera.source,
      sourceParams: JSON.stringify(camera.sourceParams)
    });
    const apiResponse = await fetch(`/api/get-stream?${params}`);
    const { streamUrl, error } = await apiResponse.json();

    if (error) {
      alert('Failed to load stream: ' + error);
      return;
    }

    if (hls) {
      hls.destroy();
      hls = null;
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        loader: class {
          constructor(config) { this.config = config; }
          load(context, config, callbacks) {
            const proxyUrl = `/api/proxy?url=${encodeURIComponent(context.url)}`;
            fetch(proxyUrl)
              .then(response => {
                if (!response.ok) throw new Error('Network error');
                return response.arrayBuffer();
              })
              .then(data => {
                callbacks.onSuccess({ data }, context);
              })
              .catch(err => {
                callbacks.onError({ code: err.message, text: err.message }, context);
              });
          }
          abort() {}
          destroy() {}
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play();
      });
    }
  }

  select.addEventListener('change', () => {
    playCamera(select.value);
  });

  if (streams.length > 0) {
    playCamera(0);
  }
})();
