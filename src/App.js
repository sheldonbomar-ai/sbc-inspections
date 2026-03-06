import { useState, useEffect, useRef } from "react";
import { db, storage } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

const C={bg:"#0F1419",b2:"#1A2332",b3:"#222E3C",bd:"#2D3B4E",bl:"#3B8BF5",bll:"#1C3A5E",gr:"#4ADE80",grl:"#1A3A2A",w:"#E8ECF1",w2:"#A0AEBF",w3:"#6B7D92",rd:"#F87171",rdb:"#3B1C1C",or:"#FBBF24",orb:"#3B2E1C"};
const DT=[{p:"S",l:"Final Structural"},{p:"S",l:"Insulation"},{p:"S",l:"Framing"},{p:"S",l:"Drywall Screw"},{p:"S",l:"Foundation"},{p:"S",l:"Unit Masonry"},{p:"S",l:"Window/Door Buck"},{p:"S",l:"Final Building"},{p:"S",l:"Progress"},{p:"P",l:"Underground/Rough Plumbing"},{p:"P",l:"Top-Out Plumbing"},{p:"P",l:"Final Plumbing"},{p:"P",l:"Water Service"},{p:"P",l:"Sewer Hook-up"},{p:"E",l:"Rough Electrical"},{p:"E",l:"Final Electrical"},{p:"E",l:"Smokes/GFCI"},{p:"M",l:"Rough Mechanical"},{p:"M",l:"Final Mechanical"},{p:"R",l:"Mop in Progress"},{p:"R",l:"Shingle in Progress"},{p:"R",l:"Tin Cap"},{p:"R",l:"Uplift Test"},{p:"R",l:"Roof Final"},{p:"R",l:"Tile in Progress"},{p:"W",l:"Windows & Doors"},{p:"W",l:"Impact/NOA"}];
const PN={S:"Structural",P:"Plumbing",E:"Electrical",M:"Mechanical",R:"Roofing",W:"Windows/Doors"};
const SM={W:"Windows & Doors",R:"Roofing",S:"Structural",E:"Electrical",P:"Plumbing"};
const fT=(t,ct=[])=>{const f=[...DT,...ct].find(x=>x.l===t);return f?`${f.p}- ${f.l}`:t;};
const TR=["Plumbing","Electrical","HVAC","Structural","Roofing","General"];
const PR=["Critical","Major","Minor"];
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
  side:{width:200,minWidth:200,background:C.b2,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",padding:"16px 0"},
  nav:a=>({display:"flex",alignItems:"center",gap:8,padding:"9px 10px",border:"none",background:a?C.bll:"transparent",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:a?600:500,color:a?C.bl:C.w3,width:"100%",textAlign:"left",marginBottom:2,fontFamily:"inherit"}),
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
  const[proj,setP]=useState([]);const[insp,setI]=useState([]);const[punch,setPu]=useState([]);const[ct,setCt]=useState([]);
  const[ok,setOk]=useState(false);const[selI,sSI]=useState(null);const[selP,sSP]=useState(null);
  const[modal,sM]=useState(null);const[search,sSr]=useState("");const[editP,sEP]=useState(null);
  const[week,sWk]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split("T")[0];});
  const[resetting,setResetting]=useState(false);
  const lastFs=useRef({});

  useEffect(()=>{
    const keys=[["sYp",setP],["sYi",setI],["sYu",setPu],["sYc",setCt]];
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
  useEffect(()=>{if(ok){const j=JSON.stringify(punch);if(j!==lastFs.current.sYu){lastFs.current.sYu=j;svFs("sYu",punch);localStorage.setItem("sYu",j);}}},[punch,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(ct);if(j!==lastFs.current.sYc){lastFs.current.sYc=j;svFs("sYc",ct);localStorage.setItem("sYc",j);}}},[ct,ok]);

  if(!ok) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><p style={{color:C.w3}}>Loading...</p></div>;

  const oP=punch.filter(p=>p.status==="open").length;
  const ovd=insp.filter(i=>!i.completed&&i.date&&i.date<td()).length;

  return(
    <div style={S.app}>
      <div style={S.side}>
        <div style={{...S.fxc,gap:8,padding:"0 14px 16px",borderBottom:`1px solid ${C.bd}`,marginBottom:6}}>
          <svg width="24" height="24" viewBox="0 0 40 40"><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
          <div><div style={{fontSize:12,fontWeight:700,color:C.bl}}>Stacy Bomar</div><div style={{fontSize:8,fontWeight:700,color:C.gr,letterSpacing:2}}>CONSTRUCTION</div></div>
        </div>
        <div style={{flex:1,padding:"4px 8px"}}>
          {[["dashboard","Dashboard"],["sheet","Inspection Sheet"],["projects","Projects"],["punch","Punch List"]].map(([id,lb])=>
            <button key={id} style={S.nav(pg===id||(pg==="detail"&&id==="sheet"))} onClick={()=>{setPg(id);sSI(null);sSP(null);}}>
              {lb}
              {id==="punch"&&oP>0&&<span style={{...S.bg(C.rd,"#fff"),marginLeft:"auto"}}>{oP}</span>}
              {id==="sheet"&&ovd>0&&<span style={{...S.bg(C.or,C.bg),marginLeft:"auto"}}>{ovd}</span>}
            </button>)}
        </div>
        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bd}`,fontSize:9,color:C.w3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Broward County, FL</span>
          {!resetting?<button onClick={()=>setResetting(true)} style={{background:"none",border:"none",color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>Reset</button>:
          <div style={{display:"flex",gap:4}}>
            <button onClick={async()=>{const p=mkSeed();setP(p);setI([]);setPu([]);setCt([]);setResetting(false);}} style={{background:C.rd,border:"none",color:"#fff",cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4,fontWeight:600}}>Yes, reset all</button>
            <button onClick={()=>setResetting(false)} style={{background:"none",border:`1px solid ${C.bd}`,color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4}}>Cancel</button>
          </div>}
        </div>
      </div>

      <div style={{flex:1,overflow:"auto"}}><div style={{padding:"20px 24px",maxWidth:1050}}>

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
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
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
              return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
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
            <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>INSPECTION LIST</h1><p style={{fontSize:11,color:C.w3,marginTop:3}}>{fmt(days[0])} — {fmt(days[4])}</p></div><button style={S.btn} onClick={()=>sM("insp")}>+ Schedule</button></div>
            <div style={{...S.fx,gap:6,marginBottom:12}}><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()-7);sWk(d.toISOString().split("T")[0]);}}>←</button><button style={{...S.bs,color:C.bl}} onClick={()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);sWk(d.toISOString().split("T")[0]);}}>This Week</button><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()+7);sWk(d.toISOString().split("T")[0]);}}>→</button></div>
            <div style={{...S.hdr,background:C.bl,borderRadius:"8px 8px 0 0"}}>{["NAME","CITY","PERMIT","TYPE","ADDRESS"].map(h=><div key={h} style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:1}}>{h}</div>)}</div>
            {days.map(d=>{const di=insp.filter(i=>i.date===d);const isT=d===td();return <div key={d}>
              <div style={{...S.fxc,gap:6,background:isT?C.bll:C.b3,padding:"6px 14px",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:11,fontWeight:700,color:isT?C.bl:C.w}}>{fmt(d)}</span><span style={{fontSize:10,color:isT?C.bl:C.w3}}>{fDay(d)}</span>{isT&&<span style={S.bg(C.bl,"#fff")}>TODAY</span>}<span style={{fontSize:10,color:C.w3,marginLeft:"auto"}}>{di.length}</span></div>
              {di.length===0?<div style={{padding:"8px 14px",color:C.w3,fontSize:11,background:C.b2,borderBottom:`1px solid ${C.bd}`}}>—</div>:
              di.map(i=>{const p=proj.find(x=>x.id===i.projectId);const isOv=!i.completed&&i.date<td();return <div key={i.id} onClick={()=>{sSI(i.id);setPg("detail");}} style={{...S.hdr,background:isOv?C.rdb:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}><div style={{fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</div><div style={{fontSize:11,color:C.w2}}>{p?.city}</div><div style={{fontSize:10,color:C.bl,fontWeight:600}}>{i.permitNum||"—"}</div><div style={{...S.fxc,gap:4}}><div style={{width:5,height:5,borderRadius:"50%",background:i.completed?C.gr:C.or}}/><span style={{fontSize:11}}>{fT(i.type,ct)}</span></div><div style={{fontSize:11,color:C.w2}}>{p?.address!=="TBD"?p?.address:"—"}</div></div>;})}
            </div>;})}
            {pend.length>0&&<><div style={{background:C.orb,padding:"7px 14px",borderTop:`2px solid ${C.or}`,marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:C.or}}>PENDING ({pend.length})</span></div>{pend.map(i=>{const p=proj.find(x=>x.id===i.projectId);return <div key={i.id} onClick={()=>{sSI(i.id);setPg("detail");}} style={{...S.hdr,background:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:"pointer"}}><div style={{fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</div><div style={{fontSize:11,color:C.w2}}>{p?.city}</div><div style={{fontSize:10,color:C.bl}}>{i.permitNum||"—"}</div><div style={{fontSize:11,color:C.or}}>{fT(i.type,ct)}</div><div style={{fontSize:11,color:C.w2}}>{p?.address!=="TBD"?p?.address:""}</div></div>;})}</>}
          </>;
        })()}

        {pg==="detail"&&selI&&(()=>{const i=insp.find(x=>x.id===selI);if(!i)return null;const p=proj.find(x=>x.id===i.projectId);return <>
          <button style={{...S.bs,marginBottom:14}} onClick={()=>{sSI(null);setPg("sheet");}}>← Back</button>
          <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>{fT(i.type,ct)}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p?.clientName} · {p?.city} · {fmt(i.date)}</p>{i.permitNum&&<p style={{fontSize:11,color:C.bl,marginTop:3}}>Permit: {i.permitNum}</p>}</div><div style={{...S.fx,gap:6}}>{!i.completed&&<button style={{...S.btn,background:C.gr,color:C.bg}} onClick={()=>setI(v=>v.map(x=>x.id===i.id?{...x,completed:true,completedAt:td()}:x))}>✓ Complete</button>}<button style={{...S.bs,color:C.rd}} onClick={()=>{setI(v=>v.filter(x=>x.id!==i.id));sSI(null);setPg("sheet");}}>Delete</button></div></div>
          <div style={S.cd}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:i.completed?C.gr:C.or}}/><span style={{fontSize:13,fontWeight:600}}>{i.completed?"COMPLETED":"SCHEDULED"}</span></div>{i.notes&&<p style={{fontSize:12,color:C.w2,marginTop:6}}>Notes: {i.notes}</p>}</div>
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
          <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>{p.clientName}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p.city}{p.address!=="TBD"?` · ${p.address}`:""}</p></div><div style={{...S.fx,gap:6}}><button style={S.bs} onClick={()=>sEP(p)}>Edit</button><button style={S.btn} onClick={()=>sM("insp")}>+ Insp</button><button style={{...S.bs,color:C.rd}} onClick={()=>{setP(v=>v.filter(x=>x.id!==selP));sSP(null);}}>Del</button></div></div>
          <div style={{...S.fx,gap:6,flexWrap:"wrap",marginBottom:12}}>{p.hoa&&<span style={S.bg(C.orb,C.or)}>HOA</span>}{p.permitNum&&<span style={S.bg(C.bll,C.bl)}>{p.permitNum}</span>}{p.permitStatus&&<span style={S.bg(p.permitStatus==="Issued"?C.grl:C.orb,p.permitStatus==="Issued"?C.gr:C.or)}>Permit: {p.permitStatus}</span>}{p.assignee&&<span style={S.bg(C.grl,C.gr)}>👤 {p.assignee}</span>}</div>
          {p.scopeNotes&&<div style={S.cd}><p style={{margin:0,fontSize:12,color:C.w2,lineHeight:1.5}}>{p.scopeNotes}</p></div>}
          <div style={S.cd}><h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>Notes</h4>
            {(p.comments||[]).map(c=><div key={c.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:11,color:C.w2}}>{c.text}</div><div style={{fontSize:9,color:C.w3,marginTop:2}}>{fmt(c.date)}</div></div>)}
            {!(p.comments||[]).length&&<p style={{fontSize:11,color:C.w3}}>No notes yet</p>}
            <div style={{...S.fx,gap:6,marginTop:8}}><input id="cm" style={{...S.inp,marginBottom:0,flex:1}} placeholder="Add note..." onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:e.target.value.trim(),date:td()}]}:x));e.target.value="";}}} /><button style={S.btn} onClick={()=>{const el=document.getElementById("cm");if(el?.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:el.value.trim(),date:td()}]}:x));el.value="";}}}>Add</button></div>
          </div>
          <LinksSection links={p.links||[]} projectId={selP} onAdd={(lk)=>setP(v=>v.map(x=>x.id===selP?{...x,links:[...(x.links||[]),{id:uid(),...lk,date:td()}]}:x))} onDel={(lid)=>setP(v=>v.map(x=>x.id===selP?{...x,links:(x.links||[]).filter(l=>l.id!==lid)}:x))}/>
          <h4 style={{fontSize:13,fontWeight:700,margin:"12px 0 8px"}}>Inspections ({pi.length})</h4>
          {pi.map(i=><div key={i.id} style={S.rw}><div style={{width:6,height:6,borderRadius:"50%",background:i.completed?C.gr:C.or}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{fT(i.type,ct)}</div><div style={{fontSize:10,color:C.w3}}>{fmt(i.date)} · {i.permitNum||"—"}</div></div><span style={S.bg(i.completed?C.grl:C.orb,i.completed?C.gr:C.or)}>{i.completed?"Done":"Open"}</span></div>)}
        </>;})()}

        {pg==="punch"&&(()=>{const f=punch.filter(p=>p.status==="open").sort((a,b)=>({Critical:0,Major:1,Minor:2}[a.priority]-{Critical:0,Major:1,Minor:2}[b.priority]));return <>
          <div style={{...S.fxsb,marginBottom:16}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>Punch List</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{oP} open</p></div><button style={S.btn} onClick={()=>sM("punch")}>+ New</button></div>
          {!f.length?<p style={{textAlign:"center",padding:40,color:C.w3}}>All clear ✓</p>:f.map(i=>{const p=proj.find(x=>x.id===i.projectId);return <div key={i.id} style={{...S.fx,background:C.b2,borderRadius:8,border:`1px solid ${C.bd}`,marginBottom:6,overflow:"hidden"}}><div style={{width:3,background:i.priority==="Critical"?C.rd:i.priority==="Major"?C.or:C.w3}}/><div style={{flex:1,padding:"10px 14px"}}><div style={S.fxsb}><div><div style={{fontSize:12,fontWeight:600}}>{i.description}</div><div style={{fontSize:11,color:C.w3,marginTop:1}}>{p?.clientName} · {i.trade}</div></div><span style={S.bg(i.priority==="Critical"?C.rdb:C.orb,i.priority==="Critical"?C.rd:C.or)}>{i.priority}</span></div><div style={{...S.fx,gap:6,marginTop:8}}><button style={{...S.btn,background:C.gr,color:C.bg,padding:"3px 10px",fontSize:10}} onClick={()=>setPu(v=>v.map(x=>x.id===i.id?{...x,status:"closed"}:x))}>✓</button><button style={{...S.bs,color:C.rd,padding:"3px 10px",fontSize:10}} onClick={()=>setPu(v=>v.filter(x=>x.id!==i.id))}>Del</button></div></div></div>;})}
        </>})()}

        {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>sM(null)}><div style={{background:C.b2,borderRadius:14,padding:24,width:"100%",maxWidth:460,maxHeight:"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>{modal==="insp"?"Schedule Inspection":modal==="proj"?"New Project":"New Punch Item"}</h2><button onClick={()=>sM(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          {modal==="insp"&&<InspF pr={proj} ok={i=>{setI(v=>[...v,{...i,id:uid(),createdAt:td(),completed:false}]);sM(null);}} ct={ct} aC={t=>setCt(v=>[...v,t])} pre={selP}/>}
          {modal==="proj"&&<PF ok={p=>{setP(v=>[...v,{...p,id:uid(),comments:[],createdAt:td()}]);sM(null);}}/>}
          {modal==="punch"&&<PuF pr={proj} ok={p=>{setPu(v=>[...v,{...p,id:uid(),createdAt:td(),status:"open"}]);sM(null);}}/>}
        </div></div>}
        {editP&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={()=>sEP(null)}><div style={{background:C.b2,borderRadius:14,padding:24,width:"100%",maxWidth:460,maxHeight:"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>Edit Project</h2><button onClick={()=>sEP(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          <EF p={editP} ok={u=>{setP(v=>v.map(p=>p.id===editP.id?{...p,...u}:p));sEP(null);}}/>
        </div></div>}

      </div></div>
    </div>
  );
}

function InspF({pr,ok,ct=[],aC,pre}){
  const[f,s]=useState({projectId:pre||"",type:"",date:td(),permitNum:"",notes:""});
  const[ts,sTs]=useState("");const[sh,sSh]=useState(false);
  const all=[...DT,...ct];const fl=all.filter(t=>(`${t.p}- ${t.l}`).toLowerCase().includes(ts.toLowerCase())||t.l.toLowerCase().includes(ts.toLowerCase())||t.p.toLowerCase()===ts.toLowerCase());
  const gr={};fl.forEach(t=>{const g=PN[t.p]||"Other";if(!gr[g])gr[g]=[];gr[g].push(t);});
  return <div>
    <div style={S.lb}>Project *</div>
    <select style={S.inp} value={f.projectId} onChange={e=>s({...f,projectId:e.target.value})}><option value="">Select...</option>{[...pr].sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"})).map(p=><option key={p.id} value={p.id}>{p.clientName} — {p.city}</option>)}</select>
    <div style={S.lb}>Type *</div>
    <div style={{position:"relative",marginBottom:10}}>
      <input style={{...S.inp,marginBottom:0}} value={f.type?fT(f.type,ct):ts} onChange={e=>{sTs(e.target.value);s({...f,type:""});sSh(true);}} onFocus={()=>sSh(true)} placeholder="Search... (S, plumb, rough)"/>
      {sh&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:C.b2,border:`1px solid ${C.bd}`,borderRadius:7,maxHeight:200,overflow:"auto",zIndex:100,marginTop:3,boxShadow:"0 8px 20px rgba(0,0,0,.5)"}}>
        {Object.entries(gr).map(([g,items])=><div key={g}><div style={{padding:"4px 12px",fontSize:9,fontWeight:700,color:C.w3,background:C.b3,borderBottom:`1px solid ${C.bd}`}}>{g}</div>
        {items.map(t=><div key={t.l} onClick={()=>{s({...f,type:t.l});sTs("");sSh(false);}} style={{padding:"6px 12px",fontSize:12,cursor:"pointer",borderBottom:`1px solid ${C.bd}`}}><span style={{fontWeight:700,color:C.bl,marginRight:6}}>{t.p}-</span>{t.l}</div>)}</div>)}
      </div>}
    </div>
    <div style={S.lb}>Permit #</div><input style={S.inp} value={f.permitNum} onChange={e=>s({...f,permitNum:e.target.value})} placeholder="B25-05040"/>
    <div style={S.lb}>Date *</div><input style={S.inp} type="date" value={f.date} onChange={e=>s({...f,date:e.target.value})}/>
    <div style={S.lb}>Notes</div><input style={S.inp} value={f.notes} onChange={e=>s({...f,notes:e.target.value})} placeholder="framing, screw"/>
    <div style={{...S.fx,justifyContent:"flex-end",marginTop:4}}><button style={S.btn} onClick={()=>f.projectId&&f.date&&f.type&&ok(f)}>Schedule</button></div>
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
function PuF({pr,ok}){
  const[f,s]=useState({projectId:"",description:"",trade:"Plumbing",priority:"Major"});
  return <div>
    <div style={S.lb}>Project *</div><select style={S.inp} value={f.projectId} onChange={e=>s({...f,projectId:e.target.value})}><option value="">Select...</option>{[...pr].sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"})).map(p=><option key={p.id} value={p.id}>{p.clientName} — {p.city}</option>)}</select>
    <div style={S.lb}>Description *</div><textarea style={{...S.inp,minHeight:50,resize:"vertical"}} value={f.description} onChange={e=>s({...f,description:e.target.value})}/>
    <div style={S.lb}>Trade</div><select style={S.inp} value={f.trade} onChange={e=>s({...f,trade:e.target.value})}>{TR.map(t=><option key={t}>{t}</option>)}</select>
    <div style={S.lb}>Priority</div>
    <div style={{...S.fx,gap:6,marginBottom:10}}>{PR.map(p=><button key={p} onClick={()=>s({...f,priority:p})} style={{flex:1,padding:7,borderRadius:6,border:`1px solid ${C.bd}`,background:f.priority===p?(p==="Critical"?C.rd:p==="Major"?C.or:C.w3):C.bg,fontSize:12,fontWeight:600,cursor:"pointer",color:f.priority===p?C.bg:C.w2,textAlign:"center"}}>{p}</button>)}</div>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>f.projectId&&f.description&&ok(f)}>Add</button></div>
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
