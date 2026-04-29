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
      currentPlayer.remove();
      currentPlayer = null;
    }
  }

  async function playCamera(index) {
    const camera = streams[index];
    if (!camera) return;
    cleanup();
    title.textContent = `${camera.city} — LIVE`;

    if (camera.source === 'youtube' && camera.sourceParams.videoId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${camera.sourceParams.videoId}?autoplay=1&mute=0&playsinline=1&controls=0&showinfo=0&loop=1&playlist=${camera.sourceParams.videoId}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      
      container.appendChild(iframe);
      currentPlayer = iframe;

      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        new YT.Player(iframe, {
          events: {
            onReady: (event) => {
              event.target.unMute();
              event.target.playVideo();
            }
          }
        });
      };
      return;
    }

    if (camera.source === 'hls' && camera.sourceParams.url) {
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
        hls.loadSource(camera.sourceParams.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play();
        });
        video._hls = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = camera.sourceParams.url;
        video.play();
      }
      return;
    }

    title.textContent += ' (source not supported)';
  }

  select.addEventListener('change', () => playCamera(select.value));
  if (streams.length > 0) playCamera(0);
})();
