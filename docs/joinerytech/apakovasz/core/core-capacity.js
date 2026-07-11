// ──────────────────────────────────────────────────────────────────────────
// core-capacity.js — DOMÉN-VAK véges kapacitás-ütemező
// "Bucket"-ök (állomások) napi órakerettel. Nem ismer sütőt/gépet — csak
// foglalható időt. Lásd CORE_MAP.md §1/#2 (JoineryTech ProdSchedEngine analóg).
// ──────────────────────────────────────────────────────────────────────────
(function () {
  // stations: [{ id, label, dailyHours, kind }]
  // bookings: [{ stationId, minutes, day, label, status }]  (status: aktív vagy sem)
  function CapacityEngine(stations) {
    const byId = {};
    (stations || []).forEach(function (s) { byId[s.id] = s; });

    // egy állomás adott napi terhelése percben
    function dayLoadMinutes(bookings, stationId, day) {
      return (bookings || [])
        .filter(function (b) { return b.stationId === stationId && b.day === day; })
        .reduce(function (sum, b) { return sum + (b.minutes || 0); }, 0);
    }
    function capacityMinutes(stationId) {
      const s = byId[stationId];
      return s ? (s.dailyHours || 0) * 60 : 0;
    }
    // kihasználtság 0..1+ (1 felett = túlterhelt)
    function utilization(bookings, stationId, day) {
      const cap = capacityMinutes(stationId);
      if (!cap) return 0;
      return dayLoadMinutes(bookings, stationId, day) / cap;
    }
    function freeMinutes(bookings, stationId, day) {
      return capacityMinutes(stationId) - dayLoadMinutes(bookings, stationId, day);
    }
    // ütközések: ahol a terhelés meghaladja a kapacitást
    function conflicts(bookings, day) {
      return (stations || [])
        .map(function (s) {
          const load = dayLoadMinutes(bookings, s.id, day);
          const cap = capacityMinutes(s.id);
          return { stationId: s.id, label: s.label, load: load, cap: cap, over: load - cap };
        })
        .filter(function (r) { return r.over > 0; });
    }
    // össz-kihasználtság (átlag) egy napra — KPI-hoz
    function overallUtilization(bookings, day) {
      const arr = (stations || []).map(function (s) { return utilization(bookings, s.id, day); });
      if (!arr.length) return 0;
      return arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
    }
    function stationsByKind(kind) {
      return (stations || []).filter(function (s) { return s.kind === kind; });
    }

    return {
      stations: stations || [],
      byId: byId,
      dayLoadMinutes: dayLoadMinutes,
      capacityMinutes: capacityMinutes,
      utilization: utilization,
      freeMinutes: freeMinutes,
      conflicts: conflicts,
      overallUtilization: overallUtilization,
      stationsByKind: stationsByKind,
    };
  }

  window.CoreCapacity = { CapacityEngine: CapacityEngine };
})();
