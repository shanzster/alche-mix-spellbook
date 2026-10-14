#!/usr/bin/env python3
"""Split the wizard key art into animatable layers.

Produces a body plate with the hands and halo removed, each hand cut at the
wrist with a recorded pivot point, the halo as one ring layer, and each gem
isolated on its own. Every layer is full canvas size, so the web page can stack
them at 0,0 with no offset arithmetic.
"""
import os, json
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

SRC = '/root/.claude/uploads/e583eaa1-5c49-53d0-bdeb-25384d28c71d/8dcbc9e6-image.png'
OUT = '/mnt/user-data/outputs/wizard_layers'
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.array(im).astype(int)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
cy = (g + b) / 2 - r
BG = np.array([10, 15, 24], dtype=np.uint8)

# wrist cuts, measured from the pale-blob extents
HANDS = {
    'hand-left':  {'box': (470, 100, 800, 580), 'pivot': (655, 565)},
    'hand-right': {'box': (1020, 230, 1330, 615), 'pivot': (1170, 600)},
}


def save(mask_f, name, soft=0):
    """Write one layer: original pixels where the mask is, transparent elsewhere."""
    alpha = (np.clip(mask_f, 0, 1) * 255).astype(np.uint8)
    img = Image.fromarray(np.dstack([np.array(im), alpha]), 'RGBA')
    if soft:
        al = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(soft))
        img.putalpha(al)
    ys, xs = np.nonzero(np.array(img.getchannel('A')) > 6)
    if not len(xs):
        return None
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    img.crop((x0, y0, x1, y1)).save(os.path.join(OUT, f'{name}.png'), optimize=True)
    # offset is where this crop sits on the full canvas
    return {'file': f'{name}.png', 'offset': [x0, y0],
            'size': [x1 - x0, y1 - y0], 'bbox': [x0, y0, x1 - 1, y1 - 1]}


# ---- halo: cyan core plus its glow, as a soft alpha ramp
bright = (g + b) / 2
notbg = np.abs(a - BG).sum(axis=2) > 40

# Two seeds for the halo. The glowing gems are strongly cyan; the pale ones are
# bright but cool (blue at or above red), which the warm cream-and-gold robe
# never is, and the dark navy robe is never bright enough to reach either.
seed_cyan = (cy > 32) & (bright > 112)
seed_pale = (bright > 120) & (b >= r + 2)
# the hands are painted the same cool white, so the pale seed is blind to them;
# a gem that falls inside a hand box is still caught by the cyan seed
for _c in HANDS.values():
    _x0, _y0, _x1, _y1 = _c['box']
    seed_pale[_y0:_y1, _x0:_x1] = False
seed = ndimage.binary_opening(seed_cyan | seed_pale, np.ones((5, 5)))
seed[1250:, :] = False                      # the halo lives in the upper frame
lab0, n0 = ndimage.label(ndimage.binary_closing(seed, np.ones((15, 15))))
sz0 = ndimage.sum(seed, lab0, range(1, n0 + 1))
gem_core = np.isin(lab0, [i + 1 for i, v in enumerate(sz0) if v > 320])
gem_core = ndimage.binary_fill_holes(gem_core)

# grow a little, then carry each gem's own halo with it
grown = ndimage.binary_dilation(gem_core, np.ones((9, 9)))
grown = ndimage.binary_fill_holes(grown) & notbg
reach = ndimage.gaussian_filter(gem_core.astype(float), 24)
reach = np.clip(reach / max(reach.max(), 1e-6) * 8.0, 0, 1)
cyglow = np.clip((cy - 16) / 44.0, 0, 1) * np.clip(bright / 90.0, 0, 1) * reach
glow = np.maximum(cyglow, ndimage.gaussian_filter(grown.astype(float), 1.2))
glow[glow < 0.05] = 0
gem_px = glow > 0.12
core = gem_core

# ---- hands
hand_mask = np.zeros((H, W), bool)
pale = (r > 165) & (g > 170) & (b > 160) & (cy < 28)
pale[700:, :] = False
pale = ndimage.binary_fill_holes(ndimage.binary_closing(pale, np.ones((13, 13))))
lab, _ = ndimage.label(pale)
manifest = {'canvas': [W, H], 'layers': []}

for name, cfg in HANDS.items():
    x0, y0, x1, y1 = cfg['box']
    region = np.zeros((H, W), bool)
    region[y0:y1, x0:x1] = True
    ids = set(lab[region & pale].ravel()) - {0}
    m = np.isin(lab, list(ids)) & region
    m = ndimage.binary_dilation(m, np.ones((7, 7)))
    # keep the whole hand silhouette, not just the lit skin
    notbg = (np.abs(a - BG).sum(axis=2) > 46)
    m = ndimage.binary_fill_holes(m | (region & notbg & (cy < 28)))
    m &= ~gem_px          # a gem caught inside the hand box belongs to the halo
    m = ndimage.binary_opening(m, np.ones((5, 5)))
    m = ndimage.binary_fill_holes(m)
    lb, _ = ndimage.label(m)
    if lb.max():
        szs = ndimage.sum(m, lb, range(1, lb.max() + 1))
        m = lb == (int(np.argmax(szs)) + 1)
    m[y1:, :] = False
    hand_mask |= m
    soft = ndimage.gaussian_filter(m.astype(float), 1.2)
    e = save(soft, name)
    e.update({'pivot': cfg['pivot'], 'role': 'hand'})
    e['pivot_local'] = [cfg['pivot'][0] - e['offset'][0], cfg['pivot'][1] - e['offset'][1]]
    manifest['layers'].append(e)

# ---- the halo as one ring
e = save(glow, 'gems-ring')
e['role'] = 'halo'
manifest['layers'].append(e)

# ---- each gem on its own
cm = ndimage.binary_closing(core, np.ones((17, 17)))
lab2, n2 = ndimage.label(cm)
sizes = ndimage.sum(cm, lab2, range(1, n2 + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > 1500]
cx_all = []
for i in keep:
    comp = ndimage.binary_dilation(lab2 == i, np.ones((5, 5)))
    local = ndimage.gaussian_filter(comp.astype(float), 9)
    layer = np.clip(glow * np.clip(local * 3.2, 0, 1), 0, 1)
    ys, xs = np.nonzero(lab2 == i)
    cx_all.append((int(xs.mean()), int(ys.mean()), i, layer))

cx_all.sort(key=lambda t: np.arctan2(t[1] - 760, t[0] - 900))
for k, (cx, cyy, i, layer) in enumerate(cx_all, 1):
    e = save(layer, f'gem-{k:02d}')
    if e:
        e.update({'centre': [cx, cyy], 'role': 'gem'})
        manifest['layers'].append(e)

# ---- body: everything minus hands, minus halo
body = np.array(im).copy()
remove = hand_mask | (glow > 0.015)
body[remove] = BG
soft_edge = ndimage.gaussian_filter((~remove).astype(float), 1.0)
alpha = np.full((H, W), 255, np.uint8)
Image.fromarray(body, 'RGB').save(os.path.join(OUT, 'body.png'), optimize=True)
manifest['layers'].insert(0, {'file': 'body.png', 'role': 'body', 'offset': [0, 0],
                              'size': [W, H], 'bbox': [0, 0, W - 1, H - 1]})

manifest['background'] = '#0A0F18'
manifest['halo_centre'] = [900, 760]
json.dump(manifest, open(os.path.join(OUT, 'layers.json'), 'w'), indent=2)

print(f'canvas {W}x{H}')
for l in manifest['layers']:
    extra = ''
    if 'pivot' in l: extra = f"  pivot={l['pivot']}"
    if 'centre' in l: extra = f"  centre={l['centre']}"
    print(f"  {l['file']:<16} {l['role']:<6} bbox={l['bbox']}{extra}")
