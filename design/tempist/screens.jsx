/* eslint-disable */
// Tempist — redesigned app screens (light + dark, shared components)

const ICON_STROKE = 1.6;

// ---------- Icons ----------
const Icon = ({ d, size = 16, fill = "none", sw = ICON_STROKE }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);
const I = {
  today:    <Icon d="M8 2v4M16 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />,
  inbox:    <Icon d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />,
  upcoming: <Icon d={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" /></>} />,
  proj:     <Icon d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />,
  clients:  <Icon d={<><circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16.5 8.5a3 3 0 1 0 0-1M21 20a5 5 0 0 0-4.5-4.97"/></>} />,
  filter:   <Icon d="M3 5h18l-7 9v6l-4-2v-4z" />,
  clock:    <Icon d={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>} />,
  reports:  <Icon d="M3 21V9m6 12V3m6 18v-7m6 7V11" />,
  settings: <Icon d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h0a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9V9c0 .67.39 1.27 1 1.51H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z"/></>} />,
  search:   <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>} />,
  bell:     <Icon d={<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></>} />,
  play:     <Icon d={<><path d="M6 4v16l14-8z" fill="currentColor" strokeWidth="0"/></>} />,
  plus:     <Icon d="M12 5v14M5 12h14" />,
  chev:     <Icon d="m6 9 6 6 6-6" />,
  chevR:    <Icon d="m9 6 6 6-6 6" />,
  chevL:    <Icon d="m15 6-6 6 6 6" />,
  chevSel:  <Icon d="m7 9 5-5 5 5M7 15l5 5 5-5" />,
  download: <Icon d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
  print:    <Icon d={<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></>} />,
  edit:     <Icon d={<><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></>} />,
  moon:     <Icon d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  sun:      <Icon d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>} />,
  arrow:    <Icon d="M5 12h14m-4-4 4 4-4 4" />,
  more:     <Icon d={<><circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/></>} sw="0" />,
  check:    <Icon d="m5 12 4 4L20 5" />,
  pause:    <Icon d={<><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" strokeWidth="0"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" strokeWidth="0"/></>} />,
  bolt:     <Icon d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};

// =====================================================================
// Sidebar
// =====================================================================
function Sidebar({ active = "today" }) {
  const Item = ({ id, icon, label, badge, color }) => {
    const on = id === active;
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "7px 10px",
        borderRadius: 8, fontSize: 14, fontWeight: 450,
        color: on ? "var(--ink)" : "var(--ink-2)",
        background: on ? "var(--hover)" : "transparent",
        position: "relative", cursor: "default",
      }}>
        {on && <div style={{ position:"absolute", left:-12, top:6, bottom:6, width:2, borderRadius:2, background:"var(--accent)" }} />}
        {icon && <span style={{ display:"flex", color: on ? "var(--ink)" : "var(--ink-3)" }}>{icon}</span>}
        {color && <span style={{ width:8, height:8, borderRadius:99, background: color }} />}
        <span style={{ flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</span>
        {badge != null && <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>{badge}</span>}
      </div>
    );
  };

  const SectionLabel = ({ children, right }) => (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"18px 10px 6px", fontSize:11, fontWeight:500, letterSpacing:".08em",
      color:"var(--ink-3)", textTransform:"uppercase",
    }}>
      <span>{children}</span>
      {right}
    </div>
  );

  return (
    <aside style={{
      width: 252, flex:"0 0 252px", background: "var(--surface)",
      borderRight: "1px solid var(--line)", display:"flex", flexDirection:"column",
      padding: "14px 12px", gap: 2,
    }}>
      {/* Workspace switcher */}
      <button style={{
        all:"unset", display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
        borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
        cursor:"default", marginBottom:8,
      }}>
        <div style={{
          width:28, height:28, borderRadius:7, background:"var(--ink)", color:"var(--surface)",
          display:"grid", placeItems:"center", fontSize:13, fontWeight:600, letterSpacing:"-.02em",
        }}>P</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:550, lineHeight:1.1 }}>Personal</div>
          <div className="mono" style={{ fontSize:10.5, color:"var(--ink-3)", marginTop:2 }}>OWNER · 3 PROJECTS</div>
        </div>
        <span style={{ color:"var(--ink-3)" }}>{I.chevSel}</span>
      </button>

      {/* Quick search */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"7px 10px",
        borderRadius:8, border:"1px solid var(--line)", background:"transparent",
        marginBottom: 10,
      }}>
        <span style={{ color:"var(--ink-3)" }}>{I.search}</span>
        <span style={{ fontSize:13, color:"var(--ink-3)", flex:1 }}>Search…</span>
        <span className="mono" style={{ fontSize:10.5, color:"var(--mute)", padding:"1px 5px", border:"1px solid var(--line)", borderRadius:4 }}>⌘K</span>
      </div>

      <Item id="today"    icon={I.today}    label="Today"    badge={3} />
      <Item id="inbox"    icon={I.inbox}    label="Inbox"    badge={1} />
      <Item id="upcoming" icon={I.upcoming} label="Upcoming" />

      <SectionLabel right={<span style={{ color:"var(--ink-3)", cursor:"default" }}>{I.plus}</span>}>Projects</SectionLabel>
      <Item id="p1" color="#D45A33" label="Tempist"      badge="12h" />
      <Item id="p2" color="#C49237" label="Showupp"      badge="4h" />
      <Item id="p3" color="#3F7AB8" label="App estintori" badge="2h" />

      <SectionLabel right={<span style={{ color:"var(--ink-3)", cursor:"default" }}>{I.plus}</span>}>Clients</SectionLabel>
      <Item id="c1" color="#3F7AB8" label="Alice Italia"  badge="25.6h" />
      <Item id="c2" color="#5C7A4F" label="Studio Indaco" badge="0h" />

      <SectionLabel>Workspace</SectionLabel>
      <Item id="filters"   icon={I.filter}   label="Filters" />
      <Item id="timesheet" icon={I.clock}    label="Timesheet" />
      <Item id="reports"   icon={I.reports}  label="Reports" />
      <Item id="settings"  icon={I.settings} label="Settings" />

      <div style={{ flex:1 }} />

      {/* Account footer */}
      <div style={{
        display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
        borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
      }}>
        <div style={{
          width:28, height:28, borderRadius:99, background:"var(--accent-soft)",
          color:"var(--accent-2)", display:"grid", placeItems:"center", fontSize:12, fontWeight:600,
        }}>MA</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:500, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>marco@ranghieri.com</div>
          <div className="mono" style={{ fontSize:10.5, color:"var(--ink-3)", marginTop:2 }}>FREE PLAN</div>
        </div>
        <span style={{ color:"var(--ink-3)", padding:4 }}>{I.sun}</span>
      </div>
    </aside>
  );
}

// =====================================================================
// Top bar
// =====================================================================
function TopBar({ runningTimer = null }) {
  return (
    <header style={{
      display:"flex", alignItems:"center", gap:12, height:60, flex:"0 0 60px",
      borderBottom:"1px solid var(--line)", padding:"0 28px",
      background:"var(--bg)",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"var(--ink-3)" }}>
        <span>Workspace</span>
        <span style={{ color:"var(--mute)" }}>/</span>
        <span style={{ color:"var(--ink-2)", fontWeight:500 }}>Today</span>
      </div>

      <div style={{ flex:1 }} />

      {runningTimer ? (
        <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"6px 6px 6px 12px",
          borderRadius:10, background:"var(--accent-soft)",
          border:"1px solid color-mix(in oklch, var(--accent) 22%, transparent)",
          whiteSpace:"nowrap",
        }}>
          <span style={{ width:7, height:7, borderRadius:99, background:"var(--accent)", flex:"0 0 auto",
            boxShadow:"0 0 0 3px color-mix(in oklch, var(--accent) 22%, transparent)" }} />
          <span style={{ fontSize:12, fontWeight:500, color:"var(--accent-2)", maxWidth:180,
            overflow:"hidden", textOverflow:"ellipsis" }}>{runningTimer.label}</span>
          <span className="mono" style={{ fontSize:12, color:"var(--accent-2)", fontWeight:500 }}>{runningTimer.time}</span>
          <button style={{
            all:"unset", padding:"4px 6px", borderRadius:6, cursor:"default",
            background:"color-mix(in oklch, var(--accent) 15%, transparent)", color:"var(--accent-2)",
            display:"flex", flex:"0 0 auto",
          }}>{I.pause}</button>
        </div>
      ) : (
        <button style={{
          all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
          borderRadius:10, background:"var(--ink)", color:"var(--surface)", cursor:"default",
          fontSize:13, fontWeight:500, whiteSpace:"nowrap",
        }}>
          <span style={{ display:"flex" }}>{I.play}</span>
          Start timer
        </button>
      )}

      <button style={{
        all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
        borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
        fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default", whiteSpace:"nowrap",
      }}>
        {I.plus} Log time
      </button>

      <button style={{
        all:"unset", display:"flex", alignItems:"center", justifyContent:"center",
        width:36, height:36, borderRadius:10, border:"1px solid var(--line)",
        background:"var(--canvas)", color:"var(--ink-2)", cursor:"default", position:"relative",
      }}>
        {I.bell}
        <span style={{ position:"absolute", top:8, right:9, width:6, height:6, borderRadius:99, background:"var(--accent)", boxShadow:"0 0 0 2px var(--canvas)" }} />
      </button>
    </header>
  );
}

// =====================================================================
// Helpers (cards, chips)
// =====================================================================
const Card = ({ children, style }) => (
  <div style={{
    background:"var(--canvas)", border:"1px solid var(--line)", borderRadius:14,
    boxShadow:"var(--shadow)", ...style,
  }}>{children}</div>
);

const Chip = ({ children, active, mono, style }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:6,
    padding:"5px 10px", borderRadius:7,
    fontSize: mono ? 11.5 : 12, fontFamily: mono ? '"Geist Mono", monospace' : 'inherit',
    letterSpacing: mono ? ".04em" : "0", textTransform: mono ? "uppercase" : "none",
    background: active ? "var(--ink)" : "transparent", color: active ? "var(--surface)" : "var(--ink-2)",
    border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
    ...style,
  }}>{children}</span>
);

const KPI = ({ label, value, sub, accent, mono = true }) => (
  <div style={{
    flex:1, padding:"18px 20px", borderRight:"1px solid var(--line)",
    display:"flex", flexDirection:"column", gap:6,
  }}>
    <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em" }}>
      {label}
    </div>
    <div style={{
      fontSize:32, fontWeight:500, letterSpacing:"-.02em", color: accent || "var(--ink)",
      fontFamily: mono ? '"Geist Mono", monospace' : "inherit",
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize:12, color:"var(--ink-3)" }}>{sub}</div>}
  </div>
);

// =====================================================================
// Screen: TODAY
// =====================================================================
function TodayScreen() {
  const tasks = [
    { time: "09:00 → 10:30", title: "Kickoff call · Alice Italia", project:"Tempist", proj:"#D45A33", billable:true, dur:"1h 30m" },
    { time: "11:00 → 12:15", title: "Estimator flow — wireframes", project:"App estintori", proj:"#3F7AB8", billable:true, dur:"1h 15m" },
    { time: "14:30 → 15:00", title: "Review onboarding copy", project:"Showupp", proj:"#C49237", billable:false, dur:"30m" },
    { time: "15:30 — running", title: "Iteration: timesheet UI", project:"Tempist", proj:"#D45A33", billable:true, dur:"0h 42m", running:true },
  ];

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopBar runningTimer={{ label: "Iteration: timesheet UI", time:"0:42:18" }} />

      <main style={{ flex:1, overflow:"auto", padding:"28px 36px 48px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:8 }}>
              THURSDAY · 21 MAY 2026
            </div>
            <h1 style={{ margin:0, fontSize:38, fontWeight:500, letterSpacing:"-.025em", lineHeight:1 }}>
              Today
            </h1>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Chip mono active>This week</Chip>
            <Chip mono>Last week</Chip>
            <Chip mono>Custom</Chip>
          </div>
        </div>

        {/* KPI row */}
        <Card style={{ display:"flex", marginBottom:24 }}>
          <KPI label="TRACKED TODAY" value="3:27" sub="across 4 entries" />
          <KPI label="BILLABLE" value="2:57" sub="85% of tracked" accent="var(--billable)" />
          <KPI label="WEEK · 18–24 MAY" value="25:40" sub="target 40h" />
          <div style={{ flex:1, padding:"18px 20px", display:"flex", flexDirection:"column", gap:6 }}>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em" }}>
              REVENUE · MAY
            </div>
            <div className="mono" style={{ fontSize:32, fontWeight:500, color:"var(--accent)" }}>
              €1,840
            </div>
            <div style={{ fontSize:12, color:"var(--ink-3)" }}>
              <span style={{ color:"var(--billable)" }}>↑ 12%</span> vs April
            </div>
          </div>
        </Card>

        {/* Quick add */}
        <Card style={{ display:"flex", alignItems:"center", gap:12, padding:"6px 6px 6px 18px", marginBottom:28 }}>
          <span style={{ color:"var(--ink-3)", flex:"0 0 auto" }}>{I.plus}</span>
          <div style={{ flex:1, fontSize:14, color:"var(--ink-3)", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            <span style={{ color:"var(--mute)" }}>e.g. </span>
            "Call Mario tomorrow 15:00 #Alice p1 60min"
          </div>
          <span className="mono" style={{ fontSize:11, color:"var(--mute)", padding:"4px 8px", border:"1px solid var(--line)", borderRadius:6, whiteSpace:"nowrap", flex:"0 0 auto" }}>↵ to add</span>
          <button style={{
            all:"unset", padding:"8px 16px", borderRadius:8, background:"var(--ink)", color:"var(--surface)",
            fontSize:13, fontWeight:500, cursor:"default", flex:"0 0 auto",
          }}>Add</button>
        </Card>

        {/* Timeline + sidebar */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24 }}>
          <div>
            <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:12 }}>
              <h2 style={{ margin:0, fontSize:18, fontWeight:550, letterSpacing:"-.01em" }}>Timeline</h2>
              <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>04 ENTRIES</span>
            </div>

            <Card style={{ padding: 0, overflow:"hidden" }}>
              {tasks.map((t, i) => (
                <div key={i} style={{
                  display:"grid", gridTemplateColumns:"140px 1fr 88px 110px", gap:16,
                  padding:"16px 20px", borderBottom: i < tasks.length-1 ? "1px solid var(--line-soft)" : "none",
                  alignItems:"center",
                  background: t.running ? "color-mix(in oklch, var(--accent-soft) 60%, transparent)" : "transparent",
                }}>
                  <div className="mono" style={{ fontSize:12, color: t.running ? "var(--accent-2)" : "var(--ink-3)" }}>
                    {t.time}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background: t.proj, flex:"0 0 auto" }} />
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:500, lineHeight:1.2, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:2 }}>{t.project}</div>
                    </div>
                  </div>
                  {t.billable ? (
                    <span style={{
                      justifySelf:"start", padding:"3px 8px", borderRadius:5, fontSize:11,
                      background:"var(--billable-soft)", color:"var(--billable)",
                      fontWeight:500, letterSpacing:".02em",
                    }}>Billable</span>
                  ) : <span style={{ fontSize:11, color:"var(--mute)" }}>—</span>}
                  <div className="mono" style={{ fontSize:14, color:"var(--ink)", textAlign:"right", fontWeight:500 }}>
                    {t.dur}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          {/* Right column: upcoming + focus */}
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            <div>
              <h3 style={{ margin:"0 0 10px", fontSize:13, fontWeight:550, color:"var(--ink-2)", textTransform:"uppercase", letterSpacing:".06em" }}>
                Up next
              </h3>
              <Card style={{ padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>FRI 22 MAY</span>
                  <span style={{ flex:1, height:1, background:"var(--line-soft)" }} />
                </div>
                {[
                  { t:"Review Q2 invoice with Alice", h:"09:00", c:"#3F7AB8" },
                  { t:"Studio Indaco — onsite", h:"14:30", c:"#5C7A4F" },
                  { t:"Tempist v0.4 release notes", h:"17:00", c:"#D45A33" },
                ].map((u, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderTop: i ? "1px solid var(--line-soft)" : "none" }}>
                    <span style={{ width:6, height:6, borderRadius:99, background:u.c }} />
                    <span style={{ fontSize:13, flex:1, color:"var(--ink-2)" }}>{u.t}</span>
                    <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>{u.h}</span>
                  </div>
                ))}
              </Card>
            </div>

            <div>
              <h3 style={{ margin:"0 0 10px", fontSize:13, fontWeight:550, color:"var(--ink-2)", textTransform:"uppercase", letterSpacing:".06em" }}>
                Pulse · last 7 days
              </h3>
              <Card style={{ padding:18 }}>
                <div className="mono" style={{ fontSize:28, fontWeight:500, letterSpacing:"-.02em" }}>
                  25:40<span style={{ fontSize:14, color:"var(--ink-3)", marginLeft:6 }}>h</span>
                </div>
                <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:4, marginBottom:14 }}>
                  Avg 3h 40m / day · longest streak 6 days
                </div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:60 }}>
                  {[2, 3, 4, 5, 6, 5.4, 0].map((v, i) => (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <div style={{
                        width:"100%", height: `${(v/6)*100}%`, minHeight:2,
                        background: i === 3 ? "var(--accent)" : "color-mix(in oklch, var(--ink) 78%, transparent)",
                        borderRadius:3, opacity: v === 0 ? .15 : 1,
                      }} />
                      <span className="mono" style={{ fontSize:10, color:"var(--ink-3)" }}>{["M","T","W","T","F","S","S"][i]}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// =====================================================================
// Screen: TIMESHEET
// =====================================================================
function TimesheetScreen() {
  const rows = [
    { day:"DOM 24 MAG", date:"24 May", proj:"Tempist", projC:"#D45A33", desc:"Sprint planning + retro notes", from:"10:00", to:"15:40", dur:"5:40:00", billable:true },
    { day:"VEN 22 MAG", date:"22 May", proj:"Tempist", projC:"#D45A33", desc:"Component library — buttons + inputs", from:"09:00", to:"15:00", dur:"6:00:00", billable:true },
    { day:"GIO 21 MAG", date:"21 May", proj:"App estintori", projC:"#3F7AB8", desc:"Estimator UI · backend integration", from:"09:30", to:"14:30", dur:"5:00:00", billable:true },
    { day:"MER 20 MAG", date:"20 May", proj:"Showupp", projC:"#C49237", desc:"Onboarding copy + microcopy review", from:"14:00", to:"18:00", dur:"4:00:00", billable:false },
    { day:"MAR 19 MAG", date:"19 May", proj:"Tempist", projC:"#D45A33", desc:"Timesheet redesign exploration", from:"10:00", to:"13:00", dur:"3:00:00", billable:true },
    { day:"LUN 18 MAG", date:"18 May", proj:"Alice Italia", projC:"#3F7AB8", desc:"Onsite kickoff", from:"14:00", to:"16:00", dur:"2:00:00", billable:true },
  ];

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopBar />
      <main style={{ flex:1, overflow:"auto", padding:"28px 36px 48px" }}>
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22 }}>
          <div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:8 }}>TIME</div>
            <h1 style={{ margin:0, fontSize:38, fontWeight:500, letterSpacing:"-.025em", lineHeight:1 }}>Timesheet</h1>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", border:"1px solid var(--line)", borderRadius:10, background:"var(--canvas)" }}>
              <button style={{ all:"unset", padding:"8px 10px", color:"var(--ink-3)", cursor:"default" }}>{I.chevL}</button>
              <div className="mono" style={{ padding:"8px 14px", fontSize:12, borderLeft:"1px solid var(--line)", borderRight:"1px solid var(--line)" }}>
                18 MAY → 24 MAY 2026
              </div>
              <button style={{ all:"unset", padding:"8px 10px", color:"var(--ink-3)", cursor:"default" }}>{I.chevR}</button>
            </div>
            <button style={{
              all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default",
            }}>{I.download} Export CSV</button>
          </div>
        </div>

        {/* Filters row */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22 }}>
          <Chip mono active>This week</Chip>
          <Chip mono>Last week</Chip>
          <Chip mono>This month</Chip>
          <div style={{ width:1, height:18, background:"var(--line)", margin:"0 4px" }} />
          <Chip>All clients <span style={{ color:"var(--ink-3)" }}>{I.chev}</span></Chip>
          <Chip>All projects <span style={{ color:"var(--ink-3)" }}>{I.chev}</span></Chip>
          <Chip>Billable only</Chip>
        </div>

        {/* KPIs */}
        <Card style={{ display:"flex", marginBottom:24 }}>
          <KPI label="HOURS" value="25:40" sub="entries 06 · avg 4h 16m / day" />
          <KPI label="BILLABLE" value="23:40" sub="92% billable rate" accent="var(--billable)" />
          <KPI label="REVENUE" value="€1,420" sub="@ avg €60/h" accent="var(--accent)" />
          <div style={{ flex:1, padding:"18px 20px", display:"flex", flexDirection:"column", gap:8 }}>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em" }}>DAILY DISTRIBUTION</div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:48 }}>
              {[2, 3, 5, 4, 0, 6, 5.7].map((v, i) => (
                <div key={i} style={{
                  flex:1, height: v ? `${(v/6)*100}%` : 3, borderRadius:3, minHeight:3,
                  background: v ? `color-mix(in oklch, var(--ink) ${65 + v*5}%, transparent)` : "var(--line)",
                }} />
              ))}
            </div>
            <div className="mono" style={{ fontSize:10, color:"var(--ink-3)", display:"flex", justifyContent:"space-between" }}>
              <span>L</span><span>M</span><span>M</span><span>G</span><span>V</span><span>S</span><span>D</span>
            </div>
          </div>
        </Card>

        {/* Manual add */}
        <button style={{
          all:"unset", display:"inline-flex", alignItems:"center", gap:8,
          padding:"10px 14px", border:"1px dashed var(--line)", borderRadius:10,
          fontSize:13, color:"var(--ink-2)", cursor:"default", marginBottom:20,
        }}>{I.plus} Add manual entry</button>

        {/* Day groups */}
        {rows.reduce((acc, r) => {
          const last = acc[acc.length-1];
          if (last && last.day === r.day) last.items.push(r);
          else acc.push({ day:r.day, date:r.date, items:[r] });
          return acc;
        }, []).map((group, gi) => {
          const total = group.items.reduce((a, r) => a + parseInt(r.dur), 0);
          return (
            <div key={gi} style={{ marginBottom:18 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:8, padding:"0 4px" }}>
                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em" }}>{group.day}</span>
                <span style={{ flex:1, height:1, background:"var(--line-soft)" }} />
                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".04em" }}>
                  {group.items.length} {group.items.length === 1 ? "ENTRY" : "ENTRIES"} · {String(total).padStart(2,'0')}:00:00
                </span>
              </div>
              <Card style={{ padding:0, overflow:"hidden" }}>
                {group.items.map((r, i) => (
                  <div key={i} style={{
                    display:"grid", gridTemplateColumns:"24px 1fr 180px 110px 100px 24px", gap:16,
                    alignItems:"center", padding:"14px 18px",
                    borderBottom: i < group.items.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:r.projC }} />
                    <div>
                      <div style={{ fontSize:14, color:"var(--ink)", lineHeight:1.2 }}>{r.desc}</div>
                      <div style={{ fontSize:12, color:"var(--ink-3)", marginTop:3 }}>{r.proj}</div>
                    </div>
                    <div className="mono" style={{ fontSize:12, color:"var(--ink-3)" }}>
                      {r.from} <span style={{ color:"var(--mute)" }}>→</span> {r.to}
                    </div>
                    <div className="mono" style={{ fontSize:14, color:"var(--ink)", textAlign:"right", fontWeight:500 }}>
                      {r.dur}
                    </div>
                    {r.billable ? (
                      <span style={{
                        justifySelf:"start", padding:"3px 8px", borderRadius:5, fontSize:11,
                        background:"var(--billable-soft)", color:"var(--billable)", fontWeight:500,
                      }}>Billable</span>
                    ) : <span style={{ fontSize:11, color:"var(--mute)" }}>Internal</span>}
                    <span style={{ color:"var(--ink-3)", justifySelf:"end", cursor:"default" }}>{I.more}</span>
                  </div>
                ))}
              </Card>
            </div>
          );
        })}
      </main>
    </div>
  );
}

// =====================================================================
// Screen: REPORTS
// =====================================================================
function ReportsScreen() {
  const days = [
    { d:"05-17", v:0 }, { d:"05-18", v:2 }, { d:"05-19", v:3 }, { d:"05-20", v:4 },
    { d:"05-21", v:5 }, { d:"05-22", v:6 }, { d:"05-23", v:5.7 },
  ];
  const max = 6;

  const clients = [
    { name:"Alice Italia", color:"#3F7AB8", hours:"19:40", entries:5, billable:"€1,180.00", pct:77 },
    { name:"Studio Indaco", color:"#5C7A4F", hours:"06:00", entries:1, billable:"€360.00", pct:23 },
  ];
  const projects = [
    { name:"Tempist", color:"#D45A33", hours:"14:40", billable:"€880" },
    { name:"App estintori", color:"#3F7AB8", hours:"05:00", billable:"€300" },
    { name:"Showupp", color:"#C49237", hours:"06:00", billable:"€360" },
  ];

  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopBar />
      <main style={{ flex:1, overflow:"auto", padding:"28px 36px 48px" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:22 }}>
          <div>
            <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:8 }}>
              ANALYTICS · 18 — 24 MAY 2026
            </div>
            <h1 style={{ margin:0, fontSize:38, fontWeight:500, letterSpacing:"-.025em", lineHeight:1 }}>Reports</h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button style={{
              all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default",
            }}>{I.download} Export CSV</button>
            <button style={{
              all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default",
            }}>{I.print} Print</button>
          </div>
        </div>

        {/* Range tabs */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:22 }}>
          <Chip mono active>This week</Chip>
          <Chip mono>Last week</Chip>
          <Chip mono>This month</Chip>
          <Chip mono>Last month</Chip>
          <Chip mono>Custom range</Chip>
        </div>

        {/* KPIs */}
        <Card style={{ display:"flex", marginBottom:24 }}>
          <KPI label="HOURS" value="25:40" sub="↑ 14% vs last week" />
          <KPI label="ENTRIES" value="06" sub="avg 4h 16m / entry" />
          <KPI label="COMPLETED" value="00" sub="of 12 scheduled" />
          <KPI label="BILLABLE" value="€1,420" sub="at avg €60/h" accent="var(--accent)" />
        </Card>

        {/* Two charts */}
        <div style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:24, marginBottom:24 }}>
          <Card style={{ padding:24 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <h3 style={{ margin:0, fontSize:15, fontWeight:600 }}>Hours per day</h3>
              <div style={{ display:"flex", gap:6 }}>
                <Chip mono active>Daily</Chip>
                <Chip mono>Weekly</Chip>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"flex-end", gap:14, height:200, padding:"8px 0", borderBottom:"1px solid var(--line-soft)" }}>
              {days.map((day, i) => (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <span className="mono" style={{ fontSize:11, color:"var(--ink)", fontWeight:500, opacity: day.v ? 1 : 0 }}>
                    {day.v ? day.v + "h" : ""}
                  </span>
                  <div style={{
                    width:"100%", maxWidth:60, height: day.v ? `${(day.v/max)*150}px` : 4,
                    background: i === 4 ? "var(--accent)" : "color-mix(in oklch, var(--ink) 82%, transparent)",
                    borderRadius:5, opacity: day.v ? 1 : .25,
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"space-around", marginTop:8 }}>
              {days.map((day, i) => (
                <span key={i} className="mono" style={{ fontSize:11, color: i === 4 ? "var(--accent)" : "var(--ink-3)", fontWeight: i === 4 ? 600 : 400 }}>
                  {day.d}
                </span>
              ))}
            </div>
          </Card>

          <Card style={{ padding:24 }}>
            <h3 style={{ margin:"0 0 18px", fontSize:15, fontWeight:600 }}>Client distribution</h3>
            <div style={{ display:"flex", height:14, borderRadius:99, overflow:"hidden", marginBottom:16 }}>
              {clients.map((c, i) => (
                <div key={i} style={{ width:`${c.pct}%`, background:c.color }} />
              ))}
            </div>
            {clients.map((c, i) => (
              <div key={i} style={{
                display:"grid", gridTemplateColumns:"12px 1fr auto auto", gap:12, alignItems:"center",
                padding:"10px 0", borderBottom: i < clients.length-1 ? "1px solid var(--line-soft)" : "none",
              }}>
                <span style={{ width:8, height:8, borderRadius:99, background:c.color }} />
                <span style={{ fontSize:13.5, color:"var(--ink)" }}>{c.name}</span>
                <span className="mono" style={{ fontSize:12.5, color:"var(--ink-2)" }}>{c.hours}h</span>
                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", width:42, textAlign:"right" }}>{c.pct}%</span>
              </div>
            ))}
            <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid var(--line)", display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:12, color:"var(--ink-3)" }}>Total billable</span>
              <span className="mono" style={{ fontSize:14, fontWeight:600, color:"var(--accent)" }}>€1,540.00</span>
            </div>
          </Card>
        </div>

        {/* By project table */}
        <div style={{ marginBottom:8, display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:600 }}>By project</h3>
          <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>03 PROJECTS</span>
        </div>
        <Card style={{ padding:0, overflow:"hidden" }}>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 120px 100px 120px 120px",
            padding:"12px 20px", borderBottom:"1px solid var(--line-soft)",
            fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", fontWeight:500, textTransform:"uppercase",
          }} className="mono">
            <span>Project</span>
            <span style={{ textAlign:"right" }}>Hours</span>
            <span style={{ textAlign:"right" }}>Entries</span>
            <span style={{ textAlign:"right" }}>Billable</span>
            <span style={{ textAlign:"right" }}>Share</span>
          </div>
          {projects.map((p, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 120px 100px 120px 120px",
              padding:"14px 20px", alignItems:"center",
              borderBottom: i < projects.length-1 ? "1px solid var(--line-soft)" : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ width:10, height:10, borderRadius:3, background:p.color }} />
                <span style={{ fontSize:14, color:"var(--ink)" }}>{p.name}</span>
              </div>
              <span className="mono" style={{ fontSize:14, textAlign:"right", color:"var(--ink)" }}>{p.hours}</span>
              <span className="mono" style={{ fontSize:13, textAlign:"right", color:"var(--ink-3)" }}>{[3,1,2][i]}</span>
              <span className="mono" style={{ fontSize:14, textAlign:"right", color:"var(--accent)", fontWeight:500 }}>{p.billable}</span>
              <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                <div style={{ width:80, height:5, background:"var(--line-soft)", borderRadius:99, overflow:"hidden" }}>
                  <div style={{ width:`${[57,20,23][i]}%`, height:"100%", background:p.color }} />
                </div>
                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", width:32, textAlign:"right" }}>{[57,20,23][i]}%</span>
              </div>
            </div>
          ))}
        </Card>
      </main>
    </div>
  );
}

// =====================================================================
// Screen: CLIENT DETAIL — Alice Italia
// =====================================================================
function ClientDetailScreen() {
  const week = [
    { day:"LUN", date:"18 mag", v:2, today:false },
    { day:"MAR", date:"19 mag", v:3, today:false },
    { day:"MER", date:"20 mag", v:4, today:false },
    { day:"GIO", date:"21 mag", v:5, today:true },
    { day:"VEN", date:"22 mag", v:6, today:false },
    { day:"SAB", date:"23 mag", v:0, today:false },
    { day:"DOM", date:"24 mag", v:5.67, today:false },
  ];
  return (
    <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
      <TopBar />
      <main style={{ flex:1, overflow:"auto", padding:"28px 36px 48px" }}>
        {/* Identity */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, gap:24 }}>
          <div style={{ display:"flex", gap:18, alignItems:"flex-start" }}>
            <div style={{
              width:64, height:64, borderRadius:14,
              background:"color-mix(in oklch, #3F7AB8 18%, var(--canvas))",
              border:"1px solid color-mix(in oklch, #3F7AB8 30%, transparent)",
              display:"grid", placeItems:"center",
              fontFamily:'"Instrument Serif", serif', fontSize:32, fontStyle:"italic",
              color:"#3F7AB8",
            }}>A</div>
            <div>
              <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:6 }}>CLIENT · ACTIVE</div>
              <h1 style={{ margin:0, fontSize:38, fontWeight:500, letterSpacing:"-.025em", lineHeight:1 }}>Alice Italia</h1>
              <div style={{ marginTop:10, display:"flex", gap:18, fontSize:13, color:"var(--ink-3)" }}>
                <span>via Solferino 12 · Milano</span>
                <span style={{ color:"var(--mute)" }}>·</span>
                <span>VAT IT01234567890</span>
                <span style={{ color:"var(--mute)" }}>·</span>
                <span>€60 / hour</span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={{
              all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default",
            }}>{I.download} Export</button>
            <button style={{
              all:"unset", display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
              borderRadius:10, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:13, color:"var(--ink-2)", fontWeight:500, cursor:"default",
            }}>{I.edit} Edit</button>
          </div>
        </div>

        {/* KPIs */}
        <Card style={{ display:"flex", marginBottom:24 }}>
          <KPI label="HOURS · MAY" value="25:40" />
          <KPI label="BILLABLE" value="25:40" accent="var(--billable)" />
          <KPI label="INTERNAL" value="00:00" />
          <KPI label="REVENUE (EUR)" value="€1,540" accent="var(--accent)" sub="invoiced €960 · open €580" />
        </Card>

        {/* Weekly input grid */}
        <div style={{ marginBottom:10, display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
          <h3 style={{ margin:0, fontSize:15, fontWeight:600 }}>Quick weekly entry</h3>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span className="mono" style={{ fontSize:11, color:"var(--ink-3)" }}>18 — 24 MAY 2026</span>
            <div style={{ display:"flex", alignItems:"center", border:"1px solid var(--line)", borderRadius:8, background:"var(--canvas)" }}>
              <button style={{ all:"unset", padding:"5px 8px", color:"var(--ink-3)", cursor:"default" }}>{I.chevL}</button>
              <button style={{ all:"unset", padding:"5px 8px", color:"var(--ink-3)", cursor:"default" }}>{I.chevR}</button>
            </div>
          </div>
        </div>
        <Card style={{ padding:0, overflow:"hidden", marginBottom:24 }}>
          <div style={{
            display:"grid", gridTemplateColumns:"110px 1fr 1fr 110px",
            padding:"12px 18px", borderBottom:"1px solid var(--line-soft)",
            fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", fontWeight:500, textTransform:"uppercase",
          }} className="mono">
            <span>Day</span>
            <span>Tempist</span>
            <span>App estintori</span>
            <span style={{ textAlign:"right" }}>Total</span>
          </div>
          {week.map((d, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"110px 1fr 1fr 110px",
              padding:"14px 18px", alignItems:"center",
              borderBottom: i < week.length-1 ? "1px solid var(--line-soft)" : "none",
              background: d.today ? "color-mix(in oklch, var(--accent-soft) 50%, transparent)" : "transparent",
            }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                <span className="mono" style={{ fontSize:11, color: d.today ? "var(--accent-2)" : "var(--ink-3)", letterSpacing:".06em" }}>{d.day}</span>
                <span style={{ fontSize:13.5, color: d.today ? "var(--accent-2)" : "var(--ink)", fontWeight: d.today ? 600 : 400 }}>{d.date}</span>
              </div>
              <div className="mono" style={{ fontSize:14, color: i === 0 ? "var(--ink-3)" : "var(--ink)" }}>
                {[0, 3, 4, 5, 6, "—", "5:40"][i] || "—"}
              </div>
              <div className="mono" style={{ fontSize:14, color:"var(--ink-3)" }}>
                {[2, "—", "—", "—", "—", "—", "—"][i] || "—"}
              </div>
              <div className="mono" style={{ fontSize:14, color:"var(--ink)", textAlign:"right", fontWeight:500 }}>
                {d.v ? (d.v % 1 ? "5:40" : `${d.v}:00`) : "—"}
              </div>
            </div>
          ))}
          <div style={{
            display:"grid", gridTemplateColumns:"110px 1fr 1fr 110px",
            padding:"14px 18px",
            background:"var(--surface)", borderTop:"1px solid var(--line)",
          }}>
            <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em" }}>TOTAL</span>
            <span className="mono" style={{ fontSize:13.5, color:"var(--ink)" }}>23:40</span>
            <span className="mono" style={{ fontSize:13.5, color:"var(--ink)" }}>02:00</span>
            <span className="mono" style={{ fontSize:14, color:"var(--ink)", textAlign:"right", fontWeight:600 }}>25:40</span>
          </div>
        </Card>

        <div style={{ fontSize:11.5, color:"var(--ink-3)" }} className="mono">
          TAB / ENTER TO SAVE · FORMAT: 2.5 · 2,5 · 2:30 · 1H30
        </div>
      </main>
    </div>
  );
}

// Make available globally
Object.assign(window, { Sidebar, TopBar, TodayScreen, TimesheetScreen, ReportsScreen, ClientDetailScreen, Card, KPI, Chip, I });
