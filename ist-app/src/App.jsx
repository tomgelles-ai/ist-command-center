import React, { useState, useRef, useCallback, useEffect } from "react";

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f172a; }
    input:focus { outline: 2px solid #3b82f6; outline-offset: 1px; }
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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmt = function(n) { if(!n||n===0) return "--"; return "$"+Math.round(n).toLocaleString(); };
const fmtK = function(n) { if(!n||n===0) return "--"; return "$"+(n>=1000?Math.round(n/1000)+"k":n); };
const pct = function(n,d) { if(!d||!n) return null; return Math.round((n/d)*100); };
const pctStr = function(n,d) { var p=pct(n,d); return p!==null ? p+"%" : "--"; };
const daysInMonth = function(y,m) { return new Date(y,m,0).getDate(); };

const monthPacingPct = function(year, month1idx) {
  var today=new Date(), cy=today.getFullYear(), cm=today.getMonth();
  if(cy!==year||cm!==month1idx-1) { return today>new Date(year,month1idx-1,1)?100:0; }
  return Math.round((today.getDate()/daysInMonth(year,month1idx))*100);
};

const getPaceStatus = function(repPct, monthPct) {
  if(repPct===null||monthPct===0) return null;
  var d=repPct-monthPct;
  if(d>=10)  return {label:"AHEAD",    color:"#10b981", bg:"rgba(16,185,129,0.12)"};
  if(d>=-5)  return {label:"ON TRACK", color:"#3b82f6", bg:"rgba(59,130,246,0.12)"};
  if(d>=-20) return {label:"WATCH",    color:"#f59e0b", bg:"rgba(245,158,11,0.12)"};
  return           {label:"BEHIND",   color:"#ef4444", bg:"rgba(239,68,68,0.12)"};
};

const daysUntil5th = function() {
  var now=new Date(), t=new Date(now.getFullYear(),now.getMonth(),5);
  if(now.getDate()>5) t.setMonth(t.getMonth()+1);
  return Math.max(0,Math.ceil((t-now)/(1000*60*60*24)));
};

const currentMonthKey = function() { var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); };
const defaultMonthData = function() { return { startingForecasts:{}, locks:{}, stretches:{}, abClosedWon:{}, lastUpdated:null }; };

const parseNum = function(raw) { return parseInt((raw||"").toString().replace(/[^0-9]/g,""))||0; };

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  app:       { background:"#0f172a", minHeight:"100vh", fontFamily:"'Barlow',sans-serif", color:"#e2e8f0" },
  header:    { background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", borderBottom:"1px solid #1e3a5f", padding:"0 24px" },
  headerTop: { display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:16, paddingBottom:12 },
  title:     { fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:800, color:"#f1f5f9", letterSpacing:"0.02em" },
  subtitle:  { fontSize:13, color:"#64748b", fontFamily:"'IBM Plex Mono',monospace", marginTop:2 },
  tabs:      { display:"flex", borderTop:"1px solid #1e3a5f", marginTop:4 },
  tab:       function(a) { return { padding:"12px 20px", fontSize:14, fontWeight:a?700:500, color:a?"#60a5fa":"#64748b", cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em", textTransform:"uppercase", background:"none", border:"none", borderBottom:a?"3px solid #3b82f6":"3px solid transparent", transition:"all 0.15s" }; },
  content:   { padding:"20px 24px", maxWidth:1400, margin:"0 auto" },
  card:      { background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden" },
  cardHdr:   { padding:"12px 16px", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", gap:10 },
  cardTitle: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, color:"#f1f5f9", letterSpacing:"0.04em", textTransform:"uppercase" },
  tbl:       { width:"100%", borderCollapse:"collapse" },
  th:        function(bg) { return { background:bg||"#1e3a5f", color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"right", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }; },
  thL:       function(bg) { return { background:bg||"#1e3a5f", color:"#94a3b8", fontSize:11, fontWeight:600, padding:"8px 12px", textAlign:"left", borderRight:"1px solid #0f172a", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase" }; },
  td:        { fontSize:13, padding:"7px 12px", textAlign:"right", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'IBM Plex Mono',monospace", color:"#cbd5e1" },
  tdL:       { fontSize:13, padding:"7px 10px", textAlign:"left", borderRight:"1px solid #1e293b", borderBottom:"1px solid #1e293b", fontFamily:"'Barlow',sans-serif", fontWeight:600, color:"#f1f5f9" },
  tdSub:     { fontSize:11, color:"#64748b", fontWeight:400, display:"block" },
  secRow:    function(c) { return { background:c, padding:"5px 12px", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'Barlow Condensed',sans-serif" }; },
  input:     { background:"#0f172a", border:"1px solid #334155", borderRadius:6, color:"#f1f5f9", fontSize:13, padding:"5px 8px", width:"100%", textAlign:"right", fontFamily:"'IBM Plex Mono',monospace" },
  btn:       function(c) { return { background:c||"#3b82f6", color:"#fff", border:"none", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" }; },
  statNum:   { fontFamily:"'Barlow Condensed',sans-serif", fontSize:30, fontWeight:800, lineHeight:1 },
  statLbl:   { fontSize:12, color:"#64748b", marginTop:4 },
  badge:     function(c) { return { background:c, color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:"0.05em" }; },
};

// ── Shared components ─────────────────────────────────────────────────────────
function Bar(props) {
  var value=props.value, max=props.max, color=props.color||"#3b82f6", height=props.height||6;
  var p = Math.min(100, (max||0)>0 ? (value/max)*100 : 0);
  return (
    <div style={{height:height,background:"#0f172a",borderRadius:3,overflow:"hidden",width:"100%"}}>
      <div className="bar-fill" style={{height:"100%",width:p+"%",background:color,borderRadius:3}}/>
    </div>
  );
}

function PctCell(props) {
  var num=props.num, den=props.den, bold=props.bold;
  var p = pct(num,den);
  var color = p===null?"#475569":p>=100?"#10b981":p>=75?"#f59e0b":"#ef4444";
  return <span style={{color:color,fontWeight:bold?700:600,fontFamily:"'IBM Plex Mono',monospace"}}>{p!==null?p+"%":"--"}</span>;
}

function PaceBadge(props) {
  var ab=props.ab||0, lk=props.lk||0, mPacing=props.mPacing;
  if(!lk||!ab) return <span style={{color:"#475569",fontSize:11}}>--</span>;
  var status = getPaceStatus(pct(ab,lk), mPacing);
  if(!status) return <span style={{color:"#475569",fontSize:11}}>--</span>;
  return (
    <span style={{background:status.bg,color:status.color,border:"1px solid "+status.color,borderRadius:4,fontSize:10,fontWeight:700,padding:"2px 6px",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.06em"}}>
      {status.label}
    </span>
  );
}

// ── SETUP TAB ─────────────────────────────────────────────────────────────────
function SetupTab(props) {
  var monthData=props.monthData, monthName=props.monthName, activeYear=props.activeYear, mPacing=props.mPacing, onSave=props.onSave;

  var [local, setLocal] = useState({
    forecasts: Object.assign({}, monthData.startingForecasts),
    locks:     Object.assign({}, monthData.locks),
    stretches: Object.assign({}, monthData.stretches),
  });
  var [saved,  setSaved]  = useState(false);
  var [saving, setSaving] = useState(false);

  var days5th  = daysUntil5th();
  var past5th  = new Date().getDate() > 5;
  var lockCount = ALL_REPS.filter(function(n){ return (local.locks[n]||0)>0; }).length;

  function setVal(field, rep, raw) {
    var v = parseNum(raw);
    setLocal(function(prev) {
      var f = Object.assign({}, prev[field]);
      f[rep] = v;
      return Object.assign({}, prev, {[field]: f});
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave({ startingForecasts:local.forecasts, locks:local.locks, stretches:local.stretches });
    setSaving(false); setSaved(true);
    setTimeout(function(){ setSaved(false); }, 3000);
  }

  var sfTotal   = ALL_REPS.reduce(function(a,n){ return a+(local.forecasts[n]||0); }, 0);
  var lockTotal = ALL_REPS.reduce(function(a,n){ return a+(local.locks[n]||0); }, 0);
  var stTotal   = ALL_REPS.reduce(function(a,n){ return a+(local.stretches[n]||0); }, 0);
  var aiTotal   = ALL_REPS.reduce(function(a,n){ var sf=local.forecasts[n]||0; return a+(sf?Math.round(sf*HIST[n].avgFinish):0); }, 0);

  var groups = [{label:"Human Services",reps:HS_REPS,color:"#1a2744"},{label:"Post-Acute",reps:PA_REPS,color:"#1a2433"}];

  return (
    <div className="slide-in">
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={Object.assign({},s.statNum,{color:past5th?"#ef4444":"#f59e0b"})}>{past5th?"CLOSED":days5th+"d"}</div>
              <div style={s.statLbl}>{past5th?"Lock deadline passed":"Days to lock deadline (5th)"}</div>
            </div>
            <span style={{fontSize:28}}>{past5th?"🔒":"⏳"}</span>
          </div>
        </div>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={Object.assign({},s.statNum,{color:"#60a5fa"})}>{monthName} {activeYear}</div>
              <div style={s.statLbl}>{mPacing}% through month</div>
            </div>
            <span style={{fontSize:28}}>📅</span>
          </div>
          <Bar value={mPacing} max={100} color="#3b82f6" height={4}/>
        </div>
        <div style={Object.assign({},s.card,{padding:16})}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={Object.assign({},s.statNum,{color:"#10b981"})}>{lockCount} / {ALL_REPS.length}</div>
              <div style={s.statLbl}>Reps with Lock submitted</div>
            </div>
            <span style={{fontSize:28}}>✅</span>
          </div>
          <Bar value={lockCount} max={ALL_REPS.length} color="#10b981" height={4}/>
        </div>
      </div>

      {/* Info banner */}
      <div style={Object.assign({},s.card,{marginBottom:16,padding:"12px 16px",borderLeft:"4px solid #3b82f6",borderRadius:12})}>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.7}}>
          <strong style={{color:"#60a5fa"}}>Tom:</strong> Enter Starting Forecasts at the start of each month (blue column).&nbsp;&nbsp;
          <strong style={{color:"#10b981"}}>Reps:</strong> Enter your Lock &amp; Stretch targets by the 5th, then hit <strong style={{color:"#f1f5f9"}}>Save</strong>.
        </div>
      </div>

      {/* Table */}
      <div style={s.card}>
        <div style={s.cardHdr}>
          <div style={s.cardTitle}>📋 {monthName} {activeYear} — Month Setup</div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12}}>
            {saved  && <span style={{color:"#10b981",fontSize:13,fontWeight:600}}>✓ Saved for everyone!</span>}
            {saving && <span style={{color:"#f59e0b",fontSize:13,fontWeight:600}}>Saving…</span>}
            <button onClick={handleSave} style={s.btn()}>💾 Save</button>
          </div>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={Object.assign({},s.thL(),{width:175})}>Rep</th>
                <th style={s.th()}>Quota</th>
                <th style={s.th("#1a3a5c")}>Starting Forecast ★ TOM</th>
                <th style={s.th("#14432e")}>CSR Lock ★ REP</th>
                <th style={s.th("#143028")}>CSR Stretch ★ REP</th>
                <th style={s.th()}>AI Predicted Finish</th>
                <th style={s.th()}>AI Lock Floor</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(function(group) {
                return (
                  <React.Fragment key={group.label}>
                    <tr><td colSpan={7} style={s.secRow(group.color)}>{group.label}</td></tr>
                    {group.reps.map(function(name, i) {
                      var r=REPS[name], h=HIST[name], sf=local.forecasts[name]||0;
                      return (
                        <tr key={name} style={{background:i%2===0?"#1e293b":"#1a2535"}}>
                          <td style={s.tdL}>{r.fullName}<span style={s.tdSub}>{r.group}</span></td>
                          <td style={s.td}>{fmt(r.quota)}</td>
                          <td style={Object.assign({},s.td,{background:"rgba(59,130,246,0.06)"})}>
                            <input style={s.input} value={local.forecasts[name]?local.forecasts[name].toLocaleString():""} placeholder="0"
                              onChange={function(e){ setVal("forecasts",name,e.target.value); }}/>
                          </td>
                          <td style={Object.assign({},s.td,{background:"rgba(16,185,129,0.06)"})}>
                            <input style={Object.assign({},s.input,{borderColor:"#14432e"})} value={local.locks[name]?local.locks[name].toLocaleString():""} placeholder="0"
                              onChange={function(e){ setVal("locks",name,e.target.value); }}/>
                          </td>
                          <td style={Object.assign({},s.td,{background:"rgba(20,186,129,0.04)"})}>
                            <input style={Object.assign({},s.input,{borderColor:"#143028"})} value={local.stretches[name]?local.stretches[name].toLocaleString():""} placeholder="0"
                              onChange={function(e){ setVal("stretches",name,e.target.value); }}/>
                          </td>
                          <td style={Object.assign({},s.td,{color:sf?"#a78bfa":"#475569"})}>{sf?fmt(Math.round(sf*h.avgFinish)):"Enter forecast"}</td>
                          <td style={Object.assign({},s.td,{color:sf?"#60a5fa":"#475569"})}>{sf?fmt(Math.round(sf*h.lockMult)):"--"}</td>
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

// ── TRACKER TAB ───────────────────────────────────────────────────────────────
function TrackerTab(props) {
  var monthData=props.monthData, monthName=props.monthName, activeYear=props.activeYear, mPacing=props.mPacing, onSave=props.onSave;

  var [localWon, setLocalWon] = useState(Object.assign({}, monthData.abClosedWon));
  var [saved,    setSaved]    = useState(false);
  var [saving,   setSaving]   = useState(false);
  var [lastUpd,  setLastUpd]  = useState(monthData.lastUpdated||null);

  // Keep localWon in sync if monthData changes from outside (e.g. month switch)
  useEffect(function() {
    setLocalWon(Object.assign({}, monthData.abClosedWon));
    setLastUpd(monthData.lastUpdated||null);
  }, [monthData]);

  var totals = ALL_REPS.reduce(function(a,n){
    a.sf     += monthData.startingForecasts[n]||0;
    a.lock   += monthData.locks[n]||0;
    a.stretch+= monthData.stretches[n]||0;
    a.ab     += localWon[n]||0;
    return a;
  },{sf:0,lock:0,stretch:0,ab:0});

  function setWon(rep, raw) {
    var v = parseNum(raw);
    setLocalWon(function(prev){ return Object.assign({},prev,{[rep]:v}); });
  }

  async function handleSave() {
    setSaving(true);
    var now = new Date().toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
    await onSave({ abClosedWon: localWon, lastUpdated: now });
    setSaving(false); setSaved(true); setLastUpd(now);
    setTimeout(function(){ setSaved(false); }, 3000);
  }

  var groups = [{label:"Human Services",reps:HS_REPS,color:"#1a2744"},{label:"Post-Acute",reps:PA_REPS,color:"#1a2433"}];

  return (
    <div className="slide-in">
      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[
          {label:"AB Closed Won",    val:fmt(totals.ab),                               color:"#60a5fa"},
          {label:"vs Team Lock",     val:pctStr(totals.ab,totals.lock),                color:(pct(totals.ab,totals.lock)||0)>=100?"#10b981":"#f59e0b"},
          {label:"Team Lock Target", val:fmt(totals.lock),                             color:"#10b981"},
          {label:"Month Progress",   val:mPacing+"%",                                  color:"#a78bfa"},
        ].map(function(stat){
          return (
            <div key={stat.label} style={Object.assign({},s.card,{padding:16})}>
              <div style={Object.assign({},s.statNum,{color:stat.color})}>{stat.val}</div>
              <div style={s.statLbl}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Update panel */}
      <div style={Object.assign({},s.card,{marginBottom:16,padding:"14px 18px",borderLeft:"4px solid #3b82f6",borderRadius:12})}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,fontWeight:700,color:"#f1f5f9",letterSpacing:"0.04em",textTransform:"uppercase"}}>
              📊 Update Daily Numbers
            </div>
            <div style={{fontSize:13,color:"#64748b",marginTop:3}}>
              Enter each rep's AB Closed Won from the daily chart, then hit Save — everyone sees it instantly.
              {lastUpd && <span style={{color:"#475569",marginLeft:12,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>Last saved: {lastUpd}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginLeft:24}}>
            {saved  && <span style={{color:"#10b981",fontSize:13,fontWeight:600}}>✓ Saved!</span>}
            {saving && <span style={{color:"#f59e0b",fontSize:13,fontWeight:600}}>Saving…</span>}
            <button onClick={handleSave} style={s.btn("#10b981")}>💾 Save Numbers</button>
          </div>
        </div>
      </div>

      {/* Main table */}
      <div style={s.card}>
        <div style={s.cardHdr}>
          <div style={s.cardTitle}>📈 {monthName} {activeYear} — Daily Tracker</div>
          <span style={{marginLeft:"auto",fontSize:12,color:"#64748b",fontFamily:"'IBM Plex Mono',monospace"}}>{mPacing}% through month</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={Object.assign({},s.thL(),{width:175})}>Rep</th>
                <th style={s.th()}>Quota</th>
                <th style={s.th("#1a3a5c")}>AB Closed Won ✏️</th>
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
                    <tr><td colSpan={10} style={s.secRow(group.color)}>{group.label}</td></tr>
                    {group.reps.map(function(name,i){
                      var r=REPS[name];
                      var sf=monthData.startingForecasts[name]||0;
                      var lk=monthData.locks[name]||0;
                      var st=monthData.stretches[name]||0;
                      var ab=localWon[name]||0;
                      var pctLock=pct(ab,lk);
                      var lockColor=pctLock===null?"#475569":pctLock>=100?"#10b981":pctLock>=75?"#f59e0b":"#ef4444";
                      return (
                        <tr key={name} style={{background:i%2===0?"#1e293b":"#1a2535"}}>
                          <td style={s.tdL}>{r.fullName}<span style={Object.assign({},s.tdSub,{color:"#475569"})}>{r.group}</span></td>
                          <td style={s.td}>{fmt(r.quota)}</td>
                          <td style={Object.assign({},s.td,{background:"rgba(59,130,246,0.06)",padding:"4px 8px"})}>
                            <input
                              style={Object.assign({},s.input,{borderColor:"#1a3a5c",color:"#93c5fd",fontWeight:700})}
                              value={localWon[name]?localWon[name].toLocaleString():""}
                              placeholder="0"
                              onChange={function(e){ setWon(name,e.target.value); }}
                            />
                            {ab>0&&lk>0&&<div style={{marginTop:4}}><Bar value={ab} max={st||lk} color={lockColor} height={3}/></div>}
                          </td>
                          <td style={s.td}>{sf?fmt(sf):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={sf}/></td>
                          <td style={Object.assign({},s.td,{color:"#4ade80"})}>{lk?fmt(lk):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={lk} bold={true}/></td>
                          <td style={Object.assign({},s.td,{color:"#34d399"})}>{st?fmt(st):"--"}</td>
                          <td style={s.td}><PctCell num={ab} den={st}/></td>
                          <td style={Object.assign({},s.td,{textAlign:"center"})}><PaceBadge ab={ab} lk={lk} mPacing={mPacing}/></td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              <tr style={{background:"#1e3a5f",borderTop:"2px solid #3b82f6"}}>
                <td style={Object.assign({},s.tdL,{color:"#f1f5f9",fontWeight:800})}>TOTALS</td>
                <td style={s.td}>{fmt(ALL_REPS.reduce(function(a,n){return a+REPS[n].quota;},0))}</td>
                <td style={Object.assign({},s.td,{color:"#60a5fa",fontWeight:700,fontSize:15})}>{totals.ab>0?fmt(totals.ab):"--"}</td>
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

// ── PREDICTIONS TAB ───────────────────────────────────────────────────────────
function PredictionsTab(props) {
  var monthData=props.monthData, monthName=props.monthName, activeYear=props.activeYear;

  var trendLabel = function(t) {
    return ({
      steady:  {label:"Steady",      color:"#60a5fa", icon:"→"},
      upside:  {label:"High Upside", color:"#10b981", icon:"↑"},
      volatile:{label:"Volatile",    color:"#f59e0b", icon:"↕"},
      under:   {label:"Cautious",    color:"#f87171", icon:"↓"},
    })[t] || {label:"--",color:"#64748b",icon:"·"};
  };

  return (
    <div className="slide-in">
      <div style={Object.assign({},s.card,{padding:"12px 16px",marginBottom:16,borderLeft:"4px solid #a78bfa",borderRadius:12})}>
        <div style={{fontSize:13,color:"#94a3b8",lineHeight:1.6}}>
          <strong style={{color:"#c4b5fd"}}>AI Prediction Model</strong> — Based on 2025 historical performance.
          Predicted finish range uses each rep's avg finish multiplier vs starting forecast.
          Compare their stated Lock &amp; Stretch against the model to flag conservative or aggressive targets.
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:16}}>
        {ALL_REPS.map(function(name){
          var h=HIST[name];
          var sf=monthData.startingForecasts[name]||0;
          var lk=monthData.locks[name]||0;
          var st=monthData.stretches[name]||0;
          var ab=monthData.abClosedWon[name]||0;
          var predicted = sf?Math.round(sf*h.avgFinish):null;
          var predLow   = sf?Math.round(sf*h.low):null;
          var predHigh  = sf?Math.round(sf*h.high):null;
          var aiLock    = sf?Math.round(sf*h.lockMult):null;
          var trend     = trendLabel(h.trend);
          var lockVsAI  = lk&&aiLock?pct(lk,aiLock):null;
          var lockAssess= lockVsAI===null?null:lockVsAI>=110?{label:"Aggressive",color:"#f59e0b"}:lockVsAI>=90?{label:"On Model",color:"#10b981"}:{label:"Conservative",color:"#60a5fa"};
          return (
            <div key={name} style={s.card}>
              <div style={{padding:"12px 14px",borderBottom:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:700,color:"#f1f5f9",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15}}>{REPS[name].fullName}</div>
                  <div style={{fontSize:11,color:trend.color,fontWeight:600,marginTop:2}}>{trend.icon} {trend.label} · {REPS[name].group}</div>
                </div>
                {ab>0&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#64748b"}}>Actual so far</div><div style={{color:"#93c5fd",fontWeight:700,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(ab)}</div></div>}
              </div>
              <div style={{padding:"12px 14px"}}>
                {sf ? (
                  <div>
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:"#64748b",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Predicted Finish Range</div>
                      <div style={{color:"#c4b5fd",fontWeight:600,fontFamily:"'IBM Plex Mono',monospace"}}>{fmtK(predLow)} — {fmtK(predHigh)}</div>
                      <div style={{fontSize:12,color:"#a78bfa",marginTop:2}}>Most likely: <strong>{fmt(predicted)}</strong></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>AI Lock Floor</div>
                        <div style={{color:"#4ade80",fontWeight:600,fontFamily:"'IBM Plex Mono',monospace"}}>{fmt(aiLock)}</div>
                        <div style={{fontSize:10,color:"#475569",marginTop:1}}>{Math.round(h.lockMult*100)}% of forecast</div>
                      </div>
                      <div style={{background:"#0f172a",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>Rep Lock</div>
                        <div style={{color:lk?"#4ade80":"#334155",fontWeight:600,fontFamily:"'IBM Plex Mono',monospace"}}>{lk?fmt(lk):"Not set"}</div>
                        {lockAssess&&<div style={{fontSize:10,color:lockAssess.color,fontWeight:600,marginTop:1}}>{lockAssess.label}</div>}
                      </div>
                    </div>
                    {st>0&&(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(52,211,153,0.06)",border:"1px solid #143028",borderRadius:6,padding:"6px 10px"}}>
                        <span style={{fontSize:11,color:"#64748b"}}>Stretch: <strong style={{color:"#34d399"}}>{fmt(st)}</strong></span>
                        <span style={{fontSize:11,fontWeight:600,color:st>=predLow&&st<=predHigh?"#10b981":"#f59e0b"}}>{st>=predLow&&st<=predHigh?"✓ Within range":st>predHigh?"Above model":"Below model"}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{color:"#475569",fontSize:13,textAlign:"center",padding:"16px 0"}}>Set starting forecast in Month Setup to see predictions</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.card}>
        <div style={s.cardHdr}><div style={s.cardTitle}>📊 Historical Performance Reference (2025)</div></div>
        <div style={{overflowX:"auto"}}>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.thL()}>Rep</th>
                <th style={s.th()}>Avg Finish %</th>
                <th style={s.th()}>Median Lock %</th>
                <th style={s.th()}>Low (worst)</th>
                <th style={s.th()}>High (best)</th>
                <th style={s.th()}>Profile</th>
              </tr>
            </thead>
            <tbody>
              {ALL_REPS.map(function(name,i){
                var h=HIST[name], trend=trendLabel(h.trend);
                return (
                  <tr key={name} style={{background:i%2===0?"#1e293b":"#1a2535"}}>
                    <td style={s.tdL}>{REPS[name].fullName}</td>
                    <td style={Object.assign({},s.td,{color:h.avgFinish>=1.5?"#10b981":h.avgFinish>=1?"#60a5fa":"#f87171",fontWeight:700})}>{Math.round(h.avgFinish*100)}%</td>
                    <td style={Object.assign({},s.td,{color:"#4ade80"})}>{Math.round(h.lockMult*100)}%</td>
                    <td style={Object.assign({},s.td,{color:"#f87171"})}>{Math.round(h.low*100)}%</td>
                    <td style={Object.assign({},s.td,{color:"#10b981"})}>{Math.round(h.high*100)}%</td>
                    <td style={Object.assign({},s.td,{textAlign:"left",color:trend.color,fontWeight:600,fontSize:12})}>{trend.icon} {trend.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ISTCommandCenter() {
  var [tab,         setTab]         = useState("tracker");
  var [data,        setData]        = useState({months:{}});
  var [activeMonth, setActiveMonth] = useState(currentMonthKey());
  var [loading,     setLoading]     = useState(true);
  var [saveStatus,  setSaveStatus]  = useState(null);
  var saveTimeout = useRef(null);

  var parts          = activeMonth.split("-").map(Number);
  var activeYear     = parts[0];
  var activeMonthNum = parts[1];
  var monthName      = MONTHS[activeMonthNum-1];
  var monthData      = data.months[activeMonth] || defaultMonthData();
  var mPacing        = monthPacingPct(activeYear, activeMonthNum);
  var totals         = ALL_REPS.reduce(function(a,n){ a.ab+=monthData.abClosedWon[n]||0; a.lock+=monthData.locks[n]||0; return a; },{ab:0,lock:0});

  useEffect(function() {
    fetch("/api/get-data")
      .then(function(r){ return r.json(); })
      .then(function(d){ setData(d||{months:{}}); })
      .catch(function(){ setData({months:{}}); })
      .finally(function(){ setLoading(false); });
  }, []);

  var saveToServer = useCallback(function(newData) {
    clearTimeout(saveTimeout.current);
    setSaveStatus("saving");
    saveTimeout.current = setTimeout(async function() {
      try {
        await fetch("/api/save-data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newData)});
        setSaveStatus("saved");
        setTimeout(function(){ setSaveStatus(null); }, 3000);
      } catch(e) { setSaveStatus("error"); }
    }, 400);
  }, []);

  var updateMonthData = useCallback(function(updates) {
    setData(function(prev) {
      var cur = prev.months[activeMonth] || defaultMonthData();
      var merged = Object.assign({}, cur, updates);
      var newMonths = Object.assign({}, prev.months);
      newMonths[activeMonth] = merged;
      var newData = Object.assign({}, prev, {months: newMonths});
      saveToServer(newData);
      return newData;
    });
  }, [activeMonth, saveToServer]);

  var handleSetupSave   = useCallback(function(u){ updateMonthData(u); }, [updateMonthData]);
  var handleTrackerSave = useCallback(function(u){ updateMonthData(u); }, [updateMonthData]);

  if(loading) return (
    <div style={{background:"#0f172a",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#64748b",fontSize:14,fontFamily:"monospace"}}>Loading IST Command Center…</div>
    </div>
  );

  return (
    <React.Fragment>
      <FontLoader/>
      <div style={s.app}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <div>
              <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                <span style={s.title}>IST SALES COMMAND CENTER</span>
                <span style={s.badge("#1d4ed8")}>NETSMART</span>
              </div>
              <div style={s.subtitle}>
                {totals.ab>0
                  ? fmt(totals.ab)+" closed · "+pctStr(totals.ab,totals.lock)+" of lock · "+mPacing+"% through "+monthName
                  : monthName+" "+activeYear+" · Enter daily numbers in the Tracker tab"}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {saveStatus==="saving" && <span style={{fontSize:12,color:"#f59e0b",fontWeight:600}}>Saving…</span>}
              {saveStatus==="saved"  && <span style={{fontSize:12,color:"#10b981",fontWeight:600}}>✓ Saved</span>}
              {/* Month selector */}
              <div style={{display:"flex",alignItems:"center",gap:8,background:"#1e293b",border:"1px solid #334155",borderRadius:8,padding:"6px 12px"}}>
                <span style={{color:"#64748b",fontSize:12}}>Month:</span>
                <select value={activeMonthNum-1}
                  onChange={function(e){ setActiveMonth(activeYear+"-"+String(Number(e.target.value)+1).padStart(2,"0")); }}
                  style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {MONTHS.map(function(m,i){ return <option key={i} value={i} style={{background:"#1e293b"}}>{m}</option>; })}
                </select>
                <select value={activeYear}
                  onChange={function(e){ setActiveMonth(e.target.value+"-"+String(activeMonthNum).padStart(2,"0")); }}
                  style={{background:"transparent",border:"none",color:"#f1f5f9",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                  {[2025,2026,2027].map(function(y){ return <option key={y} value={y} style={{background:"#1e293b"}}>{y}</option>; })}
                </select>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div style={s.tabs}>
            {[{key:"setup",label:"📋 Month Setup"},{key:"tracker",label:"📈 Daily Tracker"},{key:"predictions",label:"🔮 AI Predictions"}].map(function(t){
              return <button key={t.key} onClick={function(){ setTab(t.key); }} style={s.tab(tab===t.key)}>{t.label}</button>;
            })}
          </div>
        </div>

        {/* Content */}
        <div style={s.content}>
          {tab==="setup"        && <SetupTab       monthData={monthData} monthName={monthName} activeYear={activeYear} mPacing={mPacing} onSave={handleSetupSave}/>}
          {tab==="tracker"      && <TrackerTab     monthData={monthData} monthName={monthName} activeYear={activeYear} mPacing={mPacing} onSave={handleTrackerSave}/>}
          {tab==="predictions"  && <PredictionsTab monthData={monthData} monthName={monthName} activeYear={activeYear}/>}
        </div>
      </div>
    </React.Fragment>
  );
}
