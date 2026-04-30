// api/get-stream.js
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const source = url.searchParams.get('source');
  const sourceParamsRaw = url.searchParams.get('sourceParams');

  if (!source || !sourceParamsRaw) {
    return new Response(JSON.stringify({ error: 'source and sourceParams required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let params;
  try {
    params = JSON.parse(decodeURIComponent(sourceParamsRaw));
  } catch {
    return new Response(JSON.stringify({ error: 'invalid sourceParams JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (source !== 'hls' && source !== 'earthcam') {
    return new Response(JSON.stringify({ error: 'unsupported source type' }), {
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

  try {
    const manifestRes = await fetch(params.url, {
      headers: {
        'User-Agent': params.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

    const manifestText = await manifestRes.text();
    
    return new Response(manifestText, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        // Передаём клиенту заголовки, которые нужны для запросов сегментов
        'X-Stream-Auth': JSON.stringify({
          referer: params.referer || 'https://www.earthcam.com/',
          userAgent: params.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
      }
    });
  } catch (err) {
