"""Build dist/ from build/: one index.html with icons, scripts and the sample inlined, plus the fonts.
Run from the repo root: python3 build/build.py"""
import base64, json, pathlib, re, shutil

B = pathlib.Path(__file__).parent
ROOT = B.parent
DIST = ROOT / 'dist'
FONTS = ROOT / 'node_modules' / '@fontsource'
SUBSETS = ('latin', 'latin-ext', 'bengali')  # ponytail: add subsets here when other scripts are supported

icons = json.loads((B / 'icons.json').read_text())
s = (B / 'app.src.html').read_text()
s = re.sub(r'__I_([a-z0-9-]+)__', lambda m: f'<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icons[m[1]]}</svg>', s)
s = s.replace('__ICONS__', json.dumps(icons))
s = s.replace('/*__TRANSCRIPT_JS__*/', (B / 'transcript.js').read_text())
s = s.replace('/*__PROJECT_JS__*/', (B / 'project.js').read_text())
sample = json.loads((ROOT / 'sample' / 'sample.json').read_text())
sample['transcripts'] = {f.stem: f.read_text() for f in sorted((ROOT / 'sample').glob('*.md'))}
s = s.replace('/*__SAMPLE__*/null', json.dumps(sample, ensure_ascii=False))
s = s.replace('/*__LIBRON_CSS__*/', ''.join(
    f"@font-face{{font-family:'Libron';src:url(data:font/woff2;base64,{base64.b64encode((B / 'fonts' / f'libron-{n}.woff2').read_bytes()).decode()}) format('woff2');font-weight:{w};font-style:{st};font-display:swap}}"
    for n, w, st in [('400', 400, 'normal'), ('400i', 400, 'italic'), ('700', 700, 'normal')]))
assert '__I_' not in s and '/*__' not in s, 'a placeholder was left in the page'

if DIST.exists():
    shutil.rmtree(DIST)
(DIST / 'fonts').mkdir(parents=True)
(DIST / 'index.html').write_text(s)


def font_css(pkg, weights):
    """@font-face rules for the kept subsets, pointing at woff2 files copied next to the css."""
    out = []
    for w in weights:
        css = (FONTS / pkg / f'{w}.css').read_text()
        for block in re.findall(r'/\* ([\w-]+) \*/\s*(@font-face \{.*?\})', css, re.S):
            name, rule = block
            if not any(name == f'{pkg}-{sub}-{w}-normal' for sub in SUBSETS):
                continue
            f = re.search(r'url\(\./files/([^)]+\.woff2)\)', rule)[1]
            (DIST / 'fonts' / pkg).mkdir(exist_ok=True)
            shutil.copy(FONTS / pkg / 'files' / f, DIST / 'fonts' / pkg / f)
            out.append(re.sub(r'src:[^;]+;', f"src: url({pkg}/{f}) format('woff2');", rule))
    return '\n'.join(out)


ui = font_css('manrope', [400, 500, 600, 700]) + '\n' + font_css('bricolage-grotesque', [700])
(DIST / 'fonts' / 'ui.css').write_text(ui)
for pkg, ws in {'newsreader': [400, 500], 'tiro-bangla': [400], 'hind-siliguri': [400, 500, 600], 'anek-bangla': [400, 500, 600],
                'noto-sans': [400, 500, 600], 'noto-sans-bengali': [400, 500, 600]}.items():
    (DIST / 'fonts' / f'{pkg}.css').write_text(font_css(pkg, ws))

size = sum(f.stat().st_size for f in DIST.rglob('*') if f.is_file())
print(f'built dist/ ({size // 1024} KB)')
