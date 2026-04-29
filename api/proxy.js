export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(url).origin
      }
    });
    const body = await response.arrayBuffer();
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.status(response.status).send(Buffer.from(body));
  } catch (error) {
    res.status(500).json({ error: 'proxy error' });
  }
}
