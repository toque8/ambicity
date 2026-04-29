import subprocess
import json
import tempfile
import os

def handler(req, res):
    # Извлекаем параметры
    source = req.query.get('source')
    source_params_json = req.query.get('sourceParams')
    
    if not source or not source_params_json:
        res.status_code = 400
        res.end(json.dumps({'error': 'source and sourceParams required'}))
        return

    try:
        source_params = json.loads(source_params_json)
    except:
        res.status_code = 400
        res.end(json.dumps({'error': 'invalid sourceParams JSON'}))
        return

    if source == 'youtube':
        if 'videoId' not in source_params:
            res.status_code = 400
            res.end(json.dumps({'error': 'videoId required for youtube source'}))
            return

        video_id = source_params['videoId']
        
        # Создаём временную папку для выхода yt-dlp
        with tempfile.TemporaryDirectory() as tmpdir:
            cmd = [
                'yt-dlp',
                '-f', 'best',
                '--get-url',
                f'https://www.youtube.com/watch?v={video_id}'
            ]
            try:
                # Запускаем yt-dlp для получения прямой ссылки
                process = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
                if process.returncode != 0:
                    res.status_code = 500
                    res.end(json.dumps({'error': f'yt-dlp failed: {process.stderr}'}))
                    return
                
                # yt-dlp выводит прямую ссылку на поток (обычно HLS)
                stream_url = process.stdout.strip()
                
                if stream_url:
                    res.status_code = 200
                    res.end(json.dumps({'streamUrl': stream_url}))
                else:
                    res.status_code = 404
                    res.end(json.dumps({'error': 'No stream URL found'}))
            
            except subprocess.TimeoutExpired:
                res.status_code = 504
                res.end(json.dumps({'error': 'yt-dlp timed out'}))
    else:
        res.status_code = 400
        res.end(json.dumps({'error': 'unsupported source type'}))
