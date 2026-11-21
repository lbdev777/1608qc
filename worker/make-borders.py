# Ajoute à analytics-ui/land.js (après make-land.py) : frontières des pays + provinces/états (Canada, É.-U.), Natural Earth (domaine public).
# Usage : python3 make-borders.py dossier/geojson
import json, sys, math
D = sys.argv[1]
def lines(path, keep=None):
    g = json.load(open(path)); out = []
    for ft in g['features']:
        if keep and not keep(ft['properties']): continue
        geo = ft['geometry']
        for l in (geo['coordinates'] if geo['type'] == 'MultiLineString' else [geo['coordinates']]):
            out.append([(p[0], p[1]) for p in l])
    return out
def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; n = math.hypot(dx, dy) or 1e-9
    idx, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / n
        if d > dmax: idx, dmax = i, d
    if dmax > eps: return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]
def enc(ls, eps):
    out = []
    for l in ls:
        l = dp(l, eps); q = []
        for x, y in l:
            p = (round(x * 5), round(y * 5))
            if not q or q[-1] != p: q.append(p)
        if len(q) < 2: continue
        flat = [q[0][0], q[0][1]]
        for a, b in zip(q, q[1:]): flat += [b[0] - a[0], b[1] - a[1]]
        out.append(flat)
    return out
countries = enc(lines(D + '/ne_110m_admin_0_boundary_lines_land.geojson'), 0.05)
states = enc(lines(D + '/ne_50m_admin_1_states_provinces_lines.geojson', lambda p: p.get('ADM0_A3') in ('USA', 'CAN')), 0.07)
open('/home/claude/preview-work/worker/analytics-ui/land.js', 'a').write('\nwindow.BORDERS={"u":0.2,"c":' + json.dumps(countries, separators=(',', ':')) + ',"s":' + json.dumps(states, separators=(',', ':')) + '};')
print(len(countries), sum(len(x)//2 for x in countries), len(states), sum(len(x)//2 for x in states))
