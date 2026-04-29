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
        const baseUrl = params.url;
        // Забираем плейлист с реферером
        const response = await fetch(baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://www.earthcam.com/'
            }
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: 'EarthCam stream not available' });
        }
        let manifest = await response.text();

        // Переписываем все относительные и абсолютные ссылки на сегменты, чтобы они шли через наш прокси
        const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/') + 1);
        manifest = manifest.replace(/^([^#].+)$/gm, (line) => {
            if (line.startsWith('http')) {
                return `/api/proxy?url=${encodeURIComponent(line)}`;
            } else {
                const absoluteUrl = basePath + line;
                return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
            }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.status(200).send(manifest);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}