export default async function handler(req, res) {
  const { source, sourceParams } = req.query;
  if (!source || !sourceParams) {
    return res.status(400).json({ error: 'source and sourceParams required' });
  }

  let params;
  try {
    params = JSON.parse(sourceParams);
  } catch (e) {
    return res.status(400).json({ error: 'invalid sourceParams JSON' });
  }

  try {
    switch (source) {
      case 'youtube': {
        if (!params.videoId) throw new Error('videoId required');
        const videoPage = await fetch(`https://www.youtube.com/watch?v=${params.videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const html = await videoPage.text();
        // Ищем hlsManifestUrl в объекте ytInitialPlayerResponse
        const match = html.match(/hlsManifestUrl\\?":\\?"([^"\\]+)/);
        if (!match) {
          return res.status(500).json({ error: 'Could not extract HLS manifest from YouTube page' });
        }
        const hlsUrl = match[1].replace(/\\\//g, '/');
        // Проксируем HLS-плейлист с нужным Referer
        const manifestRes = await fetch(hlsUrl, {
          headers: { 'Referer': 'https://www.youtube.com/' }
        });
        const manifestData = await manifestRes.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(manifestData);
        break;
      }
      default:
        res.status(400).json({ error: 'unsupported source type' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}