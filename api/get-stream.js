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

        // Загружаем страницу трансляции
        const videoPage = await fetch(`https://www.youtube.com/watch?v=${params.videoId}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        });
        const html = await videoPage.text();

        // Ищем начало JSON-объекта ytInitialPlayerResponse
        const prefix = 'var ytInitialPlayerResponse = ';
        const startIdx = html.indexOf(prefix);
        if (startIdx === -1) {
          return res.status(500).json({ error: 'Player response not found' });
        }
        const jsonStart = startIdx + prefix.length;
        const jsonEnd = html.indexOf(';', jsonStart);
        if (jsonEnd === -1) {
          return res.status(500).json({ error: 'Could not parse player response' });
        }
        const jsonStr = html.substring(jsonStart, jsonEnd);

        // Парсим JSON, чтобы достать hlsManifestUrl
        let playerResponse;
        try {
          playerResponse = JSON.parse(jsonStr);
        } catch (e) {
          return res.status(500).json({ error: 'Invalid player response JSON' });
        }

        const hlsUrl = playerResponse?.streamingData?.hlsManifestUrl;
        if (!hlsUrl) {
          return res.status(500).json({ error: 'HLS manifest URL not found (maybe not live or restricted)' });
        }

        // Проксируем манифест с Referer от YouTube
        const manifestRes = await fetch(hlsUrl, {
          headers: {
            'Referer': 'https://www.youtube.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (!manifestRes.ok) {
          return res.status(500).json({ error: `Manifest fetch failed: ${manifestRes.status}` });
        }

        const manifestData = await manifestRes.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        return res.status(200).send(manifestData);
      }

      default:
        return res.status(400).json({ error: 'unsupported source type' });
    }
  } catch (error) {
    console.error('get-stream error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
