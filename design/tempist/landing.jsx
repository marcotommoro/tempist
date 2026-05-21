/* eslint-disable */
// Tempist — landing page

function LandingPage() {
  return (
    <div style={{
      width:"100%", minHeight:"100%", background:"var(--bg)",
      fontFamily: "Geist, system-ui, sans-serif", color:"var(--ink)",
    }}>
      {/* Nav */}
      <nav style={{
        display:"flex", alignItems:"center", padding:"22px 48px",
        borderBottom:"1px solid var(--line-soft)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:30, height:30, borderRadius:8, background:"var(--ink)", color:"var(--surface)",
            display:"grid", placeItems:"center", fontSize:14, fontWeight:600,
          }}>T</div>
          <span style={{ fontSize:18, fontWeight:600, letterSpacing:"-.02em" }}>Tempist</span>
        </div>
        <div style={{ display:"flex", gap:30, marginLeft:60, fontSize:14, color:"var(--ink-2)" }}>
          <span>Product</span>
          <span>For freelancers</span>
          <span>Pricing</span>
          <span>Changelog</span>
        </div>
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:14, color:"var(--ink-2)" }}>Log in</span>
          <button style={{
            all:"unset", padding:"8px 16px", borderRadius:9, background:"var(--ink)",
            color:"var(--surface)", fontSize:13.5, fontWeight:500, cursor:"default",
          }}>Start tracking — free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding:"100px 48px 80px", position:"relative" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1.05fr .95fr", gap:60, alignItems:"center" }}>
          <div>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8, padding:"6px 12px 6px 8px",
              borderRadius:99, border:"1px solid var(--line)", background:"var(--canvas)",
              fontSize:12.5, color:"var(--ink-2)", marginBottom:30,
            }} className="mono">
              <span style={{
                padding:"2px 6px", borderRadius:99, background:"var(--accent)", color:"#fff",
                fontSize:10, letterSpacing:".06em", fontWeight:500,
              }}>NEW</span>
              Natural-language task entry · v0.4
            </div>

            <h1 style={{
              margin:0, fontSize:78, lineHeight:.95, letterSpacing:"-.035em", fontWeight:500,
              maxWidth:"14ch",
            }}>
              The hours{" "}
              <span style={{ fontFamily:'"Instrument Serif", serif', fontStyle:"italic", fontWeight:400, color:"var(--accent)" }}>
                you actually billed
              </span>
              .
            </h1>

            <p style={{
              margin:"28px 0 36px", fontSize:18.5, lineHeight:1.5, color:"var(--ink-2)",
              maxWidth:"44ch",
            }}>
              A time tracker built for freelancers who'd rather be working. Type what you did, hit enter, send the invoice. No spreadsheets, no Friday-afternoon panic.
            </p>

            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
              <button style={{
                all:"unset", padding:"14px 22px", borderRadius:10, background:"var(--ink)",
                color:"var(--surface)", fontSize:15, fontWeight:500, cursor:"default",
                display:"flex", alignItems:"center", gap:10,
              }}>Start tracking — free <span style={{ opacity:.6 }}>{I.arrow}</span></button>
              <button style={{
                all:"unset", padding:"14px 22px", borderRadius:10, border:"1px solid var(--line)",
                background:"var(--canvas)", color:"var(--ink)", fontSize:15, fontWeight:500, cursor:"default",
              }}>Watch 2-min demo</button>
            </div>

            <div className="mono" style={{ fontSize:11.5, color:"var(--ink-3)", letterSpacing:".06em" }}>
              FREE FOREVER FOR SOLOS · NO CREDIT CARD · GDPR-COMPLIANT
            </div>
          </div>

          {/* Hero artwork: stacked card mock */}
          <div style={{ position:"relative", height:520 }}>
            {/* Background card — week sparkline */}
            <div style={{
              position:"absolute", top:0, right:40, width:380,
              padding:24, borderRadius:16, background:"var(--canvas)", border:"1px solid var(--line)",
              boxShadow:"var(--shadow-lg)", transform:"rotate(-2.2deg)",
            }}>
              <div className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em", marginBottom:10 }}>
                WEEK 18 — 24 MAY
              </div>
              <div className="mono" style={{ fontSize:42, fontWeight:500, letterSpacing:"-.02em", marginBottom:14 }}>
                25:40<span style={{ fontSize:18, color:"var(--ink-3)", marginLeft:6 }}>h</span>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:90 }}>
                {[2,3,4,5,6,5.7,0].map((v,i)=>(
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", gap:6, alignItems:"center" }}>
                    <div style={{
                      width:"100%", height: v ? `${(v/6)*70}px` : 3,
                      background: i === 4 ? "var(--accent)" : "color-mix(in oklch, var(--ink) 80%, transparent)",
                      borderRadius:4, opacity: v ? 1 : .2,
                    }} />
                    <span className="mono" style={{ fontSize:10, color:"var(--ink-3)" }}>{["M","T","W","T","F","S","S"][i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Foreground: running timer */}
            <div style={{
              position:"absolute", left:0, top:120, width:420,
              padding:"20px 22px", borderRadius:16, background:"var(--canvas)",
              border:"1px solid var(--line)", boxShadow:"var(--shadow-lg)",
              transform:"rotate(1.5deg)",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <span style={{ width:10, height:10, borderRadius:99, background:"var(--accent)",
                  boxShadow:"0 0 0 4px color-mix(in oklch, var(--accent) 22%, transparent)" }} />
                <span style={{ fontSize:12.5, color:"var(--ink-3)" }} className="mono">RUNNING · 00:42:18</span>
                <span style={{ flex:1 }} />
                <button style={{
                  all:"unset", padding:"6px 8px", borderRadius:6, background:"color-mix(in oklch, var(--accent) 15%, transparent)",
                  color:"var(--accent-2)", display:"flex",
                }}>{I.pause}</button>
              </div>
              <div style={{ fontSize:20, fontWeight:500, lineHeight:1.25, marginBottom:8 }}>
                Iteration: timesheet redesign
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:"#D45A33" }} />
                <span style={{ fontSize:13, color:"var(--ink-3)" }}>Tempist</span>
                <span style={{ color:"var(--mute)" }}>·</span>
                <span style={{ fontSize:11, color:"var(--billable)", padding:"2px 7px", borderRadius:4, background:"var(--billable-soft)", fontWeight:500 }}>Billable</span>
              </div>
            </div>

            {/* Smallest card: quick-add */}
            <div style={{
              position:"absolute", left:60, bottom:0, right:0,
              padding:"14px 16px", borderRadius:14, background:"var(--canvas)",
              border:"1px solid var(--line)", boxShadow:"var(--shadow-lg)",
              display:"flex", alignItems:"center", gap:12,
              transform:"rotate(-1deg)",
            }}>
              <span style={{ color:"var(--ink-3)" }}>{I.bolt}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:13.5, color:"var(--ink)" }}>"Call Mario tomorrow 15:00 </span>
                <span style={{ fontSize:13.5, color:"var(--info)", fontWeight:500 }}>#Alice</span>
                <span style={{ fontSize:13.5, color:"var(--ink)" }}> </span>
                <span style={{ fontSize:13.5, color:"var(--accent)", fontWeight:500 }}>p1</span>
                <span style={{ fontSize:13.5, color:"var(--ink)" }}> </span>
                <span style={{ fontSize:13.5, color:"var(--billable)", fontWeight:500 }}>60min</span>
                <span style={{ fontSize:13.5, color:"var(--ink)" }}>"</span>
              </div>
              <span className="mono" style={{ fontSize:10.5, color:"var(--ink-3)", padding:"3px 7px", border:"1px solid var(--line)", borderRadius:5 }}>↵</span>
            </div>
          </div>
        </div>

        {/* Logos strip */}
        <div style={{
          maxWidth:1100, margin:"100px auto 0", paddingTop:36, borderTop:"1px solid var(--line-soft)",
          display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:24,
        }}>
          <span className="mono" style={{ fontSize:11.5, color:"var(--ink-3)", letterSpacing:".1em" }}>
            TRUSTED BY 3,200+ INDEPENDENT BUSINESSES
          </span>
          <div style={{ display:"flex", gap:42, opacity:.55, color:"var(--ink-2)", fontFamily:'"Instrument Serif", serif', fontSize:22, fontStyle:"italic" }}>
            <span>Studio Indaco</span>
            <span style={{ fontFamily:"Geist", fontStyle:"normal", fontWeight:600, letterSpacing:"-.02em" }}>Alice Italia</span>
            <span style={{ fontFamily:"Geist", fontStyle:"normal", fontWeight:500, letterSpacing:".24em", fontSize:16, textTransform:"uppercase" }}>Ranghieri</span>
            <span style={{ fontFamily:"Geist Mono", fontStyle:"normal", fontSize:18 }}>showupp/</span>
            <span>Estintori &amp; Co</span>
          </div>
        </div>
      </section>

      {/* Section: 3 feature columns */}
      <section style={{ padding:"80px 48px", borderTop:"1px solid var(--line-soft)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto" }}>
          <div className="mono" style={{ fontSize:11.5, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:18 }}>
            §01 · WHAT'S IN THE BOX
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, marginBottom:56 }}>
            <h2 style={{ margin:0, fontSize:54, fontWeight:500, letterSpacing:"-.025em", lineHeight:1.05 }}>
              Built for the small studio,<br/>
              <span style={{ fontFamily:'"Instrument Serif", serif', fontStyle:"italic", fontWeight:400 }}>not the enterprise</span>.
            </h2>
            <p style={{ margin:"8px 0 0", fontSize:18, lineHeight:1.55, color:"var(--ink-2)", maxWidth:"42ch", alignSelf:"end" }}>
              Three things matter when you bill by the hour: knowing where it went, getting it out the door, and not losing your sanity in admin. Tempist does those.
            </p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:24 }}>
            {[
              { n:"01", t:"One‑line time entry", d:"Type 'Call Mario 15:00 #Alice 60min' and we'll parse the project, date, duration and billable status. No forms.", iconColor:"var(--accent)" },
              { n:"02", t:"Invoice‑ready exports", d:"CSV, printable PDF, or push straight to Fattura24. Hours are reconciled to the minute, billable separated from internal.", iconColor:"var(--billable)" },
              { n:"03", t:"Pulse, not surveillance", d:"Weekly rhythm at a glance. Where you're spending time, who owes you money, what's slipping. No team-tracking guilt theatre.", iconColor:"var(--info)" },
            ].map((f, i) => (
              <div key={i} style={{
                background:"var(--canvas)", border:"1px solid var(--line)", borderRadius:14,
                padding:"28px 26px", boxShadow:"var(--shadow)",
                display:"flex", flexDirection:"column", gap:14, minHeight:260,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span className="mono" style={{ fontSize:11.5, color: f.iconColor, fontWeight:500, letterSpacing:".06em" }}>
                    §{f.n}
                  </span>
                  <span style={{ flex:1, height:1, background:"var(--line-soft)" }} />
                </div>
                <h3 style={{ margin:0, fontSize:22, fontWeight:550, letterSpacing:"-.015em", lineHeight:1.15 }}>
                  {f.t}
                </h3>
                <p style={{ margin:0, fontSize:14.5, lineHeight:1.55, color:"var(--ink-2)" }}>
                  {f.d}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section: feature deep dive — quick entry */}
      <section style={{ padding:"100px 48px", borderTop:"1px solid var(--line-soft)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1.1fr", gap:60, alignItems:"center" }}>
          <div>
            <div className="mono" style={{ fontSize:11.5, color:"var(--accent)", letterSpacing:".1em", marginBottom:18 }}>
              §02 · QUICK ENTRY
            </div>
            <h2 style={{ margin:"0 0 24px", fontSize:48, fontWeight:500, letterSpacing:"-.025em", lineHeight:1.05 }}>
              Stop opening forms.<br/>
              <span style={{ fontFamily:'"Instrument Serif", serif', fontStyle:"italic", fontWeight:400 }}>Just type.</span>
            </h2>
            <p style={{ margin:"0 0 28px", fontSize:17, lineHeight:1.55, color:"var(--ink-2)", maxWidth:"44ch" }}>
              Tempist understands clients, projects, dates, durations and tags inline. Hit return; we'll do the rest. Works in the app, in Raycast, or from a shortcut.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {[
                ["#client", "Routes to client", "var(--info)"],
                ["p1, p2, p3", "Priority", "var(--accent)"],
                ["60min, 1h30, 2:00", "Duration", "var(--billable)"],
                ["tomorrow 15:00", "Smart dates", "var(--ink-2)"],
              ].map(([k,v,c],i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:14 }}>
                  <span className="mono" style={{
                    fontSize:13, padding:"4px 10px", borderRadius:6,
                    background:"var(--surface)", border:"1px solid var(--line)", color: c, fontWeight:500,
                  }}>{k}</span>
                  <span style={{ fontSize:14, color:"var(--ink-2)" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding:24, borderRadius:18, background:"var(--surface)",
            border:"1px solid var(--line)", boxShadow:"var(--shadow-lg)",
          }}>
            {/* faux quick-add */}
            <div style={{
              padding:"18px 18px", borderRadius:12, background:"var(--canvas)",
              border:"1px solid var(--line)", marginBottom:16,
              display:"flex", alignItems:"center", gap:12,
            }}>
              <span style={{ color:"var(--accent)" }}>{I.plus}</span>
              <div style={{ flex:1, fontSize:16 }}>
                <span style={{ color:"var(--ink)" }}>Onboarding wireframes </span>
                <span style={{ color:"var(--info)", fontWeight:500 }}>#Alice </span>
                <span style={{ color:"var(--accent)", fontWeight:500 }}>p1 </span>
                <span style={{ color:"var(--billable)", fontWeight:500 }}>2h30</span>
                <span style={{ borderLeft:"2px solid var(--accent)", marginLeft:2, height:18, display:"inline-block", verticalAlign:"middle", animation:"blink 1s infinite" }} />
              </div>
              <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", padding:"4px 9px", border:"1px solid var(--line)", borderRadius:6 }}>↵</span>
            </div>

            <div className="mono" style={{ fontSize:10.5, color:"var(--ink-3)", letterSpacing:".08em", margin:"8px 4px" }}>
              PARSED ↓
            </div>

            <div style={{
              padding:18, borderRadius:12, background:"var(--canvas)", border:"1px solid var(--line)",
            }}>
              <div style={{ display:"grid", gridTemplateColumns:"100px 1fr", rowGap:12, fontSize:13.5 }}>
                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", paddingTop:2 }}>TITLE</span>
                <span style={{ color:"var(--ink)" }}>Onboarding wireframes</span>

                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", paddingTop:2 }}>CLIENT</span>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:99, background:"var(--info)" }} />
                  Alice Italia
                </span>

                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", paddingTop:2 }}>PRIORITY</span>
                <span style={{ color:"var(--accent)", fontWeight:500 }}>P1 · High</span>

                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", paddingTop:2 }}>DURATION</span>
                <span className="mono" style={{ color:"var(--billable)", fontWeight:500 }}>02:30:00</span>

                <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".06em", paddingTop:2 }}>BILLABLE</span>
                <span style={{
                  padding:"2px 8px", borderRadius:5, fontSize:11.5, fontWeight:500,
                  background:"var(--billable-soft)", color:"var(--billable)", justifySelf:"start",
                }}>YES · €150 @ €60/h</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding:"100px 48px", borderTop:"1px solid var(--line-soft)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="mono" style={{ fontSize:11.5, color:"var(--ink-3)", letterSpacing:".1em", marginBottom:18 }}>
            §03 · PRICING
          </div>
          <h2 style={{ margin:"0 0 14px", fontSize:48, fontWeight:500, letterSpacing:"-.025em" }}>
            Honest pricing.
          </h2>
          <p style={{ margin:"0 0 48px", fontSize:17, color:"var(--ink-2)", maxWidth:"50ch" }}>
            Free if it's just you. A few euros a month per teammate. No "contact sales" tier.
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18 }}>
            {[
              { name:"Solo", price:"€0", per:"forever", feats:["Unlimited tracking","Unlimited clients & projects","CSV + PDF export","2 years of history"], cta:"Start free", primary:false },
              { name:"Studio", price:"€8", per:"per seat / month", feats:["Everything in Solo","Up to 10 teammates","Invoicing integrations","Team reports","Priority email support"], cta:"Try free for 14 days", primary:true, badge:"MOST POPULAR" },
              { name:"Agency", price:"€18", per:"per seat / month", feats:["Everything in Studio","SSO + SAML","Custom rate tables","API + webhooks","Dedicated CSM"], cta:"Talk to us", primary:false },
            ].map((p, i) => (
              <div key={i} style={{
                position:"relative", padding:"32px 28px",
                background: p.primary ? "var(--ink)" : "var(--canvas)",
                color: p.primary ? "var(--surface)" : "var(--ink)",
                border:"1px solid " + (p.primary ? "var(--ink)" : "var(--line)"),
                borderRadius:16, boxShadow: p.primary ? "var(--shadow-lg)" : "var(--shadow)",
                display:"flex", flexDirection:"column", gap:18,
              }}>
                {p.badge && (
                  <span style={{
                    position:"absolute", top:-12, left:24,
                    padding:"4px 10px", borderRadius:99, background:"var(--accent)", color:"#fff",
                    fontSize:10.5, letterSpacing:".08em", fontWeight:500,
                  }} className="mono">{p.badge}</span>
                )}
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between" }}>
                  <span style={{ fontSize:20, fontWeight:550, letterSpacing:"-.01em" }}>{p.name}</span>
                </div>
                <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
                  <span className="mono" style={{ fontSize:50, fontWeight:500, letterSpacing:"-.03em" }}>{p.price}</span>
                  <span style={{ fontSize:13, opacity:.65 }}>{p.per}</span>
                </div>
                <div style={{ height:1, background: p.primary ? "rgba(255,255,255,.12)" : "var(--line-soft)" }} />
                <ul style={{ margin:0, padding:0, listStyle:"none", display:"flex", flexDirection:"column", gap:11 }}>
                  {p.feats.map((f, j) => (
                    <li key={j} style={{ display:"flex", alignItems:"flex-start", gap:10, fontSize:14, lineHeight:1.4 }}>
                      <span style={{ marginTop:3, color: p.primary ? "var(--accent-2)" : "var(--accent)" }}>{I.check}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ flex:1 }} />
                <button style={{
                  all:"unset", padding:"12px 18px", borderRadius:10, cursor:"default", textAlign:"center",
                  background: p.primary ? "var(--accent)" : "var(--ink)",
                  color: p.primary ? "#fff" : "var(--surface)",
                  fontSize:14, fontWeight:500,
                }}>{p.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ padding:"110px 48px", borderTop:"1px solid var(--line-soft)" }}>
        <div style={{
          maxWidth:1100, margin:"0 auto", padding:"64px 56px",
          background:"var(--ink)", color:"var(--surface)", borderRadius:24,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:60,
          boxShadow:"var(--shadow-lg)", position:"relative", overflow:"hidden",
        }}>
          <div style={{ flex:1, position:"relative", zIndex:1 }}>
            <h2 style={{ margin:"0 0 18px", fontSize:54, fontWeight:500, letterSpacing:"-.025em", lineHeight:1 }}>
              Make Friday<br/>
              <span style={{ fontFamily:'"Instrument Serif", serif', fontStyle:"italic", color:"var(--accent-2)" }}>
                feel like Friday.
              </span>
            </h2>
            <p style={{ margin:0, fontSize:17, opacity:.7, maxWidth:"38ch" }}>
              Set up takes ninety seconds. Try Tempist on this week's hours — you can always go back to spreadsheets.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, position:"relative", zIndex:1 }}>
            <button style={{
              all:"unset", padding:"16px 28px", borderRadius:12, background:"var(--accent)",
              color:"#fff", fontSize:16, fontWeight:500, cursor:"default", textAlign:"center",
              display:"flex", alignItems:"center", gap:12,
            }}>Start tracking — free <span style={{ opacity:.8 }}>{I.arrow}</span></button>
            <span className="mono" style={{ fontSize:11, opacity:.55, letterSpacing:".08em", textAlign:"center" }}>
              NO CREDIT CARD · 2 MIN SETUP
            </span>
          </div>
          {/* decorative big numeral */}
          <div style={{
            position:"absolute", right:-20, top:-30, fontFamily:'"Instrument Serif", serif',
            fontSize:380, opacity:.05, lineHeight:1, fontStyle:"italic", color:"var(--accent-2)",
            pointerEvents:"none",
          }}>t</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding:"48px 48px 64px" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:40, flexWrap:"wrap" }}>
          <div style={{ maxWidth:300 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{
                width:26, height:26, borderRadius:7, background:"var(--ink)", color:"var(--surface)",
                display:"grid", placeItems:"center", fontSize:13, fontWeight:600,
              }}>T</div>
              <span style={{ fontSize:16, fontWeight:600, letterSpacing:"-.02em" }}>Tempist</span>
            </div>
            <p style={{ margin:0, fontSize:13, color:"var(--ink-3)", lineHeight:1.5 }}>
              A time tracker for freelancers and small studios. Made in Milano.
            </p>
          </div>
          <div style={{ display:"flex", gap:60, fontSize:13, color:"var(--ink-2)" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em", marginBottom:4 }}>PRODUCT</span>
              <span>Features</span><span>Pricing</span><span>Changelog</span><span>Roadmap</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em", marginBottom:4 }}>COMPANY</span>
              <span>About</span><span>Manifesto</span><span>Contact</span><span>Press</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <span className="mono" style={{ fontSize:11, color:"var(--ink-3)", letterSpacing:".08em", marginBottom:4 }}>LEGAL</span>
              <span>Terms</span><span>Privacy</span><span>GDPR</span><span>DPA</span>
            </div>
          </div>
        </div>
        <div style={{
          maxWidth:1200, margin:"36px auto 0", paddingTop:24, borderTop:"1px solid var(--line-soft)",
          display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--ink-3)",
        }}>
          <span className="mono" style={{ letterSpacing:".06em" }}>© 2026 RANGHIERI · MILANO, ITALY</span>
          <span className="mono" style={{ letterSpacing:".06em" }}>v0.4.2 · ALL SYSTEMS NORMAL</span>
        </div>
      </footer>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}

window.LandingPage = LandingPage;
