"""Add the music player's two tags to every built page (one-off helper for the music-player branch).

Skips the age gate, the OG render page, and the old-URL redirect pages (no stylesheet). The asset prefix is copied
from each page's first stylesheet link, so pages under / and pages using "assets/" both resolve.
Safe to re-run: pages that already have the player are left alone.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKIP = {"og.html"}
changed = []
for f in sorted(ROOT.rglob("*.html")):
    rel = f.relative_to(ROOT).as_posix()
    if rel.startswith(".git/") or rel.startswith("gate/") or f.name in SKIP:
        continue
    s = f.read_text(encoding="utf-8")
    if "music.v1.js" in s:
        continue
    m = re.search(r'<link rel="stylesheet" href="([^"]*?)assets/', s)
    if not m or "</head>" not in s:
        continue
    p = m.group(1)
    tags = f'<link rel="stylesheet" href="{p}assets/music.v1.css">\n<script src="{p}assets/music.v1.js" defer></script>\n'
    s = s.replace("</head>", tags + "</head>", 1)
    f.write_text(s, encoding="utf-8")
    changed.append(rel)
print(len(changed), "pages:", ", ".join(changed))
