import json
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

import yt_dlp


MAX_FILE_SIZE = 512 * 1024 * 1024
# YouTube puede devolver formatos DRM para el cliente predeterminado. Estos
# clientes públicos no requieren cookies y cubren el caso de recuperación.
YOUTUBE_FALLBACK_CLIENTS = ("android_vr", "web_embedded", "tv")


class _QuietLogger:
    def debug(self, _message):
        pass

    def info(self, _message):
        pass

    def warning(self, _message):
        pass

    def error(self, _message):
        pass


def _base_options():
    return {
        "quiet": True,
        "no_warnings": True,
        "logger": _QuietLogger(),
        "noplaylist": True,
        "playlist_items": "1",
        "socket_timeout": 30,
        "retries": 3,
        "fragment_retries": 3,
        "max_filesize": MAX_FILE_SIZE,
        "restrictfilenames": True,
        "windowsfilenames": False,
        "cachedir": False,
        "ignoreconfig": True,
        "no_color": True,
    }


def _is_youtube_url(url):
    try:
        host = (urlparse(str(url or "")).hostname or "").lower()
    except ValueError:
        return False
    return (
        host == "youtu.be"
        or host == "youtube.com"
        or host.endswith(".youtube.com")
        or host == "youtube-nocookie.com"
        or host.endswith(".youtube-nocookie.com")
    )


def _is_youtube_search(url):
    return str(url or "").lower().startswith("ytsearch")


def _should_retry_youtube(url, error):
    if not (_is_youtube_url(url) or _is_youtube_search(url)):
        return False
    message = str(error or "").lower()
    return any(
        marker in message
        for marker in (
            "sign in to confirm",
            "not a bot",
            "login_required",
            "po token",
            "requested format is not available",
            "http error 403",
            "http error 400",
            "http error 408",
            "http error 429",
            "http error 500",
            "http error 502",
            "http error 503",
            "bad request",
            "too many requests",
            "unable to download",
            "timed out",
            "connection reset",
            "connection aborted",
            "temporary failure",
            "forbidden",
            "failed to extract any player response",
            "all player responses are invalid",
            "your ip is likely being blocked",
            "video unavailable",
            "this video is restricted",
            "workspace administrator",
            "network administrator",
            "this video is drm protected",
            "drm protected",
            "drm-only",
            "the page needs to be reloaded",
        )
    )


def _youtube_fallback_options(options, player_client):
    fallback = dict(options)
    extractor_args = {
        key: dict(value)
        for key, value in (options.get("extractor_args") or {}).items()
    }
    youtube_args = dict(extractor_args.get("youtube") or {})
    youtube_args["player_client"] = [player_client]
    extractor_args["youtube"] = youtube_args
    fallback["extractor_args"] = extractor_args
    return fallback


def _extract_with_youtube_fallback(url, options, download):
    attempts = [options]
    if _is_youtube_url(url) or _is_youtube_search(url):
        attempts.extend(
            _youtube_fallback_options(options, player_client)
            for player_client in YOUTUBE_FALLBACK_CLIENTS
        )

    last_error = None
    for attempt in attempts:
        try:
            with yt_dlp.YoutubeDL(attempt) as ydl:
                return ydl.extract_info(url, download=download), ydl
        except Exception as error:
            if not _should_retry_youtube(url, error):
                raise
            last_error = error

    if last_error is not None:
        raise last_error
    raise RuntimeError("No se pudo preparar la extracción")


def _media_json(info, path=None):
    payload = {
        "id": str(info.get("id") or ""),
        "title": str(info.get("title") or "Audio"),
        "artist": str(
            info.get("artist")
            or info.get("uploader")
            or info.get("channel")
            or ""
        ),
        "album": str(info.get("album") or ""),
        "durationMs": int(float(info.get("duration") or 0) * 1000),
        "thumbnail": _best_thumbnail(info),
        "webpageUrl": str(info.get("webpage_url") or info.get("original_url") or ""),
        "extractor": str(info.get("extractor_key") or info.get("extractor") or ""),
        "extension": str(info.get("ext") or ""),
        "sizeBytes": int(info.get("filesize") or info.get("filesize_approx") or -1),
        "path": str(path or ""),
    }
    return json.dumps(payload, ensure_ascii=False)


def _best_thumbnail(info):
    thumbnails = [item for item in (info.get("thumbnails") or []) if item.get("url")]
    if thumbnails:
        best = max(
            thumbnails,
            key=lambda item: (
                int(item.get("preference") or -1),
                int(item.get("width") or 0) * int(item.get("height") or 0),
            ),
        )
        return str(best.get("url") or "")
    return str(info.get("thumbnail") or "")


def _upload_date(info):
    raw = str(info.get("upload_date") or "")
    if len(raw) == 8 and raw.isdigit():
        return raw
    timestamp = info.get("timestamp") or info.get("release_timestamp")
    if timestamp:
        return datetime.fromtimestamp(float(timestamp), tz=timezone.utc).strftime("%Y%m%d")
    return ""


def inspect_media(url):
    options = _base_options()
    options["skip_download"] = True
    info, _ydl = _extract_with_youtube_fallback(url, options, download=False)
    if info and info.get("entries"):
        info = next((entry for entry in info["entries"] if entry), None)
    if not info:
        raise RuntimeError("El proveedor no devolvió información del audio")
    return _media_json(info)


def inspect_playlist(url):
    """Read public playlist metadata without resolving or downloading audio."""
    options = _base_options()
    options.pop("playlist_items", None)
    options.update(
        {
            "skip_download": True,
            "extract_flat": "in_playlist",
            "noplaylist": False,
        }
    )
    info, _ydl = _extract_with_youtube_fallback(url, options, download=False)
    if not info:
        raise RuntimeError("YouTube no devolvió información de la playlist")

    entries = []
    for entry in info.get("entries") or []:
        if not entry:
            continue
        video_id = str(entry.get("id") or "")
        raw_url = str(
            entry.get("webpage_url")
            or entry.get("original_url")
            or entry.get("url")
            or ""
        )
        if not video_id and raw_url.startswith("https://"):
            video_id = str(urlparse(raw_url).query.split("v=", 1)[-1].split("&", 1)[0])
        webpage_url = raw_url
        if not webpage_url.startswith("https://") and video_id:
            webpage_url = f"https://www.youtube.com/watch?v={video_id}"
        if not webpage_url.startswith("https://"):
            continue
        entries.append(
            {
                "id": video_id or webpage_url,
                "title": str(entry.get("title") or ""),
                "artist": str(
                    entry.get("artist")
                    or entry.get("artists")
                    or entry.get("channel")
                    or entry.get("uploader")
                    or ""
                ),
                "album": str(entry.get("album") or ""),
                "durationMs": int(float(entry.get("duration") or 0) * 1000),
                "thumbnail": _best_thumbnail(entry),
                "webpageUrl": webpage_url,
            }
        )
    return json.dumps(
        {
            "id": str(info.get("id") or ""),
            "title": str(info.get("title") or ""),
            "description": str(info.get("description") or ""),
            "thumbnail": _best_thumbnail(info),
            "webpageUrl": str(info.get("webpage_url") or info.get("original_url") or url),
            "entries": entries,
            "totalTracks": int(info.get("playlist_count") or len(entries)),
        },
        ensure_ascii=False,
    )


def _preview_stream_url(info):
    requested = info.get("requested_formats") or []
    audio_formats = [
        item
        for item in requested
        if item.get("url") and item.get("acodec") not in (None, "none")
    ]
    if audio_formats:
        return str(audio_formats[0]["url"])
    stream_url = info.get("url")
    if stream_url and info.get("acodec") not in (None, "none"):
        return str(stream_url)
    for item in info.get("formats") or []:
        if item.get("url") and item.get("acodec") not in (None, "none"):
            return str(item["url"])
    return ""


def preview_audio(url):
    options = _base_options()
    options.update(
        {
            "format": (
                "bestaudio[ext=m4a]/bestaudio[ext=webm]/"
                "bestaudio/best[acodec!=none]"
            ),
            "skip_download": True,
        }
    )
    info, _ydl = _extract_with_youtube_fallback(url, options, download=False)
    if info and info.get("entries"):
        info = next((entry for entry in info["entries"] if entry), None)
    if not info:
        raise RuntimeError("No se pudo resolver un adelanto de audio")
    stream_url = _preview_stream_url(info)
    if not stream_url or urlparse(stream_url).scheme.lower() != "https":
        raise RuntimeError("El proveedor no devolvió una pista HTTPS para el adelanto")
    payload = json.loads(_media_json(info))
    payload["streamUrl"] = stream_url
    return json.dumps(payload, ensure_ascii=False)


def search_youtube(query, page=0, page_size=10):
    clean_query = str(query or "").strip()
    if len(clean_query) < 3:
        raise ValueError("La búsqueda requiere al menos 3 caracteres")
    page = max(0, int(page))
    page_size = min(20, max(1, int(page_size)))
    start = page * page_size
    end = start + page_size

    options = _base_options()
    options.pop("playlist_items", None)
    options.update(
        {
            "skip_download": True,
            "extract_flat": "in_playlist",
            "noplaylist": False,
        }
    )
    info, _ydl = _extract_with_youtube_fallback(
        f"ytsearch{end + 1}:{clean_query}",
        options,
        download=False,
    )
    entries = [entry for entry in (info or {}).get("entries", []) if entry]
    selected = entries[start:end]
    items = []
    seen_ids = set()
    for entry in selected:
        video_id = str(entry.get("id") or "")
        webpage_url = str(entry.get("webpage_url") or entry.get("original_url") or "")
        if not webpage_url.startswith("https://") and video_id:
            webpage_url = f"https://www.youtube.com/watch?v={video_id}"
        stable_id = video_id or webpage_url
        if not stable_id or stable_id in seen_ids:
            continue
        seen_ids.add(stable_id)
        items.append(
            {
                "id": stable_id,
                "title": str(entry.get("title") or "Sin título"),
                "channel": str(
                    entry.get("channel")
                    or entry.get("uploader")
                    or entry.get("channel_id")
                    or "Canal desconocido"
                ),
                "durationMs": int(float(entry.get("duration") or 0) * 1000),
                "thumbnail": _best_thumbnail(entry),
                "webpageUrl": webpage_url,
                "uploadDate": _upload_date(entry),
            }
        )
    return json.dumps(
        {
            "items": items,
            "page": page,
            "hasMore": len(entries) > end,
        },
        ensure_ascii=False,
    )


def download_audio(url, output_dir, callback):
    os.makedirs(output_dir, exist_ok=True)

    def progress_hook(data):
        if callback is not None and callback.isCancelled():
            raise RuntimeError("__POLENTITA_CANCELLED__")
        if callback is None:
            return
        status = str(data.get("status") or "")
        downloaded = int(data.get("downloaded_bytes") or 0)
        total = int(data.get("total_bytes") or data.get("total_bytes_estimate") or -1)
        speed = int(data.get("speed") or 0)
        callback.onProgress(status, downloaded, total, speed)

    options = _base_options()
    options.update(
        {
            "format": (
                "bestaudio[ext=m4a]/bestaudio[ext=webm]/"
                "bestaudio/best[acodec!=none]"
            ),
            "outtmpl": os.path.join(output_dir, "%(id).80s.%(ext)s"),
            "continuedl": True,
            "nopart": False,
            "overwrites": False,
            "progress_hooks": [progress_hook],
        }
    )

    info, ydl = _extract_with_youtube_fallback(url, options, download=True)
    if info and info.get("entries"):
        info = next((entry for entry in info["entries"] if entry), None)
    if not info:
        raise RuntimeError("No se pudo resolver un audio descargable")
    requested = info.get("requested_downloads") or []
    path = requested[0].get("filepath") if requested else None
    if not path:
        path = info.get("_filename") or ydl.prepare_filename(info)
    return _media_json(info, path)
