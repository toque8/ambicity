export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const segmentUrl = url.searchParams.get('src');
    
    if (!segmentUrl) {
      return new Response('Missing segment URL', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(segmentUrl);
    const referer = new URL(decodedUrl).origin.replace(/\/$/, '') + '/';
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const segmentRes = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Origin': referer
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!segmentRes.ok) {
      return new Response('Segment unavailable', { status: segmentRes.status });
    }

    const contentType = segmentRes.headers.get('Content-Type') || 'video/mp2t';
    const buffer = await segmentRes.arrayBuffer();
    
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
        'Content-Length': buffer.byteLength.toString()
      }
    });

  } catch (err) {
    return new Response('Proxy error: ' + err.message, { status: 500 });
  }
}
