"""Synthetic demo data for the public Profitability Cockpit.

Every number and name here comes from a seeded random model of a fictional toy company (Brightfield Toys):
market sizes, brand mix, gross-to-net, cost, royalty, logistics and overhead rates, seasonality and forecast drift.
Nothing is read from, scaled from or derived from any real data file. Output: data/*.js in the shapes the app reads
(var globals, so a loaded data pack can replace them). Run: python -I tools/gen_demo.py <kit folder>
"""
import json, math, os, random, struct, sys, zlib, base64

R = random.Random(20261106)
OUT = os.path.join(sys.argv[1] if len(sys.argv) > 1 else '.', 'data')
os.makedirs(OUT, exist_ok=True)
CENTRAL, CLOSE = 'CENTRAL', 'Closeouts'

# market code: (display name, currency, size in $M gross, FOB share of gross)
MARKETS = {
    'UK': ('United Kingdom', 'GBP', 95, .22), 'FRANCE': ('France', 'EUR', 82, .18), 'DACH': ('Germany / Austria / Switzerland', 'EUR', 88, .15),
    'ITALY': ('Italy', 'EUR', 46, .20), 'IBERIA': ('Spain & Portugal', 'EUR', 52, .17), 'BENELUX': ('Benelux', 'EUR', 31, .25),
    'NORDICS': ('Nordics', 'EUR', 26, .12), 'POLAND': ('Poland', 'EUR', 19, .10), 'CEE': ('Central & Eastern Europe', 'EUR', 23, .14),
    'GREECE': ('Greece', 'EUR', 8, .05), 'TURKEY': ('Turkey', 'TRY', 14, .08), 'MIDDLE EAST': ('Middle East', 'USD', 18, .35),
    'EXPORT': ('Export & Distributors', 'USD', 12, .60)}
# brand: (weight, royalty % of net sales, product cost % of net sales, category)
BRANDS = {
    'STARFORGE': (14, .14, .38, 'figure'), 'PUZZLE PEAK': (16, 0, .30, 'game'), 'CLAYWORKS': (11, 0, .34, 'creative'),
    'BLASTERZ': (12, 0, .44, 'blaster'), 'DREAM DOLLS': (7, 0, .40, 'doll'), 'ROBO RANGERS': (8, .12, .41, 'figure'),
    'TINY DINO': (6, .10, .37, 'preschool'), 'GALAXY RACERS': (5, .08, .43, 'vehicle'), 'CARD CLASH': (9, 0, .22, 'cards'),
    'BABY BLOOM': (4, 0, .42, 'doll'), 'WORD WIZARDS': (5, 0, .31, 'game'), 'SPIN TOPS': (4, .09, .39, 'toy'),
    'WILDWOOD PETS': (4, 0, .41, 'plush'), 'HERO LEAGUE': (9, .15, .40, 'figure'), 'MONSTER MAKERS': (3, .05, .36, 'creative'),
    'OTHER PORTFOLIO BRANDS': (3, 0, .45, 'toy')}
NOUNS = {'figure': ['Titan Figure', 'Deluxe Figure Set', 'Battle Pack', 'Command Ship', 'Collector Figure', 'Mega Playset'],
         'game': ['Classic Edition', 'Travel Edition', 'Family Game', 'Party Game', 'Junior Edition', 'Deluxe Board Game'],
         'creative': ['Starter Set', 'Bucket of Colours', 'Kitchen Playset', 'Mega Pack', 'Party Pack', 'Studio Kit'],
         'blaster': ['Elite Blaster', 'Mini Blaster', 'Water Blaster', 'Dart Refill 30', 'Mega Blaster', 'Target Set'],
         'doll': ['Fashion Doll', 'Baby Doll', 'Doll House', 'Wardrobe Set', 'Care Kit', 'Deluxe Doll'],
         'preschool': ['Friends Playset', 'Plush Buddy', 'Sound Book', 'Figure Pack', 'Vehicle Set', 'Bath Toy'],
         'vehicle': ['Speed Racer', 'Track Set', 'Launcher', 'Remote Racer', 'Garage Playset', '3-Pack'],
         'cards': ['Starter Deck', 'Booster Pack', 'Booster Display', 'Collector Tin', 'Battle Box', 'Elite Set'],
         'toy': ['Classic Toy', 'Electronic Game', 'Spinner', 'Arena Set', 'Mini Pack', 'Gift Set'],
         'plush': ['Small Plush', 'Large Plush', 'Pet Carrier', 'Vet Set', 'Surprise Pet', 'Family Pack']}
CHS = ['10', '20']  # 10 = Domestic, 20 = Direct import / FOB
SEASON = [3, 3, 4, 4, 5, 6, 7, 9, 11, 14, 17, 17]  # % of the year by month
OH_LINES = ['dt', 'ap', 'ss', 'ol', 'ms', 'ia', 'ad']
OH_RATE = {'dt': .010, 'ap': .075, 'ss': .004, 'ol': .012, 'ms': .085, 'ia': .004, 'ad': .105}


def jit(a=.05):
    return 1 + R.uniform(-a, a)


def rnd(x, d=0):
    return round(x, d) if d else int(round(x))


# ---------- the base year: market x channel x brand gross sales ----------
mix = {}
for m, (_, _, size, fob) in MARKETS.items():
    w = {b: v[0] * R.uniform(.35, 1.8) for b, v in BRANDS.items()}
    drop = R.sample(list(w), R.randint(0, 3))       # not every brand sells everywhere
    for b in drop:
        w[b] = 0
    t = sum(w.values())
    for b in BRANDS:
        if not w[b]:
            continue
        g = size * 1e6 * w[b] / t
        for ch in CHS:
            share = fob if ch == '20' else 1 - fob
            if ch == '20' and R.random() < .3:
                continue
            mix[(m, ch, b)] = g * share * jit(.15)


def econ(m, ch, b, gs, drift=None):
    """Central-forecast row in the cockpit shape: [m,ch,b,u,gs,al,ns,cogs,gp,roy,gmr,wh,fr,vm]."""
    _, roy, cost, _ = BRANDS[b]
    d = drift or {}
    alr = (.12 if ch == '20' else .33) * d.get('al', 1) * (1.15 if m in ('ITALY', 'TURKEY', 'MIDDLE EAST') else 1)
    al = gs * min(alr, .6)
    ns = gs - al
    cr = cost * (1.35 if ch == '20' else 1) * d.get('c', 1)
    cogs = -ns * min(cr, .85)
    r_ = -ns * roy
    wh = -ns * (.028 if ch == '10' else 0) * d.get('wh', 1)
    fr = -ns * (.042 if ch == '10' else 0) * d.get('fr', 1)
    gp = ns + cogs
    gmr = gp + r_
    vm = gmr + wh + fr
    u = gs / (R.uniform(9, 22) if ch == '10' else R.uniform(6, 14))
    return [m, ch, b, rnd(u), rnd(gs), rnd(al), rnd(ns), rnd(cogs), rnd(gp), rnd(r_), rnd(gmr), rnd(wh), rnd(fr), rnd(vm)]


def fix(row):
    """Recompute the subtotals of a rounded row so it always adds up."""
    m, ch, b, u, gs, al, ns, cogs, gp, roy, gmr, wh, fr, vm = row
    ns = gs - al
    gp = ns + cogs
    gmr = gp + roy
    vm = gmr + wh + fr
    return [m, ch, b, u, gs, al, ns, cogs, gp, roy, gmr, wh, fr, vm]


def scen(base, f_brand=.06, f_row=.04, drift=None, drop_m=()):
    bf = {b: jit(f_brand) for b in BRANDS}
    out = {}
    for (m, ch, b), g in base.items():
        if m in drop_m:
            continue
        out[(m, ch, b)] = g * bf[b] * jit(f_row)
    return out, [fix(econ(m, ch, b, g, drift)) for (m, ch, b), g in out.items()]


# ---------- market submissions (Jul cycle) with full P&L lines ----------
groups, subl = [], {}
for (m, ch, b), g in mix.items():
    _, roy, cost, _ = BRANDS[b]
    al = g * (.12 if ch == '20' else .33) * jit(.12)
    ns = g - al
    cr = cost * (1.35 if ch == '20' else 1) * jit(.06)
    ic, iv = ns * cr * .97, ns * cr * .03
    gm = ns - ic - iv
    ry = ns * roy * jit(.05)
    L = {k: ns * OH_RATE[k] * jit(.3) for k in OH_LINES}
    if R.random() < .5:
        L['dt'] = 0
    if R.random() < .7:
        L['ia'] = 0
    L['ss'] *= 1 if ch == '10' else .2
    sw = ns * (.045 if ch == '10' else .006) * jit(.2)
    co = gm - ry - L['dt'] - L['ap'] - L['ss']
    op = co - sw - L['ol'] - L['ms'] - L['ia'] - L['ad']
    u = g / R.uniform(8, 20)
    groups.append(dict(m=m, ch=ch, b=b, u=round(u, 2), gs=round(g, 2), al=round(al, 2), ns=round(ns, 2), gm=round(gm, 2), co=round(co, 2), op=round(op, 2)))
    subl[f'{m}|{ch}|{b}'] = [round(x, 2) for x in [g, al, ns, ic, ry, iv, gm, L['dt'], L['ap'], L['ss'], co, sw, L['ol'], L['ms'], L['ia'], L['ad'], op]]
# closeouts: low price, high allowance
for m in MARKETS:
    g = MARKETS[m][2] * 1e6 * R.uniform(.004, .02)
    al, ns = g * .79, g * .21
    ic = g * .2
    gm = ns - ic
    ry = g * .02
    co = gm - ry
    op = co - ns * .05
    groups.append(dict(m=m, ch='10', b=CLOSE, u=0, gs=round(g, 2), al=round(al, 2), ns=round(ns, 2), gm=round(gm, 2), co=round(co, 2), op=round(op, 2)))
    subl[f'{m}|10|{CLOSE}'] = [round(x, 2) for x in [g, al, ns, ic, ry, 0, gm, 0, 0, 0, co, ns * .05, 0, 0, 0, 0, op]]
# central charges by brand (no sales; costs only)
for b in BRANDS:
    if b == 'OTHER PORTFOLIO BRANDS':
        continue
    gm = -R.uniform(2e4, 9e4)
    ap, ms, ad = R.uniform(1e5, 6e5), R.uniform(1e5, 5e5), R.uniform(5e4, 3e5)
    co = gm - ap
    op = co - ms - ad
    groups.append(dict(m=CENTRAL, ch='10', b=b, u=0, gs=0, al=0, ns=0, gm=round(gm, 2), co=round(co, 2), op=round(op, 2)))
    subl[f'{CENTRAL}|10|{b}'] = [round(x, 2) for x in [0, 0, 0, -gm, 0, 0, gm, 0, ap, 0, co, 0, 0, ms, 0, ad, op]]
CUR = {m: v[1] for m, v in MARKETS.items()}
CUR[CENTRAL] = 'USD'

# ---------- overhead pools for the What-If (Jul and Sept cycles) ----------
def pool(var):
    P = {}
    cen = {g['b']: -g['op'] for g in groups if g['m'] == CENTRAL}
    bns = {}
    for g in groups:
        if g['m'] != CENTRAL and g['b'] != CLOSE:
            bns[g['b']] = bns.get(g['b'], 0) + g['ns']
    for g in groups:
        if g['m'] == CENTRAL or g['b'] == CLOSE:
            continue
        a = subl[f"{g['m']}|{g['ch']}|{g['b']}"]
        oh = [a[7], a[8], a[9], a[12], a[13], a[14], a[15]]
        eu = cen.get(g['b'], 0) * g['ns'] / bns[g['b']] if bns.get(g['b']) else 0
        P[f"{g['m']}|{g['ch']}|{g['b']}"] = [rnd(x * (jit(var) if var else 1)) for x in oh] + [rnd(eu)]
    return P


OHL = {'jul': pool(0), 'sep': pool(.08)}

# ---------- central forecasts ----------
CFC = {}
base_jul, rows_jul = scen(mix, .05, .04)
CFC['jul'] = dict(lab='Jul Fcst', full='Jul FC 2026, central forecast (demo data)', rows=rows_jul)
base_sep, rows_sep = scen(base_jul, .05, .05, {'wh': 1.5, 'fr': 0})
for r in rows_sep:                       # Sept = market submissions: S&W as warehousing, no freight line
    r[11], r[12] = rnd(-r[6] * .045), 0
CFC['sep'] = dict(lab='Sept FC', full='Sept FC 2026, market submissions (demo data)', rows=[fix(r) for r in rows_sep])
base_oct, rows_oct = scen(base_sep, .05, .04, {'c': 1.02})
CFC['oct'] = dict(lab='Oct FC', full='Oct FC 2026, central forecast (demo data)', rows=rows_oct)
base_nov, rows_nov = scen(base_oct, .04, .04, {'c': 1.03, 'al': 1.02})
CFC['nov'] = dict(lab='Nov FC', full='Nov FC 2026, central forecast (demo data)', rows=rows_nov)


# ---------- monthly phasing (Oct and Nov) ----------
def phase(rows, tgt_noise):
    """Split each FY row by month: before phasing (flat season), target by market x channel, phased = scaled to target."""
    prof = {}
    for m in MARKETS:
        for ch in CHS:
            p = [s * jit(.25) for s in SEASON]
            t = sum(p)
            prof[(m, ch)] = [x / t for x in p]
    pre, tgt, out = {}, {}, []
    for r in rows:
        m, ch = r[0], r[1]
        for mo in range(12):
            pre[(m, ch, mo + 1)] = pre.get((m, ch, mo + 1), 0) + r[6] * SEASON[mo] / 100
    for k, v in pre.items():
        tgt[k] = v * jit(tgt_noise)
    fac = {k: tgt[k] / pre[k] if pre[k] else 1 for k in pre}
    for r in rows:
        m, ch, b = r[0], r[1], r[2]
        for mo in range(12):
            f = SEASON[mo] / 100 * fac[(m, ch, mo + 1)]
            out.append([m, ch, b, mo + 1] + [rnd(x * f) for x in r[3:]])
    out = [[a[0], a[1], a[2], a[3]] + fix([a[0], a[1], a[2]] + a[4:])[3:] for a in out]
    fy = {}
    for a in out:
        k = (a[0], a[1], a[2])
        fy[k] = [x + y for x, y in zip(fy.get(k, [0] * 11), a[4:])]
    phased_fy = [fix([k[0], k[1], k[2]] + v) for k, v in fy.items()]
    return out, [[k[0], k[1], k[2], rnd(v)] for k, v in pre.items()], [[k[0], k[1], k[2], rnd(v)] for k, v in tgt.items()], phased_fy


mon_rows, mon_pre, mon_tgt, ocp = phase(rows_oct, .12)
nov_rows, nov_pre, _, nvp = phase(rows_nov, .10)
CFC['ocp'] = dict(lab='Oct FC Phased', full='Oct FC 2026 phased to the monthly sales plan (demo data)', rows=ocp)
CFC['nvp'] = dict(lab='Nov FC Phased', full='Nov FC 2026 phased to the monthly sales plan (demo data)', rows=nvp)
CFC = {k: CFC[k] for k in ['jul', 'sep', 'oct', 'ocp', 'nov', 'nvp']}
MON = dict(rows=mon_rows, pre=mon_pre, tgt=mon_tgt, unm=[])
MON_NOV = dict(rows=nov_rows, pre=nov_pre)

# ---------- prior year actuals ----------
_, py_rows = scen(mix, .08, .06, {'al': .97, 'c': .98})
py_rows = [fix([r[0], r[1], r[2], rnd(r[3] * .93), rnd(r[4] * .93), rnd(r[5] * .93), 0, rnd(r[7] * .93), 0, rnd(r[9] * .93), 0, rnd(r[11] * .93), rnd(r[12] * .93), 0]) for r in py_rows]
PY = dict(lab='FY2025 actuals', full='FY2025 actuals (demo data)', source='demo', rows=py_rows)

# ---------- SKUs: list, prices, submissions and forecast detail ----------
skus, srp = [], {}
n = 10000
for b, (w, _, _, cat) in BRANDS.items():
    k = max(4, int(w * 1.4))
    for i in range(k):
        n += R.randint(3, 40)
        short = b.title() if b != 'OTHER PORTFOLIO BRANDS' else 'Assorted'
        name = f"{short} {R.choice(NOUNS[cat])}{'' if R.random() < .6 else ' ' + R.choice(['V2', 'XL', 'Mini', 'Asst', 'S2'])}".upper()
        sid = f"BT{n}"
        skus.append([sid, name, b])
        srp[sid] = R.choice([4.99, 7.99, 9.99, 12.99, 14.99, 19.99, 24.99, 29.99, 34.99, 39.99, 49.99, 59.99, 79.99])
SIDX = {s[0]: i for i, s in enumerate(skus)}
BSK = {}
for s in skus:
    BSK.setdefault(s[2], []).append(s[0])
MK = sorted(MARKETS)


def split(total, ids):
    w = [R.paretovariate(1.3) for _ in ids]
    t = sum(w)
    return [total * x / t for x in w]


sku_r = []
for g in groups:
    if g['m'] == CENTRAL or g['b'] == CLOSE or not g['ns']:
        continue
    ids = R.sample(BSK[g['b']], max(1, int(len(BSK[g['b']]) * R.uniform(.5, 1))))
    a = subl[f"{g['m']}|{g['ch']}|{g['b']}"]
    for sid, sh in zip(ids, split(1, ids)):
        gs, al, ns = g['gs'] * sh, g['al'] * sh, g['ns'] * sh
        gm, co, op = g['gm'] * sh * jit(.2), g['co'] * sh * jit(.3), g['op'] * sh * jit(.4)
        u = gs / max(1, srp[sid] * 1.1 * .55)
        sku_r.append([SIDX[sid], MK.index(g['m']), g['ch'], rnd(u), rnd(gs), rnd(al), rnd(ns), rnd(gm), rnd(co), rnd(op), rnd(a[11] * sh)])
SKU = dict(s=skus, m=MK, r=sku_r)


def fcs_rows(rows):
    out = []
    for r in rows:
        ids = R.sample(BSK[r[2]], max(1, int(len(BSK[r[2]]) * R.uniform(.5, 1))))
        for sid, sh in zip(ids, split(1, ids)):
            u = r[4] * sh / max(1, srp[sid] * 1.1 * .55)
            out.append([SIDX[sid], MK.index(r[0]), int(r[1]), rnd(u), rnd(r[4] * sh), rnd(r[6] * sh), rnd(r[13] * sh * jit(.25))])
    return out


FCS = dict(s=skus, m=MK, jul=fcs_rows(CFC['jul']['rows']), sep=fcs_rows(CFC['sep']['rows']))

META = dict(company='Brightfield Toys', title='Profitability Cockpit', region='EMEA', year='FY2026',
            sub='FY2026 profitability · market submissions, forecasts, phasing and pricing · demo data',
            markets={m: dict(name=v[0], ccy=v[1]) for m, v in MARKETS.items()},
            central=CENTRAL, fx=dict(EUR=1.10, GBP=1.30, TRY=1 / 40, USD=1), demo=True)


# ---------- a neutral logo (no text): rounded square with two bars ----------
def png(w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    def ch(t, d):
        c = struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        return struct.pack('>I', len(d)) + t + d + c
    return b'\x89PNG\r\n\x1a\n' + ch(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + ch(b'IDAT', zlib.compress(raw, 9)) + ch(b'IEND', b'')


S_ = 160
px = bytearray(S_ * S_ * 4)
for y in range(S_):
    for x in range(S_):
        cx, cy = min(max(x, 28), S_ - 29), min(max(y, 28), S_ - 29)
        inside = (x - cx) ** 2 + (y - cy) ** 2 <= 28 ** 2
        if not inside:
            continue
        c = (34, 81, 255)
        if 44 <= x <= 70 and 52 <= y <= 116 or 82 <= x <= 116 and 52 <= y <= 78 or 82 <= x <= 116 and 90 <= y <= 116:
            c = (255, 255, 255)
        i = (y * S_ + x) * 4
        px[i:i + 4] = bytes([*c, 255])
LOGO = base64.b64encode(png(S_, S_, px)).decode()


def w(name, var, obj, note):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n') as f:
        f.write(f'// {note}\nvar {var}={json.dumps(obj, separators=(",", ":"))};\n')


NOTE = 'Synthetic demo data (fictional company); generated by tools/gen_demo.py. No real figures.'
w('meta.js', 'META', META, NOTE)
w('submissions.js', 'DATA', dict(cur=CUR, groups=groups), NOTE)
w('sub_lines.js', 'SUBL', subl, NOTE)
w('ohl.js', 'OHL', OHL, NOTE)
w('sku_submissions.js', 'SKU', SKU, NOTE)
w('cfc.js', 'CFC', CFC, NOTE)
w('mon.js', 'MON', MON, NOTE)
w('mon_nov.js', 'MON_NOV', MON_NOV, NOTE)
w('py.js', 'PY', PY, NOTE)
w('fcs.js', 'FCS', FCS, NOTE)
w('srp.js', 'SRP', srp, NOTE)
with open(os.path.join(OUT, 'logo.js'), 'w', newline='\n') as f:
    f.write(f"// Neutral demo logo (generated)\nvar LOGO='{LOGO}';\n")
print('groups', len(groups), 'skus', len(skus), 'sku rows', len(sku_r), 'fcs', len(FCS['jul']), len(FCS['sep']), 'mon', len(mon_rows))
print('FY gross $M', round(sum(g['gs'] for g in groups) / 1e6, 1), 'OP $M', round(sum(g['op'] for g in groups) / 1e6, 1))
