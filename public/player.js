(async function() {
  const select = document.getElementById('city-select');
  const video = document.getElementById('video');
  const title = document.getElementById('city-title');
  let hls = null;
  let iframeContainer = null;

  // Загружаем каталог
  const streams = await fetch('/streams.json').then(r => r.json());

  streams.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = camera.city;
    select.appendChild(option);
  });

  function cleanup() {
    if (hls) { hls.destroy(); hls = null; }
    if (iframeContainer) { iframeContainer.remove(); iframeContainer = null; }
    video.style.display = 'none';
    video.src = '';
  }

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    cleanup();
    title.textContent = `${camera.city} — LIVE`;

    const params = camera.sourceParams;

    // Если указан embed – встраиваем YouTube iframe поверх <video>
    if (params.embed) {
      if (camera.source === 'youtube' && params.videoId) {
        iframeContainer = document.createElement('div');
        iframeContainer.style.position = 'absolute';
        iframeContainer.style.top = '0'; iframeContainer.style.left = '0';
        iframeContainer.style.width = '100%'; iframeContainer.style.height = '100%';
        iframeContainer.style.zIndex = '5';
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${params.videoId}?autoplay=1&mute=0&playsinline=1&controls=0&showinfo=0&loop=1&playlist=${params.videoId}`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        iframeContainer.appendChild(iframe);
        document.body.appendChild(iframeContainer);
        video.style.display = 'none';
      }
      return;
    }

    video.style.display = 'block';
    const apiParams = new URLSearchParams({
      source: camera.source,
      sourceParams: JSON.stringify(params)
    });
    const apiResp = await fetch(`/api/get-stream?${apiParams}`);
    const { streamUrl, error } = await apiResp.json();
    if (error) { alert('Failed to load stream: ' + error); return; }

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
              .then(data => callbacks.onSuccess({ data }, context))
              .catch(err => callbacks.onError({ code: err.message, text: err.message }, context));
          }
          abort() {}
          destroy() {}
        }
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else {
      video.src = streamUrl;
      video.play();
    }
  }

  select.addEventListener('change', () => playCamera(select.value));
  if (streams.length > 0) playCamera(0);
})();
