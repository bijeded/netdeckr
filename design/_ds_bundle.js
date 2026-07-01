/* MetaStack — hand-written preview runtime.
 * Mirrors the source components in components/ using React.createElement so the
 * *.card.html specimens and the UI kit render in a plain browser without the
 * auto-generated Design System bundle.
 *
 * NOTE: when this project is registered as a Design System, the compiler emits
 * its own _ds_bundle.js under the same window.MetaStack namespace and this file
 * becomes redundant. The source of truth for development is components/*.jsx.
 */
(function () {
  var h = function () { return window.React.createElement.apply(null, arguments); };
  var NS = {};

  var MANA = {
    W: ['var(--mana-w)', 'rgba(0,0,0,.25)'],
    U: ['var(--mana-u)', 'rgba(255,255,255,.25)'],
    B: ['var(--mana-b)', 'rgba(255,255,255,.18)'],
    R: ['var(--mana-r)', 'rgba(255,255,255,.2)'],
    G: ['var(--mana-g)', 'rgba(255,255,255,.2)'],
  };

  function ManaPip(props) {
    props = props || {};
    var size = props.size || 13;
    var m = MANA[props.color] || MANA.U;
    var st = Object.assign({
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: m[0], border: '1px solid ' + m[1], boxShadow: '0 0 6px ' + m[0] + '55', flex: '0 0 auto',
    }, props.style || {});
    return h('span', { style: st });
  }
  NS.ManaPip = ManaPip;

  function ManaPips(props) {
    props = props || {};
    var colors = props.colors || 'U';
    var size = props.size || 13;
    return h('span', { style: Object.assign({ display: 'inline-flex', gap: props.gap || 4 }, props.style || {}) },
      colors.split('').map(function (c, i) { return h(ManaPip, { key: i, color: c, size: size }); }));
  }
  NS.ManaPips = ManaPips;

  function Button(props) {
    props = props || {};
    var variant = props.variant || 'neon';
    var size = props.size || 'md';
    var rest = Object.assign({}, props);
    delete rest.variant; delete rest.size; delete rest.icon; delete rest.children; delete rest.style;
    var base = {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: size === 'sm' ? '8px 13px' : '10px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
      fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)',
      transition: 'all var(--dur) var(--ease)', whiteSpace: 'nowrap',
    };
    var variants = {
      neon: { border: '1px solid var(--neon-border)', background: 'var(--neon-gradient)', color: '#fff', boxShadow: '0 0 22px rgba(177,75,255,.4)' },
      ghost: { border: '1px solid var(--border-line)', background: 'var(--surface-faint)', color: '#cfd0db' },
    };
    return h('button', Object.assign({ style: Object.assign({}, base, variants[variant], props.style || {}) }, rest),
      props.icon ? h('span', { style: { fontSize: 15 } }, props.icon) : null, props.children);
  }
  NS.Button = Button;

  function IconButton(props) {
    props = props || {};
    var rest = Object.assign({}, props); delete rest.children; delete rest.style;
    return h('button', Object.assign({ style: Object.assign({
      display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flex: '0 0 auto',
      border: '1px solid var(--border-line)', background: 'var(--surface-faint)', borderRadius: 'var(--r-md)',
      color: '#cfd0db', cursor: 'pointer', fontSize: 15,
    }, props.style || {}) }, rest), props.children);
  }
  NS.IconButton = IconButton;

  function Pill(props) {
    props = props || {};
    var active = !!props.active;
    var rest = Object.assign({}, props); delete rest.active; delete rest.children; delete rest.style;
    return h('button', Object.assign({ style: Object.assign({
      flex: '0 0 auto', padding: '8px 15px', borderRadius: 'var(--r-pill)',
      fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-sm)',
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all var(--dur) var(--ease)',
      border: '1px solid ' + (active ? 'rgba(177,75,255,.6)' : 'var(--border-line)'),
      background: active ? 'linear-gradient(140deg,rgba(177,75,255,.22),rgba(122,43,255,.16))' : 'var(--surface-faint)',
      color: active ? 'var(--neon-text-soft)' : 'var(--text-secondary)',
      boxShadow: active ? 'var(--glow-neon)' : 'none',
    }, props.style || {}) }, rest), props.children);
  }
  NS.Pill = Pill;

  var TIERS = {
    T1: { color: 'var(--tier-1)', bg: 'var(--neon-tint-16)', border: 'rgba(177,75,255,.55)' },
    T2: { color: 'var(--tier-2)', bg: 'rgba(127,216,255,.12)', border: 'rgba(127,216,255,.4)' },
    T3: { color: 'var(--tier-3)', bg: 'rgba(255,255,255,.06)', border: 'rgba(255,255,255,.18)' },
    Otros: { color: 'var(--tier-rogue)', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.12)' },
  };
  function tierFor(pct) { if (pct >= 10) return 'T1'; if (pct >= 5) return 'T2'; if (pct >= 1) return 'T3'; return 'Otros'; }
  NS.tierFor = tierFor;

  function TierBadge(props) {
    props = props || {};
    var t = props.tier || (props.pct != null ? tierFor(props.pct) : 'T3');
    var c = TIERS[t] || TIERS.T3;
    var rest = Object.assign({}, props); delete rest.tier; delete rest.pct; delete rest.style;
    return h('span', Object.assign({ style: Object.assign({
      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', fontWeight: 'var(--fw-bold)',
      padding: '3px 9px', borderRadius: 'var(--r-sm)', color: c.color, background: c.bg,
      border: '1px solid ' + c.border, backdropFilter: 'blur(4px)',
    }, props.style || {}) }, rest), t);
  }
  NS.TierBadge = TierBadge;

  function ChangeIndicator(props) {
    props = props || {};
    var d = props.delta || 0, c;
    if (d > 0.05) c = { color: 'var(--up)', icon: '\u25B2', text: '+' + d.toFixed(1), bg: 'var(--up-tint)', border: 'var(--up-border)' };
    else if (d < -0.05) c = { color: 'var(--down)', icon: '\u25BC', text: d.toFixed(1), bg: 'var(--down-tint)', border: 'var(--down-border)' };
    else c = { color: 'var(--flat)', icon: '\u2013', text: '0.0', bg: 'var(--flat-tint)', border: 'var(--flat-border)' };
    var rest = Object.assign({}, props); delete rest.delta; delete rest.style;
    return h('span', Object.assign({ style: Object.assign({
      display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)',
      fontSize: '12.5px', fontWeight: 'var(--fw-bold)', padding: '4px 9px', borderRadius: '7px',
      color: c.color, background: c.bg, border: '1px solid ' + c.border,
    }, props.style || {}) }, rest), h('span', { style: { fontSize: 11 } }, c.icon), c.text);
  }
  NS.ChangeIndicator = ChangeIndicator;

  function StatCard(props) {
    props = props || {};
    var color = props.color || 'var(--text-primary)';
    var rest = Object.assign({}, props); delete rest.value; delete rest.label; delete rest.color; delete rest.style;
    return h('div', Object.assign({ style: Object.assign({
      padding: '10px 16px', border: '1px solid var(--border-soft)', background: 'var(--surface-faint)',
      borderRadius: 'var(--r-lg)', minWidth: 96, textAlign: 'right',
    }, props.style || {}) }, rest),
      h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'var(--fs-stat-sm)', fontWeight: 'var(--fw-bold)', color: color, lineHeight: 1 } }, props.value),
      h('div', { style: { fontSize: 'var(--fs-3xs)', color: 'var(--text-muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 5 } }, props.label));
  }
  NS.StatCard = StatCard;

  function ArchetypeCard(props) {
    props = props || {};
    var pct = props.pct || 0, delta = props.delta || 0, colors = props.colors || 'U', hue = props.hue || 265, maxPct = props.maxPct || 100;
    var t = tierFor(pct);
    var tierColor = { T1: 'var(--tier-1)', T2: 'var(--tier-2)', T3: 'var(--tier-3)', Otros: 'var(--tier-rogue)' }[t];
    var deltaColor = delta > 0.05 ? 'var(--up)' : delta < -0.05 ? 'var(--down)' : 'var(--flat)';
    return h('div', { onClick: props.onClick, style: Object.assign({
      border: '1px solid ' + (props.selected ? 'var(--neon-border)' : 'var(--border-soft)'),
      background: 'var(--surface-card)', borderRadius: 'var(--r-xl)', overflow: 'hidden',
      cursor: props.onClick ? 'pointer' : 'default', transition: 'border-color var(--dur-slow), box-shadow var(--dur-slow)',
      boxShadow: props.selected ? '0 0 0 1px rgba(177,75,255,.25), var(--shadow-card)' : 'none',
    }, props.style || {}) },
      h('div', { style: { position: 'relative', height: 118, overflow: 'hidden', background: 'linear-gradient(150deg, oklch(0.32 0.09 ' + hue + '), oklch(0.16 0.05 ' + hue + '))' } },
        h('div', { style: { position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 11px)' } }),
        h('div', { style: { position: 'absolute', left: 11, top: 10 } }, h(ManaPips, { colors: colors, size: 16 })),
        h('span', { style: { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em', color: 'rgba(255,255,255,.34)', textTransform: 'uppercase' } }, 'arte \u00B7 ' + colors),
        h('div', { style: { position: 'absolute', right: 10, top: 10 } }, h(TierBadge, { tier: t }))),
      h('div', { style: { padding: '13px 14px 15px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 } },
          h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-2xs)', color: 'var(--text-faint)' } }, '#' + props.rank),
          h('span', { style: { fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-semibold)', fontSize: 'var(--fs-md)', letterSpacing: 'var(--track-snug)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, props.name)),
        h('div', { style: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' } },
          h('div', { style: { fontFamily: 'var(--font-display)', fontSize: 'var(--fs-stat)', fontWeight: 'var(--fw-bold)', letterSpacing: '-.02em', lineHeight: 1 } }, pct.toFixed(1) + '%'),
          h(ChangeIndicator, { delta: delta })),
        h('div', { style: { marginTop: 11, height: 4, borderRadius: 3, background: 'rgba(255,255,255,.06)', overflow: 'hidden' } },
          h('div', { style: { height: '100%', width: Math.min(100, pct / maxPct * 100) + '%', background: 'linear-gradient(90deg, ' + tierColor + ', ' + deltaColor + ')', borderRadius: 3 } }))));
  }
  NS.ArchetypeCard = ArchetypeCard;

  window.MetaStack = Object.assign(window.MetaStack || {}, NS);
})();
