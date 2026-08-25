"""Registers an in-process-QuickJS JsChallengeProvider with yt-dlp, so YouTube's
n/sig challenge solving never shells out to an external qjs/deno/node/bun binary.

Import this module once, before any extraction, to activate it:

    import embedded_quickjs_provider  # noqa: F401  (registers on import)
"""
from yt_dlp.extractor.youtube.jsc._builtin.ejs import EJSBaseJCP
from yt_dlp.extractor.youtube.jsc.provider import register_preference, register_provider
from yt_dlp.extractor.youtube.pot._provider import BuiltinIEContentProvider

import embedded_quickjs


@register_provider
class EmbeddedQuickJSJCP(EJSBaseJCP, BuiltinIEContentProvider):
    """Solves YouTube JS challenges using an in-process embedded QuickJS
    engine instead of shelling out to a `qjs`/`deno`/`node`/`bun` binary.
    Required on iOS, where sandboxed apps cannot spawn subprocesses."""

    JS_RUNTIME_NAME = 'embedded-quickjs'

    def is_available(self) -> bool:
        # No external binary to detect -- the engine is always present.
        return self._available

    def _run_js_runtime(self, stdin: str, /) -> str:
        return embedded_quickjs.eval_js(stdin)


@register_preference(EmbeddedQuickJSJCP)
def _preference(provider, requests):
    return 1000  # above the built-in subprocess-based providers (<= 850)
