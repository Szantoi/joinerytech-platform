// Workflow data — Doorstar StageChain + FlowEpics

const STAGES = [
  { key: "sales",     hu: "\u00c9rt\u00e9kes\u00edt\u00e9s",   en: "Sales" },
  { key: "survey",    hu: "Felm\u00e9r\u00e9s",                en: "Survey",   optional: true },
  { key: "production",hu: "Gy\u00e1rt\u00e1s",                 en: "Production" },
  { key: "delivery",  hu: "Sz\u00e1ll\u00edt\u00e1s",          en: "Delivery" },
  { key: "install",   hu: "Beszerel\u00e9s",                   en: "Install" },
];

const FLOW_EPICS = [
  { id: "FE-2426-184", title: "16-fi\u00f3kos konyhab\u00fator",      customer: "Bogn\u00e1r B\u00fator Kft.",       type: "cabinet", stage: "production", due: "2026-05-08", assignee: "NJ", priority: "high",   delegated: false },
  { id: "FE-2426-183", title: "Konyhasziget egyedi",                  customer: "V\u00e1rdai Konyhast\u00fadi\u00f3", type: "cabinet", stage: "production", due: "2026-05-04", assignee: "TK", priority: "med",    delegated: false },
  { id: "FE-2426-182", title: "42db belt\u00e9ri ajt\u00f3",            customer: "Doorstar Hungary Zrt.",            type: "door",    stage: "production", due: "2026-05-15", assignee: "KA", priority: "high",   delegated: true },
  { id: "FE-2426-181", title: "Ablak felm\u00e9r\u00e9s villa",         customer: "Pesti Ablakm\u0171hely",            type: "window",  stage: "survey",     due: "2026-04-30", assignee: "SA", priority: "low",    delegated: false },
  { id: "FE-2426-180", title: "Nappali szekr\u00e9nysor",               customer: "Hegyi Lakberendez\u00e9s",          type: "cabinet", stage: "delivery",   due: "2026-04-29", assignee: "HE", priority: "med",    delegated: false },
  { id: "FE-2426-179", title: "Egyedi t\u00e1rgyal\u00f3 asztal",       customer: "Szab\u00f3 Asztalos Bt.",           type: "custom",  stage: "install",    due: "2026-04-30", assignee: "NJ", priority: "low",    delegated: false },
  { id: "FE-2426-178", title: "Lak\u00e1s teljes b\u00fatorzat",        customer: "Vella Interior Design",             type: "cabinet", stage: "install",    due: "2026-05-02", assignee: "TK", priority: "med",    delegated: false },
  { id: "FE-2426-177", title: "28db bej\u00e1rati ajt\u00f3",           customer: "Doorstar Hungary Zrt.",            type: "door",    stage: "delivery",   due: "2026-05-06", assignee: "KA", priority: "high",   delegated: false },
  { id: "FE-2426-176", title: "Modern konyha pultos",                  customer: "T\u00f3th Konyha & T\u00e1rsa",     type: "cabinet", stage: "sales",      due: "2026-05-12", assignee: "SA", priority: "med",    delegated: false },
  { id: "FE-2426-175", title: "Egyedi rejtett bar",                    customer: "Erdei M\u0171b\u00fator",          type: "custom",  stage: "sales",      due: "2026-05-20", assignee: "SA", priority: "low",    delegated: false },
  { id: "FE-2426-174", title: "Iroda \u00e9p\u00edt\u00e9s b\u00fator", customer: "Vella Interior Design",            type: "cabinet", stage: "sales",      due: "2026-05-22", assignee: "SA", priority: "med",    delegated: false },
  { id: "FE-2426-173", title: "Hotel szoba kit",                       customer: "Doorstar Hungary Zrt.",            type: "door",    stage: "production", due: "2026-05-18", assignee: "NJ", priority: "high",   delegated: false },
  { id: "FE-2426-172", title: "P\u00e9nz\u00fcgyi pult",                customer: "OTP Bank Zrt.",                    type: "custom",  stage: "production", due: "2026-05-10", assignee: "TK", priority: "med",    delegated: true  },
];

const WORKSTATIONS = [
  { name: "Holzma HPP380", type: "Sz\u00e9rial sz\u00e9k\u00e9ny",       category: "cutting",   status: "ok",       capacity: 88, lastService: "2026-03-14", operators: ["NJ", "KA"] },
  { name: "Biesse Selco WN6",   type: "Sz\u00e9rial sz\u00e9k\u00e9ny",  category: "cutting",   status: "ok",       capacity: 76, lastService: "2026-04-02", operators: ["TK"] },
  { name: "Homag Edge KAL",     type: "\u00c9lz\u00e1r\u00f3",            category: "edgebanding", status: "ok",     capacity: 64, lastService: "2026-03-21", operators: ["KA"] },
  { name: "Biesse Rover B",     type: "CNC megmunk.",                   category: "cnc",       status: "low",     capacity: 42, lastService: "2026-04-18", operators: ["NJ", "TK"] },
  { name: "Holzma CNC Profile", type: "CNC megmunk.",                   category: "cnc",       status: "critical", capacity: 0, lastService: "2025-11-30", operators: [] },
  { name: "Holz-Her S\u00e1ndo",type: "Furog\u00e9p",                    category: "drilling",  status: "ok",       capacity: 58, lastService: "2026-04-09", operators: ["KA"] },
];

const CATALOG_MATERIALS = [
  { name: "B\u00fckk t\u00e1bla", thicknesses: ["18mm", "22mm"], sizes: "2440\u00d71220", price: 18500, supplier: "Egger" },
  { name: "T\u00f6lgy t\u00e1bla", thicknesses: ["22mm", "40mm"], sizes: "2440\u00d71220", price: 32400, supplier: "Egger" },
  { name: "MDF feh\u00e9r", thicknesses: ["16mm", "19mm"], sizes: "2800\u00d72070", price: 8900, supplier: "Kronospan" },
  { name: "Forg\u00e1csolt csendes", thicknesses: ["18mm"], sizes: "2800\u00d72070", price: 7400, supplier: "Falco" },
];

const AUDIT_LOG = [
  { ts: "2026-04-28 09:14:22", actor: "Kov\u00e1cs P\u00e9ter", event: "order.create",      target: "JT-2426-0184", hash: "a3f4b29c", verified: true },
  { ts: "2026-04-28 09:08:11", actor: "Nagy J\u00e1nos",        event: "stage.handoff",     target: "FE-2426-183",  hash: "9e2c8d11", verified: true },
  { ts: "2026-04-28 08:42:55", actor: "T\u00f3th Kinga",         event: "production.start",  target: "CP-184-A",     hash: "f1d04b87", verified: true },
  { ts: "2026-04-27 17:21:09", actor: "Szab\u00f3 Anna",         event: "user.invite",       target: "horvath.e@",   hash: "c47a92ee", verified: true },
  { ts: "2026-04-27 16:55:30", actor: "Kov\u00e1cs P\u00e9ter", event: "settings.update",    target: "stagechain",   hash: "b8a31f04", verified: true },
  { ts: "2026-04-27 14:08:44", actor: "Nagy J\u00e1nos",        event: "stage.handoff",     target: "FE-2426-180",  hash: "5d6b7c92", verified: true },
  { ts: "2026-04-27 11:32:18", actor: "Kiss Andr\u00e1s",        event: "machine.fault",     target: "Holzma CNC",   hash: "ee198c3a", verified: true },
  { ts: "2026-04-27 10:14:02", actor: "System",                  event: "snapshot.create",   target: "FE-2426-178",  hash: "7c2d9a14", verified: true },
];

Object.assign(window, { STAGES, FLOW_EPICS, WORKSTATIONS, CATALOG_MATERIALS, AUDIT_LOG });
