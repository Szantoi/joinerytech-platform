/* AUTO-GENERATED from app-main.jsx — NE SZERKESZD, a forrás a .jsx! */
(function(){
// ──────────────────────────────────────────────────────────────────
// app-main.jsx — App gyökér + világ-router (a Portal HTML-ből kiemelve)
// A TWEAK_DEFAULTS (EDITMODE) blokk a HTML-ben él: window.TWEAK_DEFAULTS.
// ──────────────────────────────────────────────────────────────────
const {
  useState,
  useEffect
} = React;
const TWEAK_DEFAULTS = window.TWEAK_DEFAULTS; // a HTML-beli EDITMODE blokkból

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const sim = useSim();
  const account = sim.accounts.find(a => a.id === sim.currentAccountId) || sim.accounts[0];
  const [authed, setAuthed] = useState(false);
  const [route, setRoute] = useState({
    world: tweaks.startWorld === "home" ? null : tweaks.startWorld,
    screen: null
  });
  if (!authed) {
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "Login"
    }, /*#__PURE__*/React.createElement(LoginPage, {
      onLogin: () => setAuthed(true),
      lang: tweaks.lang
    }), /*#__PURE__*/React.createElement(ToastHost, null), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }));
  }
  const lang = tweaks.lang === "en" ? "en" : "hu";
  const i18n = I18N[lang];
  const tweakEnabled = tweaks.enabledModules || ["production", "mfgprep", "supervisor", "sales", "procurement", "finance", "design", "warehouse", "masterdata", "shopfloor", "settings"];
  // A fiók aktivált ablakai metszete az alkalmazás-szintű kapcsolóval
  const enabled = tweakEnabled.filter(m => account.worlds.includes(m) && WORLDS[m]);
  const enterWorld = (worldKey, screen = null) => {
    const w = WORLDS[worldKey];
    const initialScreen = screen || w.screens[0] && w.screens[0].key || null;
    setRoute({
      world: worldKey,
      screen: initialScreen
    });
    window.scrollTo(0, 0);
  };
  // Expose global navigation so deep components (SlideOvers, etc.) can navigate worlds
  window.navigateTo = enterWorld;
  const goHome = () => setRoute({
    world: null,
    screen: null
  });
  const setScreen = s => setRoute(r => ({
    ...r,
    screen: s
  }));

  // ── B2C CUSTOMER — the webshop IS their whole experience ──
  if (account.type === "b2c") {
    const backTo = sim.prevAccountId && sim.prevAccountId !== "acc-b2c" ? sim.prevAccountId : "acc-internal";
    const backAcct = sim.accounts.find(a => a.id === backTo);
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "Bolt \xB7 \xDCgyf\xE9l"
    }, /*#__PURE__*/React.createElement(WebshopPortal, {
      onExit: () => window.sim.setAccount(backTo),
      exitLabel: backAcct ? `Kilépés (${backAcct.name.replace(/\s*\(.*?\)/g, "")})` : "Kilépés az ügyfélnézetből"
    }), /*#__PURE__*/React.createElement(CommHub, null), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }), /*#__PURE__*/React.createElement(ToastHost, null));
  }

  // ── BESZÁLLÍTÓ — a beszállítói portál a teljes élménye (ugyanaz az app, más szelet) ──
  if (account.portal === "supplier") {
    const backTo = sim.prevAccountId && sim.prevAccountId !== "acc-vendor" ? sim.prevAccountId : "acc-internal";
    const backAcct = sim.accounts.find(a => a.id === backTo);
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "Besz\xE1ll\xEDt\xF3i port\xE1l"
    }, /*#__PURE__*/React.createElement(SupplierPortal, {
      onExit: () => window.sim.setAccount(backTo),
      exitLabel: backAcct ? `Kilépés (${backAcct.name.replace(/\s*\(.*?\)/g, "")})` : "Kilépés",
      lang: lang
    }), /*#__PURE__*/React.createElement(CommHub, null), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }), /*#__PURE__*/React.createElement(ToastHost, null));
  }

  // ── SHOP (portfolio webshop) — companies browse the catalogue ──
  if (route.world === "shop") {
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "Bolt"
    }, /*#__PURE__*/React.createElement(WebshopPortal, {
      onExit: goHome
    }), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }), /*#__PURE__*/React.createElement(ToastHost, null));
  }

  // ── HOME ──
  if (!route.world) {
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "Home"
    }, /*#__PURE__*/React.createElement(HomeScreen, {
      enabledModules: enabled,
      onEnter: enterWorld,
      lang: lang
    }), /*#__PURE__*/React.createElement(ToastHost, null), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }));
  }

  // ── ÜZEM · MŰHELY-TERMINÁL — full-screen kiosk, no shell ──
  if (route.world === "shopfloor") {
    return /*#__PURE__*/React.createElement("div", {
      "data-screen-label": "\xDCzem \xB7 M\u0171hely-termin\xE1l"
    }, /*#__PURE__*/React.createElement(WorkshopTerminal, {
      onExit: goHome,
      lang: lang
    }), /*#__PURE__*/React.createElement(ToastHost, null), /*#__PURE__*/React.createElement(RootTweaks, {
      tweaks: tweaks,
      setTweak: setTweak
    }));
  }

  // ── World screens content router ──
  const screen = route.screen;
  let content = null;
  if (route.world === "production") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(ProductionDashboard, {
      onScreen: setScreen
    }) : screen === "schedule" ? /*#__PURE__*/React.createElement(ProductionSchedule, null) : screen === "machining" ? /*#__PURE__*/React.createElement(ProductionPage, {
      t: i18n,
      initialTab: "machining"
    }) : screen === "manufprojects" ? /*#__PURE__*/React.createElement(ManufacturingProjectsPage, null) : screen === "workflow" ? /*#__PURE__*/React.createElement(WorkflowPage, {
      t: i18n
    }) : screen === "analytics" ? /*#__PURE__*/React.createElement(AnalyticsPage, {
      t: i18n
    }) : /*#__PURE__*/React.createElement(ProductionDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "mfgprep") {
    content = screen === "nesting" ? /*#__PURE__*/React.createElement(CuttingOptimizer, null) : /*#__PURE__*/React.createElement(MfgPrepPage, null);
  } else if (route.world === "supervisor") {
    content = screen === "dispatch" ? /*#__PURE__*/React.createElement(SupervisorDispatch, null) : screen === "load" ? /*#__PURE__*/React.createElement(SupervisorLoad, null) : screen === "productivity" ? /*#__PURE__*/React.createElement(SupervisorProductivity, null) : /*#__PURE__*/React.createElement(SupervisorDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "sales") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(SalesDashboard, {
      onScreen: setScreen
    }) : screen === "orders" ? /*#__PURE__*/React.createElement(OrdersPage, {
      t: i18n
    }) : screen === "quotes" ? /*#__PURE__*/React.createElement(SalesQuotes, null) : screen === "customers" ? /*#__PURE__*/React.createElement(SalesCustomers, null) : /*#__PURE__*/React.createElement(SalesDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "design") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(DesignDashboard, {
      onScreen: setScreen
    }) : screen === "configurator" ? /*#__PURE__*/React.createElement(ConfiguratorPage, null) : screen === "specs" ? /*#__PURE__*/React.createElement(SpecsPage, {
      onScreen: setScreen
    }) : screen === "engineer" ? /*#__PURE__*/React.createElement(EngTemplatesPage, null) : screen === "datasheet" ? /*#__PURE__*/React.createElement(MfgDatasheetPage, null) : screen === "editor" ? /*#__PURE__*/React.createElement(TemplateEditor, null) : screen === "generate" ? /*#__PURE__*/React.createElement(MaterialsGenerator, null) : screen === "catalog" ? /*#__PURE__*/React.createElement(WorldCatalog, {
      worldId: "design"
    }) : /*#__PURE__*/React.createElement(DesignDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "procurement") {
    content = screen === "orders" ? /*#__PURE__*/React.createElement(CombinedOrdersPage, {
      t: i18n,
      lang: lang
    }) : screen === "rfq" ? /*#__PURE__*/React.createElement(RfqPage, null) : screen === "pricelists" ? /*#__PURE__*/React.createElement(ProcurementV2, {
      lang: lang,
      role: tweaks.procRole || "approver",
      initialTab: "price"
    }) : screen === "suppliermap" ? /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
    }, window.SupplierMapPanel ? /*#__PURE__*/React.createElement(window.SupplierMapPanel, null) : null) : screen === "catalog" ? /*#__PURE__*/React.createElement(CatalogPage, {
      lang: lang
    }) : /*#__PURE__*/React.createElement(ProcurementV2, {
      lang: lang,
      role: tweaks.procRole || "approver",
      initialTab: "req"
    });
  } else if (route.world === "finance") {
    content = screen === "outgoing" ? /*#__PURE__*/React.createElement(FinanceOutgoing, null) : screen === "incoming" ? /*#__PURE__*/React.createElement(FinanceIncoming, null) : screen === "contracts" ? /*#__PURE__*/React.createElement(FinanceContracts, null) : screen === "payments" ? /*#__PURE__*/React.createElement(FinancePayments, null) : /*#__PURE__*/React.createElement(FinanceDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "warehouse") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(WarehouseDashboard, {
      onScreen: setScreen
    }) : screen === "receiving" ? /*#__PURE__*/React.createElement(ReceivingPage, null) : screen === "inventory" ? /*#__PURE__*/React.createElement(WarehouseInventory, null) : screen === "withdrawals" ? /*#__PURE__*/React.createElement(WithdrawalsPage, null) : screen === "stocktake" ? /*#__PURE__*/React.createElement(StocktakePage, null) : screen === "movements" ? /*#__PURE__*/React.createElement(MovementsPage, null) : screen === "offcuts" ? /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
    }, /*#__PURE__*/React.createElement(OffcutWarehouse, {
      standalone: true
    })) : screen === "catalog" ? /*#__PURE__*/React.createElement(WorldCatalog, {
      worldId: "warehouse"
    }) : /*#__PURE__*/React.createElement(WarehouseDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "settings") {
    content = /*#__PURE__*/React.createElement(SettingsPage, {
      t: i18n,
      initialTab: screen
    });
  } else if (route.world === "projects") {
    content = /*#__PURE__*/React.createElement(ProjectsPage, {
      t: i18n
    });
  } else if (route.world === "tasks") {
    content = /*#__PURE__*/React.createElement(TasksWorld, null);
  } else if (route.world === "ai") {
    content = screen === "skills" ? /*#__PURE__*/React.createElement(AiSkills, null) : screen === "memory" ? /*#__PURE__*/React.createElement(AiMemory, null) : screen === "playground" ? /*#__PURE__*/React.createElement(AiPlayground, null) : /*#__PURE__*/React.createElement(AiAgentsBoard, {
      onScreen: setScreen
    });
  } else if (route.world === "logistics") {
    content = screen === "deliveries" ? /*#__PURE__*/React.createElement(ShipmentListPage, {
      dir: "out",
      title: "Kisz\xE1ll\xEDt\xE1sok"
    }) : screen === "pickups" ? /*#__PURE__*/React.createElement(ShipmentListPage, {
      dir: "in",
      title: "Besz\xE1ll\xEDt\xE1sok"
    }) : screen === "schedule" ? /*#__PURE__*/React.createElement(LogisticsSchedule, null) : screen === "terminal" ? /*#__PURE__*/React.createElement(DriverTerminal, null) : screen === "resources" ? /*#__PURE__*/React.createElement(ResourcesPanel, null) : /*#__PURE__*/React.createElement(LogisticsDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "kontrolling") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(ControllingDashboard, {
      onScreen: setScreen
    }) : screen === "projects" ? /*#__PURE__*/React.createElement(ControllingProjects, null) : screen === "variance" ? /*#__PURE__*/React.createElement(ControllingVariance, null) : screen === "postcalc" ? /*#__PURE__*/React.createElement(ControllingPostCalc, null) : /*#__PURE__*/React.createElement(ExecCockpit, {
      onScreen: setScreen
    });
  } else if (route.world === "service") {
    content = screen === "tickets" ? /*#__PURE__*/React.createElement(ServiceTickets, null) : screen === "board" ? /*#__PURE__*/React.createElement(ServiceBoard, null) : /*#__PURE__*/React.createElement(ServiceDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "crm") {
    content = screen === "pipeline" ? /*#__PURE__*/React.createElement(CrmPipeline, null) : screen === "leads" ? /*#__PURE__*/React.createElement(CrmLeads, null) : screen === "opps" ? /*#__PURE__*/React.createElement(CrmOpps, null) : screen === "tasks" ? /*#__PURE__*/React.createElement(CrmTasks, null) : screen === "forecast" ? /*#__PURE__*/React.createElement(CrmForecast, null) : /*#__PURE__*/React.createElement(CrmDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "quality") {
    content = screen === "inspections" ? /*#__PURE__*/React.createElement(QualityInspections, null) : screen === "board" ? /*#__PURE__*/React.createElement(QualityBoard, null) : /*#__PURE__*/React.createElement(QualityDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "ehs") {
    content = screen === "incidents" ? /*#__PURE__*/React.createElement(EhsIncidents, null) : screen === "risks" ? /*#__PURE__*/React.createElement(EhsRisks, null) : screen === "training" ? /*#__PURE__*/React.createElement(EhsTraining, null) : /*#__PURE__*/React.createElement(EhsDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "docs") {
    content = screen === "all" ? /*#__PURE__*/React.createElement(DocsAll, null) : /*#__PURE__*/React.createElement(DocsDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "attendance") {
    content = screen === "terminal" ? /*#__PURE__*/React.createElement(AttendanceTerminal, null) : screen === "timesheet" ? /*#__PURE__*/React.createElement(AttendanceTimesheet, null) : /*#__PURE__*/React.createElement(AttendanceDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "hr") {
    content = screen === "people" ? /*#__PURE__*/React.createElement(HrPeople, null) : screen === "capacity" ? /*#__PURE__*/React.createElement(HrCapacity, null) : screen === "absence" ? /*#__PURE__*/React.createElement(HrAbsence, null) : screen === "skills" ? /*#__PURE__*/React.createElement(HrSkills, null) : /*#__PURE__*/React.createElement(HrDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "maintenance") {
    content = screen === "assets" ? /*#__PURE__*/React.createElement(AssetRegistry, null) : screen === "workorders" ? /*#__PURE__*/React.createElement(MaintWorkOrders, null) : screen === "schedule" ? /*#__PURE__*/React.createElement(MaintSchedule, null) : screen === "downtime" ? /*#__PURE__*/React.createElement(DowntimeLog, null) : /*#__PURE__*/React.createElement(MaintDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "masterdata") {
    content = screen === "approvals" ? /*#__PURE__*/React.createElement(CatalogApprovals, null) : /*#__PURE__*/React.createElement("div", {
      className: "px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"
    }, /*#__PURE__*/React.createElement(CatalogPanel, null));
  } else if (route.world === "interior") {
    content = screen === "dash" ? /*#__PURE__*/React.createElement(InteriorDashboard, {
      onScreen: setScreen
    }) : screen === "concepts" ? /*#__PURE__*/React.createElement(InteriorConcepts, null) : screen === "composition" ? /*#__PURE__*/React.createElement(CompositionsPage, null) : screen === "catalog" ? /*#__PURE__*/React.createElement(WorldCatalog, {
      worldId: "interior"
    }) : screen === "trades" ? /*#__PURE__*/React.createElement(InteriorTrades, null) : screen === "floorplan" ? /*#__PURE__*/React.createElement(FloorplanStudio, null) : screen === "assembly" ? /*#__PURE__*/React.createElement(ProjAssemblyPage, null) : /*#__PURE__*/React.createElement(InteriorDashboard, {
      onScreen: setScreen
    });
  } else if (route.world === "trade") {
    content = screen === "counter" ? /*#__PURE__*/React.createElement(TradeCounter, null) : screen === "cutting" ? /*#__PURE__*/React.createElement(TradeCutting, null) : screen === "pricing" ? /*#__PURE__*/React.createElement(TradePricing, null) : /*#__PURE__*/React.createElement(TradeDashboard, {
      onScreen: setScreen
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    "data-screen-label": "Portal — " + (lang === "en" ? WORLDS[route.world].en : WORLDS[route.world].hu)
  }, /*#__PURE__*/React.createElement(WorldShell, {
    world: route.world,
    screen: screen,
    onScreen: setScreen,
    onHome: goHome,
    lang: lang,
    t: i18n
  }, content), /*#__PURE__*/React.createElement(ToastHost, null), /*#__PURE__*/React.createElement(RootTweaks, {
    tweaks: tweaks,
    setTweak: setTweak
  }));
}
function RootTweaks({
  tweaks,
  setTweak
}) {
  const enabled = tweaks.enabledModules || [];
  const allMods = [{
    key: "tasks",
    label: "Feladataim"
  }, {
    key: "production",
    label: "Gyártás"
  }, {
    key: "mfgprep",
    label: "Gyártás-előkészítés"
  }, {
    key: "supervisor",
    label: "Üzemvezető"
  }, {
    key: "sales",
    label: "Értékesítés"
  }, {
    key: "procurement",
    label: "Beszerzés"
  }, {
    key: "finance",
    label: "Pénzügy"
  }, {
    key: "kontrolling",
    label: "Kontrolling"
  }, {
    key: "service",
    label: "Reklamáció"
  }, {
    key: "crm",
    label: "CRM / Pipeline"
  }, {
    key: "quality",
    label: "Minőség"
  }, {
    key: "ehs",
    label: "Munkavédelem"
  }, {
    key: "docs",
    label: "Dokumentumtár"
  }, {
    key: "attendance",
    label: "Idő & jelenlét"
  }, {
    key: "hr",
    label: "HR / Kapacitás"
  }, {
    key: "maintenance",
    label: "Karbantartás"
  }, {
    key: "design",
    label: "Tervezés"
  }, {
    key: "interior",
    label: "Belsőépítészet"
  }, {
    key: "projects",
    label: "Projektek"
  }, {
    key: "logistics",
    label: "Logisztika"
  }, {
    key: "hr",
    label: "HR / Kapacitás"
  }, {
    key: "maintenance",
    label: "Karbantartás"
  }, {
    key: "masterdata",
    label: "Törzsadat"
  }, {
    key: "warehouse",
    label: "Raktár"
  }, {
    key: "shopfloor",
    label: "Üzem"
  }, {
    key: "shop",
    label: "Bolt"
  }, {
    key: "trade",
    label: "Kereskedelem"
  }, {
    key: "ai",
    label: "AI munkaterület"
  }, {
    key: "settings",
    label: "Beállítások"
  }];
  const toggleMod = key => {
    const next = enabled.includes(key) ? enabled.filter(k => k !== key) : [...enabled, key];
    setTweak("enabledModules", next);
  };
  return /*#__PURE__*/React.createElement(TweaksPanel, null, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Megjelen\xEDt\xE9s"
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Nyelv",
    value: tweaks.lang,
    options: [{
      value: "hu",
      label: "HU"
    }, {
      value: "en",
      label: "EN"
    }],
    onChange: v => setTweak("lang", v)
  }), /*#__PURE__*/React.createElement(TweakSection, {
    label: "Beszerz\xE9s v2 \u2014 szerepk\xF6r"
  }), /*#__PURE__*/React.createElement(TweakRadio, {
    label: "Szerepk\xF6r",
    value: tweaks.procRole || "approver",
    options: [{
      value: "requester",
      label: "Igénylő"
    }, {
      value: "approver",
      label: "Jóváhagyó"
    }],
    onChange: v => setTweak("procRole", v)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: "#a8a29e",
      padding: "0 12px 8px",
      lineHeight: 1.4
    }
  }, "SoD tilt\xE1s: j\xF3v\xE1hagy\xF3 nem egyezhet az ig\xE9nyl\u0151vel / r\xF6gz\xEDt\u0151vel. PR-2426-027 \xE9s SINV-2426-039 demo esetekben Kov\xE1cs P\xE9ter mindk\xE9t szerepk\xF6rben szerepel."), /*#__PURE__*/React.createElement(TweakSection, {
    label: "Enged\xE9lyezett modulok"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 6,
      padding: "0 12px 8px"
    }
  }, allMods.map(m => /*#__PURE__*/React.createElement("label", {
    key: m.key,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      cursor: "pointer",
      color: "#44403c"
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: enabled.includes(m.key),
    onChange: () => toggleMod(m.key)
  }), /*#__PURE__*/React.createElement("span", null, m.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: "#a8a29e",
      marginTop: 4,
      lineHeight: 1.4
    }
  }, "A Home-on csak az enged\xE9lyezett modulok k\xE1rty\xE1i jelennek meg.")), /*#__PURE__*/React.createElement(SimTweaks, null));
}
function SimTweaks() {
  const sim = useSim();
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TweakSection, {
    label: "Szimul\xE1ci\xF3"
  }), /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Folyamat-esem\xE9nyek \xFCzenetk\xE9nt",
    value: sim.settings.eventMessages,
    onChange: v => window.sim.setEventMessages(v)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10.5,
      color: "#a8a29e",
      padding: "0 12px 8px",
      lineHeight: 1.4
    }
  }, "Ha be van kapcsolva, a rendszer \xFCzenetet posztol a Csapat hubba (pl. aj\xE1nlatb\xF3l rendel\xE9s, gy\xE1rt\xE1sba ad\xE1s, alacsony k\xE9szlet)."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "0 12px 10px"
    }
  }, /*#__PURE__*/React.createElement(TweakButton, {
    label: "Dem\xF3 vissza\xE1ll\xEDt\xE1sa",
    secondary: true,
    onClick: () => window.sim.reset()
  })));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(CommHubProvider, null, /*#__PURE__*/React.createElement(App, null)));
})();
