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

    switch (source) {
        case 'youtube': {
            if (!params.videoId) {
                return res.status(400).json({ error: 'videoId required for youtube source' });
            }
            return res.status(500).json({ error: 'YouTube source temporarily disabled' });
        }
        case 'hls': {
            if (!params.url) {
                return res.status(400).json({ error: 'url required for hls source' });
            }
            return res.status(200).json({ streamUrl: params.url });
        }
        default:
            return res.status(400).json({ error: 'unsupported source type' });
    }
}
