#!/usr/bin/env python3
"""Compose Play listing assets and Android adaptive icons / splashes from game renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
import os

CAP = Path('/workspace/gingerbread-android/assets/captures')
OUT = Path('/workspace/gingerbread-android/assets')
REL = Path('/workspace/gingerbread-android/release')
RES = Path('/workspace/gingerbread-android/android/app/src/main/res')
REL.mkdir(parents=True, exist_ok=True)
(OUT / 'icons').mkdir(parents=True, exist_ok=True)

CREAM = (246, 230, 210, 255)
CREAM_DEEP = (241, 214, 180, 255)
COCOA = (29, 17, 10, 255)
RED = (192, 57, 43, 255)
RED2 = (122, 42, 28, 255)
INK = (74, 42, 23, 255)

SERIF = '/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Black.ttf'
SERIF_BOLD = '/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Bold.ttf'
# fallbacks
for cand in [
    '/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
]:
    if not Path(SERIF).exists() and Path(cand).exists():
        SERIF = cand
NUNITO = None
for p in Path('/usr/share/fonts/truetype/sand-box/google/Nunito').glob('*.ttf'):
    if 'Italic' not in p.name:
        NUNITO = str(p)
        break
if NUNITO is None:
    NUNITO = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def font(path, size):
    try:
        return ImageFont.truetype(path, size=size)
    except Exception:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf', size=size)

def cover(im, size):
    tw, th = size
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = int(w * scale), int(h * scale)
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (nw - tw) // 2
    y = (nh - th) // 2
    return im.crop((x, y, x + tw, y + th))

def contain(im, box, resample=Image.Resampling.LANCZOS):
    tw, th = box
    im = im.convert('RGBA')
    w, h = im.size
    scale = min(tw / w, th / h)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    return im.resize((nw, nh), resample)

def rounded(im, radius):
    im = im.convert('RGBA')
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, im.size[0], im.size[1]), radius=radius, fill=255)
    out = im.copy()
    out.putalpha(mask)
    return out

# ---------- Icon ----------
src = Image.open(CAP / 'icon-source.png').convert('RGBA')
# Crop a tight-ish square around the house (leave a little table + lights)
w, h = src.size  # 1600x1600
# The house sits slightly above center with lights at top and table at bottom.
# Trim a bit of empty table at the bottom and sides so the house is larger in the icon.
crop = src.crop((80, 40, w - 80, h - 40))  # still nearly square
# Make square
side = min(crop.size)
cx, cy = crop.size[0] // 2, crop.size[1] // 2 - 20
house_sq = crop.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side))

# Adaptive foreground: house in the center ~66% safe zone, transparent outside
FG = 1024
fg = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
# Safe zone is 66%; use ~72% so the fence slightly reaches the mask (looks fuller) but house body is safe
safe = int(FG * 0.72)
house_fit = contain(house_sq, (safe, safe))
# Soft shadow under/behind the house
shadow = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
# ellipse shadow
sw, sh = house_fit.size[0] * 0.7, int(house_fit.size[1] * 0.12)
sx = (FG - int(sw)) // 2
sy = (FG + house_fit.size[1]) // 2 - int(sh * 0.6) - 8
sd.ellipse((sx, sy, sx + int(sw), sy + int(sh)), fill=(80, 40, 20, 90))
shadow = shadow.filter(ImageFilter.GaussianBlur(24))
fx = (FG - house_fit.size[0]) // 2
fy = (FG - house_fit.size[1]) // 2 - 10  # slightly up so chimney has room
fg = Image.alpha_composite(fg, shadow)
fg.paste(house_fit, (fx, fy), house_fit)
fg_path = OUT / 'icons' / 'icon-foreground-1024.png'
fg.save(fg_path)

# Background: warm cream radial
bg = Image.new('RGBA', (FG, FG), CREAM)
bd = ImageDraw.Draw(bg)
# soft radial by pasting a blurred circle
glow = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((int(FG * 0.08), int(FG * 0.08), int(FG * 0.92), int(FG * 0.92)), fill=(255, 248, 238, 255))
glow = glow.filter(ImageFilter.GaussianBlur(80))
bg = Image.alpha_composite(bg, glow)
# subtle cocoa vignette
vig = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
vd = ImageDraw.Draw(vig)
vd.rectangle((0, 0, FG, FG), fill=(0, 0, 0, 0))
# ring
ring = Image.new('L', (FG, FG), 0)
rd = ImageDraw.Draw(ring)
rd.ellipse((-FG * 0.15, -FG * 0.15, FG * 1.15, FG * 1.15), fill=0)
# actually a soft edge tint
edge = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
ed = ImageDraw.Draw(edge)
ed.rectangle((0, 0, FG, FG), outline=None)
# light cocoa corners via blurred rect border
border = Image.new('RGBA', (FG, FG), (0, 0, 0, 0))
bdraw = ImageDraw.Draw(border)
bdraw.rectangle((0, 0, FG - 1, FG - 1), outline=(210, 170, 130, 80), width=80)
border = border.filter(ImageFilter.GaussianBlur(40))
bg = Image.alpha_composite(bg, border)
bg_path = OUT / 'icons' / 'icon-background-1024.png'
bg.convert('RGB').save(bg_path)

# Combined 1024 and 512 Play icon (no rounded mask — Play applies its own)
full = Image.alpha_composite(bg, fg)
full_1024 = OUT / 'icons' / 'icon-1024.png'
full.convert('RGB').save(full_1024, quality=95)
play_512 = full.resize((512, 512), Image.Resampling.LANCZOS).convert('RGB')
# Play high-res icon should be 32-bit PNG; RGB is fine, can include alpha
play_512_rgba = play_512.convert('RGBA')
play_512_path = REL / 'icon-512.png'
play_512_rgba.save(play_512_path)
full.convert('RGBA').save(REL / 'icon-1024.png')
print('icons written', full_1024, play_512_path)

# ---------- Android mipmaps ----------
# legacy + round: 48/72/96/144/192
# foreground: 108/162/216/324/432
DENSITIES = {
    'mdpi': 1,
    'hdpi': 1.5,
    'xhdpi': 2,
    'xxhdpi': 3,
    'xxxhdpi': 4,
}

def save_png(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)

for name, scale in DENSITIES.items():
    legacy = int(48 * scale)
    fg_size = int(108 * scale)
    combo = full.resize((legacy, legacy), Image.Resampling.LANCZOS)
    save_png(combo.convert('RGBA'), RES / f'mipmap-{name}' / 'ic_launcher.png')
    save_png(combo.convert('RGBA'), RES / f'mipmap-{name}' / 'ic_launcher_round.png')
    fg_r = fg.resize((fg_size, fg_size), Image.Resampling.LANCZOS)
    save_png(fg_r, RES / f'mipmap-{name}' / 'ic_launcher_foreground.png')
    print(f'  mipmap-{name}: {legacy} / fg {fg_size}')

# Also a color background is already set in ic_launcher_background.xml (#F6E6D2)
# Keep adaptive xml pointing at color + foreground mipmap (already the case)

# Optional: also provide a bitmap background for anydpi if wanted — color is cleaner.

# ---------- Feature graphic 1024x500 ----------
feat_src = Image.open(CAP / 'feature-source.png').convert('RGBA')
# 1920x940 already ~2.04:1; scale to slightly larger then crop 1024x500
base = cover(feat_src, (1024, 500))
# Shift composition so house is a bit to the right by covering from a left-biased crop
# cover() centers; let's do a custom crop that keeps more of the right side... actually
# the house is centered. I'll darken a left band and put title there.
feat = base.convert('RGBA')
overlay = Image.new('RGBA', (1024, 500), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
# left gradient panel
for x in range(0, 520):
    a = int(200 * (1 - x / 520) ** 1.15)
    od.line([(x, 0), (x, 500)], fill=(29, 17, 10, a))
feat = Image.alpha_composite(feat, overlay)

draw = ImageDraw.Draw(feat)
title_font = font(SERIF, 54)
sub_font = font(NUNITO, 22)
# Word wrap title
line1, line2 = 'Gingerbread', 'House Workshop'
# shadow + text
def text(xy, s, fnt, fill):
    x, y = xy
    draw.text((x + 2, y + 2), s, font=fnt, fill=(20, 10, 6, 160))
    draw.text((x, y), s, font=fnt, fill=fill)

# measure
def tw(s, fnt):
    return draw.textbbox((0, 0), s, font=fnt)[2]

left = 48
# vertically center the text block
t1h = draw.textbbox((0, 0), line1, font=title_font)[3]
t2h = draw.textbbox((0, 0), line2, font=title_font)[3]
sh = draw.textbbox((0, 0), 'Build  ·  Ice  ·  Decorate', font=sub_font)[3]
block = t1h + t2h + 16 + sh + 18
y = (500 - block) // 2 - 6
text((left, y), line1, title_font, (255, 248, 238, 255))
text((left, y + t1h + 2), line2, title_font, (255, 248, 238, 255))
# gold underline
uy = y + t1h + t2h + 12
draw.rectangle((left, uy, left + 86, uy + 5), fill=(242, 184, 75, 255))
text((left, uy + 14), 'Build  ·  Ice  ·  Decorate', sub_font, (246, 230, 210, 230))
feat_path = REL / 'feature-graphic-1024x500.png'
feat.convert('RGB').save(feat_path)
feat.convert('RGB').save(OUT / 'icons' / 'feature-graphic-1024x500.png')
print('feature graphic', feat_path)

# ---------- Splash screens ----------
# Dark cocoa background, house contained and centered (use icon-source / house_sq)
# Portrait sizes: mdpi 320x480, hdpi 480x800, xhdpi 720x1280, xxhdpi 960x1600, xxxhdpi 1280x1920
# Landscape: swapped
# default drawable/splash.png 480x320

def make_splash(size, house=house_sq):
    W, H = size
    canvas = Image.new('RGB', (W, H), (29, 17, 10))
    # soft bokeh-ish vignette from a blurred crop of the source lights
    bgphoto = cover(src.convert('RGB'), (W, H))
    # darken it
    dim = ImageChops.multiply(bgphoto, Image.new('RGB', (W, H), (70, 50, 36)))
    dim = Image.blend(canvas, dim, 0.55)
    # house in the middle, occupying ~70% of the shorter side
    short = min(W, H)
    target = int(short * 0.78)
    hfit = contain(house, (target, target))
    # shadow
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    hw, hh = hfit.size
    hx, hy = (W - hw) // 2, (H - hh) // 2
    sdraw.ellipse((hx + hw * 0.15, hy + hh * 0.82, hx + hw * 0.85, hy + hh * 0.98), fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(6, short // 80)))
    out = dim.convert('RGBA')
    out = Image.alpha_composite(out, shadow)
    out.paste(hfit, (hx, hy), hfit)
    return out.convert('RGB')

SPLASH = {
    'drawable-port-mdpi': (320, 480),
    'drawable-port-hdpi': (480, 800),
    'drawable-port-xhdpi': (720, 1280),
    'drawable-port-xxhdpi': (960, 1600),
    'drawable-port-xxxhdpi': (1280, 1920),
    'drawable-land-mdpi': (480, 320),
    'drawable-land-hdpi': (800, 480),
    'drawable-land-xhdpi': (1280, 720),
    'drawable-land-xxhdpi': (1600, 960),
    'drawable-land-xxxhdpi': (1920, 1280),
    'drawable': (480, 320),
}
for folder, size in SPLASH.items():
    im = make_splash(size)
    dest = RES / folder / 'splash.png'
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest)
    print('  splash', folder, size)

# A large splash also in assets for reference
make_splash((1280, 1920)).save(OUT / 'icons' / 'splash-portrait.png')
make_splash((1920, 1280)).save(OUT / 'icons' / 'splash-landscape.png')

# ---------- Copy phone screenshots to release ----------
shots = REL / 'screenshots'
shots.mkdir(parents=True, exist_ok=True)
names = [
    ('phone-01-build.png', '01-build.png'),
    ('phone-02-ice.png', '02-ice.png'),
    ('phone-03-decorate.png', '03-decorate.png'),
    ('phone-04-decorate-angle.png', '04-decorate-angle.png'),
    ('phone-05-finish.png', '05-finish.png'),
]
for src_name, dest_name in names:
    im = Image.open(CAP / src_name)
    # Ensure exact 1080x1920 RGB, no alpha (Play is happiest with this)
    im = im.convert('RGB')
    if im.size != (1080, 1920):
        im = im.resize((1080, 1920), Image.Resampling.LANCZOS)
    im.save(shots / dest_name)
    print('shot', dest_name, im.size)

print('ASSETS_OK')
