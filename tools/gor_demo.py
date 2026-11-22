#!/usr/bin/env python3
"""Gör om originalsidan till en demoversion.

Läser index.html från en lokal klon av originalrepot
(ai-i-folkbibliotekets-praktik) och skriver index.html här, där:
  * rubriker, menyer, knappar och etiketter behålls,
  * all löptext byts mot lorem ipsum med ungefär samma längd,
  * YouTube-inspelningarna ersätts av demovideon (assets/video/demo.mp4),
  * presentationerna (PDF) ersätts av platshållarbilder,
  * övningsmaterial (PDF) ersätts av en ruta som säger att det inte ingår.

Kör:  python3 tools/gor_demo.py ../ai-i-folkbibliotekets-praktik/index.html

Originaltexten checkas aldrig in här, bara resultatet.
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "index.html"

LOREM = (
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor "
    "incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud "
    "exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure "
    "dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur "
    "excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt "
    "mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a "
    "odio nullam varius turpis et commodo pharetra est eros bibendum elit nec luctus magna "
    "felis sollicitudin mauris integer in mauris eu nibh euismod gravida duis ac tellus et "
    "risus vulputate vehicula donec lobortis risus a elit etiam tempor ut ullamcorper "
    "ligula eu tempor congue eros est euismod turpis id tincidunt sapien risus a quam "
    "maecenas fermentum consequat mi donec fermentum pellentesque malesuada nulla a mi "
    "duis sapien sem aliquet nec commodo eget consequat quis neque aliquam faucibus"
).split()

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "source", "track", "wbr"}

# Text inuti de här taggarna/klasserna behålls som den är.
KEEP_TAGS = {"h1", "h2", "h3", "h4", "h5", "h6", "dt", "th", "td", "b", "title",
             "script", "style", "svg", "nav", "footer", "dialog", "noscript",
             "label", "caption", "head"}
KEEP_CLASSES = {
    "pill", "acc-title", "acc-num", "acc-emoji", "block-kicker", "block-title",
    "toc-num", "toc-title", "mat-kind", "mat-title", "mat-meta", "lc-title",
    "part-title", "part-num", "prompt-label", "callout-title", "tl-year",
    "stat-num", "bar-val", "kk-head", "kk-crit", "kk-tag", "k", "btn", "link-btn",
    "to-top", "brand", "nav-progress", "gate-title", "gate-sound", "gate-error",
    "gate-hint", "gate-terminal", "purpose", "bk-n", "bk-t", "book-spine",
    "icon-box", "skip-link", "sr-only", "bars-note-keep",
}
# Text i de här blir lorem även om en förälder annars skulle ha behållit den.
FORCE_LOREM_CLASSES = {"toc-desc"}

HAS_WORD = re.compile(r"[A-Za-zÅÄÖåäöÉéÜü]{2,}")


class Lorem:
    def __init__(self):
        self.i = 0

    def words(self, n):
        out = []
        for _ in range(n):
            out.append(LOREM[self.i % len(LOREM)])
            self.i += 1
        return out

    def replace(self, text):
        if not HAS_WORD.search(text):
            return text  # bara siffror, emoji, skiljetecken eller blanksteg
        m = re.match(r"^(\s*)([^\w\s]*)(.*?)([^\w\s]*)(\s*)$", text, re.S)
        lead_ws, lead_p, core, trail_p, trail_ws = m.groups()
        n = max(1, len(core.split()))
        words = self.words(n)
        # Dela in längre texter i meningar på 7–13 ord.
        sentences, k, j = [], 0, 0
        lengths = [9, 12, 7, 11, 13, 8, 10]
        while k < len(words):
            L = lengths[j % len(lengths)]
            j += 1
            sentences.append(words[k:k + L])
            k += L
        if len(sentences) > 1 and len(sentences[-1]) < 3:
            sentences[-2].extend(sentences.pop())
        parts = []
        for idx, s in enumerate(sentences):
            s = list(s)
            if idx > 0 or core[:1].isupper():
                s[0] = s[0].capitalize()
            sent = " ".join(s)
            if idx < len(sentences) - 1:
                sent += "."
            parts.append(sent)
        body = " ".join(parts)
        # Behåll inledande/avslutande skiljetecken (citattecken, punkt, kolon …)
        if n > 6 and not trail_p:
            trail_p = "."
        # Bevara blanksteg mellan ord och skiljetecken, t.ex. "dig (" före en länk
        if core[:1].isspace():
            body = " " + body
        if core[-1:].isspace():
            body = body + " "
        return f"{lead_ws}{lead_p}{body}{trail_p}{trail_ws}"


class Demoizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.stack = []  # (tag, keep_bool)
        self.lorem = Lorem()

    def _keep_for(self, tag, attrs):
        cls = set((dict(attrs).get("class") or "").split())
        if cls & FORCE_LOREM_CLASSES:
            return False
        if tag in KEEP_TAGS or cls & KEEP_CLASSES:
            return True
        return None  # ärv från föräldern

    def keeping(self):
        for _, keep in reversed(self.stack):
            if keep is not None:
                return keep
        return False

    def in_body(self):
        return any(t == "body" for t, _ in self.stack)

    def handle_decl(self, decl):
        self.out.append(f"<!{decl}>")

    def handle_starttag(self, tag, attrs):
        self.out.append(self.get_starttag_text())
        if tag not in VOID:
            self.stack.append((tag, self._keep_for(tag, attrs)))

    def handle_startendtag(self, tag, attrs):
        self.out.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        self.out.append(f"</{tag}>")
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if self.in_body() and not self.keeping():
            data = self.lorem.replace(data)
        self.out.append(data)

    def _ref(self, raw):
        if self.in_body() and not self.keeping():
            return  # entiteter i löptext (t.ex. &shy;) faller bort
        self.out.append(raw)

    def handle_entityref(self, name):
        self._ref(f"&{name};")

    def handle_charref(self, name):
        self._ref(f"&#{name};")

    def handle_comment(self, data):
        self.out.append(f"<!--{data}-->")

    def handle_pi(self, data):
        self.out.append(f"<?{data}>")


# ── Ändringar i rå-HTML före lorem-omvandlingen ────────────────────────
VIDEO = "assets/video/demo.mp4"
POSTER = "assets/img/video-poster.jpg"
PRES = {n: f"assets/img/omslag-del{n}.jpg" for n in (1, 2, 3)}


def must_sub(pattern, repl, text, count=0, flags=0, min_hits=1):
    new, n = re.subn(pattern, repl, text, count=count, flags=flags)
    if n < min_hits:
        sys.exit(f"Hittade inte mönstret: {pattern!r}")
    return new


def pre_edits(html):
    # Titel och metadata
    html = must_sub(r"<title>(.*?)</title>", r"<title>\1 (demo)</title>", html)
    html = must_sub(r'(<meta name="description" content=")[^"]*', r"\1Demoversion av en resurssida för en utbildningsserie.", html)
    html = must_sub(r'(<meta property="og:description" content=")[^"]*', r"\1Demoversion.", html)
    html = must_sub(r'(<meta property="og:title" content=")([^"]*)', r"\1\2 (demo)", html)

    # Egna nycklar i localStorage så att demot inte krockar med originalsajten
    # (båda ligger på samma domän, vidarru.github.io).
    html = must_sub(r"localStorage\.getItem\('aifp-gate'\) === '[0-9a-f]+'",
                    "localStorage.getItem('aifp-demo-gate') === '" + GATE_HASH[:12] + "'", html)

    # Lösenordsrutan: tipsa om demolösenordet
    html = must_sub(r'(<p class="gate-error" role="alert" hidden>)',
                    '<p class="gate-hint">Demoversion · lösenord: <code>demo</code></p>\n        \\1', html)

    # Inbäddade YouTube-inspelningar → demovideon
    html = must_sub(r'<div class="video" data-yt="[^"]+">', f'<div class="video" data-src="{VIDEO}">', html)
    html = must_sub(r'src="https://i\.ytimg\.com/vi/[^/]+/hqdefault\.jpg"', f'src="{POSTER}"', html)
    html = must_sub(r'href="https://youtu\.be/[^"]+"', f'href="{VIDEO}"', html)
    html = must_sub(r"öppna på YouTube", "öppna i ny flik", html)
    html = must_sub(r'>Öppna på YouTube', '>Öppna i ny flik', html, min_hits=0)

    # Presentationer (PDF) → platshållarbild i ljusrutan
    for n, img in PRES.items():
        html = must_sub(
            rf'<a class="(mat-card|link-card dl)" href="material/del{n}-presentation\.pdf" target="_blank" rel="noopener">',
            rf'<a class="\1" href="{img}" data-lightbox data-full="{img}" data-title="Presentation, del {n} (platshållare)">',
            html)
    html = must_sub(r'<div class="mat-meta">PDF · [\d,]+ MB</div>', '<div class="mat-meta">Bild · platshållare</div>', html)

    # Övningsmaterial (PDF) → visar att det inte ingår i demot
    html = must_sub(r'href="material/(rutiner-pa-biblioteket|krangligt-exempel|mejl-fran-biblioteket)\.pdf" target="_blank" rel="noopener"',
                    'href="#" data-demo', html, min_hits=3)

    # Ljusrutan används nu även för presentationsbilder
    html = must_sub(r'<dialog class="lightbox" id="lightbox" aria-label="Affisch i större format">',
                    '<dialog class="lightbox" id="lightbox" aria-label="Bild i större format">', html)

    # Diagrammets aria-label innehåller kursinnehåll
    html = must_sub(r'(<div class="bars" role="img" aria-label=")[^"]*', r"\1Stapeldiagram (demo)", html)

    if re.search(r"material/del\d-presentation|youtu|ytimg", html):
        sys.exit("Det finns kvar länkar till presentationer eller YouTube")
    return html


def post_edits(html):
    # Toast för material som inte ingår i demot
    html = must_sub(r'(<script src="assets/js/main\.js[^"]*"></script>)',
                    '<div class="demo-toast" role="status" aria-live="polite" hidden>Materialet ingår inte i demoversionen.</div>\n\\1', html)
    html = html.replace('href="assets/css/style.css?v=3"', 'href="assets/css/style.css?v=demo1"')
    html = html.replace('src="assets/js/main.js?v=3"', 'src="assets/js/main.js?v=demo1"')
    return html


import hashlib
GATE_HASH = hashlib.sha256(b"demo").hexdigest()


def main():
    if len(sys.argv) != 2:
        sys.exit("Ange sökvägen till originalets index.html, t.ex.\n"
                 "  python3 tools/gor_demo.py ../ai-i-folkbibliotekets-praktik/index.html")
    html = Path(sys.argv[1]).read_text(encoding="utf-8")
    html = pre_edits(html)
    p = Demoizer()
    p.feed(html)
    p.close()
    out = post_edits("".join(p.out))
    OUT.write_text(out, encoding="utf-8")
    print(f"Skrev {OUT.relative_to(ROOT)} ({len(out):,} tecken)")


if __name__ == "__main__":
    main()
