// ──────────────────────────────────────────────────────────────────────────
// core-fsm.js — DOMÉN-VAK állapotgép-motor
// Egyetlen pékség/asztalos szó sincs benne. Lásd CORE_MAP.md §1.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // makeFSM({ states:{id:{label,tone,terminal}}, transitions:{from:[to…]}, order:[…] })
  // → { states, order, canGo(from,to), next(from), apply(entity, to, {reason, requireReason}) }
  function makeFSM(def) {
    const states = def.states || {};
    const transitions = def.transitions || {};
    const order = def.order || Object.keys(states);

    function canGo(from, to) {
      const allowed = transitions[from] || [];
      return allowed.indexOf(to) !== -1;
    }
    function next(from) {
      return (transitions[from] || [])[0] || null;
    }
    function label(id) { return (states[id] && states[id].label) || id; }
    function tone(id) { return (states[id] && states[id].tone) || 'slate'; }
    function isTerminal(id) { return !!(states[id] && states[id].terminal); }

    // apply: validált átmenet. Az entitást MUTÁLJA (a store hív rá és perzisztál).
    // returns { ok, error }
    function apply(entity, to, opts) {
      opts = opts || {};
      const from = entity.status;
      if (from === to) return { ok: true };
      if (!canGo(from, to)) {
        return { ok: false, error: 'Tiltott átmenet: ' + label(from) + ' → ' + label(to) };
      }
      const reasonRequired = opts.requireReason || (states[to] && states[to].requireReason);
      if (reasonRequired && !opts.reason) {
        return { ok: false, error: 'Indok kötelező ehhez: ' + label(to) };
      }
      entity.status = to;
      entity.history = entity.history || [];
      entity.history.push({ from: from, to: to, reason: opts.reason || null, at: Date.now() });
      if (opts.reason) entity.statusReason = opts.reason;
      return { ok: true };
    }

    return { states, order, transitions, canGo, next, label, tone, isTerminal, apply };
  }

  window.CoreFSM = { makeFSM };
})();
