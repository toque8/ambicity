import ytdl from 'ytdl-core';

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

    if (source !== 'youtube') {
        return res.status(400).json({ error: 'unsupported source type' });
    }

    if (!params.videoId) {
        return res.status(400).json({ error: 'videoId required' });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${params.videoId}`;
        const info = await ytdl.getInfo(videoUrl);

        // Ищем HLS-манифест (он есть у живых трансляций)
        const format = info.formats.find(f => f.isLive && f.isHLS);
        if (!format || !format.url) {
            return res.status(404).json({ error: 'HLS manifest not found (maybe not live)' });
        }

        // Проксируем манифест через наш API, чтобы избежать CORS
        const manifestResponse = await fetch(format.url, {
            headers: {
                'Referer': 'https://www.youtube.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const manifestData = await manifestResponse.text();

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(manifestData);
    } catch (err) {
        console.error('Error fetching stream:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
