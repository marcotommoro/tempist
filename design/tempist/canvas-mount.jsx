/* eslint-disable */
// Mounts redesigned screens into the DesignCanvas

const APP_W = 1440;
const APP_H = 920;

function FrameLight({ children, height = APP_H }) {
  return (
    <div className="t-light" style={{
      width: APP_W, height,
      display: "flex", flexDirection: "row",
      background: "var(--bg)",
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>{children}</div>
  );
}
function FrameDark({ children, height = APP_H }) {
  return (
    <div className="t-dark" style={{
      width: APP_W, height,
      display: "flex", flexDirection: "row",
      background: "var(--bg)",
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>{children}</div>
  );
}

// ============== Palette / Brand card ==============
function BrandCard() {
  const Sw = ({ name, hex, label, dark }) => (
    <div style={{ display:"flex", alignItems:"center", gap:14, padding:"10px 0", borderBottom:"1px solid " + (dark ? "#2D2820" : "#ECE4CF") }}>
      <div style={{ width:44, height:44, borderRadius:10, background:hex, border:"1px solid rgba(0,0,0,.08)" }} />
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:500 }}>{name}</div>
        <div className="mono" style={{ fontSize:11, color: dark ? "#8E8576" : "#6E6457" }}>{label}</div>
      </div>
      <span className="mono" style={{ fontSize:12, color: dark ? "#C8BFAB" : "#3A332B" }}>{hex}</span>
    </div>
  );

  return (
    <div className="t-light" style={{
      width: 1440, padding: "56px 64px",
      background:"var(--bg)", color:"var(--ink)", fontFamily:'"Geist", system-ui, sans-serif',
    }}>
      <div className="mono" style={{ fontSize:12, color:"var(--ink-3)", letterSpacing:".12em", marginBottom:16 }}>
        TEMPIST · VISUAL SYSTEM
      </div>
      <h1 style={{ margin:"0 0 12px", fontSize:64, fontWeight:500, letterSpacing:"-.03em", lineHeight:1 }}>
        Warmer paper, sharper signal.
      </h1>
      <p style={{ margin:"0 0 48px", fontSize:18, color:"var(--ink-2)", maxWidth:"60ch", lineHeight:1.5 }}>
        The current cream + orange has good warmth — we're keeping the spirit. The refinement is in how restrained the accents are, the spacing, and a real dark mode that doesn't just invert lightness.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:48 }}>
        {/* Light palette */}
        <div>
          <div className="mono" style={{ fontSize:11, color:"var(--accent)", letterSpacing:".1em", marginBottom:14 }}>LIGHT PALETTE</div>
          <Sw name="Background" hex="#F4EEDF" label="Warm cream — the canvas" />
          <Sw name="Surface"    hex="#FBF7EC" label="Sidebar / footer wells" />
          <Sw name="Card"       hex="#FFFFFF" label="Elevated content" />
          <Sw name="Ink"        hex="#181410" label="Primary text · headings" />
          <Sw name="Ink 2"      hex="#3A332B" label="Body" />
          <Sw name="Ink 3"      hex="#6E6457" label="Secondary · labels" />
          <Sw name="Line"       hex="#E2D9C2" label="Borders · dividers" />
        </div>
        {/* Dark palette */}
        <div className="t-dark" style={{ background:"var(--bg)", padding:24, borderRadius:14, marginTop:-24, color:"var(--ink)" }}>
          <div className="mono" style={{ fontSize:11, color:"var(--accent)", letterSpacing:".1em", marginBottom:14 }}>DARK PALETTE</div>
          <Sw name="Background" hex="#15120E" label="Deep warm" dark />
          <Sw name="Surface"    hex="#1B1813" label="Sidebar wells" dark />
          <Sw name="Card"       hex="#221E18" label="Elevated" dark />
          <Sw name="Ink"        hex="#F1E9D6" label="Primary" dark />
          <Sw name="Ink 2"      hex="#C8BFAB" label="Body" dark />
          <Sw name="Ink 3"      hex="#8E8576" label="Secondary" dark />
          <Sw name="Line"       hex="#2D2820" label="Borders" dark />
        </div>
        {/* Accents + type */}
        <div>
          <div className="mono" style={{ fontSize:11, color:"var(--accent)", letterSpacing:".1em", marginBottom:14 }}>SIGNAL · BOTH MODES</div>
          <Sw name="Accent"   hex="#D45A33" label="Terracotta · CTAs, today, brand" />
          <Sw name="Billable" hex="#5C7A4F" label="Sage · billable / success" />
          <Sw name="Info"     hex="#3F7AB8" label="Blue · clients · references" />
          <Sw name="Amber"    hex="#C49237" label="Warning · scheduled" />
          <Sw name="Pink"     hex="#C25D7A" label="Optional · project tag" />

          <div className="mono" style={{ fontSize:11, color:"var(--accent)", letterSpacing:".1em", margin:"36px 0 14px" }}>TYPE</div>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #ECE4CF" }}>
            <div style={{ fontSize:32, fontWeight:500, letterSpacing:"-.025em", lineHeight:1.1 }}>Geist 500</div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>Display · Headings</div>
          </div>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #ECE4CF" }}>
            <div style={{ fontSize:16, fontWeight:400 }}>Geist 400 — body text</div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>Body · UI</div>
          </div>
          <div style={{ padding:"10px 0", borderBottom:"1px solid #ECE4CF" }}>
            <div className="mono" style={{ fontSize:14 }}>Geist Mono · 25:40:00</div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>Tabular · timecodes</div>
          </div>
          <div style={{ padding:"10px 0" }}>
            <div style={{ fontFamily:'"Instrument Serif", serif', fontStyle:"italic", fontSize:30, color:"var(--accent)" }}>
              you actually billed
            </div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>Editorial accent (sparing)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== Mount ==============
function App() {
  return (
    <DesignCanvas title="Tempist — Redesign" subtitle="Light + dark + landing">

      <DCSection id="system" title="Visual System" subtitle="Refined palette, type, dark-mode treatment">
        <DCArtboard id="brand" label="Palette · type" width={1440} height={760}>
          <BrandCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="light" title="App · Light" subtitle="The everyday view, cleaner and more confident">
        <DCArtboard id="today-l" label="Today — daily home" width={APP_W} height={APP_H}>
          <FrameLight><Sidebar active="today" /><TodayScreen /></FrameLight>
        </DCArtboard>
        <DCArtboard id="timesheet-l" label="Timesheet" width={APP_W} height={APP_H}>
          <FrameLight><Sidebar active="timesheet" /><TimesheetScreen /></FrameLight>
        </DCArtboard>
        <DCArtboard id="reports-l" label="Reports" width={APP_W} height={APP_H}>
          <FrameLight><Sidebar active="reports" /><ReportsScreen /></FrameLight>
        </DCArtboard>
        <DCArtboard id="client-l" label="Client · Alice Italia" width={APP_W} height={APP_H}>
          <FrameLight><Sidebar active="c1" /><ClientDetailScreen /></FrameLight>
        </DCArtboard>
      </DCSection>

      <DCSection id="dark" title="App · Dark" subtitle="Warm dark, not flat black — same palette transposed">
        <DCArtboard id="today-d" label="Today — dark" width={APP_W} height={APP_H}>
          <FrameDark><Sidebar active="today" /><TodayScreen /></FrameDark>
        </DCArtboard>
        <DCArtboard id="reports-d" label="Reports — dark" width={APP_W} height={APP_H}>
          <FrameDark><Sidebar active="reports" /><ReportsScreen /></FrameDark>
        </DCArtboard>
        <DCArtboard id="timesheet-d" label="Timesheet — dark" width={APP_W} height={APP_H}>
          <FrameDark><Sidebar active="timesheet" /><TimesheetScreen /></FrameDark>
        </DCArtboard>
      </DCSection>

      <DCSection id="landing" title="Landing Page" subtitle="Marketing surface — built on the same system">
        <DCArtboard id="landing-full" label="tempist.app — full page" width={1440} height={4000}>
          <div className="t-light" style={{ width:1440, minHeight:4000 }}>
            <LandingPage />
          </div>
        </DCArtboard>
        <DCArtboard id="landing-dark" label="tempist.app — dark variant" width={1440} height={4000}>
          <div className="t-dark" style={{ width:1440, minHeight:4000 }}>
            <LandingPage />
          </div>
        </DCArtboard>
      </DCSection>

    </DesignCanvas>
  );
}

// Wait for DesignCanvas to be loaded
(function mount() {
  if (typeof DesignCanvas === "undefined" || typeof DCSection === "undefined") {
    return setTimeout(mount, 30);
  }
  const root = document.createElement("div");
  root.id = "root";
  document.body.appendChild(root);
  ReactDOM.createRoot(root).render(<App />);
})();
