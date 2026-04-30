export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');
  const sourceParams = searchParams.get('sourceParams');

  if (!source || !sourceParams) {
    return new Response(JSON.stringify({ error: 'source and sourceParams required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let params;
  try {
    params = JSON.parse(sourceParams);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid sourceParams JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (source !== 'earthcam-hls' || !params.url) {
    return new Response(JSON.stringify({ error: 'unsupported source' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
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

    const manifestText = await manifestRes.text();
    
    return new Response(manifestText, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Stream-Headers': JSON.stringify({
          referer: params.referer,
          userAgent: params.userAgent
        })
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
