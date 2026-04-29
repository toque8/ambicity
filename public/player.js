if (Hls.isSupported()) {
  hls = new Hls({
    loader: class {
      constructor(config) {
        this.config = config;
      }
      load(context, config, callbacks) {
        const url = context.url;
        // Проксирование через наш /api/proxy
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        fetch(proxyUrl)
          .then(response => {
            if (!response.ok) throw new Error('Network error');
            return response.arrayBuffer();
          })
          .then(data => {
            callbacks.onSuccess({ data }, context);
          })
          .catch(error => {
            callbacks.onError({ code: error.message, text: error.message }, context);
          });
      }
      abort() {}
      destroy() {}
    }
  });
  hls.loadSource(streamUrl);
  hls.attachMedia(video);
  ...
}