export default async function handler(req, res) {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'url required' });

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.earthcam.com/'
            }
        });
        const body = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'video/MP2T');
        res.status(response.status).send(Buffer.from(body));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}