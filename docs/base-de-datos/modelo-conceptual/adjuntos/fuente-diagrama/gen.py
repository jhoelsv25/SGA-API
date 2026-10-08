# -*- coding: utf-8 -*-
"""Generador del Modelo Conceptual E-R (A3 horizontal) - SGA I.E. Nuestra Señora del Carmen."""
import heapq, html, json, sys
from model import ENTS, RELS, SPEC, NOTES, MODS, COLS, TITLE, SUBTITLE
from layout import LEGEND_BOX

CW, CH = 4200, 2970
GRID = 10
BW, ROW, HDR, PADB = 330, 27, 44, 10
GHOST_H = 64

def esc(s): return html.escape(s, quote=True)

# ---------------------------------------------------------------- boxes
boxes = {}
for k, e in ENTS.items():
    x = COLS[e['col']] + e.get('dx', 0)
    need = len(e['title']) * 14.6 + 30 + (78 if e.get('badge') else 0)
    w = max(e.get('w', BW), int((need + 9) // 10 * 10))
    if e.get('ghost'):
        w = max(e.get('w', BW), 340)
        h = GHOST_H
    else:
        h = HDR + (len(e['attrs']) + (1 if e.get('sub') else 0)) * ROW + PADB
    boxes[k] = dict(x=x, y=e['y'], w=w, h=h)

def center(b): return (b['x'] + b['w'] / 2, b['y'] + b['h'] / 2)

# ---------------------------------------------------------------- obstacle grid
GW, GH = CW // GRID, CH // GRID
blocked = bytearray(GW * GH)
def block_rect(x, y, w, h, m):
    x0 = max(0, int((x - m) // GRID)); x1 = min(GW - 1, int((x + w + m) // GRID))
    y0 = max(0, int((y - m) // GRID)); y1 = min(GH - 1, int((y + h + m) // GRID))
    for gy in range(y0, y1 + 1):
        row = gy * GW
        for gx in range(x0, x1 + 1):
            blocked[row + gx] = 1
for b in boxes.values():
    block_rect(b['x'], b['y'], b['w'], b['h'], 16)
for n in NOTES:
    block_rect(n['x'], n['y'], n['w'], 36 + 24 * len(n['attrs']), 14)
for s in SPEC:
    block_rect(s['cx'] - 26, s['cy'] - 26, 52, 52, 4)
block_rect(0, 0, CW, 250, 0)          # title band
block_rect(0, 0, 50, CH, 0); block_rect(CW - 50, 0, 50, CH, 0); block_rect(0, CH - 30, CW, 30, 0)
lb = LEGEND_BOX
block_rect(lb[0], lb[1], lb[2], lb[3], 10)

use_h = [0] * (GW * GH)
use_v = [0] * (GW * GH)

DIRS = {'R': (1, 0), 'L': (-1, 0), 'D': (0, 1), 'U': (0, -1)}
OUT = {'R': (1, 0), 'L': (-1, 0), 'B': (0, 1), 'T': (0, -1)}

def astar(s, g, sdir, gdir):
    """s,g grid points; sdir outgoing dir at start; gdir required arrival dir at goal."""
    sx, sy = s; gx, gy = g
    def hfun(x, y): return abs(x - gx) + abs(y - gy)
    start = (sx, sy, sdir)
    dist = {start: 0}
    prev = {}
    pq = [(hfun(sx, sy), 0, start)]
    TURN = 8
    while pq:
        f, c, st = heapq.heappop(pq)
        x, y, d = st
        if c > dist.get(st, 1e18): continue
        if (x, y) == (gx, gy):
            end = st
            break
        for nd, (ddx, ddy) in DIRS.items():
            if (ddx, ddy) == (-DIRS[d][0], -DIRS[d][1]): continue
            nx, ny = x + ddx, y + ddy
            if not (0 <= nx < GW and 0 <= ny < GH): continue
            idx = ny * GW + nx
            if blocked[idx] and (nx, ny) != (gx, gy): continue
            cost = 1
            if nd != d: cost += TURN
            if ddx:  # horizontal
                cost += use_h[idx] * 40 + use_v[idx] * 3
            else:
                cost += use_v[idx] * 40 + use_h[idx] * 3
            if (nx, ny) == (gx, gy) and nd != gdir: cost += TURN
            nc = c + cost
            ns = (nx, ny, nd)
            if nc < dist.get(ns, 1e18):
                dist[ns] = nc; prev[ns] = st
                heapq.heappush(pq, (nc + hfun(nx, ny), nc, ns))
    else:
        return None
    pts = []
    st = end
    while st in prev:
        pts.append((st[0], st[1])); st = prev[st]
    pts.append((st[0], st[1]))
    pts.reverse()
    return pts

def mark(pts):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        idx = y1 * GW + x1
        if x0 != x1: use_h[idx] += 1
        else: use_v[idx] += 1

def simplify(p):
    out = [p[0]]
    for i in range(1, len(p) - 1):
        a, b, c = out[-1], p[i], p[i + 1]
        if (a[0] == b[0] == c[0]) or (a[1] == b[1] == c[1]): continue
        out.append(b)
    out.append(p[-1])
    return out

# ---------------------------------------------------------------- side assignment
def auto_side(a, b):
    ba, bb = boxes[a], boxes[b]
    (ax, ay), (bx, by) = center(ba), center(bb)
    # separation along axes
    gapx = max(bb['x'] - (ba['x'] + ba['w']), ba['x'] - (bb['x'] + bb['w']))
    gapy = max(bb['y'] - (ba['y'] + ba['h']), ba['y'] - (bb['y'] + bb['h']))
    if gapx >= gapy:
        return ('R', 'L') if bx > ax else ('L', 'R')
    return ('B', 'T') if by > ay else ('T', 'B')

ends = []  # per relationship: (sideA, sideB)
for r in RELS:
    sides = r.get('sides') or auto_side(r['a'], r['b'])
    r['_sides'] = sides
# spec edges also consume ports
spec_edges = []
for s in SPEC:
    spec_edges.append(dict(a=s['super'], b=None, side=s['super_side'], tgt=(s['cx'], s['cy'] - 26)))
    for sub in s['subs']:
        spec_edges.append(dict(a=sub, b=None, side=s['sub_side'].get(sub, 'T'), tgt=(s['cx'], s['cy'])))

ports = {}  # (ent, side) -> list of (sortkey, ref)
def other_coord(ent, side, oth):
    ox, oy = oth
    return ox if side in 'TB' else oy
for i, r in enumerate(RELS):
    sa, sb = r['_sides']
    ports.setdefault((r['a'], sa), []).append((other_coord(r['a'], sa, center(boxes[r['b']])), ('r', i, 0)))
    ports.setdefault((r['b'], sb), []).append((other_coord(r['b'], sb, center(boxes[r['a']])), ('r', i, 1)))
for j, se in enumerate(spec_edges):
    ports.setdefault((se['a'], se['side']), []).append((other_coord(se['a'], se['side'], se['tgt']), ('s', j, 0)))

port_pos = {}
for (ent, side), lst in ports.items():
    b = boxes[ent]
    lst.sort(key=lambda t: t[0])
    n = len(lst)
    for k, (_, ref) in enumerate(lst):
        if side in 'TB':
            span0, span1 = b['x'] + 30, b['x'] + b['w'] - 30
            px = round((span0 + (span1 - span0) * (k + 1) / (n + 1)) / GRID) * GRID
            py = b['y'] if side == 'T' else b['y'] + b['h']
        else:
            span0, span1 = b['y'] + 22, b['y'] + b['h'] - 16
            py = round((span0 + (span1 - span0) * (k + 1) / (n + 1)) / GRID) * GRID
            px = b['x'] if side == 'L' else b['x'] + b['w']
        port_pos[ref] = (px, py, side)

STUB = 40
def free_run(p, side):
    """distance from port p outward until hitting another box (for adaptive stubs)."""
    ux, uy = OUT[side]; x, y = p
    best = 400
    for b in boxes.values():
        if side in 'TB':
            if b['x'] - 5 <= x <= b['x'] + b['w'] + 5:
                d = (b['y'] - y) if side == 'B' else (y - (b['y'] + b['h']))
                if d > 0: best = min(best, d)
        else:
            if b['y'] - 5 <= y <= b['y'] + b['h'] + 5:
                d = (b['x'] - x) if side == 'R' else (x - (b['x'] + b['w']))
                if d > 0: best = min(best, d)
    return best

def stub_pt(p, side):
    ux, uy = OUT[side]
    L = max(GRID * 3, min(STUB, free_run(p, side) / 2))
    return (round((p[0] + ux * L) / GRID), round((p[1] + uy * L) / GRID))

def route(p, side_p, q, side_q):
    # straight connection when ports face each other and are aligned
    if side_p in 'TB' and side_q in 'TB' and p[0] == q[0] and side_p != side_q:
        return [p, q]
    if side_p in 'LR' and side_q in 'LR' and p[1] == q[1] and side_p != side_q:
        return [p, q]
    sp = stub_pt(p, side_p)
    sq = stub_pt(q, side_q)
    for (gx, gy) in (sp, sq):
        blocked[gy * GW + gx] = 0
    sdir = {'R': 'R', 'L': 'L', 'B': 'D', 'T': 'U'}[side_p]
    gdir = {'R': 'L', 'L': 'R', 'B': 'U', 'T': 'D'}[side_q]
    path = astar(sp, sq, sdir, gdir)
    if path is None:
        print('NO ROUTE', p, q, file=sys.stderr)
        return [p, q]
    mark(path)
    pts = [(x * GRID, y * GRID) for x, y in path]
    # connect port exactly (port may be off-grid on its axis)
    a0 = (p[0], p[1]); b0 = (q[0], q[1])
    first = pts[0]; last = pts[-1]
    if side_p in 'TB': lead = [a0, (a0[0], first[1])] if a0[0] != first[0] else [a0]
    else: lead = [a0, (first[0], a0[1])] if a0[1] != first[1] else [a0]
    if side_q in 'TB': tail = [(b0[0], last[1]), b0] if b0[0] != last[0] else [b0]
    else: tail = [(last[0], b0[1]), b0] if b0[1] != last[1] else [b0]
    full = lead + pts + tail
    # remove duplicates
    clean = [full[0]]
    for pt in full[1:]:
        if pt != clean[-1]: clean.append(pt)
    return simplify(clean) if len(clean) > 2 else clean

# order: shortest first for nicer routing
order = sorted(range(len(RELS)), key=lambda i: (RELS[i].get('prio', 1),
               abs(center(boxes[RELS[i]['a']])[0] - center(boxes[RELS[i]['b']])[0]) +
               abs(center(boxes[RELS[i]['a']])[1] - center(boxes[RELS[i]['b']])[1])))
paths = {}
for i in order:
    r = RELS[i]
    pa = port_pos[('r', i, 0)]; pb = port_pos[('r', i, 1)]
    paths[i] = route(pa[:2], pa[2], pb[:2], pb[2])

spec_paths = []
for j, se in enumerate(spec_edges):
    p = port_pos[('s', j, 0)]
    tx, ty = se['tgt']
    x, y, side = p
    if side == 'B':
        spec_paths.append([(x, y), (x, ty - 60), (tx, ty - 60), (tx, ty)] if x != tx else [(x, y), (tx, ty)])
    else:  # subtype top/left -> circle center
        if side == 'T':
            spec_paths.append([(x, y), (x, ty + 70), (tx, ty + 70), (tx, ty)] if x != tx else [(x, y), (tx, ty)])
        elif side == 'L':
            spec_paths.append([(x, y), (tx, y), (tx, ty)])
        else:
            spec_paths.append([(x, y), (tx, y), (tx, ty)])

# ---------------------------------------------------------------- render
o = []
A = o.append
A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CW} {CH}" width="420mm" height="297mm" '
  f'font-family="Segoe UI, Arial, sans-serif">')
A('<rect width="100%" height="100%" fill="#ffffff"/>')
A('<style>.at{font-size:21px;fill:#1f2937}.hd{font-size:23px;font-weight:700;fill:#fff;letter-spacing:.3px}'
  '.lb{font-size:18px;font-style:italic;fill:#111827}.nt{font-size:19px;fill:#1f2937}'
  '.ln{fill:none;stroke:#374151;stroke-width:2.2}</style>')

# title
A(f'<text x="90" y="118" font-size="54" font-weight="800" fill="#0f172a">{esc(TITLE)}</text>')
A(f'<text x="92" y="170" font-size="27" fill="#334155">{esc(SUBTITLE[0])}</text>')
A(f'<text x="92" y="210" font-size="23" fill="#64748b">{esc(SUBTITLE[1])}</text>')
A('<line x1="90" y1="240" x2="4110" y2="240" stroke="#cbd5e1" stroke-width="3"/>')

def poly(pts, cls='ln', extra=''):
    d = 'M' + ' L'.join(f'{x:.0f},{y:.0f}' for x, y in pts)
    return f'<path d="{d}" class="{cls}" {extra}/>'

def symbols(pt, side, card):
    x, y = pt; ux, uy = OUT[side]; px, py = -uy, ux
    s = []
    mn, mx = {'1': ('1', '1'), '0..1': ('0', '1'), '1..N': ('1', 'N'), '0..N': ('0', 'N')}[card]
    L = 'stroke="#374151" stroke-width="2.2" fill="none"'
    if mx == 'N':
        tip = (x + ux * 18, y + uy * 18)
        for k in (-1, 0, 1):
            s.append(f'<line x1="{tip[0]:.1f}" y1="{tip[1]:.1f}" x2="{x + px * 11 * k:.1f}" y2="{y + py * 11 * k:.1f}" {L}/>')
    else:
        c = (x + ux * 11, y + uy * 11)
        s.append(f'<line x1="{c[0] + px * 10:.1f}" y1="{c[1] + py * 10:.1f}" x2="{c[0] - px * 10:.1f}" y2="{c[1] - py * 10:.1f}" {L}/>')
    if mn == '1':
        c = (x + ux * 25, y + uy * 25)
        s.append(f'<line x1="{c[0] + px * 10:.1f}" y1="{c[1] + py * 10:.1f}" x2="{c[0] - px * 10:.1f}" y2="{c[1] - py * 10:.1f}" {L}/>')
    else:
        c = (x + ux * 29, y + uy * 29)
        s.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="6.5" fill="#fff" stroke="#374151" stroke-width="2.2"/>')
    return ''.join(s)

def longest_seg(pts):
    best = None; bl = -1
    for a, b in zip(pts, pts[1:]):
        l = abs(a[0] - b[0]) + abs(a[1] - b[1])
        if l > bl: bl, best = l, (a, b)
    return best

label_pts = {}
labels_svg = []
taken = [(b['x'] - 4, b['y'] - 4, b['x'] + b['w'] + 4, b['y'] + b['h'] + 4) for b in boxes.values()]
for n in NOTES:
    taken.append((n['x'], n['y'], n['x'] + n['w'], n['y'] + 36 + 24 * len(n['attrs'])))
taken.append((LEGEND_BOX[0], LEGEND_BOX[1], LEGEND_BOX[0] + LEGEND_BOX[2], LEGEND_BOX[1] + LEGEND_BOX[3]))
taken = [(b['x'] - 14, b['y'] - 14, b['x'] + b['w'] + 14, b['y'] + b['h'] + 14) for b in boxes.values()] + taken[len(boxes):]
for (px_, py_, sd_) in port_pos.values():
    ux_, uy_ = OUT[sd_]
    cx_, cy_ = px_ + ux_ * 22, py_ + uy_ * 22
    taken.append((cx_ - 22, cy_ - 22, cx_ + 22, cy_ + 22))
EDGES = [(-999, -999, 60, CH + 999), (CW - 60, -999, CW + 999, CH + 999), (-999, -999, CW + 999, 250)]
taken += EDGES
relaxed = [(b['x'] - 4, b['y'] - 4, b['x'] + b['w'] + 4, b['y'] + b['h'] + 4) for b in boxes.values()] + taken[len(boxes):len(boxes) + len(NOTES) + 1] + EDGES
def hits(rc, lst=None):
    return any(not (rc[2] <= t[0] or rc[0] >= t[2] or rc[3] <= t[1] or rc[1] >= t[3]) for t in (taken if lst is None else lst))

def place_label(pts, tw, th=26, strict=True):
    total = sum(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in zip(pts, pts[1:]))
    cands = []
    acc = 0
    for a, b in zip(pts, pts[1:]):
        L = abs(a[0] - b[0]) + abs(a[1] - b[1])
        if L == 0: continue
        horiz = a[1] == b[1]
        steps = max(1, int(L // 15))
        for s in range(steps + 1):
            f = s / steps
            x = a[0] + (b[0] - a[0]) * f; y = a[1] + (b[1] - a[1]) * f
            along = acc + L * f
            offs = [(0, 0), (0, -16), (0, 16)] if horiz else [(0, 0), (tw / 2 + 6, 0), (-tw / 2 - 6, 0)]
            for ox, oy in offs:
                cx, cy = x + ox, y + oy
                rc = (cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2)
                if not hits(rc, None if strict else relaxed):
                    score = abs(along - total / 2) + (0 if horiz else 60) + (abs(ox) * 0.5)
                    cands.append((score, cx, cy, rc))
        acc += L
    if cands:
        cands.sort(key=lambda t: t[0])
        _, cx, cy, rc = cands[0]
    elif strict:
        return place_label(pts, tw, th, strict=False)
    else:
        a, b = longest_seg(pts)
        cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        rc = (cx - tw / 2, cy - th / 2, cx + tw / 2, cy + th / 2)
        print('LABEL FALLBACK', file=sys.stderr)
    taken.append(rc); relaxed.append(rc)
    return cx, cy

for i, r in enumerate(RELS):
    pts = paths[i]
    A(poly(pts, extra='stroke-dasharray="10 7"' if r.get('dashed') else ''))
    pa = port_pos[('r', i, 0)]; pb = port_pos[('r', i, 1)]
    A(symbols(pa[:2], pa[2], r['ca']))
    A(symbols(pb[:2], pb[2], r['cb']))
    t = r['label']
    tw = len(t) * 8.6 + 10
    mx, my = r['lpos'] if 'lpos' in r else place_label(pts, tw)
    label_pts[r.get('id', i)] = (mx, my)
    labels_svg.append(f'<rect x="{mx - tw / 2:.0f}" y="{my - 14:.0f}" width="{tw:.0f}" height="26" rx="6" fill="#fff" fill-opacity=".92"/>'
                      f'<text x="{mx:.0f}" y="{my + 6:.0f}" text-anchor="middle" class="lb">{esc(t)}</text>')

for sp in spec_paths:
    A(poly(sp))
for s in SPEC:
    A(f'<circle cx="{s["cx"]}" cy="{s["cy"]}" r="24" fill="#fff" stroke="#374151" stroke-width="2.6"/>'
      f'<text x="{s["cx"]}" y="{s["cy"] + 9}" text-anchor="middle" font-size="28" font-weight="700" fill="#111">o</text>')
    A(f'<text x="{s["lx"]}" y="{s["ly"]}" class="lb">{esc(s["label"])}</text>')

# notes (attributes of N:M relationships)
for n in NOTES:
    h = 36 + 24 * len(n['attrs'])
    lx, ly = label_pts[n['rel']]
    cx = min(max(lx, n['x']), n['x'] + n['w']); cy = min(max(ly, n['y']), n['y'] + h)
    A(f'<line x1="{lx:.0f}" y1="{ly:.0f}" x2="{cx:.0f}" y2="{cy:.0f}" stroke="#6b7280" stroke-width="2" stroke-dasharray="6 5"/>')
    A(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{h}" rx="10" fill="#fffbeb" stroke="#d97706" stroke-width="2" stroke-dasharray="8 5"/>')
    A(f'<text x="{n["x"] + 14}" y="{n["y"] + 26}" font-size="20" font-weight="700" fill="#92400e">{esc(n["title"])}</text>')
    for k, t in enumerate(n['attrs']):
        A(f'<text x="{n["x"] + 14}" y="{n["y"] + 52 + 24 * k}" class="nt">{esc(t)}</text>')

o.extend(labels_svg)

# entities
for k, e in ENTS.items():
    b = boxes[k]; col = MODS[e['mod']]['color']
    x, y, w, h = b['x'], b['y'], b['w'], b['h']
    if e.get('ghost'):
        A(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#f8fafc" stroke="{col}" stroke-width="2.4" stroke-dasharray="9 6"/>')
        A(f'<text x="{x + w / 2}" y="{y + 29}" text-anchor="middle" font-size="23" font-weight="700" fill="{col}">{esc(e["title"])}</text>')
        A(f'<text x="{x + w / 2}" y="{y + 52}" text-anchor="middle" font-size="17" font-style="italic" fill="#64748b">réplica visual de la entidad</text>')
        continue
    A(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#fff" stroke="{col}" stroke-width="2.6"/>')
    A(f'<path d="M{x},{y + HDR} L{x},{y + 10} Q{x},{y} {x + 10},{y} L{x + w - 10},{y} Q{x + w},{y} {x + w},{y + 10} L{x + w},{y + HDR} Z" fill="{col}"/>')
    A(f'<text x="{x + 14}" y="{y + 30}" class="hd">{esc(e["title"])}</text>')
    if e.get('badge'):
        bw_ = 66
        A(f'<rect x="{x + w - bw_ - 8}" y="{y + 9}" width="{bw_}" height="27" rx="13" fill="#fde047" stroke="#854d0e" stroke-width="1.5"/>'
          f'<text x="{x + w - bw_ / 2 - 8}" y="{y + 29}" text-anchor="middle" font-size="18" font-weight="800" fill="#422006">{e["badge"]}</text>')
    off = 0
    if e.get('sub'):
        A(f'<text x="{x + 14}" y="{y + HDR + 21}" font-size="19" font-style="italic" fill="#64748b">{esc(e["sub"])}</text>')
        off = 1
    for j, (mark_, name) in enumerate(e['attrs']):
        ty = y + HDR + 21 + (j + off) * ROW
        deco = ' text-decoration="underline"' if mark_ == '#' else ''
        weight = ' font-weight="700"' if mark_ == '#' else ''
        A(f'<text x="{x + 14}" y="{ty}" class="at"><tspan font-family="Consolas, monospace" font-weight="700" fill="{col}">{esc(mark_)}</tspan>'
          f'<tspan dx="8"{deco}{weight}>{esc(name)}</tspan></text>')

# legend
lx, ly, lw, lh = LEGEND_BOX
A(f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="14" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/>')
A(f'<text x="{lx + 24}" y="{ly + 40}" font-size="27" font-weight="800" fill="#0f172a">LEYENDA</text>')
# cardinality samples
yy = ly + 82
samples = [('1', 'exactamente uno (1..1)'), ('0..1', 'cero o uno (0..1)'), ('1..N', 'uno o muchos (1..N)'), ('0..N', 'cero o muchos (0..N)')]
for k, (c, t) in enumerate(samples):
    cx = lx + 24 + (k % 2) * 620; cy = yy + (k // 2) * 44
    A(f'<line x1="{cx}" y1="{cy}" x2="{cx + 90}" y2="{cy}" class="ln"/>')
    A(symbols((cx + 90, cy), 'L', c))
    A(f'<rect x="{cx + 90}" y="{cy - 14}" width="8" height="28" fill="#374151"/>')
    A(f'<text x="{cx + 112}" y="{cy + 7}" font-size="20" fill="#1f2937">{t}</text>')
yy += 104
items = [
    ('#', 'identificador único (clave candidata elegida)'),
    ('*', 'atributo obligatorio'),
    ('o', 'atributo opcional'),
    ('{ }', 'atributo multivaluado  ·  ( ) atributo compuesto'),
]
for k, (m, t) in enumerate(items):
    cx = lx + 24 + (k % 2) * 620; cy = yy + (k // 2) * 36
    A(f'<text x="{cx}" y="{cy}" font-size="21" font-family="Consolas, monospace" font-weight="700" fill="#1d4ed8">{esc(m)}</text>'
      f'<text x="{cx + 50}" y="{cy}" font-size="19" fill="#1f2937">{esc(t)}</text>')
yy += 84
A(f'<circle cx="{lx + 44}" cy="{yy - 8}" r="17" fill="#fff" stroke="#374151" stroke-width="2.4"/><text x="{lx + 44}" y="{yy}" text-anchor="middle" font-size="22" font-weight="700">o</text>'
  f'<text x="{lx + 74}" y="{yy}" font-size="19" fill="#1f2937">especialización solapada (una persona puede ser docente y apoderado a la vez)</text>')
yy += 44
A(f'<rect x="{lx + 24}" y="{yy - 22}" width="60" height="30" rx="6" fill="#fffbeb" stroke="#d97706" stroke-width="2" stroke-dasharray="7 4"/>'
  f'<text x="{lx + 98}" y="{yy}" font-size="19" fill="#1f2937">atributos propios de una relación muchos a muchos (N:M)</text>')
yy += 44
A(f'<rect x="{lx + 24}" y="{yy - 22}" width="60" height="30" rx="6" fill="#f8fafc" stroke="#475569" stroke-width="2" stroke-dasharray="7 4"/>'
  f'<text x="{lx + 98}" y="{yy}" font-size="19" fill="#1f2937">réplica visual de una entidad (evita cruces; es la misma entidad)</text>')
yy += 44
A(f'<rect x="{lx + 24}" y="{yy - 21}" width="60" height="27" rx="13" fill="#fde047" stroke="#854d0e" stroke-width="1.5"/><text x="{lx + 54}" y="{yy - 1}" text-anchor="middle" font-size="16" font-weight="800">CSP</text>'
  f'<text x="{lx + 98}" y="{yy}" font-size="19" fill="#1f2937">entidad que alimenta un indicador de tesis (CSP · IGM · ISA)</text>')
yy += 50
A(f'<text x="{lx + 24}" y="{yy}" font-size="21" font-weight="800" fill="#0f172a">Módulos</text>')
yy += 14
mk = list(MODS.values())
for k, m in enumerate(mk):
    cx = lx + 24 + (k % 3) * 420; cy = yy + (k // 3) * 36
    A(f'<rect x="{cx}" y="{cy}" width="26" height="26" rx="5" fill="{m["color"]}"/><text x="{cx + 36}" y="{cy + 20}" font-size="18" fill="#1f2937">{esc(m["name"])}</text>')

A('</svg>')
svg = '\n'.join(o)
open(sys.argv[1], 'w', encoding='utf-8').write(svg)
print('entities', len([e for e in ENTS.values() if not e.get('ghost')]), 'rels', len(RELS))
