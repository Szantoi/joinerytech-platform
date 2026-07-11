// ──────────────────────────────────────────────────────────────────────────
// core-store.js — DOMÉN-VAK persistens store + React-kötés
// localStorage + verzió + akció-diszpécser + useStore hook.
// JoineryTech window.sim analóg, de domén-vak. Lásd CORE_MAP.md §1/#9.
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // makeStore({ key, version, seed, buildActions }) → store-objektum
  //  - buildActions(store) → { actionName: fn } ; minden akció után auto-perzisztál + értesít
  function makeStore(cfg) {
    const KEY = cfg.key;
    const VERSION = cfg.version || 1;
    const listeners = new Set();

    function load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed._v === VERSION) return parsed;
        }
      } catch (e) { /* ignore */ }
      const fresh = typeof cfg.seed === 'function' ? cfg.seed() : JSON.parse(JSON.stringify(cfg.seed));
      fresh._v = VERSION;
      return fresh;
    }

    let state = load();

    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
    }
    function notify() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); }
    function commit() { state._rev = (state._rev || 0) + 1; persist(); notify(); }

    function subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; }
    function reset() {
      try { localStorage.removeItem(KEY); } catch (e) {}
      state = load(); commit();
    }

    const store = {
      get state() { return state; },
      subscribe: subscribe,
      commit: commit,
      reset: reset,
      _rev: function () { return state._rev || 0; },
    };

    // akciók becsomagolva: futás után auto-commit
    const rawActions = cfg.buildActions ? cfg.buildActions(store) : {};
    Object.keys(rawActions).forEach(function (name) {
      const fn = rawActions[name];
      store[name] = function () {
        const r = fn.apply(store, arguments);
        commit();
        return r;
      };
    });

    return store;
  }

  // React-kötés: a komponens újrarenderel a store minden commitjére
  function makeUseStore(store, React) {
    return function useStore() {
      const sub = React.useReducer(function (x) { return x + 1; }, 0)[1];
      React.useEffect(function () { return store.subscribe(sub); }, []);
      return store;
    };
  }

  window.CoreStore = { makeStore: makeStore, makeUseStore: makeUseStore };
})();
