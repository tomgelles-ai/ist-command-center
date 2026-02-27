import React, { useState, useRef, useCallback, useEffect } from "react";

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

const fmt  = (n,c=false) => { if(!n&&n!==0||n===0)return"--"; return c?`$${n>=1000?(n/1000).toFixed(0)+"k":n}`:`$${Math.round(n).toLocaleString()}`; };
const pct  = (n,d) => (!d||!n)?null:Math.round((n/d)*100);
const pctStr = (n,d) => { const p=pct(n,d); return p!==null?`${p}%`:"--"; };
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

const s = {
  app:      { background:"#0f172a", minHeight:"100vh", fontFamily:"'Barlow',sans-serif", color:"#e2e8f0" },
  header:   { background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", borderBottom:"1px solid #1e3a5f", padding:"0 24px" },
  headerTop:{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:16, paddingBottom:12 },
  title:    { fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.02em" },
  subtitle: { fontSize:13, color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginTop:2 },
  badge:    (c) => ({ background:c, color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em" }),
  tabs:     { display:"flex", gap:0, borderTop:"1px solid #1e3a5f", marginTop:4 },
  tab:      (a) => ({ padding:"12px 20px", fontSize:14, fontWeight:a?700:500, color:a?"#60a5fa":"#64748b", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em", textTransform:"uppercase", transition:"all 0.15s", background:"none", border:"none", borderBottom:a?"3px solid #3b82f6":"3px solid transparent" }),
  content:  { padding:"20px 24px", maxWidth:1400, margin:"0 auto" },
  card:     { background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
  cardHeader:{ padding:"12px 16px", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", gap:10 },
  cardTitle:{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#f1f5f9", letterSpacing:"0.04em", textTransform:"uppercase" },
  tbl:      { width:"100%", borderCollapse:"collapse" },
  th:       (bg) => ({ background:bg||"#1e3a5f", color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"right", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }),
  thL:      (bg) => ({ background:bg||"#1e3a5f", color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"left", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase" }),
  td:       { fontSize:13, padding:"8px 12px", textAlign:"right", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'IBM Plex Mono',monospace", color:"#cbd5e1" },
  tdL:      { fontSize:13, padding:"8px 10px", textAlign:"left", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'Barlow',sans-serif", fontWeight:600, color:"#f1f5f9" },
  tdSub:    { fontSize:11, color:"#64748b", fontWeight:400, display:"block" },
  input:    { background:"#0f172a", border:"1px solid #334155", borderRadius:6, color:"#f1f5f9", fontSize:13, padding:"5px 8px", width:"100%", textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" },
  sectionRow:(c) => ({ background:c, padding:"6px 12px", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }),
  btn:      (c) => ({ background:c||"#3b82f6", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" }),
  statNum:  { fontFamily:"'Barlow Condensed',sans-serif", fontSize:32, fontWeight:800, color:"#f1f5f9", lineHeight:1 },
  statLabel:{ fontSize:12, color:"#64748b", marginTop:4, fontFamily:"'Barlow',sans-serif" },
};

function Bar({ value, max, color, height }) {
  const p = Math.min(100, (max||0)>0?(value/max)*100:0);
  return (
    <div style={{height:height||6,background:"#0f172a",borderRadius:3,overflow:"hidden",width:"100%"}}>
      <div className="bar-fill" style={{height:"100%",width:`${p}%`,background:color||"#3b82f6",borderRadius:3}}/>
    </div>
  );
}

function PctCell({ num, den, bold }) {
  const p=pct(num,den);
  const color=p===null?"#475569":p>=100?"#10b981":p>=75?"#f59e0b":"#ef4444";
  return <span style={{color,fontWeight:bold?700:600,fontFamily:"'IBM Plex Mono',monospace"}}>{p!==null?`${p}%`:"--"}</span>;
}

function SetupTab({ monthData, monthName, activeYear, mPacing, onSave }) {
  const [local, setLocal] = useState({
    forecasts: Object.assign({}, monthData.startingForecasts),
    locks:     Object.assign({}, monthData.locks),
    stretches: Object.assign({}, monthData.stretches),
  });
  const [saved,  setSaved]  = useState(false);
  const [saving, setSaving] = useState(false);

  const days5th  = daysUntil5th();
  const past5th  = new Date().getDate() > 5;
  const lockCount = ALL_REPS.filter(n => (local.locks[n]||0) > 0).length;

  function setVal(field, rep, raw) {
    const v = parseInt(raw.replace(/[^0-9]/g,"")) || 0;
    setLocal(function(prev) {
      const updated = Object.assign({}, prev[field]);
      updated[rep] = v;
      const next = Object.assign({}, prev);
      next[field] = updated;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ startingForecasts: local.forecasts, locks: local.locks, stretches: local.stretches });
    setSaving(false);
    setSaved(true);
    setTimeout(function(){ setSaved(false); }, 3000);
  }

  const sfTotal   = ALL_REPS.reduce(function(a,n){ return a+(local.forecasts[n]||0); }, 0);
  const lockTotal = ALL_REPS.reduce(function(a,n){ return a+(local.locks[n]||0); }, 0);
  const stTotal   = ALL_REPS.reduce(function(a,n){ return a+(local.stretches[n]||0); }, 0);
  const aiTotal   = ALL_REPS.reduce(function(a,n){ var sf=local.forecasts[n]||0; return a+(sf?Math.round(sf*HIST[n].avgFinish):0); }, 0);

  const groups = [
    { label:"Human Services", reps:HS_REPS, color:"#1a2744" },
    { label:"Post-Acute",     reps:PA_REPS, color:"#1a2433" },
  ];

  return (
    <div className="slide-in">
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={Object.assign({},s.statNum,{fontSize:24,color:past5th?"#ef4444":"#f59e0b"})}>{past5th?"CLOSED":`${days5th}d`}</div>
              <div style={s.statLabel}>{past5th?"Lock Deadline Passed":"Days to Lock Deadline"}</div>
            </div>
            <span style={{fontSize:28}}>{past5th?"locked":"pending"}</span>
          </div>
        </div>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={Object.assign({},s.statNum,{fontSize:24,color:"#60a5fa"})}>{monthName} {activeYear}</div>
              <div style={s.statLabel}>{mPacing}% through month</div>
            </div>
            <span style={{fontSize:28}}>cal</span>
          </div>
          <Bar value={mPacing} max={100} color="#3b82f6" height={4}/>
        </div>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={Object.assign({},s.statNum,{fontSize:24,color:"#10b981"})}>{lockCount} / {ALL_REPS.length}</div>
              <div style={s.statLabel}>Reps with Lock submitted</div>
            </div>
            <span style={{fontSize:28}}>ok</span>
          </div>
          <Bar value={lockCount} max={ALL_REPS.length} color="#10b981" height={4}/>
        </div>
      </div>

      <div style={Object.assign({},s.card,{marginBottom:16,padding:"12px 16px",borderLeft:"4px solid #3b82f6"})}>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
          <strong style={{color:"#60a5fa"}}>Tom:</strong> Enter starting forecasts (blue column) at the start of each month.
          <strong style={{color:"#10b981"}}> Reps:</strong> Enter your Lock and Stretch by the 5th, then hit Save.
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.cardTitle}>Month Setup -- {monthName} {activeYear}</div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            {saved  && <span style={{color:"#10b981",fontSize:13,fontWeight:600}}>Saved for everyone!</span>}
            {saving && <span style={{color:"#f59e0b",fontSize:13,fontWeight:600}}>Saving...</span>}
            <button onClick={handleSave} style={s.btn()}>Save</button>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={Object.assign({},s.thL(),{width:170})}>Rep</th>
                <th style={s.th()}>Quota</th>
                <th style={s.th("#1a3a5c")}>Starting Forecast (TOM)</th>
                <th style={s.th("#14432e")}>CSR Lock (REP)</th>
                <th style={s.th("#143028")}>CSR Stretch (REP)</th>
                <th style={s.th()}>AI Predicted Finish</th>
                <th style={s.th()}>AI Lock Floor</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(function(group) {
                return (
                  <React.Fragment key={group.label}>
                    <tr><td colSpan={7} style={s.sectionRow(group.color)}>{group.label}</td></tr>
                    {group.reps.map(function(name, i) {
                      var r  = REPS[name];
                      var h  = HIST[name];
                      var sf = local.forecasts[name] || 0;
                      var bg = i%2===0 ? "#1e293b" : "#1a2535";
                      return (
                        <tr key={name} style={{background:bg}}>
                          <td style={s.tdL}>{r.fullName}<span style={s.tdSub}>{r.group}</span></td>
                          <td style={s.td}>{fmt(r.quota)}</td>
                          <td style={Object.assign({},s.td,{background:"rgba(59,130,246,0.06)"})}>
                            <input
                              style={s.input}
                              value={local.forecasts[name] ? local.forecasts[name].toLocaleString() : ""}
                              placeholder="0"
                              onChange={function(e){ setVal("forecasts", name, e.target.value); }}
                            />
                          </td>
                          <td style={Object.assign({},s.td,{background:"rgba(16,185,129,0.06)"})}>
                            <input
                              style={Object.assign({},s.input,{borderColor:"#14432e"})}
                              value={local.locks[name] ? local.locks[name].toLocaleString() : ""}
                              placeholder="0"
                              onChange={function(e){ setVal("locks", name, e.target.value); }}
                            />
                          </td>
                          <td style={Object.assign({},s.td,{background:"rgba(20,186,129,0.04)"})}>
                            <input
                              style={Object.assign({},s.input,{borderColor:"#143028"})}
                              value={local.stretches[name] ? local.stretches[name].toLocaleString() : ""}
                              placeholder="0"
                              onChange={function(e){ setVal("stretches", name, e.target.value); }}
                            />
                          </td>
                          <td style={Object.assign({},s.td,{color:sf?"#a78bfa":"#475569"})}>
                            {sf ? fmt(Math.round(sf*h.avgFinish)) : "Enter forecast"}
                          </td>
                          <td style={Object.assign({},s.td,{color:sf?"#60a5fa":"#475569"})}>
                            {sf ? fmt(Math.round(sf*h.lockMult)) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              <tr style={{background:"#1e3a5f",borderTop:"2px solid #3b82f6"}}>
                <td style={Object.assign({},s.tdL,{color:"#f1f5f9",fontWeight:700})}>TOTALS</td>
                <td style={s.td}>{fmt(ALL_REPS.reduce(function(a,n){return a+REPS[n].quota;},0))}</td>
                <td style={Object.assign({},s.td,{color:"#60a5fa",fontWeight:700})}>{fmt(sfTotal)}</td>
                <td style={Object.assign({},s.td,{color:"#10b981",fontWeight:700})}>{fmt(lockTotal)}</td>
                <td style={Object.assign({},s.td,{color:"#34d399",fontWeight:700})}>{fmt(stTotal)}</td>
                <td style={Object.assign({},s.td,{color:"#a78bfa",fontWeight:700})}>{fmt(aiTotal)}</td>
                <td style={s.td}>--</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TrackerTab({ monthData, monthName, activeYear, mPacing, onChartDrop }) {
  var [chartLoading, setChartLoading] = useState(false);
  var [chartStatus,  setChartStatus]  = useState(null);
  var [dragOver,     setDragOver]     = useState(false);
  var [previewUrl,   setPreviewUrl]   = useState(null);
  var fileInputRef = useRef();

  var totals = ALL_REPS.reduce(function(a,n){
    a.sf   += monthData.startingForecasts[n]||0;
    a.lock += monthData.locks[n]||0;
    a.stretch += monthData.stretches[n]||0;
    a.ab   += monthData.abClosedWon[n]||0;
    return a;
  },{sf:0,lock:0,stretch:0,ab:0});

  async function processChart(file) {
    setChartLoading(true);
    setChartStatus({type:"loading",msg:"Reading chart..."});
    setPreviewUrl(URL.createObjectURL(file));
    try {
      var base64 = await new Promise(function(res,rej){ var r=new FileReader(); r.onload=function(){res(r.result.split(",")[1]);}; r.onerror=rej; r.readAsDataURL(file); });
      var resp = await fetch("/api/analyze-chart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base64:base64,mediaType:file.type||"image/png"})});
      var result = await resp.json();
      if(result.error) throw new Error(result.error);
      var newWon={};
      var count=0;
      Object.entries(result.extracted).forEach(function(entry){
        var name=entry[0], val=entry[1];
        var norm=name.toLowerCase().trim();
        var key=NAME_MAP[norm]||(FIRST_MAP[norm.split(/\s+/)[0]])||null;
        if(key){newWon[key]=Number(val);count++;}
      });
      if(count===0) throw new Error("No rep names matched");
      var now=new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
      await onChartDrop(newWon, now);
      setChartStatus({type:"success",msg:"Updated "+count+" reps - "+now});
    } catch(e) {
      setChartStatus({type:"error",msg:"Error: "+e.message});
    }
    setChartLoading(false);
  }

  function handleDrop(e) { e.preventDefault(); setDragOver(false); var f=e.dataTransfer.files[0]; if(f)processChart(f); }

  var groups = [
    {label:"Human Services",reps:HS_REPS,color:"#1a2744"},
    {label:"Post-Acute",    reps:PA_REPS,color:"#1a2433"},
  ];

  return (
    <div className="slide-in">
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {label:"AB Closed Won",    val:fmt(totals.ab),             color:"#60a5fa"},
          {label:"vs Team Lock",     val:pctStr(totals.ab,totals.lock), color:(pct(totals.ab,totals.lock)||0)>=100?"#10b981":"#f59e0b"},
          {label:"Team Lock Target", val:fmt(totals.lock),           color:"#10b981"},
          {label:"Month Progress",   val:mPacing+"%",                color:"#a78bfa"},
        ].map(function(stat){
          return (
            <div key={stat.label} style={Object.assign({},s.card,{padding:16})}>
              <div style={{...s.statNum,color:stat.color}}>{stat.val}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      <div
        onDragOver={function(e){e.preventDefault();setDragOver(true);}}
        onDragLeave={function(){setDragOver(false);}}
        onDrop={handleDrop}
        onClick={function(){if(!chartLoading&&fileInputRef.current)fileInputRef.current.click();}}
        style={{border:"2px dashed "+(dragOver?"#3b82f6":"#334155"),borderRadius:12,padding:16,marginBottom:16,display:"flex",alignItems:"center",gap:16,cursor:"pointer",background:dragOver?"rgba(59,130,246,0.06)":"#1e293b",transition:"all 0.2s",opacity:chartLoading?0.7:1}}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={function(e){var f=e.target.files[0];if(f)processChart(f);}}/>
        {previewUrl
          ? <img src={previewUrl} style={{height:60,width:100,objectFit:"cover",borderRadius:8,border:"1px solid #334155"}} alt="chart"/>
          : <div style={{width:100,height:60,background:"#0f172a",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>chart</div>
        }
        <div style={{flex:1}}>
          {chartLoading
            ? <div style={{color:"#60a5fa",fontWeight:600}}>{chartStatus?chartStatus.msg:"Loading..."}</div>
            : <div>
                <div style={{fontWeight:700,color:"#f1f5f9",fontSize:16}}>Drop Daily Sales Chart Here</div>
                <div style={{fontSize:13,color:"#64748b",marginTop:2}}>Drag the IST Closed-Won chart -- AI reads it and updates everyone</div>
              </div>
          }
          {!chartLoading&&chartStatus&&<div style={{marginTop:4,fontSize:13,fontWeight:600,color:chartStatus.type==="success"?"#10b981":chartStatus.type==="error"?"#ef4444":"#60a5fa"}}>{chartStatus.msg}</div>}
        </div>
        {monthData.lastChartUpdate&&!chartLoading&&<div style={{textAlign:"right",color:"#475569",fontSize:12}}>{monthData.lastChartUpdate}</div>}
      </div>

      <div style={s.card}>
        <div style={s.cardHeader}>
          <div style={s.cardTitle}>Daily Tracker -- {monthName} {activeYear}</div>
          <span style={{marginLeft:"auto",fontSize:12,color:"#64748b"}}>{mPacing}% through month</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={Object.assign({},s.thL(),{width:170})}>Rep</th>
                <th style={s.th()}>Quota</th>
                <th style={s.th("#1a3a5c")}>AB Closed Won</th>
                <th style={s.th()}>Starting Forecast</th>
                <th style={s.th()}>% vs Forecast</th>
                <th style={s.th("#14432e")}>CSR Lock</th>
                <th style={s.th("#14432e")}>% of Lock</th>
                <th style={s.th("#143028")}>CSR Stretch</th>
                <th style={s.th("#143028")}>% of Stretch</th>
                <th style={s.th("#2a1a4a")}>Pacing</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(function(group){
                return (
                  <React.Fragment key={group.label}>
                    <tr><td colSpan={10} style={s.sectionRow(group.color)}>{group.label}</td></tr>
                    {group.reps.map(function(name,i){
                      var r=REPS[name];
                      var sf=monthData.startingForecasts[name]||0;
                      var lk=monthData.locks[name]||0;
                      var st=monthData.stretches[name]||0;
                      var ab=monthData.abClosedWon[name]||0;
                      var pctLock=pct(ab,lk);
                      var lockColor=pctLock===null?"#475569":pctLock>=100?"#10b981":pctLock>=75?"#f59e0b":"#ef4444";
                      var status=getPaceStatus(pctLock,mPacing);
                      return (
                        <tr key={name} style={{background:i%2===0?"#1e293b":"#1a2535"}}>
                          <td style={s.tdL}>{r.fullName}<span style={Object.assign({},s.tdSub,{color:"#475569"})}>{r.group}</span></td>
                          <td style={s.td}>{fmt(r.quota)}</td>
                          <td style={Object.assign({},s.td,{color:"#93c5fd",fontWeight:700})}>
                            {ab>0?fmt(ab):"--"}
                            {ab>0&&lk>0&&<div style={{marginTop:4}}><Bar value={ab} max={st||lk} color={lockColor} height={4}/></div>}
                          </td>
                          <td style={s.td}>{sf?fmt(sf):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={sf}/></td>
                          <td style={Object.assign({},s.td,{color:"#4ade80"})}>{lk?fmt(lk):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={lk} bold={true}/></td>
                          <td style={Object.assign({},s.td,{color:"#34d399"})}>{st?fmt(st):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={st}/></td>
                          <td style={Object.assign({},s.td,{textAlign:"center"})}>
                            {status ? <span style={{background:status.bg,color:status.color,border:"1px solid "+status.color,borderRadius:4,fontSize:10,fontWeight:700,padding:"2px 6px"}}>{status.label}</span> : <span style={{color:"#475569",fontSize:11}}>--</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              <tr style={{background:"#1e3a5f",borderTop:"2px solid #3b82f6"}}>
                <td style={Object.assign({},s.tdL,{color:"#f1f5f9",fontWeight:800})}>TOTALS</td>
                <td style={s.td}>{fmt(ALL_REPS.reduce(function(a,n){return a+REPS[n].quota;},0))}</td>
                <td style={Object.assign({},s.td,{color:"#60a5fa",fontWeight:700})}>{totals.ab>0?fmt(totals.ab):"--"}</td>
                <td style={s.td}>{fmt(totals.sf)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.sf} bold={true}/></td>
                <td style={Object.assign({},s.td,{color:"#4ade80",fontWeight:700})}>{fmt(totals.lock)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.lock} bold={true}/></td>
                <td style={Object.assign({},s.td,{color:"#34d399",fontWeight:700})}>{fmt(totals.stretch)}</td>
                <td style={s.td}><PctCell num={totals.ab} den={totals.stretch} bold={true}/></td>
                <td style={s.td}>--</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PredictionsTab({ monthData }) {
  var trendLabel = function(t) {
    var map = {
      steady:  {label:"Steady",      color:"#60a5fa",icon:"->"},
      upside:  {label:"High Upside", color:"#10b981",icon:"^"},
      volatile:{label:"Volatile",    color:"#f59e0b",icon:"~"},
      under:   {label:"Cautious",    color:"#f87171",icon:"v"},
    };
    return map[t]||{label:"--",color:"#64748b",icon:"."};
  };

  return (
    <div className="slide-in">
      <div style={Object.assign({},s.card,{padding:"12px 16px",marginBottom:16,borderLeft:"4px solid #a78bfa"})}>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
          AI Prediction Model -- Based on 2025 historical performance data. Predicted finish range uses each rep's average finish multiplier vs starting forecast.
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {ALL_REPS.map(function(name){
          var h=HIST[name];
          var sf=monthData.startingForecasts[name]||0;
          var lk=monthData.locks[name]||0;
          var st=monthData.stretches[name]||0;
          var ab=monthData.abClosedWon[name]||0;
          var predicted=sf?Math.round(sf*h.avgFinish):null;
          var predLow=sf?Math.round(sf*h.low):null;
          var predHigh=sf?Math.round(sf*h.high):null;
          var aiLock=sf?Math.round(sf*h.lockMult):null;
          var trend=trendLabel(h.trend);
          var lockVsAI=lk&&aiLock?pct(lk,aiLock):null;
          var lockAssessment=lockVsAI===null?null:lockVsAI>=110?{label:"Aggressive",color:"#f59e0b"}:lockVsAI>=90?{label:"On Model",color:"#10b981"}:{label:"Conservative",color:"#60a5fa"};
          return (
            <div key={name} style={s.card}>
              <div style={{padding:"12px 14px",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,color:"#f1f5f9",fontSize:15}}>{REPS[name].fullName}</div>
                  <div style={{fontSize:11,color:trend.color,fontWeight:600,marginTop:2}}>{trend.icon} {trend.label}</div>
                </div>
                {ab>0&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Actual</div><div style={{color:"#93c5fd",fontWeight:700}}>{fmt(ab)}</div></div>}
              </div>
              <div style={{padding:"12px 14px"}}>
                {sf ? (
                  <div>
                    <div style={{marginBottom:8}}>
                      <div style={{fontSize:11,color:"#64748b",marginBottom:2}}>Predicted Range</div>
                      <div style={{color:"#c4b5fd",fontWeight:600}}>{fmt(predLow,true)} -- {fmt(predHigh,true)}</div>
                      <div style={{fontSize:12,color:"#a78bfa",marginTop:2}}>Most likely: {fmt(predicted)}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div style={{background:"#0f172a",borderRadius:8,padding:"8px"}}>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>AI Lock Floor</div>
                        <div style={{color:"#4ade80",fontWeight:600}}>{fmt(aiLock)}</div>
                      </div>
                      <div style={{background:"#0f172a",borderRadius:8,padding:"8px"}}>
                        <div style={{fontSize:10,color:"#64748b",marginBottom:2}}>Rep Lock</div>
                        <div style={{color:lk?"#4ade80":"#334155",fontWeight:600}}>{lk?fmt(lk):"Not set"}</div>
                        {lockAssessment&&<div style={{fontSize:10,color:lockAssessment.color,fontWeight:600}}>{lockAssessment.label}</div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"12px 0"}}>Set starting forecast to see predictions</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ISTCommandCenter() {
  var [tab,         setTab]         = useState("tracker");
  var [data,        setData]        = useState({ months:{} });
  var [activeMonth, setActiveMonth] = useState(currentMonthKey());
  var [loading,     setLoading]     = useState(true);
  var [saveStatus,  setSaveStatus]  = useState(null);
  var saveTimeout = useRef();

  var parts = activeMonth.split("-").map(Number);
  var activeYear = parts[0], activeMonthNum = parts[1];
  var monthName = MONTHS[activeMonthNum-1];
  var monthData = data.months[activeMonth] || defaultMonthData();
  var mPacing   = monthPacingPct(activeYear, activeMonthNum);
  var totals    = ALL_REPS.reduce(function(a,n){ a.ab+=monthData.abClosedWon[n]||0; a.lock+=monthData.locks[n]||0; return a; },{ab:0,lock:0});

  useEffect(function() {
    fetch("/api/get-data").then(function(r){return r.json();}).then(function(d){setData(d||{months:{}}); }).catch(function(){setData({months:{}}); }).finally(function(){setLoading(false);});
  }, []);

  function saveToServer(newData) {
    clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    saveTimeout.current = setTimeout(async function(){
      try {
        await fetch("/api/save-data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newData)});
        setSaveStatus("saved");
        setTimeout(function(){setSaveStatus(null);},3000);
      } catch(e) { setSaveStatus("error"); }
    }, 400);
  }

  function updateMonthData(updates) {
    setData(function(prev) {
      var cur = prev.months[activeMonth] || defaultMonthData();
      var merged = Object.assign({}, cur, updates);
      var newMonths = Object.assign({}, prev.months);
      newMonths[activeMonth] = merged;
      var newData = Object.assign({}, prev, {months: newMonths});
      saveToServer(newData);
      return newData;
    });
  }

  function handleSetupSave(updates) { updateMonthData(updates); }
  function handleChartDrop(newWon, timestamp) { updateMonthData({ abClosedWon: newWon, lastChartUpdate: timestamp }); }

  if(loading) return (
    <div style={{background:"#0f172a",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#64748b",fontSize:14}}>Loading IST Command Center...</div>
    </div>
  );

  return (
    <React.Fragment>
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
                {totals.ab>0 ? fmt(totals.ab)+" closed / "+pctStr(totals.ab,totals.lock)+" of lock / "+mPacing+"% through "+monthName : monthName+" "+activeYear+" -- Drop daily chart to update"}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {saveStatus==="saving"&&<span style={{fontSize:12,color:"#f59e0b",fontWeight:600}}>Saving...</span>}
              {saveStatus==="saved" &&<span style={{fontSize:12,color:"#10b981",fontWeight:600}}>Saved</span>}
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"6px 12px"}}>
                <span style={{color:"#64748b",fontSize:12}}>Month:</span>
                <select value={activeMonthNum-1} onChange={function(e){setActiveMonth(activeYear+"-"+String(Number(e.target.value)+1).padStart(2,"0"));}}
                  style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {MONTHS.map(function(m,i){return <option key={i} value={i} style={{background:"#1e293b"}}>{m}</option>;})}
                </select>
                <select value={activeYear} onChange={function(e){setActiveMonth(e.target.value+"-"+String(activeMonthNum).padStart(2,"0"));}}
                  style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {[2025,2026,2027].map(function(y){return <option key={y} value={y} style={{background:"#1e293b"}}>{y}</option>;})}
                </select>
              </div>
            </div>
          </div>
          <div style={s.tabs}>
            {[{key:"setup",label:"Month Setup"},{key:"tracker",label:"Daily Tracker"},{key:"predictions",label:"AI Predictions"}].map(function(t){
              return <button key={t.key} onClick={function(){setTab(t.key);}} style={s.tab(tab===t.key)}>{t.label}</button>;
            })}
          </div>
        </div>
        <div style={s.content}>
          {tab==="setup"       && <SetupTab       monthData={monthData} monthName={monthName} activeYear={activeYear} mPacing={mPacing} onSave={handleSetupSave}/>}
          {tab==="tracker"     && <TrackerTab     monthData={monthData} monthName={monthName} activeYear={activeYear} mPacing={mPacing} onChartDrop={handleChartDrop}/>}
          {tab==="predictions" && <PredictionsTab monthData={monthData} monthName={monthName} activeYear={activeYear}/>}
        </div>
      </div>
    </React.Fragment>
  );
}
