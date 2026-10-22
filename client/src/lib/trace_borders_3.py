"""Trace the Shell / Rope Twist Classic / Elongated Shell line-art into ink-style vector layers.
usage: python3 trace_borders_3.py  -> writes border3_trace.json (+ ref/trace_<key>.png previews)"""
import cv2, numpy as np, json, math, random, os
UP = '/root/.claude/uploads/18184dbf-dcdc-5649-bf91-0227a50f1f09/'
S = 2; TW = 1000
CFG = {
 'shellBorder':   dict(src=UP+'a7e4d439-image.jpg', crop=(0, 0, 720, 380), thr=185, bold=1, bands=[340, 650], seed=3, hatch=0.5),
 'ropeTwistClassic': dict(src=UP+'0676cd9a-image.png', crop=(20, 20, 1734, 566), thr=140, bold=0, bands=[700], seed=5, hatch=0.4),
 'elongatedShell': dict(src=UP+'a1f15dc9-image.png', crop=(20, 20, 1566, 610), thr=140, bold=1, bands=[880, 1200], seed=7, hatch=0.6),
}
os.makedirs('ref', exist_ok=True)

def stroke(cv, pts, widths):
    pts = np.array(pts, np.float32); n = len(pts)
    if n < 2: return
    L, R = [], []
    for k in range(n):
        a = pts[max(0, k-1)]; b = pts[min(n-1, k+1)]
        t = b - a; l = math.hypot(*t) or 1
        nx, ny = -t[1]/l, t[0]/l; w = widths[k]/2
        L.append(pts[k] + np.array([nx, ny])*w); R.append(pts[k] - np.array([nx, ny])*w)
    cv2.fillPoly(cv, [(np.array(L + R[::-1])*S).astype(np.int32)], 255)

def vectorise(canvas, owner, eps=0.9, min_area=5):
    cnts, hier = cv2.findContours(canvas, cv2.RETR_TREE, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    hier = hier[0]
    for i, c in enumerate(cnts):
        d, p = 0, hier[i][3]
        while p != -1: d += 1; p = hier[p][3]
        if cv2.contourArea(c) < min_area: continue
        ap = cv2.approxPolyDP(c, eps, True).reshape(-1, 2)
        if len(ap) < 3: continue
        flat = [int(ap[0][0]), int(ap[0][1])]
        for k in range(1, len(ap)): flat += [int(ap[k][0]-ap[k-1][0]), int(ap[k][1]-ap[k-1][1])]
        out.append((d, [d, owner, *flat]))
    return out

result = {}
for key, c in CFG.items():
    rng = random.Random(c['seed'])
    im = cv2.imread(c['src'], cv2.IMREAD_GRAYSCALE)
    x0, y0, x1, y1 = c['crop']; im = im[y0:y1, x0:x1]
    h0, w0 = im.shape
    W = TW; H = int(round(h0 * TW / w0))
    big = cv2.resize(im, (W*S, H*S), interpolation=cv2.INTER_AREA if w0 > W*S else cv2.INTER_CUBIC)
    ink = (big < c['thr']).astype(np.uint8)
    # drop specks (watermark remnants)
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, connectivity=8)
    for i in range(1, n):
        if st[i][4] < 120*S: ink[lab == i] = 0
    if c['bold']: ink = cv2.dilate(ink, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=c['bold'])
    canvas = (ink*255).astype(np.uint8)
    # ---- regions between lines (1x geometry) ----
    small = cv2.resize(ink, (W, H), interpolation=cv2.INTER_NEAREST)
    seg = cv2.dilate(small, np.ones((3, 3), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats((1-seg).astype(np.uint8), connectivity=4)
    order = sorted(range(1, n), key=lambda i: -st[i][4]); bg = order[0]
    for i in order[1:]:
        if st[i][4] < 400: continue
        m = lab == i
        if m[0].any() or m[-1].any(): continue
        xs = np.where(m.any(0))[0]
        yt = {}; yb = {}
        for x in xs:
            ys = np.where(m[:, x])[0]; yt[x] = ys.min(); yb[x] = ys.max()
        x = xs.min() + 8
        run = 0; skip = 0
        while x < xs.max() - 8:
            if x not in yb: x += 1; continue
            th = yb[x] - yt[x]
            if run == 0 and skip == 0:
                if th > 10 and rng.random() < c['hatch']: run = rng.randint(4, 9)
                else: skip = rng.randint(6, 14)
            if run > 0 and th > 9:
                Ln = min(th*0.55, 30) * rng.uniform(0.55, 1.0)
                bx = x; by = yb[x] - 2
                stroke(canvas, [(bx, by), (bx + Ln*0.35, by - Ln)], [2.5, 0.9])
                run -= 1
                if run == 0: skip = rng.randint(14, 40)
            elif skip: skip -= 1
            x += 6 if run else 1
        # stipple along the bottom edge of the region
        for _ in range(int(len(xs)/40*c['hatch'])):
            xx = rng.choice(list(xs))
            if yb[xx] - yt[xx] > 22:
                cv2.circle(canvas, (int(xx*S), int((yb[xx] - rng.uniform(8, 15))*S)), max(1, int(rng.uniform(1.0, 1.9)*S)), 255, -1)
    # ---- split into unit bands, vectorise ----
    edges = [0] + [b for b in c['bands']] + [W]
    allp = []
    for bi in range(len(edges)-1):
        band = np.zeros_like(canvas)
        a, b = edges[bi]*S, edges[bi+1]*S
        band[:, a:b] = canvas[:, a:b]
        allp += vectorise(band, bi)
    allp.sort(key=lambda t: t[0])
    polys = [p for _, p in allp]
    result[key] = {'w': W, 'h': H, 'scale': S, 'polys': polys}
    prev = np.full((H*S, W*S), 255, np.uint8)
    for p in polys:
        d, o, sx, sy, *rest = p
        pts = [(sx, sy)]
        for k in range(0, len(rest), 2): pts.append((pts[-1][0]+rest[k], pts[-1][1]+rest[k+1]))
        cv2.fillPoly(prev, [np.array(pts, np.int32)], 0 if d % 2 == 0 else 255)
    cv2.imwrite(f'ref/trace_{key}.png', cv2.resize(prev, (W, H), interpolation=cv2.INTER_AREA))
    print(key, W, H, 'polys', len(polys), 'pts', sum((len(p)-2)//2 for p in polys))
json.dump(result, open('border3_trace.json', 'w'), separators=(',', ':'))
