"""Checks that the live Throne pages have a complete, non-destructive static mirror."""

from html.parser import HTMLParser
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
ROUTES = (
    "index.html",
    "command/index.html",
    "council/index.html",
    "senate/index.html",
    "federation-map/index.html",
    "pontus/index.html",
    "chatgpt/index.html",
    "grok/index.html",
    "gemini/index.html",
)
ASSETS = (
    "styles.css",
    "static/commons.css",
    "static/mini-browser.js",
    "static/commons.js",
    "static/federation-integrations.css",
    "static/federation-integrations.js",
    "static/neural-mesh.js",
)
PRESERVED = (
    "briefing.html",
    "cockpit.html",
    "chamber.html",
    "comms.html",
    "links.html",
    "roger.html",
    "throne-public.html",
    "CNAME",
    "README.md",
)


class AssetReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {"img", "script", "source", "video", "audio", "iframe"}:
            for name in ("src", "poster"):
                if attrs.get(name):
                    self.urls.add(attrs[name])
        if tag == "link" and attrs.get("rel", "").lower() in {
            "stylesheet", "icon", "apple-touch-icon", "modulepreload", "preload"
        } and attrs.get("href"):
            self.urls.add(attrs["href"])
        for name in ("srcset", "imagesrcset"):
            if attrs.get(name):
                self.urls.update(item.strip().split()[0] for item in attrs[name].split(","))


def test_all_live_routes_exported_as_html_directories():
    for route in ROUTES:
        content = (ROOT / route).read_bytes()
        assert len(content) > 1000, route
        assert b"<!doctype html>" in content[:100].lower(), route
        if route != "index.html":
            assert not (ROOT / (route.split("/")[0] + ".html")).exists()
    assert len((ROOT / "index.html").read_bytes()) == 11815


def test_every_local_page_asset_is_exported():
    referenced = set()
    for route in ROUTES:
        parser = AssetReferences()
        parser.feed((ROOT / route).read_text(encoding="utf-8"))
        for url in parser.urls:
            parts = urlsplit(url)
            if parts.netloc and parts.netloc != "nextxus.tech":
                continue  # External font CDN, not hosted by the Throne app.
            path = unquote(parts.path)
            if not path:
                continue
            target = (ROOT / path.lstrip("/")) if path.startswith("/") else (ROOT / route).parent / path
            assert target.is_file(), f"{route} references missing asset {url}"
            referenced.add(target.relative_to(ROOT).as_posix())
    assert set(ASSETS) <= referenced


def test_preserved_files_and_directories_are_untouched():
    tracked = subprocess.check_output(
        ["git", "ls-tree", "-r", "--name-only", "HEAD"], cwd=ROOT, text=True
    ).splitlines()
    protected = set(PRESERVED) | {
        item for item in tracked if item.startswith(("sims/", "nova/"))
    }
    assert protected
    for path in sorted(protected):
        original = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
        assert (ROOT / path).read_bytes() == original, path
