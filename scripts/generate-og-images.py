# -*- coding: utf-8 -*-
"""Genere une image Open Graph 1200x630 par page, sur la charte du site.

    python scripts/generate-og-images.py

A relancer si un libelle change ou si une page est ajoutee : ajouter sa
ligne dans PAGES, en bas de ce fichier, puis regenerer.

Sortie : assets/images/og/og-<slug>.png, references par les balises
og:image des pages. Ne pas retoucher ces PNG a la main, ils seraient
ecrases au prochain passage.

Depend de Pillow, et des polices Cousine deja presentes dans assets/fonts.
Les PNG sont ensuite compresses sans perte :
    magick <fichier> -strip -define png:compression-level=9         -define png:compression-filter=5 <fichier>

Le PNG source du logo est blanc sur pave noir opaque. Colle tel quel, ce
pave se decoupe en rectangle visible sur le halo, d'ou le masque de
luminance qui ne retient que les marques blanches.
"""
from PIL import Image, ImageDraw, ImageFont
import math, sys, io, os

W, H = 1200, 630
RED, GREY = (255, 91, 91), (176, 176, 176)
SAFE = 1010                       # largeur max du texte, marges laterales preservees
BOLD = 'assets/fonts/Cousine-Bold.ttf'
REG  = 'assets/fonts/Cousine-Regular.ttf'

# halo rouge diffus, calcule une fois, identique sur toutes les variantes
_glow = Image.new('L', (W, H), 0); _gp = _glow.load()
_cx, _cy, _rad = W // 2, 250, 640
for y in range(H):
    for x in range(W):
        d = math.hypot(x - _cx, (y - _cy) * 1.30) / _rad
        if d < 1: _gp[x, y] = int(40 * (1 - d) ** 2.3)

# logo : uniquement les marques blanches. Le pave noir du PNG source se
# decouperait en rectangle visible sur le halo.
_src = Image.open('assets/images/nova-logo-blanc-fond-noir.png').convert('RGBA')
_src = _src.crop(_src.split()[3].getbbox())
_logo = Image.new('RGBA', _src.size, (255, 255, 255, 255))
_logo.putalpha(_src.convert('L'))


def _w(draw, txt, font, sp):
    return sum(draw.textlength(c, font=font) + sp for c in txt) - sp


def _track(draw, txt, font, sp, y, fill):
    """PIL n'a pas d'interlettrage : on dessine caractere par caractere."""
    wid = _w(draw, txt, font, sp); x = W / 2 - wid / 2
    for c in txt:
        draw.text((x, y), c, font=font, fill=fill)
        x += draw.textlength(c, font=font) + sp
    return wid


def _fit(draw, txt, path, sp, hi, lo):
    """Reduit le corps jusqu'a tenir dans SAFE : un titre long ne deborde pas."""
    for size in range(hi, lo - 1, -1):
        f = ImageFont.truetype(path, size)
        if _w(draw, txt, f, sp) <= SAFE:
            return f, size
    return ImageFont.truetype(path, lo), lo


def build(out, title, sub):
    img = Image.new('RGB', (W, H), (0, 0, 0))
    img.paste(Image.new('RGB', (W, H), RED), (0, 0), _glow)

    lw = 300; lh = int(_logo.height * lw / _logo.width)
    lg = _logo.resize((lw, lh), Image.LANCZOS)
    img.paste(lg, ((W - lw) // 2, 96), lg)

    d = ImageDraw.Draw(img)
    ft, st = _fit(d, title, BOLD, 8, 80, 40)
    ty = 312 - st // 2
    wid = _track(d, title, ft, 8, ty, (255, 255, 255))

    ry = ty + st + 34
    d.rectangle([W / 2 - wid / 2, ry, W / 2 + wid / 2, ry + 2], fill=RED)

    fs, ss = _fit(d, sub, REG, 2, 31, 20)
    _track(d, sub, fs, 2, ry + 40, GREY)

    _track(d, 'novacorporation.fr', ImageFont.truetype(REG, 24), 3, 518, RED)
    img.save(out)
    return st, ss
# -*- coding: utf-8 -*-
PAGES = [
 ('index.html',                     u'PEACE, ART, TECHNOLOGY.', u'Label indépendant, scène underground française'),
 ('projects.html',                  u'PROJETS',                 u'Les artistes signés et les projets en cours'),
 ('services.html',                  u'SERVICES',                u'Ce que le label propose aux artistes'),
 ('contact.html',                   u'CONTACT',                 u'Parler à Nova Corporation'),
 ('news.html',                      u'ACTUALITÉS',              u'Sorties, clips et collaborations'),
 ('articles/nova-corporation.html', u'LE LABEL',                u'Le talent brut au centre du jeu'),
 ('articles/artistes-nova.html',    u'LES ARTISTES',            u'Ceux qui portent la Nova'),
]


if __name__ == '__main__':
    import os
    os.makedirs('assets/images/og', exist_ok=True)
    for page, title, sub in PAGES:
        slug = os.path.splitext(os.path.basename(page))[0]
        if page == 'index.html':
            slug = 'accueil'
        out = 'assets/images/og/og-%s.png' % slug
        build(out, title, sub)
        print('%-34s <- %s' % (out, page))
