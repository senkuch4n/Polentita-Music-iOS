"""ctypes binding to the in-process QuickJS bridge (native/quickjs-bridge/bridge.c,
compiled as libqjsbridge.dylib and embedded as a signed framework in the app
bundle). Validated first as a standalone Mac spike (spike-quickjs/); this is
the same bridge.c/embedded_quickjs.py pairing, just resolving the dylib path
from within the iOS app bundle instead of a sibling file.

Replaces yt-dlp's subprocess-based QuickJSJCP._run_js_runtime, which shells
out to a `qjs` binary -- not possible in an iOS app sandbox (no fork/exec).
"""
import ctypes
import os
import threading

_DYLIB_PATH_ENV = 'POLENTITA_QUICKJS_BRIDGE_PATH'

_lib_path = os.environ.get(_DYLIB_PATH_ENV)
if not _lib_path:
    raise RuntimeError(f'{_DYLIB_PATH_ENV} not set before importing embedded_quickjs')

_lib = ctypes.CDLL(_lib_path)
_lib.qjs_eval.restype = ctypes.c_char_p
_lib.qjs_eval.argtypes = [ctypes.c_char_p]
_lib.qjs_last_error.restype = ctypes.c_char_p
_lib.qjs_last_error.argtypes = []

# QuickJS contexts aren't thread-safe; mirrors yt-dlp's own PYTHON_LOCK
# pattern around the Chaquopy interpreter on Android.
_LOCK = threading.Lock()


class QuickJSError(RuntimeError):
    pass


def eval_js(script: str) -> str:
    with _LOCK:
        out = _lib.qjs_eval(script.encode('utf-8'))
        if out is None:
            err = _lib.qjs_last_error()
            raise QuickJSError(err.decode('utf-8') if err else 'unknown QuickJS error')
        return out.decode('utf-8')
