import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── Google Fonts ─────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; }
    input:focus { outline: 2px solid #3b82f6; outline-offset: 1px; }
    .pulse { animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite; }
    @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
    .slide-in { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none} }
    .bar-fill { transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:#1e293b}
    ::-webkit-scrollbar-thumb{background:#475569;border-radius:3px}
  `}</style>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const REPS = {
  Daniel:  { fullName:"Daniel Boyd",       quota:191354, group:"HS" },
  Lindsay: { fullName:"Lindsay Schneider", quota:191354, group:"HS" },
  John:    { fullName:"John Cott",         quota:191354, group:"HS" },
  Robby:   { fullName:"Robby Redmond",     quota:191354, group:"HS" },
  Jake:    { fullName:"Jake Anderson",     quota:191354, group:"HS" },
  Mark:    { fullName:"Mark Cox",          quota:171728, group:"PA" },
  Peyton:  { fullName:"Peyton Gertsema",   quota:130022, group:"PA" },
  Allyce:  { fullName:"Allyce Cain",       quota:130022, group:"PA" },
  Carter:  { fullName:"Carter Franklin",   quota:130022, group:"PA" },
};
const HS_REPS = ["Daniel","Lindsay","John","Robby","Jake"];
const PA_REPS = ["Mark","Peyton","Allyce","Carter"];
const ALL_REPS = [...HS_REPS,...PA_REPS];

const HIST = {
  Daniel:  { avgFinish:0.799, lockMult:0.87, low:0.58, high:1.05, trend:"under"    },
  Lindsay: { avgFinish:1.241, lockMult:1.16, low:0.18, high:2.29, trend:"volatile" },
  John:    { avgFinish:1.157, lockMult:1.03, low:0.91, high:1.30, trend:"steady"   },
  Robby:   { avgFinish:1.180, lockMult:1.08, low:1.02, high:1.28, trend:"steady"   },
  Jake:    { avgFinish:1.615, lockMult:1.40, low:0.66, high:2.48, trend:"upside"   },
  Mark:    { avgFinish:1.335, lockMult:1.03, low:0.80, high:1.10, trend:"steady"   },
  Peyton:  { avgFinish:1.581, lockMult:0.92, low:0.37, high:3.54, trend:"volatile" },
  Allyce:  { avgFinish:1.895, lockMult:1.08, low:0.71, high:5.03, trend:"upside"   },
  Carter:  { avgFinish:2.064, lockMult:1.23, low:1.16, high:2.06, trend:"upside"   },
};

const NAME_MAP = {
  "robby redmond":"Robby","robbie redmond":"Robby",
  "peyton gertsema":"Peyton","payton gertsema":"Peyton",
  "daniel boyd":"Daniel","dan boyd":"Daniel",
  "jake anderson":"Jake","jacob anderson":"Jake",
  "carter franklin":"Carter",
  "allyoe cain":"Allyce","allyce cain":"Allyce","allyse cain":"Allyce","allyc cain":"Allyce",
  "john cott":"John","john cot":"John",
  "lindsay schneider":"Lindsay","lindsey schneider":"Lindsay",
  "mark cox":"Mark",
};
const FIRST_MAP = {
  robby:"Robby",robbie:"Robby",peyton:"Peyton",payton:"Peyton",
  daniel:"Daniel",dan:"Daniel",jake:"Jake",jacob:"Jake",
  carter:"Carter",allyce:"Allyce",allyoe:"Allyce",allyse:"Allyce",
  john:"John",lindsay:"Lindsay",lindsey:"Lindsay",mark:"Mark",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n,c=false) => { if(!n&&n!==0||n===0)return"—"; return c?`$${n>=1000?(n/1000).toFixed(0)+"k":n}`:`$${Math.round(n).toLocaleString()}`; };
const pct  = (n,d) => (!d||!n)?null:Math.round((n/d)*100);
const pctStr = (n,d) => { const p=pct(n,d); return p!==null?`${p}%`:"—"; };
const daysInMonth = (y,m) => new Date(y,m,0).getDate();

const monthPacingPct = (year,month1idx) => {
  const today=new Date(), cy=today.getFullYear(), cm=today.getMonth();
  if(cy!==year||cm!==month1idx-1){ return today>new Date(year,month1idx-1,1)?100:0; }
  return Math.round((today.getDate()/daysInMonth(year,month1idx))*100);
};

const getPaceStatus = (repPct,monthPct) => {
  if(repPct===null||monthPct===0)return null;
  const d=repPct-monthPct;
  if(d>=10) return{label:"AHEAD",   color:"#10b981",bg:"rgba(16,185,129,0.12)"};
  if(d>=-5) return{label:"ON TRACK",color:"#3b82f6",bg:"rgba(59,130,246,0.12)"};
  if(d>=-20)return{label:"WATCH",   color:"#f59e0b",bg:"rgba(245,158,11,0.12)"};
  return       {label:"BEHIND",  color:"#ef4444",bg:"rgba(239,68,68,0.12)"};
};

const daysUntil5th = () => {
  const now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),5);
  if(now.getDate()>5) t.setMonth(t.getMonth()+1);
  return Math.max(0,Math.ceil((t-now)/(1000*60*60*24)));
};

const currentMonthKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const defaultMonthData = () => ({ startingForecasts:{}, locks:{}, stretches:{}, abClosedWon:{}, lastChartUpdate:null });

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function ISTCommandCenter() {
  const [tab, setTab]               = useState("tracker");
  const [data, setData]             = useState({ months:{} });
  const [activeMonth, setActiveMonth] = useState(currentMonthKey());
  const [loading, setLoading]       = useState(true);
  const [saveStatus, setSaveStatus] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartStatus, setChartStatus]   = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef();
  const saveTimeout  = useRef();

  const [activeYear, activeMonthNum] = activeMonth.split("-").map(Number);
  const monthName  = MONTHS[activeMonthNum-1];
  const monthData  = data.months[activeMonth] || defaultMonthData();
  const mPacing    = monthPacingPct(activeYear, activeMonthNum);

  // ── Load from Netlify Blobs ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/get-data")
      .then(r=>r.json())
      .then(d=>{ setData(d||{months:{}}); })
      .catch(()=>setData({months:{}}))
      .finally(()=>setLoading(false));
  }, []);

  // ── Save to Netlify Blobs (debounced) ────────────────────────────────────────
  const save = useCallback((newData) => {
    clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    saveTimeout.current = setTimeout(async () => {
      try {
        await fetch("/api/save-data", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify(newData),
        });
        setSaveStatus("saved");
        setTimeout(()=>setSaveStatus(null), 3000);
      } catch(e) {
        setSaveStatus("error");
      }
    }, 600);
  }, []);

  const updateMonthData = (updates) => {
    const newData = { ...data, months:{ ...data.months, [activeMonth]:{ ...monthData, ...updates } } };
    setData(newData);
    save(newData);
  };

  // ── Chart processing via Netlify Function ────────────────────────────────────
  const processChart = async (file) => {
    setChartLoading(true);
    setChartStatus({ type:"loading", msg:"Reading chart…" });
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=rej; r.readAsDataURL(file); });
      const resp = await fetch("/api/analyze-chart", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ base64, mediaType: file.type||"image/png" }),
      });
      const result = await resp.json();
      if(result.error) throw new Error(result.error);

      const newWon = { ...monthData.abClosedWon };
      let count = 0;
      Object.entries(result.extracted).forEach(([name,val])=>{
        const norm = name.toLowerCase().trim();
        const key  = NAME_MAP[norm] ?? FIRST_MAP[norm.split(/\s+/)[0]];
        if(key){ newWon[key]=Number(val); count++; }
      });
      if(count===0) throw new Error("No rep names matched");
      const now = new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
      updateMonthData({ abClosedWon:newWon, lastChartUpdate:now });
      setChartStatus({ type:"success", msg:`✓ Updated ${count} reps · ${now}` });
    } catch(e) {
      setChartStatus({ type:"error", msg:`Error: ${e.message}` });
    }
    setChartLoading(false);
  };

  const handleDrop = useCallback((e)=>{ e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f)processChart(f); },[monthData]);

  // ── Totals ───────────────────────────────────────────────────────────────────
  const totals = ALL_REPS.reduce((a,n)=>{ const md=monthData; a.sf+=md.startingForecasts[n]||0; a.lock+=md.locks[n]||0; a.stretch+=md.stretches[n]||0; a.ab+=md.abClosedWon[n]||0; return a; },{sf:0,lock:0,stretch:0,ab:0});

  if(loading) return (
    <div style={{background:"#0f172a",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#64748b",fontFamily:"monospace",fontSize:14}}>Loading IST Command Center…</div>
    </div>
  );

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  const s = {
    app:      { background:"#0f172a", minHeight:"100vh", fontFamily:"'Barlow',sans-serif", color:"#e2e8f0" },
    header:   { background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", borderBottom:"1px solid #1e3a5f", padding:"0 24px" },
    headerTop:{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:16, paddingBottom:12 },
    title:    { fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.02em" },
    subtitle: { fontSize:13, color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginTop:2 },
    badge:    (c)=>({ background:c, color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em" }),
    tabs:     { display:"flex", gap:0, borderTop:"1px solid #1e3a5f", marginTop:4 },
    tab:      (a)=>({ padding:"12px 20px", fontSize:14, fontWeight:a?700:500, color:a?"#60a5fa":"#64748b", cursor:"pointer", borderBottom:a?"3px solid #3b82f6":"3px solid transparent", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em", textTransform:"uppercase", transition:"all 0.15s", background:"none", border:"none", borderBottom:a?"3px solid #3b82f6":"3px solid transparent" }),
    content:  { padding:"20px 24px", maxWidth:1400, margin:"0 auto" },
    card:     { background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
    cardHeader:{ padding:"12px 16px", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", gap:10 },
    cardTitle:{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#f1f5f9", letterSpacing:"0.04em", textTransform:"uppercase" },
    tbl:      { width:"100%", borderCollapse:"collapse" },
    th:       (bg="#1e3a5f")=>({ background:bg, color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"right", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }),
    thL:      (bg="#1e3a5f")=>({ background:bg, color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"left", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase" }),
    td:       { fontSize:13, padding:"8px 12px", textAlign:"right", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'IBM Plex Mono',monospace", color:"#cbd5e1" },
    tdL:      { fontSize:13, padding:"8px 10px", textAlign:"left", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'Barlow',sans-serif", fontWeight:600, color:"#f1f5f9" },
    tdSub:    { fontSize:11, color:"#64748b", fontWeight:400, display:"block" },
    input:    { background:"#0f172a", border:"1px solid #334155", borderRadius:6, color:"#f1f5f9", fontSize:13, padding:"5px 8px", width:"100%", textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" },
    sectionRow:(c)=>({ background:c, padding:"6px 12px", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }),
    btn:      (c="#3b82f6")=>({ background:c, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" }),
    statNum:  { fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:"#f1f5f9", lineHeight:1 },
    statLabel:{ fontSize:12, color:"#64748b", marginTop:4, fontFamily:"'Barlow',sans-serif" },
  };

  // ─── Sub-components ───────────────────────────────────────────────────────────
  const Bar = ({value,max,color="#3b82f6",height=6}) => {
    const p = Math.min(100, max>0?(value/max)*100:0);
    return <div style={{height,background:"#0f172a",borderRadius:3,overflow:"hidden",width:"100%"}}><div className="bar-fill" style={{height:"100%",width:`${p}%`,background:color,borderRadius:3}}/></div>;
  };

  const PctCell = ({num,den,bold=false}) => {
    const p=pct(num,den), color=p===null?"#475569":p>=100?"#10b981":p>=75?"#f59e0b":"#ef4444";
    return <span style={{color,fontWeight:bold?700:600,fontFamily:"'IBM Plex Mono',monospace"}}>{p!==null?`${p}%`:"—"}</span>;
  };

  const PaceBadge = ({rep}) => {
    const ab=monthData.abClosedWon[rep]||0, lk=monthData.locks[rep]||0;
    if(!lk||!ab) return <span style={{color:"#475569",fontSize:11}}>—</span>;
    const status=getPaceStatus(pct(ab,lk),mPacing);
    if(!status) return null;
    return <span style={{background:status.bg,color:status.color,border:`1px solid ${status.color}`,borderRadius:4,fontSize:10,fontWeight:700,padding:"2px 6px",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.06em"}}>{status.label}</span>;
  };

  const MonthSelector = () => (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"6px 12px"}}>
      <span style={{color:"#64748b",fontSize:12}}>Month:</span>
      <select value={activeMonthNum-1} onChange={e=>setActiveMonth(`${activeYear}-${String(Number(e.target.value)+1).padStart(2,"0")}`)}
        style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
        {MONTHS.map((m,i)=><option key={i} value={i} style={{background:"#1e293b"}}>{m}</option>)}
      </select>
      <select value={activeYear} onChange={e=>setActiveMonth(`${e.target.value}-${String(activeMonthNum).padStart(2,"0")}`)}
        style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
        {[2025,2026,2027].map(y=><option key={y} value={y} style={{background:"#1e293b"}}>{y}</option>)}
      </select>
    </div>
  );

  const SaveIndicator = () => {
    if(!saveStatus) return null;
    const map = { saving:{color:"#f59e0b",label:"Saving…"}, saved:{color:"#10b981",label:"✓ Saved"}, error:{color:"#ef4444",label:"Save failed"} };
    const s2=map[saveStatus];
    return <span style={{fontSize:12,color:s2.color,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}>{s2.label}</span>;
  };

  // ─── TABLE BODY (shared between tabs) ────────────────────────────────────────
  const RepRows = ({showForecastInput=false}) => (
    <>
      {[{label:"Human Services",reps:HS_REPS,color:"#1a2744"},{label:"Post-Acute",reps:PA_REPS,color:"#1a2433"}].map(group=>(
        <React.Fragment key={group.label}>
          <tr><td colSpan={20} style={s.sectionRow(group.color)}>{group.label}</td></tr>
          {group.reps.map((name,i)=>{
            const r=REPS[name], h=HIST[name];
            const sf=monthData.startingForecasts[name]||0;
            const lk=monthData.locks[name]||0;
            const st=monthData.stretches[name]||0;
            const ab=monthData.abClosedWon[name]||0;
            const pctLock=pct(ab,lk);
            const lockColor=pctLock===null?"#475569":pctLock>=100?"#10b981":pctLock>=75?"#f59e0b":"#ef4444";
            const bg=i%2===0?"#1e293b":"#1a2535";

            if(showForecastInput) return (
              <tr key={name} style={{background:bg}}>
                <td style={s.tdL}>{r.fullName}<span style={s.tdSub}>{r.group}</span></td>
                <td style={s.td}>{fmt(r.quota)}</td>
                <td style={{...s.td,background:"rgba(59,130,246,0.06)"}}>
                  <input style={s.input} value={monthData.startingForecasts[name]?monthData.startingForecasts[name].toLocaleString():""} placeholder="$0"
                    onChange={e=>{ const v=parseInt(e.target.value.replace(/[^0-9]/g,""))||0; updateMonthData({startingForecasts:{...monthData.startingForecasts,[name]:v}}); }}/>
                </td>
                <td style={{...s.td,background:"rgba(16,185,129,0.06)"}}>
                  <input style={{...s.input,borderColor:"#14432e"}} value={monthData.locks[name]?monthData.locks[name].toLocaleString():""} placeholder="$0"
                    onChange={e=>{ const v=parseInt(e.target.value.replace(/[^0-9]/g,""))||0; updateMonthData({locks:{...monthData.locks,[name]:v}}); }}/>
                </td>
                <td style={{...s.td,background:"rgba(20,186,129,0.04)"}}>
                  <input style={{...s.input,borderColor:"#143028"}} value={monthData.stretches[name]?monthData.stretches[name].toLocaleString():""} placeholder="$0"
                    onChange={e=>{ const v=parseInt(e.target.value.replace(/[^0-9]/g,""))||0; updateMonthData({stretches:{...monthData.stretches,[name]:v}}); }}/>
                </td>
                <td style={{...s.td,color:sf?"#a78bfa":"#475569"}}>{sf?fmt(Math.round(sf*h.avgFinish)):"Enter forecast →"}</td>
                <td style={{...s.td,color:sf?"#60a5fa":"#475569"}}>{sf?fmt(Math.round(sf*h.lockMult)):"—"}</td>
              </tr>
            );

            return (
              <tr key={name} style={{background:bg}}>
                <td style={s.tdL}>{r.fullName}<span style={{...s.tdSub,color:"#475569"}}>{r.group}</span></td>
                <td style={s.td}>{fmt(r.quota)}</td>
                <td style={{...s.td,color:"#93c5fd",fontWeight:700}}>
                  {ab>0?fmt(ab):<span style={{color:"#334155"}}>—</span>}
                  {ab>0&&lk>0&&<div style={{marginTop:4}}><Bar value={ab} max={st||lk} color={lockColor} height={4}/></div>}
                </td>
                <td style={s.td}>{sf?fmt(sf):<span style={{color:"#334155"}}>—</span>}</td>
                <td style={s.td}><PctCell num={ab} den={sf}/></td>
                <td style={{...s.td,color:"#4ade80"}}>{lk?fmt(lk):<span style={{color:"#334155"}}>—</span>}</td>
                <td style={s.td}><PctCell num={ab} den={lk} bold/></td>
                <td style={{...s.td,color:"#34d399"}}>{st?fmt(st):<span style={{color:"#334155"}}>—</span>}</td>
                <td style={s.td}><PctCell num={ab} den={st}/></td>
                <td style={{...s.td,textAlign:"center"}}><PaceBadge rep={name}/></td>
              </tr>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );

  // ─── SETUP TAB ───────────────────────────────────────────────────────────────
  const SetupTab = () => {
    const days5th=daysUntil5th(), past5th=new Date().getDate()>5;
    const lockCount=ALL_REPS.filter(n=>monthData.locks[n]>0).length;
    return (
      <div className="slide-in">
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          {[
            {label:past5th?"Lock Deadline Passed":"Days to Lock Deadline",val:past5th?"CLOSED":`${days5th}d`,color:past5th?"#ef4444":"#f59e0b",icon:past5th?"🔒":"⏳"},
            {label:`${monthName} ${activeYear} · ${mPacing}% complete`,val:`${monthName} ${activeYear}`,color:"#60a5fa",icon:"📅",bar:mPacing},
            {label:"Reps with Lock submitted",val:`${lockCount} / ${ALL_REPS.length}`,color:"#10b981",icon:"✅",bar:(lockCount/ALL_REPS.length)*100},
          ].map((stat,i)=>(
            <div key={i} style={{...s.card,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><div style={{...s.statNum,fontSize:24,color:stat.color}}>{stat.val}</div><div style={s.statLabel}>{stat.label}</div></div>
                <span style={{fontSize:28}}>{stat.icon}</span>
              </div>
              {stat.bar!==undefined&&<Bar value={stat.bar} max={100} color={stat.color} height={4}/>}
            </div>
          ))}
        </div>
        <div style={{...s.card,marginBottom:16,padding:"12px 16px",borderLeft:"4px solid #3b82f6"}}>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
            <strong style={{color:"#60a5fa"}}>Tom:</strong> Enter starting forecasts (blue column) at the start of each month. &nbsp;|&nbsp;
            <strong style={{color:"#10b981"}}>Reps:</strong> Enter your Lock & Stretch targets by the 5th — changes save automatically for the whole team.
          </div>
        </div>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>📋 {monthName} {activeYear} — Month Setup</div>
            <div style={{marginLeft:"auto"}}><SaveIndicator/></div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={s.tbl}>
              <thead><tr>
                <th style={{...s.thL(),width:160}}>Rep</th>
                <th style={s.th()}>Quota</th>
                <th style={{...s.th("#1a3a5c")}}>Starting Forecast ★TOM</th>
                <th style={{...s.th("#14432e")}}>CSR Lock ★REP</th>
                <th style={{...s.th("#143028")}}>CSR Stretch ★REP</th>
                <th style={s.th()}>AI Predicted Finish</th>
                <th style={s.th()}>AI Lock Floor</th>
              </tr></thead>
              <tbody>
                <RepRows showForecastInput={true}/>
                <tr style={{background:"#1e3a5f",borderTop:"2px solid #3b82f6"}}>
                  <td style={{...s.tdL,color:"#f1f5f9",fontWeight:700}}>TOTALS</td>
                  <td style={{...s.td,color:"#f1f5f9"}}>{fmt(ALL_REPS.reduce((a,n)=>a+REPS[n].quota,0))}</td>
                  <td style={{...s.td,color:"#60a5fa",fontWeight:700}}>{fmt(totals.sf)}</td>
                  <td style={{...s.td,color:"#10b981",fontWeight:700}}>{fmt(totals.lock)}</td>
                  <td style={{...s.td,color:"#34d399",fontWeight:700}}>{fmt(totals.stretch)}</td>
                  <td style={{...s.td,color:"#a78bfa",fontWeight:700}}>{fmt(ALL_REPS.reduce((a,n)=>{const sf=monthData.startingForecasts[n]||0;return a+(sf?Math.round(sf*HIST[n].avgFinish):0)},0))}</td>
                  <td style={s.td}>—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─── TRACKER TAB ─────────────────────────────────────────────────────────────
  const TrackerTab = () => (
    <div className="slide-in">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {label:"AB Closed Won",     val:fmt(totals.ab),                          color:"#60a5fa",icon:"💰"},
          {label:"vs Team Lock",      val:pctStr(totals.ab,totals.lock),           color:(pct(totals.ab,totals.lock)||0)>=100?"#10b981":"#f59e0b",icon:"🔒"},
          {label:"Team Lock Target",  val:fmt(totals.lock),                        color:"#10b981",icon:"🎯"},
          {label:"Month Progress",    val:`${mPacing}%`,                           color:"#a78bfa",icon:"📅"},
        ].map(stat=>(
          <div key={stat.label} style={{...s.card,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div style={{...s.statNum,color:stat.color}}>{stat.val}</div><div style={s.statLabel}>{stat.label}</div></div>
              <span style={{fontSize:24}}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={handleDrop}
        onClick={()=>!chartLoading&&fileInputRef.current?.click()}
        style={{border:`2px dashed ${dragOver?"#3b82f6":"#334155"}`,borderRadius:12,padding:16,marginBottom:16,display:"flex",alignItems:"center",gap:16,cursor:"pointer",background:dragOver?"rgba(59,130,246,0.06)":"#1e293b",transition:"all 0.2s",opacity:chartLoading?0.7:1}}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)processChart(f);}}/>
        {previewUrl
          ?<img src={previewUrl} style={{height:60,width:100,objectFit:"cover",borderRadius:8,border:"1px solid #334155"}} alt="chart"/>
          :<div style={{width:100,height:60,background:"#0f172a",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>📊</div>
        }
        <div style={{flex:1}}>
          {chartLoading
            ?<div style={{color:"#60a5fa",fontWeight:600,display:"flex",alignItems:"center",gap:8}}><span className="pulse">●</span>{chartStatus?.msg}</div>
            :<><div style={{fontWeight:700,color:"#f1f5f9",fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,textTransform:"uppercase",letterSpacing:"0.04em"}}>Drop Daily Sales Chart Here</div>
              <div style={{fontSize:13,color:"#64748b",marginTop:2}}>Drag the IST Closed-Won/OP chart · AI reads it and auto-fills AB Closed Won for the whole team</div></>
          }
          {!chartLoading&&chartStatus&&<div style={{marginTop:4,fontSize:13,fontWeight:600,color:chartStatus.type==="success"?"#10b981":chartStatus.type==="error"?"#ef4444":"#60a5fa"}}>{chartStatus.msg}</div>}
        </div>
        {monthData.lastChartUpdate&&!chartLoading&&<div style={{textAlign:"right",color:"#475569",fontSize:12,fontFamily:"'IBM Plex Mono',monospace"}}>Last update<br/><span style={{color:"#64748b"}}>{monthData.lastChartUpdate}</span></div>}
      </div>

      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.cardTitle}>📈 {monthName} {activeYear} — Daily Tracker</div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            <SaveIndicator/>
            <span style={{fontSize:12,color:"#64748b",fontFamily:"'IBM Plex Mono',monospace"}}>{mPacing}% through month</span>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead><tr>
              <th style={{...s.thL(),width:160}}>Rep</th>
              <th style={s.th()}>Quota</th>
              <th style={{...s.th("#1a3a5c")}}>AB Closed Won</th>
              <th style={s.th()}>Starting Forecast</th>
              <th style={s.th()}>% vs Forecast</th>
              <th style={{...s.th("#14432e")}}>CSR Lock</th>
              <th style={{...s.th("#14432e")}}>% of Lock</th>
              <th style={{...s.th("#143028")}}>CSR Stretch</th>
              <th style={{...s.th("#143028")}}>% of Stretch</th>
              <th style={{...s.th("#2a1a4a")}}>Pacing</th>
            </tr></thead>
            <tbody>
              <RepRows showForecastInput={false}/>
              <tr style={{background:"#1e3a5f",borderTop:"2px solid #3b82f6"}}>
                <td style={{...s.tdL,color:"#f1f5f9",fontWeight:800,fontSize:14}}>TOTALS</td>
                <td style={{...s.td,color:"#94a3b8"}}>{fmt(ALL_REPS.reduce((a,n)=>a+REPS[n].quota,0))}</td>
                <td style={{...s.td,color:"#60a5fa",fontWeight:700,fontSize:15}}>{totals.ab>0?fmt(totals.ab):"—"}</td>
                <td style={{...s.td,color:"#94a3b8"}}>{fmt(totals.sf)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.sf} bold/></td>
                <td style={{...s.td,color:"#4ade80",fontWeight:700}}>{fmt(totals.lock)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.lock} bold/></td>
                <td style={{...s.td,color:"#34d399",fontWeight:700}}>{fmt(totals.stretch)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.stretch} bold/></td>
                <td style={s.td}>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─── PREDICTIONS TAB ──────────────────────────────────────────────────────────
  const PredictionsTab = () => {
    const trendLabel = t=>({
      steady:  {label:"Steady",      color:"#60a5fa",icon:"→"},
      upside:  {label:"High Upside", color:"#10b981",icon:"↑"},
      volatile:{label:"Volatile",    color:"#f59e0b",icon:"↕"},
      under:   {label:"Cautious",    color:"#f87171",icon:"↓"},
    }[t]||{label:"—",color:"#64748b",icon:"·"});

    return (
      <div className="slide-in">
        <div style={{...s.card,padding:"12px 16px",marginBottom:16,borderLeft:"4px solid #a78bfa"}}>
          <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
            <strong style={{color:"#c4b5fd"}}>AI Prediction Model</strong> — Based on 2025 historical performance data. Predicted finish range uses each rep's average finish multiplier vs starting forecast. Compare rep-stated Lock & Stretch against what the model expects to flag conservative or aggressive targets.
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
          {ALL_REPS.map(name=>{
            const h=HIST[name], sf=monthData.startingForecasts[name]||0;
            const lk=monthData.locks[name]||0, st=monthData.stretches[name]||0, ab=monthData.abClosedWon[name]||0;
            const predicted=sf?Math.round(sf*h.avgFinish):null;
            const predLow=sf?Math.round(sf*h.low):null, predHigh=sf?Math.round(sf*h.high):null;
            const aiLock=sf?Math.round(sf*h.lockMult):null;
            const trend=trendLabel(h.trend);
            const lockVsAI=lk&&aiLock?pct(lk,aiLock):null;
            const lockAssessment=lockVsAI===null?null:lockVsAI>=110?{label:"Aggressive",color:"#f59e0b"}:lockVsAI>=90?{label:"On Model",color:"#10b981"}:{label:"Conservative",color:"#60a5fa"};
            return (
              <div key={name} style={s.card}>
                <div style={{padding:"12px 14px",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,color:"#f1f5f9",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15}}>{REPS[name].fullName}</div>
                    <div style={{fontSize:11,color:trend.color,fontWeight:600,marginTop:2}}>{trend.icon} {trend.label} · {REPS[name].group}</div>
                  </div>
                  {ab>0&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Actual so far</div><div style={{fontFamily:"'IBM Plex Mono',monospace",color:"#93c5fd",fontWeight:700,fontSize:14}}>{fmt(ab)}</div></div>}
                </div>
                <div style={{padding:"12px 14px"}}>
                  {sf?(
                    <>
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:11,color:"#64748b",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"'Barlow Condensed',sans-serif"}}>Predicted Finish Range</div>
                        <div style={{fontFamily:"'IBM Plex Mono',monospace",color:"#c4b5fd",fontSize:13,fontWeight:600}}>{fmt(predLow,true)} — {fmt(predHigh,true)}</div>
                        <div style={{fontSize:12,color:"#a78bfa",marginTop:2}}>Most likely: <strong>{fmt(predicted)}</strong></div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                        {[{label:"AI Lock Floor",val:fmt(aiLock),sub:`${Math.round(h.lockMult*100)}% of forecast`,color:"#4ade80"},{label:"Rep Lock",val:lk?fmt(lk):"Not set",sub:lockAssessment?.label||"—",color:lk?"#4ade80":"#334155",subColor:lockAssessment?.color}].map((cell,i)=>(
                          <div key={i} style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
                            <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{cell.label}</div>
                            <div style={{fontFamily:"'IBM Plex Mono',monospace",color:cell.color,fontSize:13,fontWeight:600}}>{cell.val}</div>
                            <div style={{fontSize:10,color:cell.subColor||"#475569",marginTop:1,fontWeight:cell.subColor?600:400}}>{cell.sub}</div>
                          </div>
                        ))}
                      </div>
                      {st>0&&<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(52,211,153,0.06)",border:"1px solid #143028",borderRadius:6,padding:"6px 10px"}}>
                        <span style={{fontSize:11,color:"#64748b"}}>Rep Stretch: <strong style={{color:"#34d399"}}>{fmt(st)}</strong></span>
                        <span style={{fontSize:11,color:st>=predLow&&st<=predHigh?"#10b981":"#f59e0b",fontWeight:600}}>{st>=predLow&&st<=predHigh?"✓ Within range":st>predHigh?"Above model":"Below model"}</span>
                      </div>}
                    </>
                  ):(
                    <div style={{color:"#334155",fontSize:13,textAlign:"center",padding:"12px 0"}}>Set starting forecast in Month Setup to see predictions</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={s.card}>
          <div style={s.cardHeader}><div style={s.cardTitle}>📊 Historical Performance Reference (2025)</div></div>
          <div style={{overflowX:"auto"}}>
            <table style={s.tbl}>
              <thead><tr>
                <th style={s.thL()}>Rep</th>
                <th style={s.th()}>Avg Finish %</th>
                <th style={s.th()}>Median Lock %</th>
                <th style={s.th()}>Low (worst qtr)</th>
                <th style={s.th()}>High (best qtr)</th>
                <th style={s.th()}>Profile</th>
              </tr></thead>
              <tbody>
                {ALL_REPS.map((name,i)=>{
                  const h=HIST[name], trend=trendLabel(h.trend);
                  return (
                    <tr key={name} style={{background:i%2===0?"#1e293b":"#1a2535"}}>
                      <td style={s.tdL}>{REPS[name].fullName}</td>
                      <td style={{...s.td,color:h.avgFinish>=1.5?"#10b981":h.avgFinish>=1?"#60a5fa":"#f87171",fontWeight:700}}>{Math.round(h.avgFinish*100)}%</td>
                      <td style={{...s.td,color:"#4ade80"}}>{Math.round(h.lockMult*100)}%</td>
                      <td style={{...s.td,color:"#f87171"}}>{Math.round(h.low*100)}%</td>
                      <td style={{...s.td,color:"#10b981"}}>{Math.round(h.high*100)}%</td>
                      <td style={{...s.td,textAlign:"left",color:trend.color,fontWeight:600,fontSize:12}}>{trend.icon} {trend.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <>
      <FontLoader/>
      <div style={s.app}>
        <div style={s.header}>
          <div style={s.headerTop}>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                <span style={s.title}>IST SALES COMMAND CENTER</span>
                <span style={s.badge("#1d4ed8")}>NETSMART</span>
              </div>
              <div style={s.subtitle}>
                {totals.ab>0?`${fmt(totals.ab)} closed · ${pctStr(totals.ab,totals.lock)} of lock · ${mPacing}% through ${monthName}`:`${monthName} ${activeYear} · Drop daily chart to update`}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <SaveIndicator/>
              <MonthSelector/>
            </div>
          </div>
          <div style={s.tabs}>
            {[{key:"setup",label:"📋 Month Setup"},{key:"tracker",label:"📈 Daily Tracker"},{key:"predictions",label:"🔮 AI Predictions"}].map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)} style={s.tab(tab===t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
        <div style={s.content}>
          {tab==="setup"      && <SetupTab/>}
          {tab==="tracker"    && <TrackerTab/>}
          {tab==="predictions"&& <PredictionsTab/>}
        </div>
      </div>
    </>
  );
}
