(async function() {
  const select = document.getElementById('city-select');
  const container = document.getElementById('player-container');
  const title = document.getElementById('city-title');
  let currentPlayer = null;

  const streams = await fetch('/streams.json').then(r => r.json());

  streams.forEach((camera, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = camera.city;
    select.appendChild(option);
  });

  function cleanup() {
    if (currentPlayer) {
      if (currentPlayer._hls) {
        currentPlayer._hls.destroy();
      }
      currentPlayer.remove();
      currentPlayer = null;
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
    currentPlayer = video;

    const Hls = window.Hls;
    if (Hls && Hls.isSupported()) {
      const hls = new Hls();
      const apiUrl = `/api/get-stream?source=${camera.source}&sourceParams=${encodeURIComponent(JSON.stringify(camera.sourceParams))}`;
      hls.loadSource(apiUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
      });
      video._hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = apiUrl;
      video.play();
    } else {
      title.textContent += ' (source not supported)';
    }
  }

  select.addEventListener('change', () => playCamera(select.value));
  if (streams.length > 0) playCamera(0);
})();
