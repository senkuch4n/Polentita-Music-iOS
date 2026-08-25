"""Small helpers for the ObjC<->Python boundary (PythonRuntime.m) that don't
belong in yt_dlp_bridge.py itself (kept identical to Android's copy).
"""


class NullDownloadCallback:
    """Passed to yt_dlp_bridge.download_audio when the native side doesn't
    need live progress ticks yet -- unlike Android's Chaquopy bridge, we are
    not constrained to a Java interface proxy here, so this is just a plain
    Python object satisfying the callback.onProgress/isCancelled contract."""

    def onProgress(self, status, downloaded, total, speed):
        pass

    def isCancelled(self):
        return False
