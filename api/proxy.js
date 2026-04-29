export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'url required' });

    const urlObj = new URL(url);
    let referer = urlObj.origin;

    if (urlObj.hostname.includes('earthcam.com')) {
        referer = 'https://www.earthcam.com/';
    } else if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('googlevideo.com')) {
        referer = 'https://www.youtube.com/';
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': referer
            }
        });
        const body = await response.arrayBuffer();
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.status(response.status).send(Buffer.from(body));
    } catch (error) {
        res.status(500).json({ error: 'proxy error' });
    }
}
