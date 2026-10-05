"""Strictly decode /new/ images. Requires Pillow; never enable truncated-image mode."""
from html.parser import HTMLParser
from pathlib import Path
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag == 'img':
            self.images.append(dict(attrs))


parser = Images()
parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
for attrs in parser.images:
    path = (ROOT / attrs['src']).resolve()
    assert path.is_relative_to(ROOT), f'Image outside /new/: {path}'
    with Image.open(path) as image:
        image.load()
        assert image.width > 0 and image.height > 0
        assert (int(attrs['width']), int(attrs['height'])) == image.size
        assert image.format == 'WEBP', (path, image.format)
for path in (ROOT / 'assets').glob('*.webp'):
    with Image.open(path) as image:
        image.load()
for name in ['styles.css', 'fonts.css']:
    for url in re.findall(r'url\(([^)]+)\)', (ROOT / name).read_text(encoding='utf-8')):
        assert (ROOT / url.strip('\"\'')).is_file(), url
print(f'PASS: {len(parser.images)} image elements; all image bytes and dimensions valid.')
