#!/usr/bin/env python3
"""Makes the idle row of the character sheet from a video of the idle loop.

    python3 tools/idle_from_video.py assets/source/idle.mp4 60 114 [POSES]

FIRST..LAST (video frames from 0, LAST not included) must be one loop: LAST looks like FIRST.
The video is the one the idle was drawn from: the standing figure in the left 420 px, on a
grey checkerboard. The script cuts the checkerboard away (from the edges inwards, so the
white shirt stays), puts back the tail's tip where the video's edge cuts it off, lines every frame up on the boots, scales the figure to the sheet's 356 px,
keeps each different pose once (or POSES of them, evenly spread) and prints how long each is held (IDLE_HOLD in config.js);
then it puts the poses into the first row of assets/source/character_sheet.png.
Needs ffmpeg, pillow and numpy; run 
> raithwyn-bone-road@0.3.0 atlas
> python3 tools/build_atlas.py

atlas 1180x1826, 92 frames afterwards.
"""
import subprocess, tempfile
from pathlib import Path
from PIL import Image; import numpy as np, sys
from collections import deque

ROOT = Path(__file__).resolve().parent.parent
VIDEO, A, B = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
POSES = int(sys.argv[4]) if len(sys.argv) > 4 else 0   # 0: every different pose
TMP = tempfile.mkdtemp()
subprocess.run(["ffmpeg", "-v", "error", "-i", VIDEO, f"{TMP}/f%03d.png"], check=True)
def flood(mask, seeds):
    h,w=mask.shape; out=np.zeros_like(mask); q=deque()
    for y,x in seeds:
        if mask[y,x] and not out[y,x]: out[y,x]=1; q.append((y,x))
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not out[ny,nx]: out[ny,nx]=1; q.append((ny,nx))
    return out
def comps(mask):
    h,w=mask.shape; seen=np.zeros_like(mask); res=[]
    for y,x in zip(*np.where(mask)):
        if seen[y,x]: continue
        c=flood(mask&~seen,[(y,x)]); seen|=c; res.append(c)
    return res
def matte(i):
    im=np.array(Image.open(f'{TMP}/f{i+1:03d}.png').convert('RGB')).astype(np.int16)[140:950,0:420]
    lum=im.mean(2); sat=im.max(2)-im.min(2)
    light=(lum>175)&(sat<30)
    h,w=light.shape
    seeds=[(y,x) for y in range(h) for x in (0,w-1)]+[(y,x) for x in range(w) for y in (0,h-1)]
    bg=flood(light,seeds)
    # holes where the background shows through (between the arm and the body): checker-bright, grey
    for c in comps(light&~bg):
        if c.sum()>20 and lum[c].mean()>228 and sat[c].mean()<6: bg|=c
    fg=~bg
    nb=np.zeros_like(fg); nb[1:]|=bg[:-1]; nb[:-1]|=bg[1:]; nb[:,1:]|=bg[:,:-1]; nb[:,:-1]|=bg[:,1:]
    alpha=fg.astype(np.float32); edge=fg&nb
    alpha[edge]=np.clip((235-lum[edge])/(235-70),0,1)
    return im.astype(np.float32), alpha, lum
# The video cuts the tail's tip off at its left edge when the tail swings out. Room is made on
# the left and the tip is put back: the tip of TIP_FRAME (the tail out as far as it goes
# uncut), as many columns of it as it takes to be as tall as the cut, stretched to the cut.
PAD, TIP_FRAME, TAIL = 24, 82, slice(440, 860)   # TAIL: the rows the tail is in
def padded(f):
    im, al, lum = f
    return (np.pad(im, ((0, 0), (PAD, 0), (0, 0))), np.pad(al, ((0, 0), (PAD, 0))),
            np.pad(lum, ((0, 0), (PAD, 0)), constant_values=255))
tpl_im, tpl_al, _ = padded(matte(TIP_FRAME))
t_rows = np.arange(tpl_al.shape[0])[TAIL]
tip = np.where((tpl_al[TAIL] > 0.5).any(0))[0].min()
def span(al, x):
    r = t_rows[al[TAIL, x] > 0.5]
    return (r.min(), r.max()) if len(r) else None
def mend_tail(f):
    im, al, lum = f
    cut = span(al, PAD)
    if not cut or cut[1] - cut[0] < 8:
        return f
    ca, cb = cut
    n = next((t for t in range(1, PAD) if (s := span(tpl_al, tip + t)) and s[1] - s[0] >= cb - ca), PAD - 1)
    ta, tb = span(tpl_al, tip + n)
    for j in range(n):                       # template column tip+j -> PAD-n+j
        for yd in range(ca - 40, cb + 41):
            y = int(round(ta + (yd - ca) * (tb - ta) / max(1, cb - ca)))
            if 0 <= y < al.shape[0] and tpl_al[y, tip + j] > 0:
                im[yd, PAD - n + j] = tpl_im[y, tip + j]
                al[yd, PAD - n + j] = tpl_al[y, tip + j]
    return im, al, lum
frames = [mend_tail(padded(matte(i))) for i in range(A, B)]
# where the boots are: correlate the lowest 70 rows with the first frame's, sub-pixel
def boots(f):
    im,al,lum=f; ys=np.where(al.max(1)>0.5)[0]; bot=ys.max()+1
    return (255-lum)*al, bot
ref,rbot=boots(frames[0])
def shift_of(f):
    g,bot=boots(f)
    R=ref[rbot-70:rbot, 60+PAD:330+PAD]; best=None
    for dy in range(-3,4):
        for dx in range(-6,7):
            C=g[rbot-70-dy:rbot-dy, 60+PAD-dx:330+PAD-dx]
            e=((C-R)**2).sum()
            if best is None or e<best[0]: best=(e,dx,dy)
    _,dx,dy=best
    def err(ddx,ddy):
        C=g[rbot-70-ddy:rbot-ddy, 60+PAD-ddx:330+PAD-ddx]; return ((C-R)**2).sum()
    l,c,r=err(dx-1,dy),err(dx,dy),err(dx+1,dy); fx=dx+(0.5*(l-r)/(l-2*c+r) if l-2*c+r else 0)
    u,c,d=err(dx,dy-1),c,err(dx,dy+1); fy=dy+(0.5*(u-d)/(u-2*c+d) if u-2*c+d else 0)
    return fx,fy
shifts=[shift_of(f) for f in frames]
# scale: the figure as tall as the sheet's idle (356 px)
ys=np.where(frames[0][1].max(1)>0.5)[0]; Hv=ys.max()+1-ys.min(); s=356/Hv; print('video height',Hv,'scale',round(s,4))
# unique poses and how long each is held (in 1/24 s)
uniq=[0]; hold=[1]
for k in range(1,len(frames)):
    if np.abs(frames[k][2]-frames[k-1][2]).mean()>0.3: uniq.append(k); hold.append(1)
    else: hold[-1]+=1
print('unique',len(uniq),'holds',hold, 'total', sum(hold))
# or just POSES of them, evenly spread over the loop (each then held about as long)
if POSES:
    n = len(frames)
    uniq = [round(k * n / POSES) for k in range(POSES)]
    hold = [b - a for a, b in zip(uniq, uniq[1:] + [n])]
    print('poses', uniq, 'holds', hold)
out=[]
for k in uniq:
    im,al,_=frames[k]; dx,dy=shifts[k]
    rgba=np.dstack([im*al[...,None],al*255]).clip(0,255).astype(np.uint8)   # premultiplied
    P=Image.fromarray(rgba,'RGBA')
    # move back by the measured shift (sub-pixel), then scale down
    P=P.transform(P.size, Image.AFFINE, (1,0,dx,0,1,dy), resample=Image.BICUBIC)
    P=P.resize((round(P.width*s),round(P.height*s)), Image.LANCZOS)
    a=np.array(P).astype(np.float32); al2=a[...,3:4]/255
    rgb=np.where(al2>0, a[...,:3]/np.maximum(al2,1e-6), 0)
    a[...,:3]=rgb.clip(0,255); a[...,3]=np.where(a[...,3]<8,0,a[...,3])
    out.append(Image.fromarray(a.astype(np.uint8),'RGBA'))
print("IDLE_HOLD =", hold)
# into the sheet's first row (rows 16..372), one pose after another
sheet = Image.open(ROOT / "assets/source/character_sheet.png").convert("RGBA")
W0, H0 = sheet.size
a = np.array(out[0])[..., 3] > 10
bot = np.where(a.any(1))[0].max() + 1
cell = out[0].width + 16
rest = np.array(sheet)[373:, :, 3] > 10                # the rows below: how wide they need it
W = max(np.where(rest.any(0))[0].max() + 17, 16 + cell * len(out))
new = Image.new("RGBA", (W, H0))
new.paste(sheet.crop((0, 373, W0, H0)), (0, 373))
for n, f in enumerate(out):
    new.alpha_composite(f, (16 + n * cell, 372 - bot))
new.save(ROOT / "assets/source/character_sheet.png", optimize=True)
