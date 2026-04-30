// api/get-stream.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const source = url.searchParams.get('source');
    const sourceParamsRaw = url.searchParams.get('sourceParams');

    if (!source || !sourceParamsRaw) {
      return new Response(JSON.stringify({ error: 'missing params' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const params = JSON.parse(decodeURIComponent(sourceParamsRaw));
    
    if (source !== 'hls' && source !== 'earthcam') {
      return new Response(JSON.stringify({ error: 'unsupported source' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!params.url) {
      return new Response(JSON.stringify({ error: 'url required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const originalUrl = new URL(params.url);
    const baseUrl = originalUrl.origin + originalUrl.pathname.substring(0, originalUrl.pathname.lastIndexOf('/') + 1);
    const proxyBase = url.origin + '/api/proxy-segment?src=';

    const manifestRes = await fetch(params.url, {
      headers: {
        'User-Agent': params.userAgent || 'Mozilla/5.0',
        'Referer': params.referer || 'https://www.earthcam.com/',
        'Origin': 'https://www.earthcam.com'
      }
    });

    if (!manifestRes.ok) {
      return new Response(JSON.stringify({ error: 'stream unavailable' }), {
        status: manifestRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let manifestText = await manifestRes.text();
    
    manifestText = manifestText.split('\n').map(line => {
      if (line.startsWith('#') || !line.trim()) return line;
      if (line.startsWith('http://') || line.startsWith('https://')) {
        return proxyBase + encodeURIComponent(line.trim());
      }
      return proxyBase + encodeURIComponent(baseUrl + line.trim());
    }).join('\n');

    return new Response(manifestText, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
