# Génère analytics-ui/land.js à partir du tracé réel des terres (Natural Earth 110m, domaine public).
# Usage : python3 make-land.py chemin/ne_110m_land.geojson
import json, sys
g = json.load(open(sys.argv[1]))
rings = []
for f in g['features']:
    geo = f['geometry']
    polys = geo['coordinates'] if geo['type'] == 'MultiPolygon' else [geo['coordinates']]
    for poly in polys:
        ring = poly[0]  # contour extérieur seulement
        pts = [(round(x * 5), round(y * 5)) for x, y in ring]  # précision 0,2°
        out, last = [], None
        for p in pts:
            if p != last: out.append(p)
            last = p
        if len(out) < 3: continue
        flat = [out[0][0], out[0][1]]
        for a, b in zip(out, out[1:]): flat += [b[0] - a[0], b[1] - a[1]]
        rings.append(flat)
open('/home/claude/preview-work/worker/analytics-ui/land.js', 'w').write('window.LAND={"u":0.2,"r":' + json.dumps(rings, separators=(',', ':')) + '};')
print(len(rings), 'contours', sum(len(r) // 2 for r in rings), 'points')
