(async function() {
  const select = document.getElementById('city-select');
  const container = document.getElementById('player-container');
  const title = document.getElementById('city-title');
  let currentVideo = null;

  const streams = await fetch('/streams.json').then(r => r.json());
  streams.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = camera.city;
    select.appendChild(option);
  });

  function cleanup() {
    if (currentVideo) {
      if (currentVideo._hls) currentVideo._hls.destroy();
      currentVideo.remove();
      currentVideo = null;
    }
  }

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    cleanup();
    title.textContent = `${camera.city} — LIVE`;

    const video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    container.appendChild(video);
    currentVideo = video;

    if (camera.source === 'hls' && camera.sourceParams.url) {
      const Hls = window.Hls;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(camera.sourceParams.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
        video._hls = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = camera.sourceParams.url;
        video.play();
      }
    } else {
      title.textContent += ' (source not supported)';
    }
  }

  select.addEventListener('change', () => playCamera(select.value));
  if (streams.length > 0) playCamera(0);
})();
