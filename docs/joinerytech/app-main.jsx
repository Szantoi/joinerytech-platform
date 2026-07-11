// ──────────────────────────────────────────────────────────────────
// app-main.jsx — App gyökér + világ-router (a Portal HTML-ből kiemelve)
// A TWEAK_DEFAULTS (EDITMODE) blokk a HTML-ben él: window.TWEAK_DEFAULTS.
// ──────────────────────────────────────────────────────────────────
const { useState, useEffect } = React;

    const TWEAK_DEFAULTS = window.TWEAK_DEFAULTS; // a HTML-beli EDITMODE blokkból

    function App() {
      const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
      const sim = useSim();
      const account = sim.accounts.find(a => a.id === sim.currentAccountId) || sim.accounts[0];
      const [authed, setAuthed] = useState(false);
      const [route, setRoute] = useState({ world: tweaks.startWorld === "home" ? null : tweaks.startWorld, screen: null });

      if (!authed) {
        return (
          <div data-screen-label="Login">
            <LoginPage onLogin={() => setAuthed(true)} lang={tweaks.lang} />
            <ToastHost />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
          </div>
        );
      }
      const lang = tweaks.lang === "en" ? "en" : "hu";
      const i18n = I18N[lang];
      const tweakEnabled = tweaks.enabledModules || ["production", "mfgprep", "supervisor", "sales", "procurement", "finance", "design", "warehouse", "masterdata", "shopfloor", "settings"];
      // A fiók aktivált ablakai metszete az alkalmazás-szintű kapcsolóval
      const enabled = tweakEnabled.filter(m => account.worlds.includes(m) && WORLDS[m]);

      const enterWorld = (worldKey, screen = null) => {
        const w = WORLDS[worldKey];
        const initialScreen = screen || (w.screens[0] && w.screens[0].key) || null;
        setRoute({ world: worldKey, screen: initialScreen });
        window.scrollTo(0, 0);
      };
      // Expose global navigation so deep components (SlideOvers, etc.) can navigate worlds
      window.navigateTo = enterWorld;
      const goHome = () => setRoute({ world: null, screen: null });
      const setScreen = (s) => setRoute(r => ({ ...r, screen: s }));

      // ── B2C CUSTOMER — the webshop IS their whole experience ──
      if (account.type === "b2c") {
        const backTo = (sim.prevAccountId && sim.prevAccountId !== "acc-b2c") ? sim.prevAccountId : "acc-internal";
        const backAcct = sim.accounts.find(a => a.id === backTo);
        return (
          <div data-screen-label="Bolt · Ügyfél">
            <WebshopPortal
              onExit={() => window.sim.setAccount(backTo)}
              exitLabel={backAcct ? `Kilépés (${backAcct.name.replace(/\s*\(.*?\)/g, "")})` : "Kilépés az ügyfélnézetből"} />
            <CommHub />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
            <ToastHost />
          </div>
        );
      }

      // ── BESZÁLLÍTÓ — a beszállítói portál a teljes élménye (ugyanaz az app, más szelet) ──
      if (account.portal === "supplier") {
        const backTo = (sim.prevAccountId && sim.prevAccountId !== "acc-vendor") ? sim.prevAccountId : "acc-internal";
        const backAcct = sim.accounts.find(a => a.id === backTo);
        return (
          <div data-screen-label="Beszállítói portál">
            <SupplierPortal
              onExit={() => window.sim.setAccount(backTo)}
              exitLabel={backAcct ? `Kilépés (${backAcct.name.replace(/\s*\(.*?\)/g, "")})` : "Kilépés"}
              lang={lang} />
            <CommHub />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
            <ToastHost />
          </div>
        );
      }

      // ── SHOP (portfolio webshop) — companies browse the catalogue ──
      if (route.world === "shop") {
        return (
          <div data-screen-label="Bolt">
            <WebshopPortal onExit={goHome} />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
            <ToastHost />
          </div>
        );
      }

      // ── HOME ──
      if (!route.world) {
        return (
          <div data-screen-label="Home">
            <HomeScreen enabledModules={enabled} onEnter={enterWorld} lang={lang} />
            <ToastHost />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
          </div>
        );
      }

      // ── ÜZEM · MŰHELY-TERMINÁL — full-screen kiosk, no shell ──
      if (route.world === "shopfloor") {
        return (
          <div data-screen-label="Üzem · Műhely-terminál">
            <WorkshopTerminal onExit={goHome} lang={lang} />
            <ToastHost />
            <RootTweaks tweaks={tweaks} setTweak={setTweak} />
          </div>
        );
      }

      // ── World screens content router ──
      const screen = route.screen;
      let content = null;

      if (route.world === "production") {
        content = (
          screen === "dash"      ? <ProductionDashboard onScreen={setScreen} /> :
          screen === "schedule"  ? <ProductionSchedule /> :
          screen === "machining" ? <ProductionPage t={i18n} initialTab="machining" /> :
          screen === "manufprojects" ? <ManufacturingProjectsPage /> :
          screen === "workflow"  ? <WorkflowPage t={i18n} /> :
          screen === "analytics" ? <AnalyticsPage t={i18n} /> :
          <ProductionDashboard onScreen={setScreen} />
        );
      } else if (route.world === "mfgprep") {
        content = (
          screen === "nesting" ? <CuttingOptimizer /> :
          <MfgPrepPage />
        );
      } else if (route.world === "supervisor") {
        content = (
          screen === "dispatch"     ? <SupervisorDispatch /> :
          screen === "load"         ? <SupervisorLoad /> :
          screen === "productivity" ? <SupervisorProductivity /> :
          <SupervisorDashboard onScreen={setScreen} />
        );
      } else if (route.world === "sales") {
        content = (
          screen === "dash"      ? <SalesDashboard onScreen={setScreen} /> :
          screen === "orders"    ? <OrdersPage t={i18n} /> :
          screen === "quotes"    ? <SalesQuotes /> :
          screen === "customers" ? <SalesCustomers /> :
          <SalesDashboard onScreen={setScreen} />
        );
      } else if (route.world === "design") {
        content = (
          screen === "dash"     ? <DesignDashboard onScreen={setScreen} /> :
          screen === "configurator" ? <ConfiguratorPage /> :
          screen === "specs"    ? <SpecsPage onScreen={setScreen} /> :
          screen === "engineer" ? <EngTemplatesPage /> :
          screen === "datasheet" ? <MfgDatasheetPage /> :
          screen === "editor"   ? <TemplateEditor /> :
          screen === "generate" ? <MaterialsGenerator /> :
          screen === "catalog"  ? <WorldCatalog worldId="design" /> :
          <DesignDashboard onScreen={setScreen} />
        );
      } else if (route.world === "procurement") {
        content = (
          screen === "orders"     ? <CombinedOrdersPage t={i18n} lang={lang} /> :
          screen === "rfq"        ? <RfqPage /> :
          screen === "pricelists" ? <ProcurementV2 lang={lang} role={tweaks.procRole || "approver"} initialTab="price" /> :
          screen === "suppliermap" ? <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto">{window.SupplierMapPanel ? <window.SupplierMapPanel /> : null}</div> :
          screen === "catalog"    ? <CatalogPage lang={lang} /> :
          <ProcurementV2 lang={lang} role={tweaks.procRole || "approver"} initialTab="req" />
        );
      } else if (route.world === "finance") {
        content = (
          screen === "outgoing" ? <FinanceOutgoing /> :
          screen === "incoming" ? <FinanceIncoming /> :
          screen === "contracts" ? <FinanceContracts /> :
          screen === "payments" ? <FinancePayments /> :
          <FinanceDashboard onScreen={setScreen} />
        );
      } else if (route.world === "warehouse") {
        content = (
          screen === "dash"         ? <WarehouseDashboard onScreen={setScreen} /> :
          screen === "receiving"    ? <ReceivingPage /> :
          screen === "inventory"    ? <WarehouseInventory /> :
          screen === "withdrawals"  ? <WithdrawalsPage /> :
          screen === "stocktake"    ? <StocktakePage /> :
          screen === "movements"    ? <MovementsPage /> :
          screen === "offcuts"      ? <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"><OffcutWarehouse standalone /></div> :
          screen === "catalog"      ? <WorldCatalog worldId="warehouse" /> :
          <WarehouseDashboard onScreen={setScreen} />
        );
      } else if (route.world === "settings") {
        content = <SettingsPage t={i18n} initialTab={screen} />;
      } else if (route.world === "projects") {
        content = <ProjectsPage t={i18n} />;
      } else if (route.world === "tasks") {
        content = <TasksWorld />;
      } else if (route.world === "ai") {
        content = (
          screen === "skills"     ? <AiSkills /> :
          screen === "memory"     ? <AiMemory /> :
          screen === "playground" ? <AiPlayground /> :
          <AiAgentsBoard onScreen={setScreen} />
        );
      } else if (route.world === "logistics") {
        content = (
          screen === "deliveries" ? <ShipmentListPage dir="out" title="Kiszállítások" /> :
          screen === "pickups"    ? <ShipmentListPage dir="in" title="Beszállítások" /> :
          screen === "schedule"   ? <LogisticsSchedule /> :
          screen === "terminal"   ? <DriverTerminal /> :
          screen === "resources"  ? <ResourcesPanel /> :
          <LogisticsDashboard onScreen={setScreen} />
        );
      } else if (route.world === "kontrolling") {
        content = (
          screen === "dash"     ? <ControllingDashboard onScreen={setScreen} /> :
          screen === "projects" ? <ControllingProjects /> :
          screen === "variance" ? <ControllingVariance /> :
          screen === "postcalc" ? <ControllingPostCalc /> :
          <ExecCockpit onScreen={setScreen} />
        );
      } else if (route.world === "service") {
        content = (
          screen === "tickets" ? <ServiceTickets /> :
          screen === "board"   ? <ServiceBoard /> :
          <ServiceDashboard onScreen={setScreen} />
        );
      } else if (route.world === "crm") {
        content = (
          screen === "pipeline" ? <CrmPipeline /> :
          screen === "leads"    ? <CrmLeads /> :
          screen === "opps"     ? <CrmOpps /> :
          screen === "tasks"    ? <CrmTasks /> :
          screen === "forecast" ? <CrmForecast /> :
          <CrmDashboard onScreen={setScreen} />
        );
      } else if (route.world === "quality") {
        content = (
          screen === "inspections" ? <QualityInspections /> :
          screen === "board"       ? <QualityBoard /> :
          <QualityDashboard onScreen={setScreen} />
        );
      } else if (route.world === "ehs") {
        content = (
          screen === "incidents" ? <EhsIncidents /> :
          screen === "risks"     ? <EhsRisks /> :
          screen === "training"  ? <EhsTraining /> :
          <EhsDashboard onScreen={setScreen} />
        );
      } else if (route.world === "docs") {
        content = (
          screen === "all" ? <DocsAll /> :
          <DocsDashboard onScreen={setScreen} />
        );
      } else if (route.world === "attendance") {
        content = (
          screen === "terminal"  ? <AttendanceTerminal /> :
          screen === "timesheet" ? <AttendanceTimesheet /> :
          <AttendanceDashboard onScreen={setScreen} />
        );
      } else if (route.world === "hr") {
        content = (
          screen === "people"   ? <HrPeople /> :
          screen === "capacity" ? <HrCapacity /> :
          screen === "absence"  ? <HrAbsence /> :
          screen === "skills"   ? <HrSkills /> :
          <HrDashboard onScreen={setScreen} />
        );
      } else if (route.world === "maintenance") {
        content = (
          screen === "assets"     ? <AssetRegistry /> :
          screen === "workorders" ? <MaintWorkOrders /> :
          screen === "schedule"   ? <MaintSchedule /> :
          screen === "downtime"   ? <DowntimeLog /> :
          <MaintDashboard onScreen={setScreen} />
        );
      } else if (route.world === "masterdata") {
        content = (
          screen === "approvals" ? <CatalogApprovals /> :
          <div className="px-4 md:px-7 py-5 md:py-6 max-w-[1400px] mx-auto"><CatalogPanel /></div>
        );
      } else if (route.world === "interior") {
        content = (
          screen === "dash"      ? <InteriorDashboard onScreen={setScreen} /> :
          screen === "concepts"  ? <InteriorConcepts /> :
          screen === "composition" ? <CompositionsPage /> :
          screen === "catalog"   ? <WorldCatalog worldId="interior" /> :
          screen === "trades"    ? <InteriorTrades /> :
          screen === "floorplan" ? <FloorplanStudio /> :
          screen === "assembly"  ? <ProjAssemblyPage /> :
          <InteriorDashboard onScreen={setScreen} />
        );
      } else if (route.world === "trade") {
        content = (
          screen === "counter" ? <TradeCounter /> :
          screen === "cutting" ? <TradeCutting /> :
          screen === "pricing" ? <TradePricing /> :
          <TradeDashboard onScreen={setScreen} />
        );
      }

      return (
        <div data-screen-label={"Portal — " + (lang === "en" ? WORLDS[route.world].en : WORLDS[route.world].hu)}>
          <WorldShell world={route.world} screen={screen} onScreen={setScreen} onHome={goHome} lang={lang} t={i18n}>
            {content}
          </WorldShell>
          <ToastHost />
          <RootTweaks tweaks={tweaks} setTweak={setTweak} />
        </div>
      );
    }

    function RootTweaks({ tweaks, setTweak }) {
      const enabled = tweaks.enabledModules || [];
      const allMods = [
        { key: "tasks",      label: "Feladataim" },
        { key: "production", label: "Gyártás" },
        { key: "mfgprep",    label: "Gyártás-előkészítés" },
        { key: "supervisor", label: "Üzemvezető" },
        { key: "sales",      label: "Értékesítés" },
        { key: "procurement",label: "Beszerzés" },
        { key: "finance",    label: "Pénzügy" },
        { key: "kontrolling",label: "Kontrolling" },
        { key: "service",    label: "Reklamáció" },
        { key: "crm",        label: "CRM / Pipeline" },
        { key: "quality",    label: "Minőség" },
        { key: "ehs",        label: "Munkavédelem" },
        { key: "docs",       label: "Dokumentumtár" },
        { key: "attendance", label: "Idő & jelenlét" },
        { key: "hr",         label: "HR / Kapacitás" },
        { key: "maintenance",label: "Karbantartás" },
        { key: "design",     label: "Tervezés" },
        { key: "interior",   label: "Belsőépítészet" },
        { key: "projects",   label: "Projektek" },
        { key: "logistics",  label: "Logisztika" },
        { key: "hr",         label: "HR / Kapacitás" },
        { key: "maintenance",label: "Karbantartás" },
        { key: "masterdata", label: "Törzsadat" },
        { key: "warehouse",  label: "Raktár" },
        { key: "shopfloor",  label: "Üzem" },
        { key: "shop",       label: "Bolt" },
        { key: "trade",      label: "Kereskedelem" },
        { key: "ai",         label: "AI munkaterület" },
        { key: "settings",   label: "Beállítások" },
      ];
      const toggleMod = (key) => {
        const next = enabled.includes(key) ? enabled.filter(k => k !== key) : [...enabled, key];
        setTweak("enabledModules", next);
      };
      return (
        <TweaksPanel>
          <TweakSection label="Megjelenítés" />
          <TweakRadio
            label="Nyelv"
            value={tweaks.lang}
            options={[{ value: "hu", label: "HU" }, { value: "en", label: "EN" }]}
            onChange={(v) => setTweak("lang", v)}
          />
          <TweakSection label="Beszerzés v2 — szerepkör" />
          <TweakRadio
            label="Szerepkör"
            value={tweaks.procRole || "approver"}
            options={[{ value: "requester", label: "Igénylő" }, { value: "approver", label: "Jóváhagyó" }]}
            onChange={(v) => setTweak("procRole", v)}
          />
          <div style={{ fontSize: 10.5, color: "#a8a29e", padding: "0 12px 8px", lineHeight: 1.4 }}>
            SoD tiltás: jóváhagyó nem egyezhet az igénylővel / rögzítővel. PR-2426-027 és SINV-2426-039 demo esetekben Kovács Péter mindkét szerepkörben szerepel.
          </div>
          <TweakSection label="Engedélyezett modulok" />
          <div style={{ display: "grid", gap: 6, padding: "0 12px 8px" }}>
            {allMods.map(m => (
              <label key={m.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", color: "#44403c" }}>
                <input type="checkbox" checked={enabled.includes(m.key)} onChange={() => toggleMod(m.key)} />
                <span>{m.label}</span>
              </label>
            ))}
            <div style={{ fontSize: 10.5, color: "#a8a29e", marginTop: 4, lineHeight: 1.4 }}>
              A Home-on csak az engedélyezett modulok kártyái jelennek meg.
            </div>
          </div>
          <SimTweaks />
        </TweaksPanel>
      );
    }

    function SimTweaks() {
      const sim = useSim();
      return (
        <>
          <TweakSection label="Szimuláció" />
          <TweakToggle label="Folyamat-események üzenetként" value={sim.settings.eventMessages}
            onChange={(v) => window.sim.setEventMessages(v)} />
          <div style={{ fontSize: 10.5, color: "#a8a29e", padding: "0 12px 8px", lineHeight: 1.4 }}>
            Ha be van kapcsolva, a rendszer üzenetet posztol a Csapat hubba (pl. ajánlatból rendelés, gyártásba adás, alacsony készlet).
          </div>
          <div style={{ padding: "0 12px 10px" }}>
            <TweakButton label="Demó visszaállítása" secondary onClick={() => window.sim.reset()} />
          </div>
        </>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<CommHubProvider><App /></CommHubProvider>);
