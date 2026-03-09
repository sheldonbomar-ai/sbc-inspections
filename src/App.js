import { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

const C={bg:"#0F1419",b2:"#1A2332",b3:"#222E3C",bd:"#2D3B4E",bl:"#3B8BF5",bll:"#1C3A5E",gr:"#4ADE80",grl:"#1A3A2A",w:"#E8ECF1",w2:"#A0AEBF",w3:"#6B7D92",rd:"#F87171",rdb:"#3B1C1C",or:"#FBBF24",orb:"#3B2E1C"};
const PRINT_CSS=`@media print{
  body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-sidebar],[data-mobnav],[data-noprint]{display:none!important;}
  [data-app]{height:auto!important;overflow:visible!important;background:#fff!important;display:block!important;}
  [data-content]{padding:0!important;overflow:visible!important;}
  [data-print-header]{display:flex!important;}
  *{color:#000!important;border-color:#ccc!important;}
  [data-day-header]{background:#e5e7eb!important;padding:8px 12px!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-day-header] span{color:#000!important;}
  [data-insp-row]{background:#fff!important;border-bottom:1px solid #ccc!important;padding:6px 12px!important;}
  [data-insp-row] [data-name]{color:#000!important;font-size:12px!important;}
  [data-insp-row] [data-type]{color:#333!important;font-weight:700!important;font-size:11px!important;}
  [data-insp-row] [data-detail]{color:#555!important;font-size:10px!important;}
  [data-insp-row] [data-result]{font-weight:700!important;}
  [data-status-dot]{border:1px solid #000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-pend-header]{background:#fef3c7!important;border-top:2px solid #f59e0b!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-pend-header] span{color:#92400e!important;}
}`;
const useMobile=()=>{const[m,sM]=useState(window.innerWidth<768);useEffect(()=>{const h=()=>sM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const DT=[{p:"S",l:"Final Structural"},{p:"S",l:"Insulation"},{p:"S",l:"Framing"},{p:"S",l:"Drywall Screw"},{p:"S",l:"Foundation"},{p:"S",l:"Unit Masonry"},{p:"S",l:"Window/Door Buck"},{p:"S",l:"Final Building"},{p:"S",l:"Progress"},{p:"P",l:"Underground/Rough Plumbing"},{p:"P",l:"Top-Out Plumbing"},{p:"P",l:"Final Plumbing"},{p:"P",l:"Water Service"},{p:"P",l:"Sewer Hook-up"},{p:"E",l:"Rough Electrical"},{p:"E",l:"Final Electrical"},{p:"E",l:"Smokes/GFCI"},{p:"M",l:"Rough Mechanical"},{p:"M",l:"Final Mechanical"},{p:"R",l:"Mop in Progress"},{p:"R",l:"Shingle in Progress"},{p:"R",l:"Tin Cap"},{p:"R",l:"Uplift Test"},{p:"R",l:"Roof Final"},{p:"R",l:"Tile in Progress"},{p:"W",l:"Windows & Doors"},{p:"W",l:"Impact/NOA"}];
const PN={S:"Structural",P:"Plumbing",E:"Electrical",M:"Mechanical",R:"Roofing",W:"Windows/Doors"};
const SM={W:"Windows & Doors",R:"Roofing",S:"Structural",E:"Electrical",P:"Plumbing"};
const CREWS=[
{id:"robin",name:"Robin",color:"#4ADE80"},{id:"robinjr",name:"Robin Jr",color:"#3B8BF5"},{id:"onel",name:"Onel",color:"#2DD4BF"},{id:"alfredo",name:"Alfredo",color:"#818CF8"},{id:"renee",name:"Rene",color:"#C084FC"},
{id:"marcos",name:"Marcos Roofing",color:"#FB923C"},{id:"jose",name:"Jose Roofing",color:"#FBBF24"},
{id:"bob",name:"Bob Windows",color:"#A78BFA"},
{id:"manny",name:"Manny",color:"#F472B6"},{id:"roger",name:"Roger",color:"#38BDF8"},{id:"rudy",name:"Rudy",color:"#34D399"},{id:"john",name:"John (Gutters)",color:"#E879F9"},{id:"mary",name:"Marbely",color:"#FB7185"},
{id:"pete",name:"Pete Plumbing",color:"#22D3EE"},{id:"lashawn",name:"Lashawn Electrical",color:"#F87171"},{id:"richard",name:"Richard Barba Mechanical",color:"#FCD34D"}
];
const fT=(t,ct=[])=>{const f=[...DT,...ct].find(x=>x.l===t);return f?`${f.p}- ${f.l}`:t;};
const SD="Ashley|Pompano Beach|2921 NW 8 ST|0|0|W,E|⚠ REVISION: CGI NOA now PGT by Sparta;Barrant|Sunrise|4008 Del Rio Way|0|1|W,R,E|In permitting;Beckles|Pembroke Pines|12017 NW 11 ST|0|1|W,S,E,P|In permitting;Bryan|Sunrise|11701 NW 30 PL|R-STRT-003473|0|R,S,E,P|Pending building final - work done;Burke|Margate|7708 Margate Blvd Apt C3-6|0|1||CLOSED;Bursztyn|Davie|3745 SW 59 AVE|2025-7435|1|W,S,E,P|Pending finals - job done;Camacho|Plantation|7501 NW 16 ST Unit 3305|P25-1025|0|W,S,E,P|Need appliances AC kitchen sink then finals;Campbell|Margate|1835 Vista Way|0|1|R,S,E|Roof permit in review - other permits issued;Ceasar|Margate|6130 SW 3 ST|0|0|W,R|CLOSED;Clover|Deerfield Beach|516 SW Natura AVE|0|1|R|Roof permit in review;Courts|Deerfield Beach|225 Ventor Q|0|1|W,S,E,P|About to commence;Cox|Deerfield Beach|330 NW 1 AVE|0|0|W,R,S,E,P|Roof in progress - rest about to commence;Davila|Pembroke Pines|1026 NW 159 AVE|0|1|W,R,S,P|Window permit issued - roof in review;Davilsaint|Ft Lauderdale||0|0|R|On pause - insurance issue;Derek-Towriss|Ft Lauderdale|1649 NE 3 CT|0|0||Pending final inspections;Goberdhan|Plantation|7820 NW 14 ST|0|0|W,S,E,P|Win+elec+AC done - bath drywall+appliances+doors left;Gonzalez|Sunrise|9801 Sunrise Lakes Blvd Unit 207|0|1|W,S,E,P|Permit to be issued within 2 weeks;Knight|Pompano Beach|1570 NW 4 AVE|0|0|E|Exterior paint last thing - permits closed;Ledgister|Plantation|103 NW 68 AVE|B25-04632|0|W,S,E,P|All done besides appliances;Mel|Miami||0|0|R|On pause - insurance issue;Mistler|Plantation|5301 SW 8 ST|B25-04835|0|S|Roof work commenced;Morgan|Pembroke Pines|1000 Colony Point Cir #420|0|1|S,E,P|Permit in progress;Moye-Barnett|Davie|7520 NW 31st Place|0|1|W,R,S,E,P|CLOSED;Nora Sanchez|Deerfield Beach|222 Prescott L|0|1|W,S,E,P|About to commence;NSP Swap Shop|Ft Lauderdale|3090 NW 11 ST|18-00205|0|W,R,S,E,P|In progress - big job;NSP WP|West Park|28 Allen RD|WP25-000446|0|W,R,S,E,P|In progress - big job;Phillips|Pembroke Pines|7347 NW 22 DR|0|1|W,R,S,E,P|In permitting;Pifalo|Plantation|8536 NW 10 ST Unit D78|B25-05040|1|W,S,E,P|⚠ REVISION: NOA wrong on window+door - missing plmb permit for WH;Qatar|Sunrise|13800 NW 14 ST Suite 160|0|0|S,E,P|Insurance issue - working to start;Rhoda|Plantation|501 N Pine Island Rd Unit 1|0|0|W,S,E,P|Very active - lots of work to do;Soto|Sunrise|11301 NW 17 ST|0|0|W,R|In review;Stone|Davie|4791 SW 55 AVE|0|0|W,R,S,P|Permit to be closed soon";
const uid=()=>Math.random().toString(36).substr(2,9);
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
const fDay=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"long"}).toUpperCase():"";
const td=()=>new Date().toISOString().split("T")[0];
const svFs=async(k,v)=>{try{await setDoc(doc(db,"data",k),{value:JSON.stringify(v)});}catch(e){console.error("Firestore save error:",e);}};
const ldLocal=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}};
const mkSeed=()=>SD.split(";").map(r=>{const p=r.split("|");return{id:uid(),clientName:p[0],city:p[1],address:p[2]||"TBD",permitNum:p[3]==="0"?"":p[3],hoa:p[4]==="1",scopes:p[5]?p[5].split(",").map(x=>SM[x]).filter(Boolean):[],scopeNotes:"",status:p[6]||"",assignee:"",comments:[],createdAt:td()};});
const S={
  app:{display:"flex",height:"100vh",fontFamily:"system-ui,sans-serif",background:C.bg,color:C.w,overflow:"hidden"},
  side:{width:240,minWidth:240,background:C.b2,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",padding:"16px 0"},
  nav:a=>({display:"flex",alignItems:"center",gap:10,padding:"12px 16px",border:"none",background:a?C.bll:"transparent",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:a?700:500,color:a?C.bl:C.w3,width:"100%",textAlign:"left",marginBottom:4,fontFamily:"inherit",transition:"background 0.15s",letterSpacing:0.3}),
  cd:{background:C.b2,borderRadius:10,padding:16,border:`1px solid ${C.bd}`,marginBottom:12},
  inp:{width:"100%",padding:"8px 12px",borderRadius:7,border:`1px solid ${C.bd}`,background:C.bg,color:C.w,fontSize:12,outline:"none",fontFamily:"inherit",marginBottom:10},
  btn:{padding:"6px 14px",borderRadius:6,border:"none",background:C.bl,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  bs:{padding:"6px 14px",borderRadius:6,border:`1px solid ${C.bd}`,background:C.b2,color:C.w2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"},
  bg:(b,c)=>({fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,background:b,color:c,whiteSpace:"nowrap"}),
  hdr:{display:"grid",gridTemplateColumns:"130px 90px 130px 1fr 160px",gap:6,padding:"8px 14px",alignItems:"center"},
  rw:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.bd}`},
  lb:{fontSize:10,fontWeight:600,color:C.w3,textTransform:"uppercase",letterSpacing:1,marginBottom:3},
  fx:{display:"flex"},fxsb:{display:"flex",justifyContent:"space-between"},fxc:{display:"flex",alignItems:"center"},
};

const APP_PW="Papasauce@811";

export default function App(){
  const[authed,setAuthed]=useState(false);const[pwInput,setPwInput]=useState("");const[pwErr,setPwErr]=useState(false);

  useEffect(()=>{(async()=>{try{const r=localStorage.getItem("sbc-auth");if(r===APP_PW)setAuthed(true);}catch{}})();},[]);

  if(!authed)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:C.b2,borderRadius:16,padding:36,border:`1px solid ${C.bd}`,width:340,textAlign:"center"}}>
        <svg width="48" height="48" viewBox="0 0 40 40" style={{marginBottom:12}}><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
        <div style={{fontSize:18,fontWeight:700,color:C.bl,marginBottom:2}}>Stacy Bomar</div>
        <div style={{fontSize:10,fontWeight:700,color:C.gr,letterSpacing:2,marginBottom:24}}>CONSTRUCTION</div>
        <input value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwErr(false);}} onKeyDown={e=>{if(e.key==="Enter"){if(pwInput===APP_PW){setAuthed(true);localStorage.setItem("sbc-auth",pwInput);}else setPwErr(true);}}} type="password" placeholder="Enter password" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${pwErr?C.rd:C.bd}`,background:C.bg,color:C.w,fontSize:14,outline:"none",textAlign:"center",marginBottom:12}}/>
        {pwErr&&<div style={{fontSize:12,color:C.rd,marginBottom:8}}>Wrong password</div>}
        <button onClick={()=>{if(pwInput===APP_PW){setAuthed(true);localStorage.setItem("sbc-auth",pwInput);}else setPwErr(true);}} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:C.bl,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Sign In</button>
      </div>
    </div>
  );

  return <AppMain/>;
}

function AppMain(){
  const[pg,setPg]=useState("dashboard");
  const[proj,setP]=useState([]);const[insp,setI]=useState([]);const[ct,setCt]=useState([]);const[sched,setSched]=useState([]);
  const[ok,setOk]=useState(false);const[selI,sSI]=useState(null);const[selP,sSP]=useState(null);
  const[modal,sM]=useState(null);const[search,sSr]=useState("");const[editP,sEP]=useState(null);
  const[week,sWk]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split("T")[0];});
  const[resetting,setResetting]=useState(false);
  const mob=useMobile();
  const lastFs=useRef({});

  useEffect(()=>{
    const keys=[["sYp",setP],["sYi",setI],["sYc",setCt],["sYs",setSched]];
    let loaded=0;
    const unsubs=keys.map(([k,setter])=>onSnapshot(doc(db,"data",k),(snap)=>{
      const d=snap.data();
      let val=d?JSON.parse(d.value):null;
      if(k==="sYp"&&!val){val=mkSeed();svFs(k,val);}
      if(!val)val=[];
      const json=JSON.stringify(val);
      localStorage.setItem(k,json);
      if(json!==lastFs.current[k]){lastFs.current[k]=json;setter(val);}
      loaded++;if(loaded>=keys.length)setOk(true);
    },(err)=>{
      console.error("Firestore listen error:",err);
      const val=ldLocal(k,k==="sYp"?mkSeed():[]);
      setter(val);loaded++;if(loaded>=keys.length)setOk(true);
    }));
    return ()=>unsubs.forEach(u=>u());
  },[]);
  useEffect(()=>{if(ok){const j=JSON.stringify(proj);if(j!==lastFs.current.sYp){lastFs.current.sYp=j;svFs("sYp",proj);localStorage.setItem("sYp",j);}}},[proj,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(insp);if(j!==lastFs.current.sYi){lastFs.current.sYi=j;svFs("sYi",insp);localStorage.setItem("sYi",j);}}},[insp,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(ct);if(j!==lastFs.current.sYc){lastFs.current.sYc=j;svFs("sYc",ct);localStorage.setItem("sYc",j);}}},[ct,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(sched);if(j!==lastFs.current.sYs){lastFs.current.sYs=j;svFs("sYs",sched);localStorage.setItem("sYs",j);}}},[sched,ok]);

  if(!ok) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><p style={{color:C.w3}}>Loading...</p></div>;

  const ovd=insp.filter(i=>!i.completed&&i.date&&i.date<td()).length;

  const navItems=[["dashboard","Dashboard"],["sheet","Inspections"],["projects","Projects"],["scheduling","Scheduling"]];

  return(
    <div data-app="" style={{...S.app,flexDirection:mob?"column":"row"}}>
      <style dangerouslySetInnerHTML={{__html:PRINT_CSS}}/>
      {!mob&&<div data-sidebar="" style={S.side}>
        <div style={{...S.fxc,gap:10,padding:"4px 16px 18px",borderBottom:`1px solid ${C.bd}`,marginBottom:10}}>
          <svg width="32" height="32" viewBox="0 0 40 40"><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
          <div><div style={{fontSize:15,fontWeight:700,color:C.bl}}>Stacy Bomar</div><div style={{fontSize:9,fontWeight:700,color:C.gr,letterSpacing:2}}>CONSTRUCTION</div></div>
        </div>
        <div style={{flex:1,padding:"6px 10px"}}>
          {navItems.map(([id,lb])=>{const ico={dashboard:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,sheet:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>,projects:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,scheduling:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>};return(
            <button key={id} style={S.nav(pg===id||(pg==="detail"&&id==="sheet"))} onClick={()=>{setPg(id);sSI(null);sSP(null);}}>
              {ico[id]}{lb}
              {id==="sheet"&&ovd>0&&<span style={{...S.bg(C.or,C.bg),marginLeft:"auto"}}>{ovd}</span>}
            </button>);})}
        </div>
        <div style={{padding:"14px 16px",borderTop:`1px solid ${C.bd}`,fontSize:10,color:C.w3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Broward County, FL</span>
          {!resetting?<button onClick={()=>setResetting(true)} style={{background:"none",border:"none",color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>Reset</button>:
          <div style={{display:"flex",gap:4}}>
            <button onClick={async()=>{const p=mkSeed();setP(p);setI([]);setCt([]);setResetting(false);}} style={{background:C.rd,border:"none",color:"#fff",cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4,fontWeight:600}}>Yes, reset all</button>
            <button onClick={()=>setResetting(false)} style={{background:"none",border:`1px solid ${C.bd}`,color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4}}>Cancel</button>
          </div>}
        </div>
      </div>}

      <div data-content="" style={{flex:1,overflow:"auto",paddingBottom:mob?70:0}}><div style={{padding:mob?"14px 12px":"20px 32px"}}>

        {pg==="dashboard"&&(()=>{
          const cc={};proj.forEach(p=>{cc[p.city||"?"]=(cc[p.city||"?"]||0)+1;});
          const cols=["Windows & Doors","Roofing","Structural","Electrical","Plumbing"];
          const colC={"Windows & Doors":C.gr,Roofing:"#FB923C",Structural:"#A78BFA",Electrical:C.rd,Plumbing:C.bl};
          const sorted=[...proj].sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"}));
          const active=sorted.filter(p=>(p.status||"")!=="CLOSED");
          const closed=sorted.filter(p=>(p.status||"")==="CLOSED");
          const isRev=s=>(s||"").includes("REVISION");
          const revCount=active.filter(p=>isRev(p.status)).length;
          return <>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {[[active.length,"Active Jobs",C.bl],[closed.length,"Closed Jobs",C.w3],[revCount,"Revision Required",revCount?C.or:C.w3]].map(([v,l,c],i)=>
                <div key={i} style={{...S.cd,borderLeft:`3px solid ${c}`}}><div style={{fontSize:28,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:11,color:C.w3}}>{l}</div></div>)}
            </div>

            {/* SPREADSHEET TABLE */}
            <div style={{...S.cd,padding:0,overflow:"auto",marginBottom:16}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Job Scope Matrix</h3><span style={{fontSize:11,color:C.w3}}>{active.length} active · {closed.length} closed</span></div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead><tr style={{background:C.b3}}>
                  <th style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:C.w,borderBottom:`1px solid ${C.bd}`,position:"sticky",left:0,background:C.b3,minWidth:110}}>NAME</th>
                  <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:C.w,borderBottom:`1px solid ${C.bd}`,minWidth:80}}>CITY</th>
                  <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:C.w2,borderBottom:`1px solid ${C.bd}`,minWidth:140}}>ADDRESS</th>
                  <th style={{padding:"8px 10px",textAlign:"left",fontWeight:700,color:C.w2,borderBottom:`1px solid ${C.bd}`,minWidth:180}}>STATUS</th>
                  {cols.map(c=>{const sn={"Windows & Doors":"W/D",Roofing:"ROOF",Structural:"STRUCT",Electrical:"ELEC",Plumbing:"PLMB"};return <th key={c} style={{padding:"8px 6px",textAlign:"center",fontWeight:700,color:colC[c],borderBottom:`1px solid ${C.bd}`,minWidth:55}}>{sn[c]||c}</th>;})}
                </tr></thead>
                <tbody>
                  {active.map((p,idx)=><tr key={p.id} style={{background:isRev(p.status)?C.rdb:idx%2===0?C.b2:"transparent",borderBottom:`1px solid ${C.bd}`}}>
                    <td style={{padding:"6px 12px",fontWeight:600,color:C.w,whiteSpace:"nowrap"}}>{p.clientName}</td>
                    <td style={{padding:"6px 8px",color:C.w3,fontSize:10}}>{p.city}</td>
                    <td style={{padding:"6px 8px",color:C.w2,fontSize:10}}>{p.address&&p.address!=="TBD"?p.address:"—"}</td>
                    <td style={{padding:"6px 8px",fontSize:10,color:isRev(p.status)?C.or:C.w2,fontWeight:isRev(p.status)?700:400}}>{p.status||"—"}</td>
                    {cols.map(c=>{const has=(p.scopes||[]).includes(c);return <td key={c} style={{padding:"6px 6px",textAlign:"center"}}>{has?<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:colC[c]}}/>:<span style={{color:C.b3}}>—</span>}</td>;})}
                  </tr>)}
                  {closed.length>0&&<><tr><td colSpan={5+cols.length} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:C.w3,background:C.b3,borderBottom:`1px solid ${C.bd}`,letterSpacing:1}}>CLOSED JOBS</td></tr>
                  {closed.map((p,idx)=><tr key={p.id} style={{background:"transparent",borderBottom:`1px solid ${C.bd}`,opacity:0.5}}>
                    <td style={{padding:"5px 12px",fontWeight:600,color:C.w3,whiteSpace:"nowrap"}}>{p.clientName}</td>
                    <td style={{padding:"5px 8px",color:C.w3,fontSize:10}}>{p.city}</td>
                    <td style={{padding:"5px 8px",color:C.w3,fontSize:10}}>{p.address&&p.address!=="TBD"?p.address:"—"}</td>
                    <td style={{padding:"5px 8px",fontSize:10,color:C.w3}}>CLOSED</td>
                    {cols.map(c=>{const has=(p.scopes||[]).includes(c);return <td key={c} style={{padding:"5px 6px",textAlign:"center"}}>{has?<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.w3}}/>:<span style={{color:C.b3}}>—</span>}</td>;})}
                  </tr>)}</>}
                </tbody>
              </table>
            </div>

            {/* CITY + PERMITS + PHASE in 3 columns */}
            {(()=>{
              const psc={issued:0,review:0,none:0};proj.forEach(p=>{const ps=(p.permitStatus||"").toLowerCase();if(ps==="issued")psc.issued++;else if(ps==="in review")psc.review++;else psc.none++;});
              const phases={permitting:0,progress:0,done:0,paused:0,commence:0};active.forEach(p=>{const st=(p.status||"").toLowerCase();if(st.includes("permit")||st.includes("review"))phases.permitting++;else if(st.includes("progress")||st.includes("active")||st.includes("commenced")||st.includes("work"))phases.progress++;else if(st.includes("done")||st.includes("final")||st.includes("closed soon"))phases.done++;else if(st.includes("pause")||st.includes("insurance")||st.includes("waiting"))phases.paused++;else if(st.includes("commence"))phases.commence++;else phases.progress++;});
              return <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:12}}>
                <div style={S.cd}><h3 style={{fontSize:13,fontWeight:700,marginBottom:10}}>By City</h3>
                  {Object.entries(cc).sort((a,b)=>b[1]-a[1]).map(([c,n])=><div key={c} style={{...S.fxsb,padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:12}}>{c}</span><span style={{fontSize:14,fontWeight:700,color:C.bl}}>{n}</span></div>)}
                </div>
                <div style={S.cd}><h3 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Permit Status</h3>
                  {[["Issued / Approved",psc.issued,C.gr],["In Review",psc.review,C.or],["Not Set",psc.none,C.w3]].map(([l,v,c])=><div key={l} style={{...S.fxsb,padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:c}}/><span style={{fontSize:12}}>{l}</span></div><span style={{fontSize:14,fontWeight:700,color:c}}>{v}</span></div>)}
                  <p style={{fontSize:10,color:C.w3,marginTop:6}}>Set in project Edit</p>
                </div>
                <div style={S.cd}><h3 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Jobs by Phase</h3>
                  {[["In Permitting",phases.permitting,C.or],["In Progress",phases.progress,C.bl],["Nearly Done / Finals",phases.done,C.gr],["On Pause",phases.paused,C.w3]].map(([l,v,c])=><div key={l} style={{...S.fxsb,padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:c}}/><span style={{fontSize:12}}>{l}</span></div><span style={{fontSize:14,fontWeight:700,color:c}}>{v}</span></div>)}
                </div>
              </div>;
            })()}
          </>;
        })()}

        {pg==="sheet"&&!selI&&(()=>{
          const ws=new Date(week+"T00:00:00");const days=Array.from({length:5},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d.toISOString().split("T")[0];});
          const pend=insp.filter(i=>!i.completed&&(!i.date||i.date<days[0]||i.date>days[4]));
          return <>
            <div data-print-header="" style={{display:"none",alignItems:"center",gap:10,marginBottom:12,paddingBottom:8,borderBottom:"2px solid #000"}}><div><div style={{fontSize:18,fontWeight:700}}>Stacy Bomar Construction</div><div style={{fontSize:10,fontWeight:600,letterSpacing:1}}>INSPECTION LIST — {fmt(days[0])} to {fmt(days[4])}</div></div></div>
            <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>INSPECTION LIST</h1><p style={{fontSize:11,color:C.w3,marginTop:3}}>{fmt(days[0])} — {fmt(days[4])}</p></div><div data-noprint="" style={{display:"flex",gap:6}}><button style={S.bs} onClick={()=>window.print()}>Print</button><button style={S.btn} onClick={()=>sM("insp")}>+ Schedule</button></div></div>
            <div data-noprint="" style={{...S.fx,gap:6,marginBottom:12}}><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()-7);sWk(d.toISOString().split("T")[0]);}}>←</button><button style={{...S.bs,color:C.bl}} onClick={()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);sWk(d.toISOString().split("T")[0]);}}>This Week</button><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()+7);sWk(d.toISOString().split("T")[0]);}}>→</button></div>
            {!mob&&<div data-col-header="" data-noprint="" style={{...S.hdr,background:C.bl,borderRadius:"8px 8px 0 0"}}>{["NAME","CITY","PERMIT","TYPE","ADDRESS"].map(h=><div key={h} style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:1}}>{h}</div>)}</div>}
            {days.map(d=>{const di=insp.filter(i=>i.date===d);const isT=d===td();return <div key={d}>
              <div data-day-header="" style={{...S.fxc,gap:6,background:isT?C.bll:C.b3,padding:"6px 14px",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:11,fontWeight:700,color:isT?C.bl:C.w}}>{fmt(d)}</span><span style={{fontSize:10,color:isT?C.bl:C.w3}}>{fDay(d)}</span>{isT&&<span style={S.bg(C.bl,"#fff")}>TODAY</span>}<span style={{fontSize:10,color:C.w3,marginLeft:"auto"}}>{di.length}</span></div>
              {di.length===0?<div style={{padding:"8px 14px",color:C.w3,fontSize:11,background:C.b2,borderBottom:`1px solid ${C.bd}`}}>—</div>:
              di.map(i=>{const p=proj.find(x=>x.id===i.projectId);const isOv=!i.completed&&i.date<td();const rC=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;const rL=i.result==="pass"?"Pass":i.result==="fail"?"Fail":"Open";return(
                <div data-insp-row="" key={i.id} onClick={()=>{sSI(i.id);setPg("detail");}} style={{padding:"8px 14px",background:isOv?C.rdb:i.result==="fail"?C.rdb:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span data-name="" style={{fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</span><div style={{display:"flex",alignItems:"center",gap:4}}><div data-status-dot="" style={{width:6,height:6,borderRadius:"50%",background:rC}}/><span data-result="" style={{fontSize:10,color:rC}}>{rL}</span></div></div>
                  <div data-type="" style={{fontSize:11,color:C.bl,fontWeight:600}}>{fT(i.type,ct)}</div>
                  <div data-detail="" style={{fontSize:10,color:C.w3,marginTop:2}}>{p?.city}{p?.address&&p?.address!=="TBD"?` · ${p.address}`:""}{i.permitNum?` · Permit: ${i.permitNum}`:""}</div>
                </div>);})}
            </div>;})}
            {pend.length>0&&<><div data-pend-header="" style={{background:C.orb,padding:"7px 14px",borderTop:`2px solid ${C.or}`,marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:C.or}}>PENDING ({pend.length})</span></div>{pend.map(i=>{const p=proj.find(x=>x.id===i.projectId);return(
              <div data-insp-row="" key={i.id} onClick={()=>{sSI(i.id);setPg("detail");}} style={{padding:"8px 14px",background:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span data-name="" style={{fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</span><span data-result="" style={{fontSize:10,color:C.or}}>Pending</span></div>
                <div data-type="" style={{fontSize:11,color:C.or,fontWeight:600}}>{fT(i.type,ct)}</div>
                <div data-detail="" style={{fontSize:10,color:C.w3,marginTop:2}}>{p?.city}{p?.address&&p?.address!=="TBD"?` · ${p.address}`:""}{i.permitNum?` · Permit: ${i.permitNum}`:""}</div>
              </div>);})}</>}
          </>;
        })()}

        {pg==="detail"&&selI&&(()=>{const i=insp.find(x=>x.id===selI);if(!i)return null;const p=proj.find(x=>x.id===i.projectId);
          const stColor=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;
          const stLabel=i.result==="pass"?"PASSED":i.result==="fail"?"FAILED":i.completed?"COMPLETED":"SCHEDULED";
          return <>
          <button style={{...S.bs,marginBottom:14}} onClick={()=>{sSI(null);setPg("sheet");}}>← Back</button>
          <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:mob?16:20,fontWeight:700,margin:0}}>{fT(i.type,ct)}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p?.clientName} · {p?.city} · {fmt(i.date)}</p>{i.permitNum&&<p style={{fontSize:11,color:C.bl,marginTop:3}}>Permit: {i.permitNum}</p>}</div>
          <div style={{...S.fx,gap:6}}>
            {!i.result&&<><button style={{...S.btn,background:C.gr,color:C.bg}} onClick={()=>setI(v=>v.map(x=>x.id===i.id?{...x,completed:true,result:"pass",completedAt:td()}:x))}>✓ Pass</button><button style={{...S.btn,background:C.rd,color:"#fff"}} onClick={()=>setI(v=>v.map(x=>x.id===i.id?{...x,completed:true,result:"fail",completedAt:td()}:x))}>✗ Fail</button></>}
            {i.result&&<button style={S.bs} onClick={()=>setI(v=>v.map(x=>x.id===i.id?{...x,completed:false,result:"",completedAt:""}:x))}>Reset</button>}
            <button style={{...S.bs,color:C.rd}} onClick={()=>{setI(v=>v.filter(x=>x.id!==i.id));sSI(null);setPg("sheet");}}>Delete</button>
          </div></div>
          <div style={S.cd}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:stColor}}/><span style={{fontSize:13,fontWeight:600,color:stColor}}>{stLabel}</span></div>{i.notes&&<p style={{fontSize:12,color:C.w2,marginTop:6}}>Notes: {i.notes}</p>}</div>
        </>;})()}

        {pg==="projects"&&!selP&&<>
          <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Projects</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{proj.length} jobs</p></div><button style={S.btn} onClick={()=>sM("proj")}>+ New</button></div>
          <input style={S.inp} value={search} onChange={e=>sSr(e.target.value)} placeholder="Search..."/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:10}}>
            {proj.filter(p=>(p.clientName+" "+p.city+" "+p.address).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"})).map(p=>
              <div key={p.id} style={{...S.cd,cursor:"pointer",borderLeft:`3px solid ${p.hoa?C.or:C.bl}`}} onClick={()=>sSP(p.id)}>
                <div style={{...S.fxsb,marginBottom:4}}><span style={{fontSize:13,fontWeight:600}}>{p.clientName}</span><div style={{display:"flex",gap:4}}>{p.hoa&&<span style={S.bg(C.orb,C.or)}>HOA</span>}{p.permitStatus&&<span style={S.bg(p.permitStatus==="Issued"?C.grl:C.orb,p.permitStatus==="Issued"?C.gr:C.or)}>{p.permitStatus}</span>}</div></div>
                <div style={{fontSize:11,color:C.w3}}>{p.city}{p.address!=="TBD"?` · ${p.address}`:""}</div>
                {p.permitNum&&<div style={{fontSize:10,color:C.bl,marginTop:2}}>{p.permitNum}</div>}
                {p.scopes&&p.scopes.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{p.scopes.map(sc=><span key={sc} style={{fontSize:9,fontWeight:600,padding:"3px 9px",borderRadius:12,background:sc==="Structural"?"#2D1F4E":sc==="Plumbing"?C.bll:sc==="Electrical"?C.rdb:sc==="Roofing"?"#3B2410":sc==="Windows & Doors"?C.grl:C.b3,color:sc==="Structural"?"#A78BFA":sc==="Plumbing"?C.bl:sc==="Electrical"?C.rd:sc==="Roofing"?"#FB923C":sc==="Windows & Doors"?C.gr:C.w2}}>{sc}</span>)}</div>}
              </div>)}
          </div>
        </>}

        {pg==="projects"&&selP&&(()=>{const p=proj.find(x=>x.id===selP);if(!p)return null;const pi=insp.filter(i=>i.projectId===selP);return <>
          <button style={{...S.bs,marginBottom:14}} onClick={()=>sSP(null)}>← Back</button>
          <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:mob?16:20,fontWeight:700,margin:0}}>{p.clientName}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p.city}{p.address!=="TBD"?` · ${p.address}`:""}</p></div><div style={{...S.fx,gap:6}}><button style={S.bs} onClick={()=>sEP(p)}>Edit</button><button style={S.btn} onClick={()=>sM("insp")}>+ Insp</button><button style={{...S.bs,color:C.rd}} onClick={()=>{setP(v=>v.filter(x=>x.id!==selP));sSP(null);}}>Del</button></div></div>
          <div style={{...S.fx,gap:6,flexWrap:"wrap",marginBottom:12}}>{p.hoa&&<span style={S.bg(C.orb,C.or)}>HOA</span>}{p.permitNum&&<span style={S.bg(C.bll,C.bl)}>{p.permitNum}</span>}{p.permitStatus&&<span style={S.bg(p.permitStatus==="Issued"?C.grl:C.orb,p.permitStatus==="Issued"?C.gr:C.or)}>Permit: {p.permitStatus}</span>}{p.assignee&&<span style={S.bg(C.grl,C.gr)}>👤 {p.assignee}</span>}</div>
          {p.scopeNotes&&<div style={S.cd}><p style={{margin:0,fontSize:12,color:C.w2,lineHeight:1.5}}>{p.scopeNotes}</p></div>}
          <div style={S.cd}><h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>Notes</h4>
            {(p.comments||[]).map(c=><div key={c.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:11,color:C.w2}}>{c.text}</div><div style={{fontSize:9,color:C.w3,marginTop:2}}>{fmt(c.date)}</div></div>)}
            {!(p.comments||[]).length&&<p style={{fontSize:11,color:C.w3}}>No notes yet</p>}
            <div style={{...S.fx,gap:6,marginTop:8}}><input id="cm" style={{...S.inp,marginBottom:0,flex:1}} placeholder="Add note..." onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:e.target.value.trim(),date:td()}]}:x));e.target.value="";}}} /><button style={S.btn} onClick={()=>{const el=document.getElementById("cm");if(el?.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:el.value.trim(),date:td()}]}:x));el.value="";}}}>Add</button></div>
          </div>
          <LinksSection links={p.links||[]} projectId={selP} onAdd={(lk)=>setP(v=>v.map(x=>x.id===selP?{...x,links:[...(x.links||[]),{id:uid(),...lk,date:td()}]}:x))} onDel={(lid)=>setP(v=>v.map(x=>x.id===selP?{...x,links:(x.links||[]).filter(l=>l.id!==lid)}:x))}/>
          <h4 style={{fontSize:13,fontWeight:700,margin:"12px 0 8px"}}>Inspections ({pi.length})</h4>
          {pi.map(i=>{const rc=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;const rl=i.result==="pass"?"Pass":i.result==="fail"?"Fail":"Open";const rb=i.result==="pass"?C.grl:i.result==="fail"?C.rdb:C.orb;return <div key={i.id} style={S.rw}><div style={{width:6,height:6,borderRadius:"50%",background:rc}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{fT(i.type,ct)}</div><div style={{fontSize:10,color:C.w3}}>{fmt(i.date)} · {i.permitNum||"—"}</div></div><span style={S.bg(rb,rc)}>{rl}</span></div>;})}
        </>;})()}

        {pg==="scheduling"&&<SchedTab proj={proj} sched={sched} setSched={setSched} week={week} sWk={sWk} mob={mob}/>}

        {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>sM(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":24,width:"100%",maxWidth:mob?"100%":460,maxHeight:mob?"90vh":"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>{modal==="insp"?"Schedule Inspections":"New Project"}</h2><button onClick={()=>sM(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          {modal==="insp"&&<InspF pr={proj} ok={items=>{setI(v=>[...v,...items.map(i=>({...i,id:uid(),createdAt:td(),completed:false}))]);sM(null);}} ct={ct} aC={t=>setCt(v=>[...v,t])} pre={selP}/>}
          {modal==="proj"&&<PF ok={p=>{setP(v=>[...v,{...p,id:uid(),comments:[],createdAt:td()}]);sM(null);}}/>}
        </div></div>}
        {editP&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>sEP(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":24,width:"100%",maxWidth:mob?"100%":460,maxHeight:mob?"90vh":"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>Edit Project</h2><button onClick={()=>sEP(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          <EF p={editP} ok={u=>{setP(v=>v.map(p=>p.id===editP.id?{...p,...u}:p));sEP(null);}}/>
        </div></div>}

      </div></div>
      {mob&&<div data-mobnav="" style={{position:"fixed",bottom:0,left:0,right:0,background:C.b2,borderTop:`1px solid ${C.bd}`,display:"flex",zIndex:900,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {navItems.map(([id,lb])=>{const act=pg===id||(pg==="detail"&&id==="sheet");return <button key={id} onClick={()=>{setPg(id);sSI(null);sSP(null);}} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",fontFamily:"inherit"}}>
          <span style={{fontSize:16}}>{id==="dashboard"?"📊":id==="sheet"?"📋":id==="projects"?"🏗":"📅"}</span>
          <span style={{fontSize:9,fontWeight:act?700:500,color:act?C.bl:C.w3}}>{lb}</span>
          {id==="sheet"&&ovd>0&&<span style={{position:"absolute",top:4,marginLeft:24,fontSize:8,fontWeight:700,background:C.or,color:C.bg,borderRadius:8,padding:"1px 4px"}}>{ovd}</span>}
        </button>;})}
      </div>}
    </div>
  );
}

function InspF({pr,ok,ct=[],aC,pre}){
  const blank=()=>({type:"",date:td(),permitNum:"",notes:""});
  const[pid,sPid]=useState(pre||"");
  const[rows,sRows]=useState([blank()]);
  const[searches,sSr]=useState([""]);
  const[openDd,sOd]=useState(-1);
  const all=[...DT,...ct];
  const addRow=()=>{if(rows.length<5){sRows([...rows,blank()]);sSr([...searches,""]);}};
  const rmRow=(i)=>{if(rows.length>1){sRows(rows.filter((_,j)=>j!==i));sSr(searches.filter((_,j)=>j!==i));}};
  const updRow=(i,upd)=>sRows(rows.map((r,j)=>j===i?{...r,...upd}:r));
  const updSr=(i,v)=>sSr(searches.map((s,j)=>j===i?v:s));
  const valid=pid&&rows.every(r=>r.type&&r.date);
  const submit=()=>{if(valid)ok(rows.map(r=>({...r,projectId:pid})));};
  return <div>
    <div style={S.lb}>Project *</div>
    <select style={S.inp} value={pid} onChange={e=>sPid(e.target.value)}><option value="">Select...</option>{[...pr].sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"})).map(p=><option key={p.id} value={p.id}>{p.clientName} — {p.city}</option>)}</select>
    {rows.map((r,i)=>{
      const ts=searches[i]||"";
      const fl=all.filter(t=>(`${t.p}- ${t.l}`).toLowerCase().includes(ts.toLowerCase())||t.l.toLowerCase().includes(ts.toLowerCase())||t.p.toLowerCase()===ts.toLowerCase());
      const gr={};fl.forEach(t=>{const g=PN[t.p]||"Other";if(!gr[g])gr[g]=[];gr[g].push(t);});
      return <div key={i} style={{background:C.bg,borderRadius:8,padding:10,marginBottom:8,border:`1px solid ${C.bd}`}}>
        <div style={{...S.fxsb,marginBottom:6}}><span style={{fontSize:11,fontWeight:700,color:C.bl}}>Inspection {i+1}</span>{rows.length>1&&<button onClick={()=>rmRow(i)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:11}}>Remove</button>}</div>
        <div style={S.lb}>Type *</div>
        <div style={{position:"relative",marginBottom:6}}>
          <input style={{...S.inp,marginBottom:0}} value={r.type?fT(r.type,ct):ts} onChange={e=>{updSr(i,e.target.value);updRow(i,{type:""});sOd(i);}} onFocus={()=>sOd(i)} placeholder="Search... (S, plumb, rough)"/>
          {openDd===i&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.b2,border:`1px solid ${C.bd}`,borderRadius:7,maxHeight:180,overflow:"auto",zIndex:100,marginTop:3,boxShadow:"0 8px 20px rgba(0,0,0,.5)"}}>
            {Object.entries(gr).map(([g,items])=><div key={g}><div style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:C.w3,background:C.b3,borderBottom:`1px solid ${C.bd}`}}>{g}</div>
            {items.map(t=><div key={t.l} onClick={()=>{updRow(i,{type:t.l});updSr(i,"");sOd(-1);}} style={{padding:"6px 12px",fontSize:12,cursor:"pointer",borderBottom:`1px solid ${C.bd}`}}><span style={{fontWeight:700,color:C.bl,marginRight:6}}>{t.p}-</span>{t.l}</div>)}</div>)}
          </div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          <div><div style={S.lb}>Date *</div><input style={S.inp} type="date" value={r.date} onChange={e=>updRow(i,{date:e.target.value})}/></div>
          <div><div style={S.lb}>Permit #</div><input style={S.inp} value={r.permitNum} onChange={e=>updRow(i,{permitNum:e.target.value})} placeholder="B25-05040"/></div>
        </div>
        <div style={S.lb}>Notes</div><input style={S.inp} value={r.notes} onChange={e=>updRow(i,{notes:e.target.value})} placeholder="framing, screw"/>
      </div>;
    })}
    <div style={{...S.fx,justifyContent:"space-between",marginTop:4}}>
      {rows.length<5?<button style={S.bs} onClick={addRow}>+ Add Another ({rows.length}/5)</button>:<span style={{fontSize:10,color:C.w3}}>Max 5 inspections</span>}
      <button style={{...S.btn,opacity:valid?1:0.5}} onClick={submit}>Schedule {rows.length>1?`(${rows.length})`:""}
      </button>
    </div>
  </div>;
}
function PF({ok}){
  const[f,s]=useState({clientName:"",address:"",city:"",hoa:false,permitNum:"",permitStatus:"",scopeNotes:"",assignee:"",scopes:[]});
  const allSc=["Structural","Plumbing","Electrical","Roofing","Windows & Doors"];
  const scC={Structural:"#A78BFA",Plumbing:C.bl,Electrical:C.rd,Roofing:"#FB923C","Windows & Doors":C.gr};
  const togSc=sc=>{s({...f,scopes:f.scopes.includes(sc)?f.scopes.filter(x=>x!==sc):[...f.scopes,sc]});};
  return <div>
    {[["Client *","clientName",""],["City *","city","Plantation"],["Address","address","1234 NW 10 ST"],["Permit #","permitNum",""],["Assigned To","assignee","Team member"]].map(([l,k,p])=><div key={k}><div style={S.lb}>{l}</div><input style={S.inp} value={f[k]} onChange={e=>s({...f,[k]:e.target.value})} placeholder={p}/></div>)}
    <div style={S.lb}>Disciplines</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{allSc.map(sc=><button key={sc} onClick={()=>togSc(sc)} style={{padding:"5px 12px",borderRadius:12,border:`1px solid ${f.scopes.includes(sc)?scC[sc]:C.bd}`,background:f.scopes.includes(sc)?scC[sc]+"22":"transparent",color:f.scopes.includes(sc)?scC[sc]:C.w3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{sc}</button>)}</div>
    <div style={S.lb}>Permit Status</div>
    <select style={S.inp} value={f.permitStatus} onChange={e=>s({...f,permitStatus:e.target.value})}><option value="">Not set</option><option value="Issued">Issued / Approved</option><option value="In Review">In Review</option></select>
    <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.w2,marginBottom:10}}><input type="checkbox" checked={f.hoa} onChange={e=>s({...f,hoa:e.target.checked})}/> HOA</label>
    <div style={S.lb}>Scope Notes</div><textarea style={{...S.inp,minHeight:50,resize:"vertical"}} value={f.scopeNotes} onChange={e=>s({...f,scopeNotes:e.target.value})}/>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>f.clientName&&ok({...f,status:""})}>Create</button></div>
  </div>;
}
function EF({p,ok}){
  const[f,s]=useState({clientName:p.clientName,address:p.address||"",city:p.city||"",hoa:p.hoa||false,permitNum:p.permitNum||"",permitStatus:p.permitStatus||"",status:p.status||"",scopeNotes:p.scopeNotes||"",assignee:p.assignee||"",scopes:p.scopes||[]});
  const allSc=["Structural","Plumbing","Electrical","Roofing","Windows & Doors"];
  const scC={Structural:"#A78BFA",Plumbing:C.bl,Electrical:C.rd,Roofing:"#FB923C","Windows & Doors":C.gr};
  const togSc=sc=>{s({...f,scopes:f.scopes.includes(sc)?f.scopes.filter(x=>x!==sc):[...f.scopes,sc]});};
  return <div>
    {[["Client","clientName"],["City","city"],["Address","address"],["Permit #","permitNum"],["Assigned To","assignee"],["Job Status","status"]].map(([l,k])=><div key={k}><div style={S.lb}>{l}</div><input style={S.inp} value={f[k]} onChange={e=>s({...f,[k]:e.target.value})}/></div>)}
    <div style={S.lb}>Disciplines</div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{allSc.map(sc=><button key={sc} onClick={()=>togSc(sc)} style={{padding:"5px 12px",borderRadius:12,border:`1px solid ${f.scopes.includes(sc)?scC[sc]:C.bd}`,background:f.scopes.includes(sc)?scC[sc]+"22":"transparent",color:f.scopes.includes(sc)?scC[sc]:C.w3,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{sc}</button>)}</div>
    <div style={S.lb}>Permit Status</div>
    <select style={S.inp} value={f.permitStatus} onChange={e=>s({...f,permitStatus:e.target.value})}>
      <option value="">Not set</option>
      <option value="Issued">Issued / Approved</option>
      <option value="In Review">In Review</option>
    </select>
    <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.w2,marginBottom:10}}><input type="checkbox" checked={f.hoa} onChange={e=>s({...f,hoa:e.target.checked})}/> HOA</label>
    <div style={S.lb}>Scope Notes</div><textarea style={{...S.inp,minHeight:60,resize:"vertical"}} value={f.scopeNotes} onChange={e=>s({...f,scopeNotes:e.target.value})}/>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>ok(f)}>Save</button></div>
  </div>;
}
function SchedTab({proj,sched,setSched,week,sWk,mob}){
  const[assignCrew,setAssignCrew]=useState(null);
  const ws=new Date(week+"T00:00:00");const days=Array.from({length:5},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d.toISOString().split("T")[0];});
  const active=[...proj].filter(p=>(p.status||"")!=="CLOSED").sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"}));
  const getAssign=(crewId,date)=>sched.filter(s=>s.crewId===crewId&&s.date===date);
  const addAssign=(crewId,date,projectId,notes)=>setSched(v=>[...v,{id:uid(),crewId,date,projectId,notes:notes||""}]);
  const rmAssign=(id)=>setSched(v=>v.filter(s=>s.id!==id));
  return <>
    <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>CREW SCHEDULING</h1><p style={{fontSize:11,color:C.w3,marginTop:3}}>{fmt(days[0])} — {fmt(days[4])}</p></div></div>
    <div style={{...S.fx,gap:6,marginBottom:16}}><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()-7);sWk(d.toISOString().split("T")[0]);}}>←</button><button style={{...S.bs,color:C.bl}} onClick={()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);sWk(d.toISOString().split("T")[0]);}}>This Week</button><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()+7);sWk(d.toISOString().split("T")[0]);}}>→</button></div>

    {mob?
      days.map(d=>{const isT=d===td();const dayAssigns=sched.filter(s=>s.date===d);const crewsWithWork=CREWS.filter(cr=>dayAssigns.some(s=>s.crewId===cr.id));return <div key={d} style={{marginBottom:14}}>
        <div style={{background:isT?C.bll:C.b3,padding:"10px 14px",borderRadius:"8px 8px 0 0",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13,fontWeight:700,color:isT?C.bl:C.w}}>{fmt(d)}</span><span style={{fontSize:10,color:isT?C.bl:C.w3}}>{fDay(d)}</span>{isT&&<span style={S.bg(C.bl,"#fff")}>TODAY</span>}
          <span style={{marginLeft:"auto",fontSize:10,fontWeight:600,color:isT?C.bl:C.w3}}>{dayAssigns.length} assign{dayAssigns.length!==1?"s":""}</span>
        </div>
        <div style={{background:C.b2,borderRadius:"0 0 8px 8px",overflow:"hidden",border:`1px solid ${C.bd}`,borderTop:"none"}}>
          {crewsWithWork.map(cr=>{const assigns=getAssign(cr.id,d);return <div key={cr.id} style={{padding:"8px 12px",borderBottom:`1px solid ${C.bd}`}}>
            <div style={{...S.fxc,gap:6,marginBottom:4}}><div style={{width:8,height:8,borderRadius:"50%",background:cr.color}}/><span style={{fontSize:11,fontWeight:700,color:cr.color}}>{cr.name}</span></div>
            {assigns.map(a=>{const p=a.projectId==="OFF"?null:proj.find(x=>x.id===a.projectId);return a.projectId==="OFF"?
              <div key={a.id} style={{background:C.w3+"22",border:`1px solid ${C.w3}44`,borderRadius:6,padding:"6px 10px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:700,color:C.w3}}>NO WORK</div>{a.notes&&<div style={{fontSize:10,color:C.w3,marginTop:2}}>{a.notes}</div>}</div>
                <button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:12,padding:"4px"}} onClick={()=>rmAssign(a.id)}>✕</button>
              </div>:
              <div key={a.id} style={{background:cr.color+"14",border:`1px solid ${cr.color}33`,borderRadius:6,padding:"6px 10px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:12,fontWeight:600}}>{p?.clientName||"?"}</div>{p?.city&&<div style={{fontSize:10,color:C.w3}}>{p.city}{p.address&&p.address!=="TBD"?` · ${p.address}`:""}</div>}{a.notes&&<div style={{fontSize:10,color:cr.color,marginTop:2}}>{a.notes}</div>}</div>
                <button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:12,padding:"4px"}} onClick={()=>rmAssign(a.id)}>✕</button>
              </div>;})}
          </div>;})}
          {!crewsWithWork.length&&<div style={{padding:"12px 14px",color:C.w3,fontSize:11}}>No crews assigned</div>}
          <button style={{width:"100%",padding:"10px",border:"none",borderTop:`1px solid ${C.bd}`,background:"transparent",color:C.bl,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setAssignCrew({crewId:null,date:d})}>+ Assign Crew</button>
        </div>
      </div>;})
    :
      <div style={{...S.cd,padding:0,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:C.b3}}>
            <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:C.w,borderBottom:`1px solid ${C.bd}`,minWidth:130,position:"sticky",left:0,background:C.b3}}>CREW</th>
            {days.map(d=>{const isT=d===td();return <th key={d} style={{padding:"10px 8px",textAlign:"center",fontWeight:700,color:isT?C.bl:C.w,borderBottom:`1px solid ${C.bd}`,minWidth:150,background:isT?C.bll:C.b3}}>{fmt(d)}<br/><span style={{fontSize:9,fontWeight:400,color:isT?C.bl:C.w3}}>{fDay(d)}</span></th>;})}
          </tr></thead>
          <tbody>
            {CREWS.map(cr=><tr key={cr.id} style={{borderBottom:`1px solid ${C.bd}`}}>
              <td style={{padding:"10px 14px",fontWeight:600,whiteSpace:"nowrap",position:"sticky",left:0,background:C.b2,borderRight:`1px solid ${C.bd}`}}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cr.color}}/><span style={{color:cr.color}}>{cr.name}</span></div></td>
              {days.map(d=>{const assigns=getAssign(cr.id,d);const isT=d===td();return <td key={d} style={{padding:"6px 8px",verticalAlign:"top",background:isT?"rgba(59,139,245,0.05)":"transparent",borderRight:`1px solid ${C.bd}`,minHeight:50}}>
                {assigns.map(a=>{const p=a.projectId==="OFF"?null:proj.find(x=>x.id===a.projectId);return a.projectId==="OFF"?
                  <div key={a.id} style={{background:C.w3+"22",border:`1px solid ${C.w3}44`,borderRadius:6,padding:"4px 8px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:11,fontWeight:700,color:C.w3}}>NO WORK</div>{a.notes&&<div style={{fontSize:9,color:C.w3,marginTop:1}}>{a.notes}</div>}</div>
                    <button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:10,padding:"2px"}} onClick={()=>rmAssign(a.id)}>✕</button>
                  </div>:
                  <div key={a.id} style={{background:cr.color+"18",border:`1px solid ${cr.color}44`,borderRadius:6,padding:"4px 8px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:11,fontWeight:600,color:C.w}}>{p?.clientName||"?"}</div>{p?.city&&<div style={{fontSize:9,color:C.w3}}>{p.city}{p.address&&p.address!=="TBD"?` · ${p.address}`:""}</div>}{a.notes&&<div style={{fontSize:9,color:cr.color,marginTop:1}}>{a.notes}</div>}</div>
                    <button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:10,padding:"2px"}} onClick={()=>rmAssign(a.id)}>✕</button>
                  </div>;})}
                <div style={{display:"flex",gap:4}}>
                  <button style={{background:"none",border:`1px dashed ${C.bd}`,borderRadius:6,color:C.w3,cursor:"pointer",fontSize:10,padding:"4px 8px",flex:1,fontFamily:"inherit"}} onClick={()=>setAssignCrew({crewId:cr.id,date:d})}>+ Assign</button>
                  <button style={{background:"none",border:`1px dashed ${C.w3}44`,borderRadius:6,color:C.w3,cursor:"pointer",fontSize:10,padding:"4px 8px",fontFamily:"inherit"}} onClick={()=>addAssign(cr.id,d,"OFF","")}>Off</button>
                </div>
              </td>;})}
            </tr>)}
          </tbody>
        </table>
      </div>
    }

    {assignCrew&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>setAssignCrew(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":24,width:"100%",maxWidth:mob?"100%":400,maxHeight:mob?"85vh":"70vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
      <div style={{...S.fxsb,marginBottom:12}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>{assignCrew.crewId?`Assign ${CREWS.find(c=>c.id===assignCrew.crewId)?.name}`:"Assign Crew"}</h2><button onClick={()=>setAssignCrew(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
      <p style={{fontSize:11,color:C.w3,marginBottom:12}}>{fmt(assignCrew.date)} · {fDay(assignCrew.date)}</p>
      {!assignCrew.crewId&&<><div style={S.lb}>Crew *</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{CREWS.map(cr=><button key={cr.id} onClick={()=>setAssignCrew({...assignCrew,crewId:cr.id})} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${cr.color}44`,background:cr.color+"14",color:cr.color,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{cr.name}</button>)}</div>
        <div style={{borderTop:`1px solid ${C.bd}`,paddingTop:10,marginBottom:6}}><div style={S.lb}>Or mark crew as off</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{CREWS.map(cr=><button key={cr.id} onClick={()=>{addAssign(cr.id,assignCrew.date,"OFF","");setAssignCrew(null);}} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.w3}44`,background:C.w3+"14",color:C.w3,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{cr.name}</button>)}</div></div></>}
      {assignCrew.crewId&&<><div style={S.lb}>Search Project</div>
      <AssignPicker projects={active} onPick={(pid,notes)=>{addAssign(assignCrew.crewId,assignCrew.date,pid,notes);setAssignCrew(null);}}/></>}
    </div></div>}

    {/* PAYROLL SUMMARY */}
    {(()=>{
      const payroll=CREWS.map(cr=>{const daysWorked=days.filter(d=>{const a=getAssign(cr.id,d);return a.length>0&&!a.every(x=>x.projectId==="OFF");}).length;const daysOff=days.filter(d=>{const a=getAssign(cr.id,d);return a.length>0&&a.every(x=>x.projectId==="OFF");}).length;return{...cr,daysWorked,daysOff};});
      const hasWork=payroll.some(cr=>cr.daysWorked>0||cr.daysOff>0);
      const totalDays=payroll.reduce((s,cr)=>s+cr.daysWorked,0);
      return <div style={{...S.cd,marginTop:20,padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`,background:C.b3}}><h3 style={{fontSize:13,fontWeight:700,margin:0}}>PAYROLL — {fmt(days[0])} to {fmt(days[4])}</h3></div>
        {!hasWork?<div style={{padding:"14px 16px",color:C.w3,fontSize:11}}>No assignments yet</div>:
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>
            <th style={{padding:"8px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:C.w3,letterSpacing:1}}>CREW</th>
            {days.map(d=><th key={d} style={{padding:"8px 4px",textAlign:"center",fontSize:9,fontWeight:600,color:C.w3,letterSpacing:0.5}}>{new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</th>)}
            <th style={{padding:"8px 16px",textAlign:"center",fontSize:10,fontWeight:700,color:C.bl,letterSpacing:1}}>TOTAL</th>
          </tr></thead>
          <tbody>
            {payroll.map((cr,idx)=><tr key={cr.id} style={{borderBottom:`1px solid ${C.bd}`,background:idx%2===0?"transparent":C.bg}}>
              <td style={{padding:"8px 16px",whiteSpace:"nowrap"}}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cr.color}}/><span style={{fontWeight:600,color:cr.color,fontSize:12}}>{cr.name}</span></div></td>
              {days.map(d=>{const a=getAssign(cr.id,d);const worked=a.length>0&&!a.every(x=>x.projectId==="OFF");const off=a.length>0&&a.every(x=>x.projectId==="OFF");return <td key={d} style={{padding:"8px 4px",textAlign:"center"}}>{worked?<span style={{fontSize:14}}>&#10003;</span>:off?<span style={{fontSize:10,color:C.w3,fontWeight:600}}>OFF</span>:<span style={{color:C.w3}}>—</span>}</td>;})}
              <td style={{padding:"8px 16px",textAlign:"center",fontWeight:700,fontSize:14,color:cr.daysWorked>0?C.w:C.w3}}>{cr.daysWorked}</td>
            </tr>)}
            <tr style={{borderTop:`2px solid ${C.bd}`,background:C.b3}}>
              <td style={{padding:"10px 16px",fontWeight:700,fontSize:12}}>TOTAL</td>
              <td colSpan={days.length}></td>
              <td style={{padding:"10px 16px",textAlign:"center",fontWeight:700,fontSize:16,color:C.bl}}>{totalDays}</td>
            </tr>
          </tbody>
        </table>}
      </div>;
    })()}
  </>;
}
function AssignPicker({projects,onPick}){
  const[sr,sSr]=useState("");const[pid,sPid]=useState("");const[notes,sN]=useState("");
  const fl=projects.filter(p=>(p.clientName+" "+p.city+" "+p.address).toLowerCase().includes(sr.toLowerCase()));
  return <div>
    <input style={S.inp} value={sr} onChange={e=>sSr(e.target.value)} placeholder="Search by name, city, address..."/>
    <div style={{maxHeight:200,overflow:"auto",marginBottom:10}}>
      {fl.map(p=><div key={p.id} onClick={()=>sPid(p.id)} style={{padding:"8px 12px",cursor:"pointer",background:pid===p.id?C.bll:"transparent",borderBottom:`1px solid ${C.bd}`,borderRadius:pid===p.id?6:0}}>
        <div style={{fontSize:12,fontWeight:pid===p.id?700:500,color:pid===p.id?C.bl:C.w}}>{p.clientName}</div>
        <div style={{fontSize:10,color:C.w3}}>{p.city}{p.address&&p.address!=="TBD"?` · ${p.address}`:""}</div>
      </div>)}
      {!fl.length&&<p style={{fontSize:11,color:C.w3,padding:8}}>No matching projects</p>}
    </div>
    <div style={S.lb}>Notes (optional)</div>
    <input style={S.inp} value={notes} onChange={e=>sN(e.target.value)} placeholder="e.g. framing, drywall, start at 7am"/>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={{...S.btn,opacity:pid?1:0.5}} onClick={()=>{if(pid)onPick(pid,notes);}}>Assign</button></div>
  </div>;
}
function LinksSection({links,onAdd,onDel,projectId}){
  const[label,sL]=useState("");const[url,sU]=useState("");const[uploading,setUploading]=useState(false);const[progress,setProg]=useState(0);const[mode,setMode]=useState("upload");const[uploadErr,setUploadErr]=useState("");
  const icon=l=>{const k=(l||"").toLowerCase();if(k.match(/\.(jpg|jpeg|png|gif|webp|heic)$/))return"📷";if(k.match(/\.(pdf)$/))return"📋";if(k.match(/\.(doc|docx)$/))return"📝";if(k.match(/\.(xls|xlsx|csv)$/))return"📊";if(k.includes("photo")||k.includes("image"))return"📷";if(k.includes("plan"))return"📐";if(k.includes("permit"))return"📋";return"📄";};
  const handleUpload=async(e)=>{
    const files=e.target.files;if(!files||!files.length)return;
    setUploading(true);setUploadErr("");
    for(let i=0;i<files.length;i++){
      const file=files[i];
      const path=`projects/${projectId}/${Date.now()}_${file.name}`;
      const sRef=ref(storage,path);
      try{
        const task=uploadBytesResumable(sRef,file);
        await new Promise((resolve,reject)=>{
          task.on("state_changed",(snap)=>{setProg(Math.round((snap.bytesTransferred/snap.totalBytes)*100));},(err)=>{reject(err);},async()=>{
            const dlUrl=await getDownloadURL(task.snapshot.ref);
            onAdd({label:file.name,url:dlUrl,storagePath:path,fileType:file.type,fileSize:file.size});
            resolve();
          });
        });
      }catch(err){setUploadErr(err.code+": "+err.message);}
    }
    setUploading(false);setProg(0);e.target.value="";
  };
  const handleDel=async(lk)=>{
    if(lk.storagePath){try{await deleteObject(ref(storage,lk.storagePath));}catch(e){console.error("Delete error:",e);}}
    onDel(lk.id);
  };
  const add=()=>{if(label.trim()&&url.trim()){onAdd({label:label.trim(),url:url.trim()});sL("");sU("");}};
  const fmtSize=(b)=>{if(!b)return"";if(b<1024)return b+"B";if(b<1048576)return(b/1024).toFixed(1)+"KB";return(b/1048576).toFixed(1)+"MB";};
  return <div style={S.cd}><h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>Files & Links</h4>
    {links.map(lk=><div key={lk.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}>
      <span style={{fontSize:14}}>{icon(lk.label)}</span>
      <div style={{flex:1,minWidth:0}}>
        <span onClick={()=>window.open(lk.url,"_blank")} style={{fontSize:12,color:C.bl,fontWeight:600,cursor:"pointer",textDecoration:"underline",wordBreak:"break-all"}}>{lk.label}</span>
        {lk.fileSize&&<span style={{fontSize:9,color:C.w3,marginLeft:6}}>{fmtSize(lk.fileSize)}</span>}
      </div>
      <span style={{fontSize:9,color:C.w3,whiteSpace:"nowrap"}}>{fmt(lk.date)}</span>
      <button onClick={()=>handleDel(lk)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:11,padding:"2px 6px"}}>✕</button>
    </div>)}
    {!links.length&&<p style={{fontSize:11,color:C.w3}}>No files yet</p>}
    <div style={{...S.fx,gap:6,marginTop:10,marginBottom:6}}>
      <button onClick={()=>setMode("upload")} style={{...S.bs,fontSize:10,padding:"4px 10px",background:mode==="upload"?C.bll:"transparent",color:mode==="upload"?C.bl:C.w3,border:`1px solid ${mode==="upload"?C.bl:C.bd}`}}>Upload File</button>
      <button onClick={()=>setMode("link")} style={{...S.bs,fontSize:10,padding:"4px 10px",background:mode==="link"?C.bll:"transparent",color:mode==="link"?C.bl:C.w3,border:`1px solid ${mode==="link"?C.bl:C.bd}`}}>Paste Link</button>
    </div>
    {mode==="upload"&&<div>
      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:14,borderRadius:8,border:`2px dashed ${C.bd}`,cursor:uploading?"default":"pointer",color:C.w3,fontSize:12,background:C.bg}}>
        <input type="file" multiple style={{display:"none"}} onChange={handleUpload} disabled={uploading}/>
        {uploading?<span style={{color:C.bl}}>Uploading... {progress}%</span>:<span>Click to choose files (permits, photos, plans)</span>}
      </label>
      {uploading&&<div style={{height:3,background:C.bd,borderRadius:2,marginTop:6,overflow:"hidden"}}><div style={{height:"100%",background:C.bl,borderRadius:2,width:`${progress}%`,transition:"width 0.2s"}}/></div>}
      {uploadErr&&<div style={{fontSize:11,color:C.rd,marginTop:6,padding:8,background:C.rdb,borderRadius:6,wordBreak:"break-all"}}>{uploadErr}</div>}
    </div>}
    {mode==="link"&&<div style={{...S.fx,gap:6}}>
      <input style={{...S.inp,marginBottom:0,flex:1}} value={label} onChange={e=>sL(e.target.value)} placeholder="Label (e.g. Building Permit)"/>
      <input style={{...S.inp,marginBottom:0,flex:2}} value={url} onChange={e=>sU(e.target.value)} placeholder="Paste link (Google Drive, etc.)" onKeyDown={e=>{if(e.key==="Enter")add();}}/>
      <button style={S.btn} onClick={add}>Add</button>
    </div>}
  </div>;
}
