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

    if (source !== 'earthcam') {
        return res.status(400).json({ error: 'unsupported source type' });
    }

    if (!params.url) {
        return res.status(400).json({ error: 'url required for earthcam source' });
    }

    try {
        const response = await fetch(params.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.earthcam.com/'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch stream: ${response.status}` });
        }

        const manifestData = await response.text();
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(manifestData);
    } catch (err) {
        console.error('Error fetching stream:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
}
