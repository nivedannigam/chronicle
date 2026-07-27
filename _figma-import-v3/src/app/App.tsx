import React, { useState, useRef } from "react";
import {
  Search, ArrowLeft, ChevronRight, Mic, Send,
  AlertCircle, Sparkles, X, Shield, Plane,
  RefreshCw, Cloud, Folder, Link2, Sliders,
  History, Landmark, GraduationCap, Diamond,
  Eye, Users, User, Settings, Heart, Home,
  FileText, Clock, LayoutGrid, ScrollText,
  GitCommitHorizontal, BarChart2, Lightbulb, SlidersHorizontal,
} from "lucide-react";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg:      "#09090B",
  surface: "#141418",
  raise:   "#1C1C22",
  blue:    "#3B82F6",
  indigo:  "#6366F1",
  green:   "#10B981",
  amber:   "#F59E0B",
  red:     "#EF4444",
  purple:  "#8B5CF6",
  pink:    "#EC4899",
  teal:    "#06B6D4",
  orange:  "#F97316",
  fg:      "#F8F8FA",
  mid:     "rgba(255,255,255,0.55)",
  dim:     "rgba(255,255,255,0.30)",
  ghost:   "rgba(255,255,255,0.12)",
  line:    "rgba(255,255,255,0.07)",
} as const;

type Screen = "home"|"health"|"ask"|"more"|"profile"|"search"|"documents";
type HTab   = "overview"|"reports"|"timeline"|"metrics"|"insights"|"setup";
type Nav    = (s: Screen) => void;

// ─── Family data ──────────────────────────────────────────────────────────────
const MEMBERS = [
  { name:"Nivedan", init:"N", color:C.blue   },
  { name:"Priya",   init:"P", color:C.pink   },
  { name:"Aarav",   init:"A", color:C.amber  },
  { name:"Grandma", init:"G", color:C.teal   },
];

const ATTENTION: Record<string, Array<{icon:string;title:string;sub:string;cta:string;clr:string}>> = {
  Nivedan:[
    {icon:"💳",title:"Credit card due tomorrow",  sub:"HDFC Regalia · ₹12,430",               cta:"Pay",  clr:C.amber},
    {icon:"🛂",title:"Passport renewal in 8 months",sub:"Expires Aug 2025 · Start now",        cta:"View", clr:C.purple},
  ],
  Priya:[
    {icon:"🦷",title:"Dentist — 10:30 AM today",  sub:"Dr. Sharma Dental · 54 min away",      cta:"Map",  clr:C.blue},
    {icon:"💊",title:"Prescription running low",   sub:"Thyroid medication · 5 days left",     cta:"Order",clr:C.amber},
  ],
  Aarav:[
    {icon:"💉",title:"MMR vaccine overdue",        sub:"Paediatrician recommended · This month",cta:"Book", clr:C.red},
    {icon:"📚",title:"School fee due Dec 15",      sub:"Q4 2024–25 · ₹24,500",                cta:"Pay",  clr:C.amber},
  ],
  Grandma:[
    {icon:"💊",title:"Medication review overdue",  sub:"Last reviewed 4 months ago",           cta:"Book", clr:C.amber},
    {icon:"🫀",title:"Cardiology follow-up due",  sub:"Dr. Mehta — 6-month review",            cta:"Book", clr:C.blue},
  ],
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Spark({ data, color }: { data:number[]; color:string }) {
  const w=52, h=22;
  const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
  const pts=data.map((v,i)=>[
    (i/(data.length-1))*w,
    h-((v-mn)/rng)*(h-5)-2,
  ]);
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last=pts[pts.length-1];
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <path d={d} fill="none" stroke={color} strokeWidth={1.6}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.8}/>
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color}/>
    </svg>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 24,
  boxShadow: "0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.045)",
};

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color:"rgba(255,255,255,0.28)", fontSize:11, fontWeight:600,
      letterSpacing:"0.09em", textTransform:"uppercase" as const }}>
      {children}
    </span>
  );
}

function IBox({ color, size=44, children }:{ color:string; size?:number; children:React.ReactNode }) {
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.32),
      background:`${color}16`, border:`1px solid ${color}26`,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      {children}
    </div>
  );
}

function Ava({ init, color, size=44 }:{ init:string; color:string; size?:number }) {
  return (
    <div style={{ width:size, height:size, borderRadius:size/2,
      background:`linear-gradient(135deg,${color}35,${color}18)`,
      border:`1.5px solid ${color}38`,
      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ color, fontSize:size*0.36, fontWeight:700 }}>{init}</span>
    </div>
  );
}

// ─── Health ring ──────────────────────────────────────────────────────────────
function Ring({ score, color=C.green }:{ score:number; color?:string }) {
  const S=144, C2=72, R=56, SW=8;
  const circ = 2*Math.PI*R;
  const off  = circ - (score/100)*circ;
  return (
    <div style={{ position:"relative", width:S, height:S }}>
      <svg width={S} height={S} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={C2} cy={C2} r={R} fill="none" stroke={`${color}18`} strokeWidth={SW}/>
        <circle cx={C2} cy={C2} r={R} fill="none" stroke={color} strokeWidth={SW}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex",
        flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2 }}>
        <span style={{ color:C.fg, fontSize:32, fontWeight:700, letterSpacing:-1.5, lineHeight:1 }}>
          {score}
        </span>
        <span style={{ color:C.dim, fontSize:11, fontWeight:500, letterSpacing:"0.04em",
          textTransform:"uppercase" }}>Score</span>
      </div>
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────
function Bar() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
  });
  React.useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`);
    }, 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"10px 28px 0", flexShrink:0 }}>
      <span style={{ color:C.fg, fontSize:15, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>
        {time}
      </span>
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"flex-end", gap:2 }}>
          {[4,6,9,11].map((h,i)=>
            <div key={i} style={{ width:3, height:h, background:C.fg, opacity:i===3?.28:1, borderRadius:2 }}/>
          )}
        </div>
        <svg width="15" height="12" viewBox="0 0 24 18" fill="none">
          <circle cx="12" cy="16" r="2.5" fill={C.fg}/>
          <path d="M7 11C8.5 9.5 10.2 8.8 12 8.8s3.5.7 5 2.2" stroke={C.fg} strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M3 7C5.5 4.5 8.6 3.3 12 3.3s6.5 1.2 9 3.7" stroke={C.fg} strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
        <div style={{ display:"flex", alignItems:"center" }}>
          <div style={{ width:24, height:11, border:"1.5px solid rgba(255,255,255,0.4)",
            borderRadius:3.5, padding:2, boxSizing:"border-box" as const }}>
            <div style={{ width:"82%", height:"100%", background:C.fg, borderRadius:1.5 }}/>
          </div>
          <div style={{ width:2.5, height:5, background:"rgba(255,255,255,0.38)",
            borderRadius:"0 1px 1px 0", marginLeft:1 }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Hdr({ back, onBack, nav }:{ back?:boolean; onBack?:()=>void; nav:Nav }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"14px 20px 4px", flexShrink:0 }}>
      {back
        ? <button onClick={onBack} style={{ width:36, height:36, borderRadius:12,
            background:C.surface, border:`1px solid ${C.line}`,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ArrowLeft size={17} color={C.mid}/>
          </button>
        : <div style={{ width:36 }}/>
      }
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>nav("search")} style={{ width:36, height:36, borderRadius:12,
          background:"none", border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Search size={20} color={C.dim} strokeWidth={1.8}/>
        </button>
        <button onClick={()=>nav("profile")} style={{ width:34, height:34, borderRadius:17,
          background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>N</span>
        </button>
      </div>
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────
function Nav({ active, nav }:{ active:Screen; nav:Nav }) {
  const items = [
    { id:"home"    as Screen, I:Home,     l:"Home"    },
    { id:"health"  as Screen, I:Heart,    l:"Health"  },
    { id:"ask"     as Screen, I:Sparkles, l:"Ask", cx:true },
    { id:"more"    as Screen, I:FileText, l:"More"    },
    { id:"profile" as Screen, I:User,     l:"Profile" },
  ];
  return (
    <div style={{
      position:"absolute", bottom:22, left:14, right:14,
      background:"rgba(10,10,14,0.94)",
      backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)",
      border:"1px solid rgba(255,255,255,0.08)",
      borderRadius:36, padding:"8px 4px",
      display:"flex", alignItems:"center", justifyContent:"space-around",
      boxShadow:"0 16px 56px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {items.map(({ id, I, l, cx })=>{
        const on = active===id;
        if (cx) return (
          <button key={id} onClick={()=>nav(id)} style={{
            width:54, height:54, borderRadius:20, cursor:"pointer",
            background: on
              ? `linear-gradient(145deg,${C.blue},${C.indigo})`
              : `linear-gradient(145deg,rgba(59,130,246,0.2),rgba(99,102,241,0.12))`,
            border:`1px solid ${on?"rgba(99,102,241,0.55)":"rgba(59,130,246,0.22)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            transform:"translateY(-6px)",
            boxShadow: on?"0 8px 24px rgba(59,130,246,0.45)":"0 4px 14px rgba(0,0,0,0.4)",
          }}>
            <I size={22} color={on?"#fff":C.blue} strokeWidth={on?2:1.8}/>
          </button>
        );
        return (
          <button key={id} onClick={()=>nav(id)} style={{
            display:"flex", flexDirection:"column", alignItems:"center", gap:4,
            padding:"4px 14px", background:"none", border:"none", cursor:"pointer",
            position:"relative" }}>
            {/* Sliding pill glow behind active icon */}
            {on && (
              <div style={{
                position:"absolute", top:0, left:"50%",
                transform:"translateX(-50%)",
                width:36, height:28, borderRadius:10,
                background:`${C.blue}18`,
                boxShadow:`0 0 12px ${C.blue}30`,
              }}/>
            )}
            <I size={21} color={on?C.blue:"rgba(255,255,255,0.28)"}
              strokeWidth={on?2.2:1.7}/>
            <span style={{ color:on?C.blue:"rgba(255,255,255,0.28)",
              fontSize:10, fontWeight:on?600:400, letterSpacing:0.1 }}>{l}</span>
            {/* Active dot under label */}
            <div style={{ width:3, height:3, borderRadius:1.5,
              background: on ? C.blue : "transparent",
              marginTop:0 }}/>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ nav }:{ nav:Nav }) {
  const [who, setWho] = useState("Nivedan");
  const items = ATTENTION[who] ?? [];
  const statusOk = items.length===0;

  // Time-aware greeting
  const hr = new Date().getHours();
  const greet = hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  // Schedule with "past / now / upcoming" awareness
  const nowMins = hr*60 + new Date().getMinutes();
  const toMins  = (t:string) => { const [h,m]=t.split(":"); return +h*60+ +m; };
  const schedule = [
    { t:"10:30", ev:"Priya — Dentist",      tag:"Health"    },
    { t:"15:00", ev:"Aarav — School PTM",   tag:"Education" },
    { t:"21:30", ev:"Flight check-in opens",tag:"Travel"    },
  ];

  return <>
    {/* ── Greeting ─────────────────────────────────────────────────── */}
    <div style={{ padding:"4px 26px 22px" }}>
      <p style={{ color:C.dim, fontSize:14, marginBottom:5 }}>{dateStr}</p>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <h1 style={{ color:C.fg, fontSize:38, fontWeight:700,
            letterSpacing:-2, lineHeight:1.05, marginBottom:10 }}>
            {greet},<br/>Nivedan.
          </h1>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:7, height:7, borderRadius:4, flexShrink:0,
              background: statusOk ? C.green : C.amber,
              boxShadow: statusOk ? `0 0 8px ${C.green}90` : `0 0 8px ${C.amber}90` }}/>
            <p style={{ color: statusOk ? C.green : C.amber,
              fontSize:15, fontWeight:500, letterSpacing:-0.2 }}>
              {statusOk ? "Everything looks clear." : `${items.length} things need you.`}
            </p>
          </div>
        </div>
        <button onClick={()=>nav("search")}
          style={{ marginTop:4, width:38, height:38, borderRadius:13,
            background:C.surface, border:`1px solid ${C.line}`,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Search size={18} color={C.dim} strokeWidth={1.8}/>
        </button>
      </div>
    </div>

    {/* ── AI Morning Briefing ─────────────────────────────────────── */}
    <div style={{ padding:"0 20px 22px" }}>
      <div style={{
        background:"linear-gradient(135deg,rgba(99,102,241,0.1),rgba(59,130,246,0.06))",
        border:"1px solid rgba(99,102,241,0.2)",
        borderRadius:24, padding:"20px 22px",
        boxShadow:"0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
          <Sparkles size={13} color={C.blue}/>
          <span style={{ color:C.blue, fontSize:11, fontWeight:600,
            letterSpacing:"0.08em", textTransform:"uppercase" }}>Chronicle AI</span>
        </div>
        <p style={{ color:"rgba(255,255,255,0.78)", fontSize:15, lineHeight:1.7,
          letterSpacing:-0.1 }}>
          Priya's dentist is in 54 minutes. Your credit card payment is due tomorrow —
          ₹12,430 HDFC Regalia. Aarav's MMR vaccine window closes this month.
        </p>
        <button onClick={()=>nav("ask")}
          style={{ marginTop:14, display:"flex", alignItems:"center", gap:6,
            background:"none", border:"none", cursor:"pointer" }}>
          <span style={{ color:C.blue, fontSize:13, fontWeight:500 }}>Ask a follow-up</span>
          <ChevronRight size={13} color={C.blue}/>
        </button>
      </div>
    </div>

    {/* ── Family switcher — Stories-style avatar row ───────────────── */}
    <div style={{ padding:"0 20px 22px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:14 }}>
        <Lbl>Family</Lbl>
        <button onClick={()=>nav("profile")} style={{ display:"flex", alignItems:"center", gap:3,
          background:"none", border:"none", cursor:"pointer" }}>
          <span style={{ color:C.dim, fontSize:12 }}>Manage</span>
          <ChevronRight size={12} color={C.dim}/>
        </button>
      </div>

      <div style={{ display:"flex", gap:18 }}>
        {MEMBERS.map(m=>{
          const sel = who===m.name;
          const att = (ATTENTION[m.name]||[]).length;
          const ringSize = 52;
          const pad = 3; // gap between ring and avatar
          return (
            <button key={m.name} onClick={()=>setWho(m.name)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center",
                gap:7, background:"none", border:"none", cursor:"pointer" }}>
              {/* SVG ring — glows when selected, amber dash when has alerts */}
              <div style={{ position:"relative", width:ringSize, height:ringSize }}>
                <svg width={ringSize} height={ringSize}
                  style={{ position:"absolute", inset:0,
                    transform:"rotate(-90deg)",
                    opacity: sel ? 1 : att > 0 ? 0.55 : 0.15 }}>
                  <circle cx={ringSize/2} cy={ringSize/2} r={ringSize/2-2}
                    fill="none"
                    stroke={att > 0 ? C.amber : m.color}
                    strokeWidth={sel ? 2.5 : 1.5}
                    strokeDasharray={att > 0 ? "4 3" : "none"}
                    strokeLinecap="round"/>
                </svg>
                {/* Avatar inset */}
                <div style={{ position:"absolute",
                  inset:pad+2, borderRadius:"50%", overflow:"hidden",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg,${m.color}28,${m.color}14)`,
                  boxShadow: sel ? `0 0 16px ${m.color}40` : "none" }}>
                  <span style={{ color:m.color, fontSize:17, fontWeight:700 }}>{m.init}</span>
                </div>
              </div>
              <span style={{ color: sel ? m.color : "rgba(255,255,255,0.38)",
                fontSize:11, fontWeight: sel ? 700 : 400,
                letterSpacing: sel ? -0.2 : 0 }}>
                {m.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>

    {/* ── All-clear positive card ──────────────────────────────────── */}
    {items.length === 0 && (
      <div style={{ padding:"0 20px 20px" }}>
        <div style={{
          background:"linear-gradient(135deg,rgba(16,185,129,0.09),rgba(16,185,129,0.04))",
          border:"1px solid rgba(16,185,129,0.18)", borderRadius:22,
          padding:"18px 20px", display:"flex", alignItems:"center", gap:14,
        }}>
          <div style={{ width:40, height:40, borderRadius:14, flexShrink:0,
            background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:20 }}>✓</span>
          </div>
          <div>
            <p style={{ color:C.green, fontSize:14.5, fontWeight:600,
              marginBottom:3 }}>All clear for {who}</p>
            <p style={{ color:"rgba(255,255,255,0.38)", fontSize:12.5, lineHeight:1.4 }}>
              No pending actions or upcoming deadlines.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* ── Attention items — Linear-style priority list ─────────────── */}
    {items.length > 0 && (
      <div style={{ padding:"0 20px 20px" }}>
        <div style={{ marginBottom:10 }}>
          <Lbl>Needs Attention — {who}</Lbl>
        </div>
        {/* Single grouped card, items separated by hairlines */}
        <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
          {items.map((it,i)=>(
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:13,
              padding:"15px 18px",
              borderBottom: i<items.length-1
                ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              {/* Priority dot */}
              <div style={{ width:8, height:8, borderRadius:4,
                background:it.clr, flexShrink:0,
                boxShadow:`0 0 8px ${it.clr}60` }}/>
              {/* Emoji */}
              <span style={{ fontSize:19, flexShrink:0, lineHeight:1 }}>{it.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ color:C.fg, fontSize:14, fontWeight:500,
                  letterSpacing:-0.2, marginBottom:2 }}>{it.title}</p>
                <p style={{ color:"rgba(255,255,255,0.38)", fontSize:12 }}>{it.sub}</p>
              </div>
              {/* Ghost CTA — unobtrusive */}
              <button style={{ background:"none", border:"none", cursor:"pointer",
                padding:"4px 8px" }}>
                <span style={{ color:it.clr, fontSize:12.5,
                  fontWeight:600 }}>{it.cta} →</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* ── Today's schedule ──────────────────────────────────────────── */}
    <div style={{ padding:"0 20px 20px" }}>
      <div style={{ marginBottom:12 }}><Lbl>Today</Lbl></div>
      <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
        {schedule.map((ev,i)=>{
          const evMins = toMins(ev.t);
          const isPast = nowMins > evMins + 60;
          const isNow  = nowMins >= evMins && nowMins <= evMins + 60;
          return (
            <div key={i} style={{
              display:"flex", alignItems:"center", gap:12, padding:"14px 18px",
              borderBottom:i<schedule.length-1?"1px solid rgba(255,255,255,0.05)":"none",
              opacity: isPast ? 0.38 : 1,
              background: isNow ? `${C.blue}05` : "none",
            }}>
              <div style={{ width:6, height:6, borderRadius:3, flexShrink:0,
                background: isNow ? C.blue : isPast ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
                boxShadow: isNow ? `0 0 7px ${C.blue}90` : "none" }}/>
              <span style={{ color: isNow ? C.blue : C.dim, fontSize:13,
                fontWeight: isNow ? 600 : 500, width:36,
                fontVariantNumeric:"tabular-nums", flexShrink:0 }}>{ev.t}</span>
              <p style={{ flex:1, color: isPast ? C.dim : C.fg,
                fontSize:14, fontWeight:500, letterSpacing:-0.2 }}>{ev.ev}</p>
              <div style={{ background: isNow ? `${C.blue}15` : C.ghost,
                border: isNow ? `1px solid ${C.blue}25` : "none",
                borderRadius:8, padding:"3px 9px" }}>
                <span style={{ color: isNow ? C.blue : C.dim, fontSize:11 }}>{ev.tag}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>

    {/* ── Module quick-access ───────────────────────────────────────── */}
    <div style={{ padding:"0 20px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:12 }}>
        <Lbl>Explore</Lbl>
        <button onClick={()=>nav("more")} style={{ display:"flex", alignItems:"center", gap:3,
          background:"none", border:"none", cursor:"pointer" }}>
          <span style={{ color:C.dim, fontSize:12 }}>All modules</span>
          <ChevronRight size={12} color={C.dim}/>
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[
          { e:"❤️", l:"Health",  id:"health"  as Screen, c:C.green  },
          { e:"📄", l:"Docs",    id:"documents" as Screen, c:C.purple },
          { e:"🤖", l:"Ask AI",  id:"ask"    as Screen, c:C.blue   },
        ].map((m,i)=>(
          <button key={i} onClick={()=>nav(m.id)} style={{
            background:C.surface, border:`1px solid ${C.line}`,
            borderRadius:20, padding:"16px 12px",
            display:"flex", flexDirection:"column", alignItems:"flex-start", gap:8,
            cursor:"pointer",
            boxShadow:`0 2px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}>
            <span style={{ fontSize:24 }}>{m.e}</span>
            <p style={{ color:C.fg, fontSize:13, fontWeight:600 }}>{m.l}</p>
          </button>
        ))}
      </div>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════════════════
// Tab accent colours — each section gets its own hue
const H_TABS: { id:HTab; l:string; I: React.ElementType; clr:string }[] = [
  { id:"overview", l:"Overview", I:LayoutGrid,         clr:C.green  },
  { id:"reports",  l:"Reports",  I:ScrollText,         clr:C.blue   },
  { id:"timeline", l:"Timeline", I:GitCommitHorizontal,clr:C.purple },
  { id:"metrics",  l:"Metrics",  I:BarChart2,          clr:C.amber  },
  { id:"insights", l:"Insights", I:Lightbulb,          clr:C.teal   },
  { id:"setup",    l:"Setup",    I:SlidersHorizontal,  clr:C.mid    },
];

function HealthScreen({ nav }:{ nav:Nav }) {
  const [tab, setTab] = useState<HTab>("overview");

  return <>
    {/* ── Header ──────────────────────────────────────────────────── */}
    <div style={{ padding:"0 22px 0", flexShrink:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:18 }}>
        <h1 style={{ color:C.fg, fontSize:34, fontWeight:700, letterSpacing:-1.6 }}>Health</h1>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>nav("search")} style={{ width:36, height:36, borderRadius:12,
            background:"none", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Search size={20} color={C.dim} strokeWidth={1.8}/>
          </button>
          <button onClick={()=>nav("profile")} style={{ width:34, height:34, borderRadius:17,
            background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
            border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:13, fontWeight:700 }}>N</span>
          </button>
        </div>
      </div>

      {/* ── Expanding icon tab rail ─────────────────────────────── */}
      {/* Container has a subtle track background */}
      <div style={{
        display:"flex", alignItems:"center", gap:6,
        background:C.surface, border:`1px solid ${C.line}`,
        borderRadius:26, padding:"5px 6px",
        marginBottom:20,
      }}>
        {H_TABS.map(t=>{
          const on = tab===t.id;
          return (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flexShrink:0,
              display:"flex", alignItems:"center", gap: on ? 7 : 0,
              /* Active expands; inactive is a square icon pill */
              padding: on ? "8px 14px 8px 10px" : "8px 10px",
              background: on ? `${t.clr}18` : "none",
              border:`1px solid ${on ? `${t.clr}35` : "transparent"}`,
              borderRadius:20,
              cursor:"pointer",
              /* Width transition makes it feel alive */
              transition:"all 0.22s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: on ? `0 2px 12px ${t.clr}22` : "none",
            }}>
              <t.I size={16} color={on ? t.clr : "rgba(255,255,255,0.3)"}
                strokeWidth={on ? 2.2 : 1.7}/>
              {/* Label slides in only for active tab */}
              {on && (
                <span style={{ color:t.clr, fontSize:12.5, fontWeight:700,
                  letterSpacing:-0.2, whiteSpace:"nowrap" }}>
                  {t.l}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>

    <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }} className="hide-scrollbar">
      {tab==="overview"  && <HOverview nav={nav}/>}
      {tab==="reports"   && <HReports/>}
      {tab==="timeline"  && <HTimeline/>}
      {tab==="metrics"   && <HMetrics/>}
      {tab==="insights"  && <HInsights nav={nav}/>}
      {tab==="setup"     && <HSetup/>}
    </div>
  </>;
}

function HOverview({ nav }:{ nav:Nav }) {
  return (
    <div style={{ padding:"0 22px" }}>
      {/* Health ring hero */}
      <div style={{ background:"linear-gradient(135deg,rgba(16,185,129,0.07),rgba(16,185,129,0.03))",
        border:"1px solid rgba(16,185,129,0.14)", borderRadius:28,
        padding:"22px 22px 18px", marginBottom:22 }}>
        {/* Main row: big ring + text */}
        <div style={{ display:"flex", alignItems:"center", gap:22, marginBottom:18 }}>
          <Ring score={90}/>
          <div style={{ flex:1 }}>
            <p style={{ color:"rgba(255,255,255,0.32)", fontSize:11, fontWeight:600,
              letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Nivedan</p>
            <h2 style={{ color:C.fg, fontSize:21, fontWeight:700, letterSpacing:-0.7,
              lineHeight:1.2, marginBottom:6 }}>You're in good health.</h2>
            <p style={{ color:C.mid, fontSize:13.5, lineHeight:1.5 }}>
              1 marker needs attention.<br/>
              <span style={{ color:"rgba(255,255,255,0.28)", fontSize:12 }}>Last synced 2 hrs ago</span>
            </p>
          </div>
        </div>
        {/* Family mini-rings row */}
        <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:14,
          display:"flex", justifyContent:"space-around" }}>
          {[
            {name:"Priya",   score:94, color:C.pink  },
            {name:"Aarav",   score:88, color:C.amber },
            {name:"Grandma", score:71, color:C.teal  },
          ].map(m=>(
            <div key={m.name} style={{ display:"flex", flexDirection:"column",
              alignItems:"center", gap:5 }}>
              <div style={{ position:"relative", width:40, height:40 }}>
                <svg width={40} height={40} style={{ transform:"rotate(-90deg)" }}>
                  <circle cx={20} cy={20} r={16} fill="none"
                    stroke={`${m.color}18`} strokeWidth={3.5}/>
                  <circle cx={20} cy={20} r={16} fill="none"
                    stroke={m.color} strokeWidth={3.5}
                    strokeDasharray={2*Math.PI*16}
                    strokeDashoffset={2*Math.PI*16*(1-m.score/100)}
                    strokeLinecap="round"/>
                </svg>
                <span style={{ position:"absolute", inset:0, display:"flex",
                  alignItems:"center", justifyContent:"center",
                  color:C.fg, fontSize:10, fontWeight:700 }}>{m.score}</span>
              </div>
              <span style={{ color:"rgba(255,255,255,0.4)", fontSize:10.5 }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attention items */}
      <div style={{ marginBottom:22 }}>
        <div style={{ marginBottom:12 }}><Lbl>Needs Your Attention</Lbl></div>
        {[
          { title:"Blood pressure elevated",  body:"128/82 mmHg — slightly above optimal. Monitor weekly and reduce sodium.",   clr:C.amber },
          { title:"Vitamin D above normal",   body:"32 ng/mL across 3 consecutive reports. Discuss supplementation with doctor.", clr:C.orange },
        ].map((it,i)=>(
          <div key={i} style={{ ...card, borderRadius:20, padding:"18px 20px",
            marginBottom:10, borderLeft:`3px solid ${it.clr}` }}>
            <p style={{ color:C.fg, fontSize:14.5, fontWeight:600,
              letterSpacing:-0.3, marginBottom:7 }}>{it.title}</p>
            <p style={{ color:C.mid, fontSize:13.5, lineHeight:1.6, marginBottom:12 }}>{it.body}</p>
            <div style={{ display:"flex", gap:10 }}>
              <div style={{ flex:1, background:`${it.clr}10`, border:`1px solid ${it.clr}22`,
                borderRadius:12, padding:"8px 0", display:"flex", alignItems:"center",
                justifyContent:"center", cursor:"pointer" }}>
                <span style={{ color:it.clr, fontSize:13, fontWeight:600 }}>Track</span>
              </div>
              <div onClick={()=>nav("ask")} style={{ flex:1, background:C.ghost,
                borderRadius:12, padding:"8px 0", display:"flex", alignItems:"center",
                justifyContent:"center", cursor:"pointer" }}>
                <span style={{ color:C.mid, fontSize:13, fontWeight:500 }}>Ask Chronicle</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Key vitals with sparklines */}
      <div style={{ marginBottom:22 }}>
        <div style={{ marginBottom:12 }}><Lbl>Key Vitals</Lbl></div>
        <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
          {[
            {l:"Heart Rate",     v:"68 bpm",   n:"Normal",          c:C.green,  spark:[64,67,71,69,68,68]},
            {l:"Blood Pressure", v:"128/82",   n:"Slightly high",   c:C.amber,  spark:[119,122,125,120,126,128]},
            {l:"Vitamin D",      v:"32 ng/mL", n:"Above range",     c:C.orange, spark:[27,28,29,30,31,32]},
            {l:"Sleep",          v:"7h 24m",   n:"+23m avg",        c:C.green,  spark:[6.2,6.8,7.1,6.9,7.0,7.4]},
            {l:"BMI",            v:"23.4",     n:"Healthy",         c:C.green,  spark:[24.1,23.9,23.8,23.6,23.5,23.4]},
          ].map((v,i,a)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"13px 20px",
              borderBottom:i<a.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
              <span style={{ flex:1, color:"rgba(255,255,255,0.5)", fontSize:13.5 }}>{v.l}</span>
              {/* Sparkline */}
              <Spark data={v.spark} color={v.c}/>
              <div style={{ textAlign:"right", minWidth:72 }}>
                <p style={{ color:C.fg, fontSize:15, fontWeight:700,
                  letterSpacing:-0.4, marginBottom:1 }}>{v.v}</p>
                <p style={{ color:v.c, fontSize:11, fontWeight:500 }}>{v.n}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HReports() {
  const rpts = [
    {t:"Annual Physical Exam",      d:"Nov 12, 2024", who:"Nivedan", ok:true  },
    {t:"Blood Work — General Panel",d:"Oct 28, 2024", who:"Nivedan", ok:false },
    {t:"Vitamin D Test",            d:"Oct 20, 2024", who:"Nivedan", ok:false },
    {t:"Pediatric Checkup",         d:"Oct 15, 2024", who:"Aarav",   ok:true  },
    {t:"Lipid Profile",             d:"Sep 4, 2024",  who:"Nivedan", ok:true  },
  ];
  return (
    <div style={{ padding:"0 22px" }}>
      <div style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)",
        borderRadius:20, padding:"14px 20px", display:"flex", alignItems:"center", gap:12,
        marginBottom:20 }}>
        <AlertCircle size={18} color={C.amber}/>
        <span style={{ flex:1, color:C.amber, fontSize:14, fontWeight:500 }}>
          6 reports pending your review
        </span>
        <div style={{ background:C.amber, borderRadius:10, padding:"5px 14px", cursor:"pointer" }}>
          <span style={{ color:"#000", fontSize:12, fontWeight:700 }}>Review</span>
        </div>
      </div>
      <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
        {rpts.map((r,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:13, padding:"15px 20px",
            borderBottom:i<rpts.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
            <IBox color={r.ok?C.green:C.amber} size={40}>
              <FileText size={17} color={r.ok?C.green:C.amber} strokeWidth={1.8}/>
            </IBox>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:3 }}>
                <p style={{ color:C.fg, fontSize:14, fontWeight:500 }}>{r.t}</p>
                {!r.ok && <div style={{ width:6, height:6, borderRadius:3, background:C.amber }}/>}
              </div>
              <p style={{ color:C.mid, fontSize:12.5 }}>{r.d}</p>
            </div>
            <div style={{ background:C.ghost, borderRadius:8, padding:"3px 9px" }}>
              <span style={{ color:C.dim, fontSize:11 }}>{r.who}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HTimeline() {
  const events = [
    {d:"Nov 2024",t:"Annual Physical",  b:"All clear · 1 follow-up on BP",         c:C.green },
    {d:"Oct 2024",t:"Blood Work",       b:"Vitamin D elevated — flagged",           c:C.amber },
    {d:"Sep 2024",t:"Aarav — Paediatric",b:"6-month visit · Growth on track",       c:C.blue  },
    {d:"Mar 2024",t:"Cardiology Consult",b:"Normal sinus rhythm · Annual follow-up", c:C.green },
    {d:"Jan 2024",t:"Lipid Profile",    b:"Cholesterol improved from 2023",         c:C.green },
  ];
  return (
    <div style={{ padding:"0 22px", position:"relative" }}>
      <div style={{ position:"absolute", left:42, top:8, bottom:8, width:1,
        background:"linear-gradient(to bottom,transparent,rgba(255,255,255,0.07) 15%,rgba(255,255,255,0.07) 85%,transparent)" }}/>
      {events.map((ev,i)=>(
        <div key={i} style={{ display:"flex", gap:14, alignItems:"flex-start",
          marginBottom:i<events.length-1?20:0 }}>
          <div style={{ width:30, flexShrink:0, paddingTop:2, textAlign:"right" }}>
            <span style={{ color:C.ghost, fontSize:10, fontWeight:600,
              letterSpacing:"0.04em", lineHeight:1.2 }}>
              {ev.d.replace(" ","\n")}
            </span>
          </div>
          <div style={{ width:16, display:"flex", justifyContent:"center",
            flexShrink:0, paddingTop:5 }}>
            <div style={{ width:8, height:8, borderRadius:4, background:ev.c,
              boxShadow:`0 0 0 3px ${ev.c}20` }}/>
          </div>
          <div style={{ ...card, flex:1, borderRadius:18, padding:"14px 16px" }}>
            <p style={{ color:C.fg, fontSize:14, fontWeight:600,
              letterSpacing:-0.3, marginBottom:4 }}>{ev.t}</p>
            <p style={{ color:C.mid, fontSize:13, lineHeight:1.5 }}>{ev.b}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HMetrics() {
  const m = [
    {l:"Vitamin D",    v:"32 ng/mL", p:"28",  tr:"↑", c:C.orange},
    {l:"Cholesterol",  v:"182 mg/dL",p:"194", tr:"↓", c:C.green },
    {l:"Blood Glucose",v:"94 mg/dL", p:"91",  tr:"↑", c:C.green },
    {l:"Haemoglobin",  v:"14.2 g/dL",p:"14.0",tr:"→", c:C.green },
    {l:"Creatinine",   v:"0.9 mg/dL",p:"0.9", tr:"→", c:C.green },
    {l:"Triglycerides",v:"138 mg/dL",p:"155", tr:"↓", c:C.green },
  ];
  return (
    <div style={{ padding:"0 22px" }}>
      <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
        {m.map((v,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", padding:"14px 20px",
            borderBottom:i<m.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
            <span style={{ flex:1, color:C.mid, fontSize:14 }}>{v.l}</span>
            <div style={{ textAlign:"right" }}>
              <p style={{ color:C.fg, fontSize:15, fontWeight:600,
                letterSpacing:-0.3, marginBottom:2 }}>{v.v}</p>
              <p style={{ color:v.c, fontSize:11.5 }}>{v.tr} prev {v.p}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HInsights({ nav }:{ nav:Nav }) {
  return (
    <div style={{ padding:"0 22px" }}>
      {[
        {h:"Vitamin D elevated for 3 months",
         b:"Your readings have been consistently above 30 ng/mL. Consider discussing D3 supplementation with your doctor at your next visit.",
         c:C.amber},
        {h:"Cholesterol trending downward",
         b:"Dropped from 194 → 182 mg/dL over 6 months. Your dietary changes appear to be working well.",
         c:C.green},
        {h:"Grandma's annual checkup overdue",
         b:"Last general health checkup on record was January 2024. A yearly review is recommended for her age group.",
         c:C.blue},
      ].map((ins,i)=>(
        <div key={i} style={{ ...card, borderRadius:22, padding:"20px 20px",
          marginBottom:12 }}>
          <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ width:10, height:10, borderRadius:5, background:ins.c,
              flexShrink:0, marginTop:4 }}/>
            <p style={{ color:C.fg, fontSize:15, fontWeight:600,
              letterSpacing:-0.3, lineHeight:1.3 }}>{ins.h}</p>
          </div>
          <p style={{ color:C.mid, fontSize:13.5, lineHeight:1.65,
            paddingLeft:20, marginBottom:14 }}>{ins.b}</p>
          <button onClick={()=>nav("ask")} style={{ marginLeft:20,
            display:"flex", alignItems:"center", gap:6,
            background:"none", border:"none", cursor:"pointer" }}>
            <Sparkles size={12} color={C.blue}/>
            <span style={{ color:C.blue, fontSize:12.5, fontWeight:500 }}>
              Ask Chronicle about this
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}

function HSetup() {
  return (
    <div style={{ padding:"0 22px" }}>
      <div style={{ marginBottom:12 }}><Lbl>Connected Drive</Lbl></div>
      <div style={{ ...card, borderRadius:20, padding:"16px 18px",
        display:"flex", alignItems:"center", gap:13, marginBottom:24 }}>
        <IBox color={C.green} size={42}><Cloud size={18} color={C.green} strokeWidth={1.8}/></IBox>
        <div style={{ flex:1 }}>
          <p style={{ color:C.fg, fontSize:14.5, fontWeight:600, marginBottom:3 }}>Google Drive</p>
          <p style={{ color:C.green, fontSize:13, fontWeight:500 }}>Connected · 1 folder</p>
        </div>
        <div style={{ background:C.ghost, border:`1px solid ${C.line}`,
          borderRadius:12, padding:"7px 15px", cursor:"pointer" }}>
          <span style={{ color:C.mid, fontSize:13 }}>Manage</span>
        </div>
      </div>

      <div style={{ marginBottom:12 }}><Lbl>Assigned Folder</Lbl></div>
      <div style={{ ...card, borderRadius:20, padding:"16px 18px", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:13 }}>
          <IBox color={C.blue} size={40}><Folder size={17} color={C.blue} strokeWidth={1.8}/></IBox>
          <div style={{ flex:1 }}>
            <p style={{ color:C.fg, fontSize:14.5, fontWeight:600, marginBottom:8 }}>Nivedan</p>
            <p style={{ color:C.dim, fontSize:12, marginBottom:2 }}>Google Drive · Assigned Jul 24, 2026</p>
            <p style={{ color:C.dim, fontSize:12, marginBottom:2 }}>17 reports · 11 health records</p>
            <p style={{ color:C.dim, fontSize:12, marginBottom:10 }}>Last scan today at 6:50 PM</p>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:6, height:6, borderRadius:3, background:C.green }}/>
              <span style={{ color:C.green, fontSize:12, fontWeight:500 }}>Configured</span>
            </div>
          </div>
          <div style={{ background:C.ghost, border:`1px solid ${C.line}`,
            borderRadius:10, padding:"6px 12px", cursor:"pointer", flexShrink:0 }}>
            <span style={{ color:C.mid, fontSize:12 }}>Change</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom:12 }}><Lbl>Import</Lbl></div>
      <div style={{ ...card, borderRadius:20, padding:"16px 18px",
        display:"flex", alignItems:"center", gap:13, marginBottom:12 }}>
        <IBox color={C.blue} size={40}><RefreshCw size={17} color={C.blue} strokeWidth={1.8}/></IBox>
        <div style={{ flex:1 }}>
          <p style={{ color:C.fg, fontSize:14.5, fontWeight:600, marginBottom:3 }}>Scan for new reports</p>
          <p style={{ color:C.mid, fontSize:12.5 }}>1 folder ready</p>
        </div>
        <div style={{ background:C.blue, borderRadius:12, padding:"7px 16px", cursor:"pointer" }}>
          <span style={{ color:"#fff", fontSize:13, fontWeight:600 }}>Scan now</span>
        </div>
      </div>
      <div style={{ background:"rgba(245,158,11,0.09)", border:"1px solid rgba(245,158,11,0.22)",
        borderRadius:18, padding:"15px 20px", display:"flex", alignItems:"center",
        justifyContent:"center", cursor:"pointer", marginBottom:24 }}>
        <span style={{ color:C.amber, fontSize:14, fontWeight:600 }}>
          Review 6 pending reports
        </span>
      </div>

      <div style={{ marginBottom:12 }}><Lbl>Privacy</Lbl></div>
      <div style={{ ...card, borderRadius:20, padding:"16px 18px",
        display:"flex", alignItems:"center", gap:13, marginBottom:20 }}>
        <IBox color={C.purple} size={40}><Eye size={17} color={C.purple} strokeWidth={1.8}/></IBox>
        <div style={{ flex:1 }}>
          <p style={{ color:C.fg, fontSize:14.5, fontWeight:600, marginBottom:3 }}>Health data</p>
          <p style={{ color:C.mid, fontSize:12.5 }}>Stored securely in your account</p>
        </div>
        <div style={{ background:C.ghost, border:`1px solid ${C.line}`,
          borderRadius:12, padding:"7px 15px", cursor:"pointer" }}>
          <span style={{ color:C.mid, fontSize:12 }}>Manage</span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared composer box ─────────────────────────────────────────────────────
function Composer({ taRef, input, setInput, thinking, resize, send }:{
  taRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (v:string)=>void;
  thinking: boolean;
  resize: ()=>void;
  send: (t?:string)=>void;
}) {
  const active = input.trim() && !thinking;
  return (
    <div style={{
      background:C.surface,
      border:`1px solid ${input.trim() ? "rgba(99,102,241,0.4)" : C.line}`,
      borderRadius:22, padding:"12px 14px 10px",
      boxShadow: input.trim() ? "0 0 0 3px rgba(99,102,241,0.08)" : "none",
      transition:"border-color 0.2s, box-shadow 0.2s",
    }}>
      <textarea
        ref={taRef}
        value={input}
        rows={1}
        onChange={e=>{ setInput(e.target.value); resize(); }}
        onKeyDown={e=>{ if (e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
        placeholder="Ask anything — Shift+Enter for new line"
        style={{
          width:"100%", background:"none", border:"none", outline:"none",
          color:C.fg, fontSize:15, fontFamily:"inherit",
          resize:"none", lineHeight:1.6,
          maxHeight:140, overflowY:"auto",
          display:"block", boxSizing:"border-box" as const,
        }}
        className="hide-scrollbar"
      />
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginTop:10 }}>
        <div style={{ display:"flex", gap:6 }}>
          <button style={{ width:32, height:32, borderRadius:10,
            background:C.ghost, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Mic size={15} color={C.dim}/>
          </button>
          <button style={{ width:32, height:32, borderRadius:10,
            background:C.ghost, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Search size={15} color={C.dim}/>
          </button>
        </div>
        <button onClick={()=>send()} disabled={!active}
          style={{
            height:34, paddingInline:18, borderRadius:12, border:"none",
            cursor: active ? "pointer" : "default",
            background: active
              ? `linear-gradient(135deg,${C.blue},${C.indigo})`
              : C.ghost,
            display:"flex", alignItems:"center", gap:6,
            boxShadow: active ? "0 4px 14px rgba(59,130,246,0.38)" : "none",
            transition:"all 0.2s",
          }}>
          <span style={{ color: active?"#fff":C.dim, fontSize:13, fontWeight:600 }}>
            {thinking ? "Thinking…" : "Send"}
          </span>
          {!thinking && <Send size={13} color={active?"#fff":C.dim}/>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASK CHRONICLE
// ═══════════════════════════════════════════════════════════════════════════════
function AskScreen({ nav }:{ nav:Nav }) {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<{r:"u"|"ai";t:string}[]>([]);
  const [thinking, setThinking] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const chips = [
    "Summarise my latest health report",
    "What changed since last month?",
    "Compare cholesterol over 6 months",
    "Any bills due this week?",
  ];

  // Auto-resize textarea
  const resize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const send = (text=input) => {
    if (!text.trim() || thinking) return;
    const q = text.trim();
    setMsgs(m=>[...m, {r:"u",t:q}]);
    setInput("");
    if (taRef.current) { taRef.current.style.height = "auto"; }
    setThinking(true);
    setTimeout(()=>{
      setThinking(false);
      setMsgs(m=>[...m, {r:"ai",t:"Looking across your health records, documents, and family data — I found relevant context in 3 sources. Here's what I know."}]);
    }, 1800);
  };

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Context strip ─────────────────────────────────────────── */}
      <div style={{ padding:"0 20px 14px", flexShrink:0,
        borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
        <p style={{ color:C.dim, fontSize:12, marginBottom:8 }}>Chronicle has context for</p>
        <div style={{ display:"flex", gap:7, overflowX:"auto" }} className="hide-scrollbar">
          {[
            {l:"Health records", c:C.green },
            {l:"4 documents",    c:C.blue  },
            {l:"Family · 4",     c:C.purple},
            {l:"Finance",        c:C.amber },
          ].map((ch,i)=>(
            <div key={i} style={{ flexShrink:0, background:`${ch.c}12`,
              border:`1px solid ${ch.c}25`, borderRadius:20, padding:"5px 12px" }}>
              <span style={{ color:ch.c, fontSize:12, fontWeight:500 }}>{ch.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll area ───────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:"auto", padding:"18px 20px 20px" }}
        className="hide-scrollbar">

        {msgs.length === 0 ? (
          /* ── EMPTY STATE: hero → composer → chips ─────────────── */
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Hero card — animated gradient */}
            <div style={{
              background:"linear-gradient(160deg,rgba(99,102,241,0.14) 0%,rgba(59,130,246,0.08) 50%,rgba(139,92,246,0.1) 100%)",
              border:"1px solid rgba(99,102,241,0.22)",
              borderRadius:26, padding:"24px 22px",
              boxShadow:"0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              animation:"gradientShift 6s ease infinite",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                <div style={{ width:46, height:46, borderRadius:15,
                  background:`linear-gradient(135deg,${C.indigo},${C.purple})`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Sparkles size={22} color="#fff"/>
                </div>
                <div>
                  <h2 style={{ color:C.fg, fontSize:20, fontWeight:700,
                    letterSpacing:-0.7, lineHeight:1.2, marginBottom:4 }}>
                    Ask anything about your family.
                  </h2>
                  <p style={{ color:C.mid, fontSize:13, lineHeight:1.5 }}>
                    Health records · Documents · Context
                  </p>
                </div>
              </div>
            </div>

            {/* ── Composer inline ────────────────────────────────── */}
            <Composer taRef={taRef} input={input} setInput={setInput}
              thinking={thinking} resize={resize} send={send}/>

            {/* Suggestion chips */}
            <div>
              <p style={{ color:"rgba(255,255,255,0.22)", fontSize:11, fontWeight:600,
                letterSpacing:"0.07em", textTransform:"uppercase",
                marginBottom:10 }}>Try asking</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {chips.map((c,i)=>(
                  <button key={i} onClick={()=>send(c)} style={{
                    ...card, borderRadius:16, padding:"13px 16px",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    cursor:"pointer", textAlign:"left",
                  }}>
                    <span style={{ color:"rgba(255,255,255,0.72)", fontSize:14 }}>{c}</span>
                    <ChevronRight size={14} color="rgba(255,255,255,0.2)"/>
                  </button>
                ))}
              </div>
            </div>

          </div>
        ) : (
          /* ── CONVERSATION STATE ──────────────────────────────── */
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {msgs.map((m,i)=>(
              <div key={i} style={{ display:"flex", flexDirection:"column",
                alignItems:m.r==="u"?"flex-end":"flex-start" }}>
                {m.r==="ai" ? (
                  <div style={{ maxWidth:"92%", ...card, borderRadius:20,
                    borderTopLeftRadius:6, padding:"16px 18px" }}>
                    <p style={{ color:"rgba(255,255,255,0.82)", fontSize:14.5,
                      lineHeight:1.7 }}>{m.t}</p>
                  </div>
                ) : (
                  <div style={{ maxWidth:"82%",
                    background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
                    borderRadius:20, borderTopRightRadius:6, padding:"12px 16px" }}>
                    <p style={{ color:"#fff", fontSize:14.5, lineHeight:1.5 }}>{m.t}</p>
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div style={{ display:"flex", alignItems:"flex-start" }}>
                <div style={{ ...card, borderRadius:20, borderTopLeftRadius:6,
                  padding:"16px 20px", display:"flex", gap:6, alignItems:"center" }}>
                  {[0,1,2].map(j=>(
                    <div key={j} style={{ width:6, height:6, borderRadius:3, background:C.mid,
                      animation:`pulse 1.2s ease-in-out ${j*0.2}s infinite` }}/>
                  ))}
                </div>
              </div>
            )}
            {!thinking && msgs.length>0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, paddingTop:4 }}>
                {chips.slice(0,2).map((c,i)=>(
                  <button key={i} onClick={()=>send(c)} style={{
                    background:C.surface, border:`1px solid ${C.line}`,
                    borderRadius:20, padding:"7px 14px", cursor:"pointer" }}>
                    <span style={{ color:C.mid, fontSize:12.5 }}>{c}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom composer — only visible in conversation state ── */}
      {msgs.length > 0 && (
        <div style={{ padding:"10px 18px 14px",
          borderTop:"1px solid rgba(255,255,255,0.05)", flexShrink:0 }}>
          <Composer taRef={taRef} input={input} setInput={setInput}
            thinking={thinking} resize={resize} send={send}/>
          <p style={{ color:"rgba(255,255,255,0.15)", fontSize:11,
            textAlign:"center", marginTop:8 }}>
            Chronicle can make mistakes. Verify important information.
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MORE — MODULE LAUNCHER
// ═══════════════════════════════════════════════════════════════════════════════
function MoreScreen({ nav }:{ nav:Nav }) {
  const mods = [
    {
      l:"Finance", icon:<Landmark size={28} color={C.green} strokeWidth={1.5}/>,
      grad:"linear-gradient(145deg,rgba(16,185,129,0.16),rgba(16,185,129,0.06))",
      border:"rgba(16,185,129,0.22)", c:C.green, open:false,
    },
    {
      l:"Insurance", icon:<Shield size={28} color={C.blue} strokeWidth={1.5}/>,
      grad:"linear-gradient(145deg,rgba(59,130,246,0.16),rgba(59,130,246,0.06))",
      border:"rgba(59,130,246,0.22)", c:C.blue, open:false,
    },
    {
      l:"Travel", icon:<Plane size={28} color={C.amber} strokeWidth={1.5}/>,
      grad:"linear-gradient(145deg,rgba(245,158,11,0.16),rgba(245,158,11,0.06))",
      border:"rgba(245,158,11,0.22)", c:C.amber, open:false,
    },
    {
      l:"Education", icon:<GraduationCap size={28} color={C.teal} strokeWidth={1.5}/>,
      grad:"linear-gradient(145deg,rgba(6,182,212,0.16),rgba(6,182,212,0.06))",
      border:"rgba(6,182,212,0.22)", c:C.teal, open:false,
    },
    {
      l:"Assets", icon:<Diamond size={28} color={C.pink} strokeWidth={1.5}/>,
      grad:"linear-gradient(145deg,rgba(236,72,153,0.16),rgba(236,72,153,0.06))",
      border:"rgba(236,72,153,0.22)", c:C.pink, open:false,
    },
    {
      l:"Property", icon:<span style={{ fontSize:28 }}>🏠</span>,
      grad:"linear-gradient(145deg,rgba(249,115,22,0.16),rgba(249,115,22,0.06))",
      border:"rgba(249,115,22,0.22)", c:C.orange, open:false,
    },
  ];

  return <>
    <div style={{ padding:"4px 22px 0" }}>
      <h1 style={{ color:C.fg, fontSize:34, fontWeight:700,
        letterSpacing:-1.6, marginBottom:6 }}>More</h1>
      <p style={{ color:C.mid, fontSize:15, lineHeight:1.55, marginBottom:22 }}>
        Modules coming to Chronicle
      </p>

      {/* Documents — available now */}
      <div style={{ marginBottom:22 }}>
        <div style={{ marginBottom:12 }}><Lbl>Available Now</Lbl></div>
        <button onClick={()=>nav("documents")} style={{
          width:"100%",
          background:"linear-gradient(145deg,rgba(139,92,246,0.16),rgba(139,92,246,0.07))",
          border:"1px solid rgba(139,92,246,0.28)",
          borderRadius:26, padding:"22px 22px",
          display:"flex", alignItems:"center", gap:18,
          cursor:"pointer",
          boxShadow:"0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <div style={{ width:58, height:58, borderRadius:18,
            background:"rgba(139,92,246,0.2)", border:"1px solid rgba(139,92,246,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <FileText size={28} color={C.purple} strokeWidth={1.5}/>
          </div>
          <div style={{ flex:1, textAlign:"left" }}>
            <p style={{ color:C.fg, fontSize:20, fontWeight:700,
              letterSpacing:-0.6, marginBottom:5 }}>Documents</p>
            <p style={{ color:C.purple, fontSize:12, fontWeight:600,
              letterSpacing:"0.07em", textTransform:"uppercase" }}>Open</p>
          </div>
          <ChevronRight size={20} color={C.mid}/>
        </button>
      </div>

      {/* Coming soon grid */}
      <div style={{ marginBottom:22 }}>
        <div style={{ marginBottom:12 }}><Lbl>Coming Soon</Lbl></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {mods.map((m,i)=>(
            <div key={i} style={{
              position:"relative", overflow:"hidden",
              background:m.grad, border:`1px solid ${m.border}`,
              borderRadius:24, padding:"20px 16px 16px",
            }}>
              {/* Faint SVG preview — unique per module */}
              <svg width={80} height={48} style={{ position:"absolute",
                right:-4, bottom:-4, opacity:0.12 }}>
                {i===0 && /* Finance — bar chart */
                  [20,32,24,40,28,36].map((h,j)=>(
                    <rect key={j} x={j*12+2} y={48-h} width={8} height={h}
                      rx={2} fill={m.c}/>
                  ))
                }
                {i===1 && /* Insurance — shield arc */
                  <path d="M40 4 L68 14 L68 32 Q68 44 40 48 Q12 44 12 32 L12 14 Z"
                    fill="none" stroke={m.c} strokeWidth={3}/>
                }
                {i===2 && /* Travel — flight arc */
                  <>
                    <path d="M8 40 Q40 4 72 40" fill="none" stroke={m.c} strokeWidth={2.5}
                      strokeDasharray="4 3"/>
                    <circle cx={72} cy={40} r={4} fill={m.c}/>
                    <circle cx={8} cy={40} r={4} fill={m.c}/>
                  </>
                }
                {i===3 && /* Education — book lines */
                  [8,16,24,32,40].map((y,j)=>(
                    <line key={j} x1={10} y1={y} x2={j%2===0?60:50} y2={y}
                      stroke={m.c} strokeWidth={2.5} strokeLinecap="round"/>
                  ))
                }
                {i===4 && /* Assets — diamond */
                  <path d="M40 4 L72 28 L40 48 L8 28 Z" fill="none"
                    stroke={m.c} strokeWidth={2.5}/>
                }
                {i===5 && /* Property — house */
                  <path d="M40 6 L70 28 L64 28 L64 46 L16 46 L16 28 L10 28 Z"
                    fill="none" stroke={m.c} strokeWidth={2.5} strokeLinejoin="round"/>
                }
              </svg>

              <div style={{ marginBottom:14 }}>{m.icon}</div>
              <p style={{ color:C.fg, fontSize:15, fontWeight:700,
                letterSpacing:-0.3, marginBottom:5 }}>{m.l}</p>
              <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                background:"rgba(0,0,0,0.2)", borderRadius:8, padding:"3px 8px" }}>
                <div style={{ width:5, height:5, borderRadius:3, background:m.c }}/>
                <span style={{ color:m.c, fontSize:10, fontWeight:600,
                  letterSpacing:"0.06em" }}>COMING SOON</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════════
function DocsScreen({ nav }:{ nav:Nav }) {
  const cats = [
    {l:"Medical",   e:"🏥", n:14, c:C.green },
    {l:"Finance",   e:"💰", n:23, c:C.amber },
    {l:"Travel",    e:"✈️", n:8,  c:C.blue  },
    {l:"Legal",     e:"⚖️", n:6,  c:C.purple},
    {l:"Insurance", e:"🛡️", n:5,  c:C.teal  },
    {l:"Education", e:"📚", n:11, c:C.pink  },
  ];
  const recent = [
    {t:"Passport",                  s:"Expires Aug 2025",  c:C.blue,   warn:true,  type:"PDF"},
    {t:"Health Insurance Policy",   s:"Renewed Oct 2024",  c:C.teal,   warn:false, type:"PDF"},
    {t:"ITR Filing FY 2023–24",     s:"Filed July 2024",   c:C.amber,  warn:false, type:"DOC"},
    {t:"Aarav — Birth Certificate", s:"Added Sep 2024",    c:C.purple, warn:false, type:"IMG"},
  ];
  return <>
    <div style={{ padding:"0 22px" }}>
      {/* Search */}
      <div style={{ padding:"4px 0 18px" }}>
        <button onClick={()=>nav("search")} style={{ width:"100%", background:C.surface,
          border:`1px solid ${C.line}`, borderRadius:18, padding:"13px 16px",
          display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
          <Search size={17} color="rgba(255,255,255,0.2)"/>
          <span style={{ color:"rgba(255,255,255,0.2)", fontSize:15 }}>
            Search all documents…
          </span>
        </button>
      </div>

      {/* Expiry alert with time-remaining bar */}
      <div style={{ background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)",
        borderRadius:20, padding:"15px 18px 14px", marginBottom:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:13, marginBottom:12 }}>
          <span style={{ fontSize:20, flexShrink:0 }}>🛂</span>
          <div style={{ flex:1 }}>
            <p style={{ color:C.fg, fontSize:14, fontWeight:600, marginBottom:2 }}>
              Passport expires in 8 months
            </p>
            <p style={{ color:"rgba(255,255,255,0.38)", fontSize:12 }}>
              Renewal takes 4–6 weeks — start now
            </p>
          </div>
          <button style={{ background:C.amber, border:"none", borderRadius:11,
            padding:"5px 13px", cursor:"pointer", flexShrink:0 }}>
            <span style={{ color:"#000", fontSize:12, fontWeight:700 }}>Renew</span>
          </button>
        </div>
        {/* Days-remaining bar: 8 of 12 months left = 67% */}
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ flex:1, height:4, borderRadius:2,
            background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
            <div style={{ width:"67%", height:"100%", borderRadius:2,
              background:`linear-gradient(90deg,${C.amber},${C.orange})` }}/>
          </div>
          <span style={{ color:"rgba(255,255,255,0.28)", fontSize:11,
            flexShrink:0, whiteSpace:"nowrap" }}>8 of 12 months</span>
        </div>
      </div>

      {/* Categories — big-number texture tiles */}
      <div style={{ marginBottom:24 }}>
        <div style={{ marginBottom:12 }}><Lbl>Categories</Lbl></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {cats.map((c,i)=>(
            <div key={i} style={{
              position:"relative", overflow:"hidden",
              background:`linear-gradient(145deg,${c.c}10,${c.c}05)`,
              border:`1px solid ${c.c}20`,
              borderRadius:22, padding:"18px 16px 16px",
              cursor:"pointer",
              boxShadow:"0 2px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>
              {/* Big number watermark */}
              <span style={{
                position:"absolute", right:-4, top:-8,
                fontSize:72, fontWeight:800, lineHeight:1,
                color:c.c, opacity:0.07, letterSpacing:-4,
                userSelect:"none", pointerEvents:"none",
              }}>{c.n}</span>
              {/* Emoji icon */}
              <span style={{ fontSize:22, display:"block", marginBottom:20 }}>{c.e}</span>
              <p style={{ color:C.fg, fontSize:14.5, fontWeight:700,
                letterSpacing:-0.3, marginBottom:4 }}>{c.l}</p>
              <p style={{ color:c.c, fontSize:11.5, fontWeight:600 }}>
                {c.n} files
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div style={{ marginBottom:20 }}>
        <div style={{ marginBottom:12 }}><Lbl>Recent</Lbl></div>
        <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
          {recent.map((d,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:13,
              padding:"14px 18px",
              borderBottom:i<recent.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
              {/* File type badge */}
              <div style={{ width:42, height:42, borderRadius:13, flexShrink:0,
                background:`${d.c}12`, border:`1px solid ${d.c}22`,
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:1 }}>
                <FileText size={14} color={d.c} strokeWidth={2}/>
                <span style={{ color:d.c, fontSize:8, fontWeight:800,
                  letterSpacing:"0.05em" }}>{d.type}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:3 }}>
                  <p style={{ color:C.fg, fontSize:14, fontWeight:500 }}>{d.t}</p>
                  {d.warn && (
                    <div style={{ background:C.amber, borderRadius:5, padding:"1px 6px",
                      flexShrink:0 }}>
                      <span style={{ color:"#000", fontSize:9, fontWeight:800,
                        letterSpacing:"0.03em" }}>EXPIRES</span>
                    </div>
                  )}
                </div>
                <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12 }}>{d.s}</p>
              </div>
              <ChevronRight size={14} color="rgba(255,255,255,0.18)"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileScreen({ nav }:{ nav:Nav }) {
  // Each row has its own icon bg colour — Apple Settings pattern
  const secs = [
    { t:"Profile", rows:[
      {I:User,    l:"Account",           s:"Nivedan Nigam",                        bg:"#3B82F6"},
      {I:Users,   l:"Family",            s:"4 members",                             bg:"#8B5CF6"},
      {I:Sliders, l:"Preferences",       s:"Notifications & defaults",              bg:"#6366F1"},
    ]},
    { t:"Connections", rows:[
      {I:Link2,    l:"Connected Accounts",s:"Google Drive linked",                  bg:"#10B981"},
      {I:Settings, l:"Integrations",      s:"Connectors and data sources",          bg:"#64748B"},
    ]},
    { t:"App", rows:[
      {I:Heart,    l:"Health",            s:"Import sources & folders",             bg:"#EF4444"},
      {I:Eye,      l:"Privacy & Security",s:"2FA on · data management",             bg:"#F59E0B"},
    ]},
    { t:"Subscription", rows:[
      {I:Diamond,  l:"Chronicle Family",  s:"₹999 / mo · renews Jan 9",            bg:"#F97316"},
    ]},
  ];

  return <>
    <div style={{ padding:"0 22px" }}>
      {/* Avatar hero */}
      <div style={{ padding:"8px 0 28px", display:"flex",
        flexDirection:"column", alignItems:"center", gap:14 }}>
        <div style={{ width:86, height:86, borderRadius:43,
          background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 10px 32px rgba(59,130,246,0.35)" }}>
          <span style={{ color:"#fff", fontSize:36, fontWeight:700 }}>N</span>
        </div>
        <div style={{ textAlign:"center" }}>
          <h2 style={{ color:C.fg, fontSize:22, fontWeight:700,
            letterSpacing:-0.8, marginBottom:4 }}>Nivedan Nigam</h2>
          <p style={{ color:C.mid, fontSize:14 }}>nivedan.nigam@gmail.com</p>
        </div>
        {/* Family row */}
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {MEMBERS.map(m=>(
            <div key={m.name} style={{ display:"flex", flexDirection:"column",
              alignItems:"center", gap:5 }}>
              <Ava init={m.init} color={m.color} size={36}/>
              <span style={{ color:"rgba(255,255,255,0.3)", fontSize:10 }}>{m.name}</span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display:"flex", gap:0,
          background:C.surface, border:`1px solid ${C.line}`, borderRadius:18,
          overflow:"hidden" }}>
          {[
            { n:"67", l:"Docs"    },
            { n:"28", l:"Reports" },
            { n:"4",  l:"Members" },
          ].map((s,i)=>(
            <div key={i} style={{ flex:1, padding:"10px 0", textAlign:"center",
              borderRight:i<2?"1px solid rgba(255,255,255,0.06)":"none" }}>
              <p style={{ color:C.fg, fontSize:17, fontWeight:700,
                letterSpacing:-0.5, marginBottom:2 }}>{s.n}</p>
              <p style={{ color:"rgba(255,255,255,0.3)", fontSize:11 }}>{s.l}</p>
            </div>
          ))}
        </div>

        <div style={{ background:"rgba(59,130,246,0.1)",
          border:"1px solid rgba(59,130,246,0.22)",
          borderRadius:14, padding:"6px 18px" }}>
          <span style={{ color:C.blue, fontSize:12, fontWeight:600 }}>
            Chronicle Family Plan ✦
          </span>
        </div>
      </div>

      {secs.map((sec,si)=>(
        <div key={si} style={{ marginBottom:20 }}>
          <div style={{ marginBottom:12 }}><Lbl>{sec.t}</Lbl></div>
          <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
            {sec.rows.map((row,ri)=>(
              <div key={ri} style={{ display:"flex", alignItems:"center", gap:13,
                padding:"13px 18px",
                borderBottom:ri<sec.rows.length-1?"1px solid rgba(255,255,255,0.05)":"none",
                cursor:"pointer" }}>
                {/* Apple-style coloured icon square */}
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background:row.bg, display:"flex", alignItems:"center",
                  justifyContent:"center",
                  boxShadow:`0 2px 8px ${row.bg}40` }}>
                  <row.I size={17} color="#fff" strokeWidth={2}/>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ color:C.fg, fontSize:14.5, fontWeight:500 }}>{row.l}</p>
                  <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12 }}>{row.s}</p>
                </div>
                <ChevronRight size={14} color="rgba(255,255,255,0.18)"/>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button style={{ width:"100%", background:"rgba(239,68,68,0.07)",
        border:"1px solid rgba(239,68,68,0.18)", borderRadius:20, padding:"16px 20px",
        display:"flex", alignItems:"center", justifyContent:"center",
        cursor:"pointer", marginBottom:24 }}>
        <span style={{ color:C.red, fontSize:14, fontWeight:500 }}>Sign Out</span>
      </button>
      <p style={{ color:"rgba(255,255,255,0.15)", fontSize:11.5,
        textAlign:"center", marginBottom:24 }}>Chronicle v2.0 · Family OS</p>
    </div>
  </>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
function SearchScreen({ nav }:{ nav:Nav }) {
  const [q, setQ] = useState("");
  const recent = ["Passport expiry","Aarav vaccination","Income tax 2024","Japan trip"];
  const cats   = [
    {l:"Health",   e:"❤️", c:C.green,  n:28},
    {l:"Finance",  e:"💰", c:C.amber,  n:23},
    {l:"Travel",   e:"✈️", c:C.blue,   n:8 },
    {l:"Legal",    e:"⚖️", c:C.purple, n:6 },
    {l:"Insurance",e:"🛡️", c:C.teal,   n:5 },
    {l:"Education",e:"📚", c:C.pink,   n:11},
  ];
  const results = q.trim() ? [
    {t:"Passport — Nivedan", s:"Expires Aug 2025 · Travel", c:C.blue},
    {t:"Passport Application",s:"Uploaded Mar 2024 · Legal", c:C.purple},
  ] : [];

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"4px 20px 14px", flexShrink:0 }}>
        <div style={{ background:C.surface, border:"1px solid rgba(59,130,246,0.3)",
          borderRadius:20, padding:"13px 16px",
          display:"flex", alignItems:"center", gap:10,
          boxShadow:"0 0 0 3px rgba(59,130,246,0.06)" }}>
          <Search size={18} color={C.blue}/>
          <input value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search everything…" autoFocus
            style={{ flex:1, background:"none", border:"none", outline:"none",
              color:C.fg, fontSize:16, fontFamily:"inherit" }}/>
          {q && <button onClick={()=>setQ("")}
            style={{ background:"none", border:"none", cursor:"pointer" }}>
            <X size={16} color={C.mid}/>
          </button>}
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 20px" }} className="hide-scrollbar">
        {results.length>0 ? (
          <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
            {results.map((r,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:13,
                padding:"15px 20px",
                borderBottom:i<results.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                <IBox color={r.c} size={40}>
                  <FileText size={17} color={r.c} strokeWidth={1.8}/>
                </IBox>
                <div style={{ flex:1 }}>
                  <p style={{ color:C.fg, fontSize:14, fontWeight:500, marginBottom:3 }}>{r.t}</p>
                  <p style={{ color:C.mid, fontSize:12.5 }}>{r.s}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <>
          <div style={{ marginBottom:22 }}>
            <div style={{ marginBottom:12 }}><Lbl>Recent</Lbl></div>
            <div style={{ ...card, borderRadius:22, overflow:"hidden" }}>
              {recent.map((r,i)=>(
                <div key={i} onClick={()=>setQ(r)} style={{ display:"flex",
                  alignItems:"center", gap:13, padding:"13px 20px",
                  borderBottom:i<recent.length-1?"1px solid rgba(255,255,255,0.05)":"none",
                  cursor:"pointer" }}>
                  <Clock size={14} color={C.mid}/>
                  <span style={{ color:"rgba(255,255,255,0.68)", fontSize:14 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ marginBottom:12 }}><Lbl>Browse</Lbl></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {cats.map((c,i)=>(
                <div key={i} style={{
                  position:"relative", overflow:"hidden",
                  background:`linear-gradient(145deg,${c.c}10,${c.c}05)`,
                  border:`1px solid ${c.c}20`, borderRadius:18,
                  padding:"14px 12px 12px", cursor:"pointer",
                }}>
                  {/* Watermark number */}
                  <span style={{ position:"absolute", right:-2, top:-4,
                    fontSize:44, fontWeight:800, color:c.c, opacity:0.08,
                    lineHeight:1, userSelect:"none", pointerEvents:"none",
                    letterSpacing:-2 }}>{c.n}</span>
                  <span style={{ fontSize:20, display:"block", marginBottom:8 }}>{c.e}</span>
                  <p style={{ color:C.fg, fontSize:12, fontWeight:600,
                    marginBottom:2 }}>{c.l}</p>
                  <p style={{ color:c.c, fontSize:10.5, fontWeight:500 }}>{c.n}</p>
                </div>
              ))}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHELL + APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const nav: Nav = setScreen;

  const isFluid  = screen==="ask"  || screen==="search";
  const isHealth = screen==="health";

  return (
    <div style={{
      minHeight:"100vh", background:"#000",
      display:"flex", justifyContent:"center", alignItems:"flex-start",
      padding:"40px 0 56px",
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",
    }}>
      {/* Ambient glow — shifts colour per screen */}
      <div style={{
        position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:500, height:300, borderRadius:"50%", pointerEvents:"none", zIndex:0,
        background: screen==="health"  ? `radial-gradient(ellipse,${C.green}22 0%,transparent 70%)`
                  : screen==="ask"     ? `radial-gradient(ellipse,${C.indigo}22 0%,transparent 70%)`
                  : screen==="more"    ? `radial-gradient(ellipse,${C.purple}18 0%,transparent 70%)`
                  : screen==="profile" ? `radial-gradient(ellipse,${C.blue}18 0%,transparent 70%)`
                  : `radial-gradient(ellipse,${C.blue}15 0%,transparent 70%)`,
        transition:"background 0.6s ease",
        filter:"blur(20px)",
      }}/>

      {/* Phone */}
      <div style={{
        width:393, height:852, background:C.bg,
        borderRadius:54, overflow:"hidden", position:"relative", zIndex:1,
        flexShrink:0, display:"flex", flexDirection:"column",
        boxShadow:"0 0 0 1px rgba(255,255,255,0.10),0 0 0 2.5px rgba(255,255,255,0.03),0 52px 130px rgba(0,0,0,0.95)",
      }}>
        {/* Dynamic Island */}
        <div style={{ display:"flex", justifyContent:"center",
          paddingTop:14, flexShrink:0 }}>
          <div style={{ width:126, height:37, background:"#000", borderRadius:24 }}/>
        </div>

        <Bar/>

        {/* Per-screen chrome */}
        {screen==="ask" && (
          <div style={{ padding:"12px 20px 0", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", marginBottom:0 }}>
              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ width:34, height:34, borderRadius:11,
                  background:`linear-gradient(135deg,${C.blue},${C.indigo})`,
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Sparkles size={16} color="#fff"/>
                </div>
                <div>
                  <p style={{ color:C.fg, fontSize:15, fontWeight:600,
                    letterSpacing:-0.3, marginBottom:1 }}>Ask Chronicle</p>
                  <p style={{ color:C.mid, fontSize:11 }}>
                    Your family intelligence layer
                  </p>
                </div>
              </div>
              <button style={{ display:"flex", alignItems:"center", gap:5,
                background:C.surface, border:`1px solid ${C.line}`,
                borderRadius:12, padding:"7px 12px", cursor:"pointer" }}>
                <History size={13} color={C.dim}/>
                <span style={{ color:C.dim, fontSize:12 }}>History</span>
              </button>
            </div>
          </div>
        )}

        {screen==="search" && (
          <div style={{ display:"flex", alignItems:"center",
            padding:"12px 20px 4px", flexShrink:0 }}>
            <button onClick={()=>nav("home")} style={{ display:"flex",
              alignItems:"center", gap:6, background:"none",
              border:"none", cursor:"pointer" }}>
              <ArrowLeft size={17} color={C.mid}/>
              <span style={{ color:C.mid, fontSize:14 }}>Back</span>
            </button>
          </div>
        )}

        {screen==="home" && (
          <div style={{ padding:"14px 20px 0", display:"flex",
            justifyContent:"flex-end", flexShrink:0 }}/>
        )}

        {isHealth && (
          <div style={{ padding:"14px 20px 0", display:"flex",
            alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <button onClick={()=>nav("home")} style={{ display:"flex",
              alignItems:"center", gap:5, background:"none",
              border:"none", cursor:"pointer" }}>
              <ArrowLeft size={17} color={C.mid}/>
              <span style={{ color:C.mid, fontSize:14 }}>Home</span>
            </button>
          </div>
        )}

        {!isFluid && !isHealth && screen!=="home" && (
          <Hdr back onBack={()=>nav("home")} nav={nav}/>
        )}

        {/* Screen content */}
        {!isFluid && !isHealth
          ? <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }}
              className="hide-scrollbar">
              {screen==="home"     && <HomeScreen    nav={nav}/>}
              {screen==="more"     && <MoreScreen    nav={nav}/>}
              {screen==="documents"&& <DocsScreen    nav={nav}/>}
              {screen==="profile"  && <ProfileScreen nav={nav}/>}
            </div>
          : isHealth
            ? <HealthScreen nav={nav}/>
            : <>
                {screen==="ask"    && <AskScreen    nav={nav}/>}
                {screen==="search" && <SearchScreen nav={nav}/>}
              </>
        }

        <Nav active={screen} nav={nav}/>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display:none }
        .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none }
        input::placeholder { color:rgba(255,255,255,0.2) }
        textarea::placeholder { color:rgba(255,255,255,0.2) }
        /* Tactile press feedback — applies to every button in the app */
        button:active { transform:scale(0.96); transition:transform 0.08s ease }
        button { transition:transform 0.12s ease, opacity 0.12s ease }
        @keyframes pulse {
          0%,100% { opacity:0.25; transform:scale(0.8) }
          50%      { opacity:1;    transform:scale(1)   }
        }
        @keyframes gradientShift {
          0%,100% { filter:hue-rotate(0deg) brightness(1) }
          50%     { filter:hue-rotate(18deg) brightness(1.06) }
        }
        @keyframes blink {
          0%,100% { opacity:1 } 50% { opacity:0 }
        }
      `}</style>
    </div>
  );
}
