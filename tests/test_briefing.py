from pathlib import Path

from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
PAGE = (ROOT / "briefing.html").read_text(encoding="utf-8")
SOUP = BeautifulSoup(PAGE, "html.parser")


def test_pre_rendered_briefing_structure_and_copy():
    assert SOUP.html["lang"] == "en"
    assert SOUP.select_one("main h1").get_text(strip=True) == "THE BRIEFING"
    headings = [h.get_text(strip=True) for h in SOUP.select("main section > h2")]
    assert headings == [
        "What This Is",
        "Two Layers, One Architecture",
        "The Constitutional Foundation",
        "What Is Proven and Live",
        "What This Is Not",
        "The Mandate",
    ]
    assert "What the NextXus Federation Is — And What It Is Not" in SOUP.get_text(" ")
    assert "200-YEAR MANDATE ACTIVE" in SOUP.get_text(" ")
    assert len(SOUP.select_one("#agent-zero").parent.select("ol > li")) == 6
    assert len(SOUP.select_one("#proven").parent.select("ul > li")) == 5
    assert len(SOUP.select_one("#not").parent.select("ul > li")) == 4
    assert not SOUP.select("script, template")
    assert "Constitutional Binding ratified 2026-09-24" in SOUP.footer.get_text()


def test_links_accessibility_and_small_screen_defaults():
    links = SOUP.select("nav .nav-links a")
    assert [(a.get_text(strip=True), a["href"]) for a in links] == [
        ("Home", "/"),
        ("Throne", "/cockpit.html"),
        ("Ring of 12", "/sims/ring-of-12.html"),
        ("Briefing", "/briefing.html"),
    ]
    assert SOUP.select_one('a[href="#main"]')
    assert SOUP.select_one('a[aria-current="page"]')["href"] == "/briefing.html"
    assert all(SOUP.select_one("#" + h["aria-labelledby"]) for h in SOUP.select("main section"))
    assert SOUP.select_one(".bg-canvas")["aria-hidden"] == "true"
    assert "html{font-size:16px}" in PAGE
    assert "@media(max-width:640px)" in PAGE
    assert "prefers-reduced-motion:reduce" in PAGE
    assert all(f"@keyframes {animation}" in PAGE for animation in ("pulse", "glow", "drift"))


def test_claims_are_qualified_where_not_independently_verified():
    status = SOUP.select_one("#proven").parent.get_text(" ", strip=True)
    assert "not verified live" in status
    assert "chat is not verified operational" in status
    assert "public access is not verified" in status
    assert "not independently tested" in status


def test_home_nav_keeps_existing_links_and_adds_briefing_once():
    home = BeautifulSoup((ROOT / "index.html").read_text(encoding="utf-8"), "html.parser")
    nav_links = [a.get("href") for a in home.select("nav .nav-links a")]
    assert nav_links == [
        "/comms.html", "/chamber.html", "/council/", "/briefing.html", "https://next-xus.com"
    ]
