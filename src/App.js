import { useState, useEffect, useRef } from "react";
import { db, storage, auth } from "./firebase";
import { doc, setDoc, onSnapshot, collection, addDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";

const C={bg:"#0F1419",b2:"#1A2332",b3:"#222E3C",bd:"#2D3B4E",bl:"#3B8BF5",bll:"#1C3A5E",gr:"#4ADE80",grl:"#1A3A2A",w:"#E8ECF1",w2:"#A0AEBF",w3:"#6B7D92",rd:"#F87171",rdb:"#3B1C1C",or:"#FBBF24",orb:"#3B2E1C"};
const PRINT_CSS=`@media print{
  @page{size:portrait;margin:0.4in;}
  body{background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0!important;padding:0!important;}
  [data-sidebar],[data-mobnav],[data-noprint]{display:none!important;}
  [data-app]{height:auto!important;overflow:visible!important;background:#fff!important;display:block!important;min-height:0!important;}
  [data-content]{padding:0!important;overflow:visible!important;height:auto!important;}
  [data-content]>div{padding:0!important;}
  [data-print-header]{display:flex!important;justify-content:center!important;text-align:center!important;border-bottom:3px solid #000!important;padding-bottom:10px!important;margin-bottom:14px!important;}
  [data-print-header] div{text-align:center!important;}
  [data-print-header] div div:first-child{font-size:22px!important;font-weight:800!important;letter-spacing:1px!important;}
  [data-print-header] div div:last-child{font-size:12px!important;font-weight:600!important;margin-top:4px!important;letter-spacing:2px!important;text-transform:uppercase!important;}
  *{color:#000!important;border-color:#ccc!important;}
  [data-day-header]{background:#e5e7eb!important;padding:10px 14px!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin-top:8px!important;border-radius:0!important;border:1px solid #ccc!important;border-bottom:2px solid #999!important;}
  [data-day-header] span{color:#000!important;font-size:12px!important;}
  [data-insp-row]{background:#fff!important;border:1px solid #ddd!important;border-top:none!important;padding:10px 14px!important;page-break-inside:avoid!important;}
  [data-insp-row] [data-name]{color:#000!important;font-size:13px!important;font-weight:700!important;}
  [data-insp-row] [data-type]{color:#222!important;font-weight:700!important;font-size:12px!important;}
  [data-insp-row] [data-detail]{color:#444!important;font-size:11px!important;margin-top:3px!important;}
  [data-insp-row] [data-result]{font-weight:700!important;font-size:11px!important;}
  [data-status-dot]{width:8px!important;height:8px!important;border:2px solid #000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-pend-header]{background:#fef3c7!important;border:2px solid #f59e0b!important;margin-top:14px!important;padding:10px 14px!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  [data-pend-header] span{color:#92400e!important;font-size:13px!important;}
  [data-col-header]{display:none!important;}
}`;
const useMobile=()=>{const[m,sM]=useState(window.innerWidth<768);useEffect(()=>{const h=()=>sM(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const DT=[{p:"S",l:"Final Structural"},{p:"S",l:"Insulation"},{p:"S",l:"Framing"},{p:"S",l:"Drywall Screw"},{p:"S",l:"Foundation"},{p:"S",l:"Unit Masonry"},{p:"S",l:"Window/Door Buck"},{p:"S",l:"Final Building"},{p:"S",l:"Progress"},{p:"P",l:"Underground/Rough Plumbing"},{p:"P",l:"Top-Out Plumbing"},{p:"P",l:"Final Plumbing"},{p:"P",l:"Water Service"},{p:"P",l:"Sewer Hook-up"},{p:"E",l:"Rough Electrical"},{p:"E",l:"Final Electrical"},{p:"E",l:"Smokes/GFCI"},{p:"M",l:"Rough Mechanical"},{p:"M",l:"Final Mechanical"},{p:"R",l:"Mop in Progress"},{p:"R",l:"Shingle in Progress"},{p:"R",l:"Tin Cap"},{p:"R",l:"Uplift Test"},{p:"R",l:"Roof Final"},{p:"R",l:"Tile in Progress"},{p:"W",l:"Windows & Doors"},{p:"W",l:"Impact/NOA"}];
const PN={S:"Structural",P:"Plumbing",E:"Electrical",M:"Mechanical",R:"Roofing",W:"Windows/Doors"};
const SM={W:"Windows & Doors",R:"Roofing",S:"Structural",E:"Electrical",P:"Plumbing",M:"Mechanical"};
const CREWS=[
{id:"robin",name:"Robin",color:"#4ADE80"},{id:"robinjr",name:"Robin Jr",color:"#3B8BF5"},{id:"onel",name:"Onel",color:"#2DD4BF"},{id:"alfredo",name:"Alfredo",color:"#818CF8"},{id:"renee",name:"Rene",color:"#C084FC"},
{id:"marcos",name:"Marcos Roofing",color:"#FB923C"},{id:"jose",name:"Jose Roofing",color:"#FBBF24"},
{id:"bob",name:"Bob Windows",color:"#A78BFA"},
{id:"manny",name:"Manny",color:"#F472B6"},{id:"roger",name:"Roger",color:"#38BDF8"},{id:"rudy",name:"Rudy",color:"#34D399"},{id:"john",name:"John (Gutters)",color:"#E879F9"},{id:"mary",name:"Marbely",color:"#FB7185"},
{id:"pete",name:"Pete Plumbing",color:"#22D3EE"},{id:"lashawn",name:"Lashawn Electrical",color:"#F87171"},{id:"richard",name:"Richard Barba Mechanical",color:"#FCD34D"}
];
const fT=(t,ct=[])=>{const f=[...DT,...ct].find(x=>x.l===t);return f?`${f.p}- ${f.l}`:t;};
const AddrLink=({a,c})=>!a||a==="TBD"?null:<a href={`https://maps.apple.com/?q=${encodeURIComponent(c?a+", "+c:a)}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{color:"inherit",textDecoration:"underline",textDecorationStyle:"dotted",textUnderlineOffset:2}}>{a}</a>;
const SD="Ashley|Pompano Beach|2921 NW 8 ST|0|0|W,E|⚠ REVISION: CGI NOA now PGT by Sparta;Barrant|Sunrise|4008 Del Rio Way|0|1|W,R,E|In permitting;Beckles|Pembroke Pines|12017 NW 11 ST|0|1|W,S,E,P|In permitting;Bryan|Sunrise|11701 NW 30 PL|R-STRT-003473|0|R,S,E,P|Pending building final - work done;Burke|Margate|7708 Margate Blvd Apt C3-6|0|1||CLOSED;Bursztyn|Davie|3745 SW 59 AVE|2025-7435|1|W,S,E,P|Pending finals - job done;Camacho|Plantation|7501 NW 16 ST Unit 3305|P25-1025|0|W,S,E,P|Need appliances AC kitchen sink then finals;Campbell|Margate|1835 Vista Way|0|1|R,S,E|Roof permit in review - other permits issued;Ceasar|Margate|6130 SW 3 ST|0|0|W,R|CLOSED;Clover|Deerfield Beach|516 SW Natura AVE|0|1|R|Roof permit in review;Courts|Deerfield Beach|225 Ventor Q|0|1|W,S,E,P|About to commence;Cox|Deerfield Beach|330 NW 1 AVE|0|0|W,R,S,E,P|Roof in progress - rest about to commence;Davila|Pembroke Pines|1026 NW 159 AVE|0|1|W,R,S,P|Window permit issued - roof in review;Davilsaint|Ft Lauderdale||0|0|R|On pause - insurance issue;Derek-Towriss|Ft Lauderdale|1649 NE 3 CT|0|0||Pending final inspections;Goberdhan|Plantation|7820 NW 14 ST|0|0|W,S,E,P|Win+elec+AC done - bath drywall+appliances+doors left;Gonzalez|Sunrise|9801 Sunrise Lakes Blvd Unit 207|0|1|W,S,E,P|Permit to be issued within 2 weeks;Knight|Pompano Beach|1570 NW 4 AVE|0|0|E|Exterior paint last thing - permits closed;Ledgister|Plantation|103 NW 68 AVE|B25-04632|0|W,S,E,P|All done besides appliances;Mel|Miami||0|0|R|On pause - insurance issue;Mistler|Plantation|5301 SW 8 ST|B25-04835|0|S|Roof work commenced;Morgan|Pembroke Pines|1000 Colony Point Cir #420|0|1|S,E,P|Permit in progress;Moye-Barnett|Davie|7520 NW 31st Place|0|1|W,R,S,E,P|CLOSED;Nora Sanchez|Deerfield Beach|222 Prescott L|0|1|W,S,E,P|About to commence;NSP Swap Shop|Ft Lauderdale|3090 NW 11 ST|18-00205|0|W,R,S,E,P|In progress - big job;NSP WP|West Park|28 Allen RD|WP25-000446|0|W,R,S,E,P|In progress - big job;Phillips|Pembroke Pines|7347 NW 22 DR|0|1|W,R,S,E,P|In permitting;Pifalo|Plantation|8536 NW 10 ST Unit D78|B25-05040|1|W,S,E,P|⚠ REVISION: NOA wrong on window+door - missing plmb permit for WH;Qatar|Sunrise|13800 NW 14 ST Suite 160|0|0|S,E,P|Insurance issue - working to start;Rhoda|Plantation|501 N Pine Island Rd Unit 1|0|0|W,S,E,P|Very active - lots of work to do;Soto|Sunrise|11301 NW 17 ST|0|0|W,R|In review;Stone|Davie|4791 SW 55 AVE|0|0|W,R,S,P|Permit to be closed soon;Peacox|Ft Lauderdale||0|0|W,R,S|Not signed — Windows; (2) ext doors; Sloped roof; OHGD; AC C/O;Centeno|Cooper City||0|0|W,R,E|Not signed — Windows + (1) SGD; FD 1/4 lite; Slope+flat roof; AC C/O; Electrical upgrade;Perez-Millan|West Park||0|0|W,E|Not signed — Windows; (6) 1/2 lite doors; AC C/O; Electrical upgrade; Ext paint;Lopez|Weston||0|1|W,R|Not signed — Windows + (1) SGD; 1 6-panel door; Tile roof; Gutters";
const uid=()=>Math.random().toString(36).substr(2,9);
const fmt=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"}):"";
const fDay=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"long"}).toUpperCase():"";
const td=()=>new Date().toISOString().split("T")[0];
const svFs=async(k,v)=>{try{await setDoc(doc(db,"data",k),{value:JSON.stringify(v)});}catch(e){console.error("Firestore save error:",e);}};
const ldLocal=(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}};
const mkSeed=()=>SD.split(";").map(r=>{const p=r.split("|");const st=p[6]||"";const dashIdx=st.indexOf("—");return{id:uid(),clientName:p[0],city:p[1],address:p[2]||"TBD",permitNum:p[3]==="0"?"":p[3],hoa:p[4]==="1",scopes:p[5]?p[5].split(",").map(x=>SM[x]).filter(Boolean):[],scopeNotes:dashIdx>-1?st.slice(dashIdx+2).trim():"",status:dashIdx>-1?st.slice(0,dashIdx).trim():st,assignee:"",comments:[],createdAt:td()};});
const S={
  app:{display:"flex",height:"100vh",fontFamily:"system-ui,sans-serif",background:C.bg,color:C.w,overflow:"hidden"},
  side:{width:240,minWidth:240,background:C.b2,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",padding:"16px 0"},
  nav:a=>({display:"flex",alignItems:"center",gap:10,padding:"12px 16px",border:"none",background:a?C.bll:"transparent",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:a?700:500,color:a?C.bl:C.w3,width:"100%",textAlign:"left",marginBottom:4,fontFamily:"inherit",transition:"background 0.15s",letterSpacing:0.3}),
  cd:{background:C.b2,borderRadius:10,padding:18,border:`1px solid ${C.bd}`,marginBottom:14,transition:"box-shadow 0.15s"},
  inp:{width:"100%",padding:"10px 14px",borderRadius:7,border:`1px solid ${C.bd}`,background:C.bg,color:C.w,fontSize:13,outline:"none",fontFamily:"inherit",marginBottom:10,transition:"border-color 0.15s"},
  btn:{padding:"8px 16px",borderRadius:6,border:"none",background:C.bl,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"opacity 0.15s"},
  bs:{padding:"8px 16px",borderRadius:6,border:`1px solid ${C.bd}`,background:C.b2,color:C.w2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"background 0.15s"},
  bg:(b,c)=>({fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:5,background:b,color:c,whiteSpace:"nowrap"}),
  hdr:{display:"grid",gridTemplateColumns:"130px 90px 130px 1fr 160px",gap:6,padding:"8px 14px",alignItems:"center"},
  rw:{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.bd}`},
  lb:{fontSize:10,fontWeight:600,color:C.w3,textTransform:"uppercase",letterSpacing:1,marginBottom:3},
  fx:{display:"flex"},fxsb:{display:"flex",justifyContent:"space-between"},fxc:{display:"flex",alignItems:"center"},
};

export default function App(){
  const[user,setUser]=useState(null);const[loading,setLoading]=useState(true);
  const[nameInput,setNameInput]=useState("");const[pwInput,setPwInput]=useState("");const[loginErr,setLoginErr]=useState("");const[signingIn,setSigningIn]=useState(false);

  useEffect(()=>{const unsub=onAuthStateChanged(auth,(u)=>{setUser(u);setLoading(false);});return unsub;},[]);

  const doLogin=async()=>{
    if(!nameInput.trim()||!pwInput)return;
    setSigningIn(true);setLoginErr("");
    try{
      await signInWithEmailAndPassword(auth,nameInput.trim().toLowerCase()+"@sbc.app",pwInput);
    }catch(e){
      setLoginErr(e.code==="auth/invalid-credential"?"Wrong username or password":e.code==="auth/user-not-found"?"User not found":e.code==="auth/too-many-requests"?"Too many attempts — try again later":"Login failed");
    }
    setSigningIn(false);
  };

  if(loading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}><div style={{color:C.bl,fontSize:14,fontFamily:"system-ui,sans-serif"}}>Loading...</div></div>;

  if(!user)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"system-ui,sans-serif"}}>
      <div style={{background:C.b2,borderRadius:16,padding:36,border:`1px solid ${C.bd}`,width:340,textAlign:"center"}}>
        <svg width="48" height="48" viewBox="0 0 40 40" style={{marginBottom:12}}><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
        <div style={{fontSize:18,fontWeight:700,color:C.bl,marginBottom:2}}>Stacy Bomar</div>
        <div style={{fontSize:10,fontWeight:700,color:C.gr,letterSpacing:2,marginBottom:24}}>CONSTRUCTION</div>
        <input value={nameInput} onChange={e=>{setNameInput(e.target.value);setLoginErr("");}} onKeyDown={e=>{if(e.key==="Enter")document.getElementById("sbc-pw")?.focus();}} type="text" autoCapitalize="none" autoCorrect="off" placeholder="Username" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${loginErr?C.rd:C.bd}`,background:C.bg,color:C.w,fontSize:14,outline:"none",textAlign:"center",marginBottom:10}}/>
        <input id="sbc-pw" value={pwInput} onChange={e=>{setPwInput(e.target.value);setLoginErr("");}} onKeyDown={e=>{if(e.key==="Enter")doLogin();}} type="password" placeholder="Password" style={{width:"100%",padding:"12px 16px",borderRadius:8,border:`1px solid ${loginErr?C.rd:C.bd}`,background:C.bg,color:C.w,fontSize:14,outline:"none",textAlign:"center",marginBottom:12}}/>
        {loginErr&&<div style={{fontSize:12,color:C.rd,marginBottom:8}}>{loginErr}</div>}
        <button disabled={signingIn} onClick={doLogin} style={{width:"100%",padding:"10px",borderRadius:8,border:"none",background:C.bl,color:"#fff",fontSize:14,fontWeight:600,cursor:signingIn?"default":"pointer",opacity:signingIn?0.7:1}}>
          {signingIn?"Signing in...":"Sign In"}
        </button>
      </div>
    </div>
  );

  return <AppMain user={user}/>;
}

function AppMain({user}){
  const[pg,setPg]=useState("dashboard");
  const[proj,setP]=useState([]);const[insp,setI]=useState([]);const[ct,setCt]=useState([]);const[sched,setSched]=useState([]);const[permits,setPermits]=useState([]);const[todos,setTodos]=useState([]);const[companyDocs,setCompanyDocs]=useState([]);
  const[ok,setOk]=useState(false);const[selI,sSI]=useState(null);const[selP,sSP]=useState(null);
  const[modal,sM]=useState(null);const[search,sSr]=useState("");const[editP,sEP]=useState(null);
  const[week,sWk]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().split("T")[0];});
  const[resetting,setResetting]=useState(false);
  const[inspDragId,setInspDragId]=useState(null);const[inspDropDay,setInspDropDay]=useState(null);const inspDragRef=useRef(null);
  const mob=useMobile();
  const lastFs=useRef({});

  useEffect(()=>{
    const keys=[["sYp",setP],["sYi",setI],["sYc",setCt],["sYs",setSched],["sYpm",setPermits],["sYtd",setTodos],["sYcd",setCompanyDocs]];
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
      const json=JSON.stringify(val);
      lastFs.current[k]=json;
      setter(val);loaded++;if(loaded>=keys.length)setOk(true);
    }));
    return ()=>unsubs.forEach(u=>u());
  },[]);
  useEffect(()=>{if(ok){const j=JSON.stringify(proj);if(j!==lastFs.current.sYp){lastFs.current.sYp=j;svFs("sYp",proj);localStorage.setItem("sYp",j);}}},[proj,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(insp);if(j!==lastFs.current.sYi){lastFs.current.sYi=j;svFs("sYi",insp);localStorage.setItem("sYi",j);}}},[insp,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(ct);if(j!==lastFs.current.sYc){lastFs.current.sYc=j;svFs("sYc",ct);localStorage.setItem("sYc",j);}}},[ct,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(sched);if(j!==lastFs.current.sYs){lastFs.current.sYs=j;svFs("sYs",sched);localStorage.setItem("sYs",j);}}},[sched,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(permits);if(j!==lastFs.current.sYpm){lastFs.current.sYpm=j;svFs("sYpm",permits);localStorage.setItem("sYpm",j);}}},[permits,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(todos);if(j!==lastFs.current.sYtd){lastFs.current.sYtd=j;svFs("sYtd",todos);localStorage.setItem("sYtd",j);}}},[todos,ok]);
  useEffect(()=>{if(ok){const j=JSON.stringify(companyDocs);if(j!==lastFs.current.sYcd){lastFs.current.sYcd=j;svFs("sYcd",companyDocs);localStorage.setItem("sYcd",j);}}},[companyDocs,ok]);

  // One-time: add new jobs from 2026 spreadsheet
  const migratedRef=useRef(false);
  useEffect(()=>{
    if(!ok||!proj.length||migratedRef.current)return;
    migratedRef.current=true;
    const newJobs=[
      {clientName:"Peacox",city:"Ft Lauderdale",scopes:["Windows & Doors","Roofing","Structural","Mechanical"],hoa:false,scopeNotes:"Windows; (2) ext doors; Sloped roof; OHGD; AC C/O",status:"Not signed"},
      {clientName:"Centeno",city:"Cooper City",scopes:["Windows & Doors","Roofing","Electrical","Mechanical"],hoa:false,scopeNotes:"Windows + (1) SGD; FD 1/4 lite; Slope+flat roof; AC C/O; Electrical upgrade",status:"Not signed"},
      {clientName:"Perez-Millan",city:"West Park",scopes:["Windows & Doors","Electrical","Mechanical"],hoa:false,scopeNotes:"Windows; (6) 1/2 lite doors; AC C/O; Electrical upgrade; Ext paint",status:"Not signed"},
      {clientName:"Lopez",city:"Weston",scopes:["Windows & Doors","Roofing"],hoa:true,scopeNotes:"Windows + (1) SGD; 1 6-panel door; Tile roof; Gutters",status:"Not signed"},
    ];
    setP(cur=>{const toAdd=newJobs.filter(nj=>!cur.some(p=>p.clientName.toLowerCase()===nj.clientName.toLowerCase()));return toAdd.length?[...cur,...toAdd.map(j=>({id:uid(),address:"TBD",permitNum:"",assignee:"",comments:[],createdAt:td(),...j}))]:cur;});
  },[ok,proj.length]);

  const logAct=(action,detail)=>{try{addDoc(collection(db,"activityLog"),{user:user.displayName||"Unknown",action,detail:detail||"",ts:new Date().toISOString()});}catch(e){console.error("Log error:",e);}};
  const isAdmin=user.email==="sheldon@sbc.app"||user.email==="tim@sbc.app";
  const[actLog,setActLog]=useState([]);
  const loadLog=async()=>{try{const q2=query(collection(db,"activityLog"),orderBy("ts","desc"),limit(200));const snap=await getDocs(q2);setActLog(snap.docs.map(d=>({id:d.id,...d.data()})));}catch(e){console.error("Load log error:",e);}};

  if(!ok) return <div style={{...S.app,alignItems:"center",justifyContent:"center"}}><p style={{color:C.w3}}>Loading...</p></div>;

  const ovd=insp.filter(i=>!i.completed&&i.date&&i.date<td()).length;
  const pendCO=proj.reduce((n,p)=>n+((p.changeOrders||[]).filter(co=>co.status==="Pending").length),0);
  const pendRev=proj.reduce((n,p)=>n+((p.revisions||[]).filter(r=>r.status==="Open").length),0);
  const pendTotal=pendCO+pendRev;
  const projWithIssues=proj.filter(p=>(p.changeOrders||[]).some(co=>co.status==="Pending")||(p.revisions||[]).some(r=>r.status==="Open"));

  const navBase=[["dashboard","Dashboard"],["projects","Projects"],["sheet","Inspections"],["permits","Permits"],["scheduling","Scheduling"],["todos","To Do"]];
  const navItems=isAdmin?[...navBase,["activity","Activity Log"]]:navBase;
  const mobBase=[["dashboard","Dashboard"],["projects","Projects"],["sheet","Inspections"],["permits","Permits"],["scheduling","Scheduling"],["todos","To Do"]];
  const mobNavItems=isAdmin?[...mobBase,["activity","Log"]]:mobBase;

  return(
    <div data-app="" style={{...S.app,flexDirection:mob?"column":"row"}}>
      <style dangerouslySetInnerHTML={{__html:PRINT_CSS}}/>
      {!mob&&<div data-sidebar="" style={S.side}>
        <div style={{...S.fxc,gap:10,padding:"4px 16px 18px",borderBottom:`1px solid ${C.bd}`,marginBottom:10}}>
          <svg width="32" height="32" viewBox="0 0 40 40"><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
          <div><div style={{fontSize:15,fontWeight:700,color:C.bl}}>Stacy Bomar</div><div style={{fontSize:9,fontWeight:700,color:C.gr,letterSpacing:2}}>CONSTRUCTION</div></div>
        </div>
        <div style={{flex:1,padding:"6px 10px"}}>
          {navItems.map(([id,lb])=>{const ico={dashboard:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,sheet:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>,projects:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,permits:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>,scheduling:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>,todos:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,activity:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>};return(
            <button key={id} style={S.nav(pg===id||(pg==="detail"&&id==="sheet"))} onClick={()=>{setPg(id);sSI(null);sSP(null);}}>
              {ico[id]}{lb}
              {id==="sheet"&&ovd>0&&<span style={{...S.bg(C.or,C.bg),marginLeft:"auto"}}>{ovd}</span>}
              {id==="projects"&&pendTotal>0&&<span style={{...S.bg(C.rd,"#fff"),marginLeft:"auto"}}>{pendTotal}</span>}
              {id==="todos"&&todos.filter(t=>!t.done).length>0&&<span style={{...S.bg(C.orb,C.or),marginLeft:"auto"}}>{todos.filter(t=>!t.done).length}</span>}
            </button>);})}
        </div>
        <div style={{padding:"14px 16px",borderTop:`1px solid ${C.bd}`,fontSize:10,color:C.w3}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontWeight:600,color:C.w2}}>{user.displayName||"User"}</span>
            <button onClick={()=>signOut(auth)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:4,color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px"}}>Sign Out</button>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Broward County, FL</span>
            {!resetting?<button onClick={()=>setResetting(true)} style={{background:"none",border:"none",color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit"}}>Reset</button>:
            <div style={{display:"flex",gap:4}}>
              <button onClick={async()=>{const p=mkSeed();setP(p);setI([]);setCt([]);setResetting(false);}} style={{background:C.rd,border:"none",color:"#fff",cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4,fontWeight:600}}>Yes, reset all</button>
              <button onClick={()=>setResetting(false)} style={{background:"none",border:`1px solid ${C.bd}`,color:C.w3,cursor:"pointer",fontSize:9,fontFamily:"inherit",padding:"2px 8px",borderRadius:4}}>Cancel</button>
            </div>}
          </div>
        </div>
      </div>}

      {mob&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:C.b2,borderBottom:`1px solid ${C.bd}`}}>
        <div style={{...S.fxc,gap:8}}>
          <svg width="24" height="24" viewBox="0 0 40 40"><path d="M20 4L6 18h5v14h18V18h5L20 4z" fill={C.bl}/><path d="M8 28c4-2 8-6 12-6s8 2 14 0" fill="none" stroke={C.gr} strokeWidth="3" strokeLinecap="round"/></svg>
          <span style={{fontSize:13,fontWeight:700,color:C.bl}}>SBC</span>
          <span style={{fontSize:11,color:C.w2,fontWeight:500}}>{user.displayName||"User"}</span>
        </div>
        <button onClick={()=>signOut(auth)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,color:C.w3,cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:"5px 10px"}}>Sign Out</button>
      </div>}
      <div data-content="" style={{flex:1,overflow:"auto",paddingBottom:mob?70:0}}><div style={{padding:mob?"14px 12px":"24px 40px",maxWidth:mob?"100%":1400}}>

        {pg==="dashboard"&&(()=>{
          const cc={};proj.forEach(p=>{cc[p.city||"?"]=(cc[p.city||"?"]||0)+1;});
          const cols=["Windows & Doors","Roofing","Structural","Electrical","Plumbing","Mechanical"];
          const colC={"Windows & Doors":C.gr,Roofing:"#FB923C",Structural:"#A78BFA",Electrical:C.rd,Plumbing:C.bl,Mechanical:"#FCD34D"};
          const sorted=[...proj].sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"}));
          const active=sorted.filter(p=>(p.status||"")!=="CLOSED");
          const closed=sorted.filter(p=>(p.status||"")==="CLOSED");
          const isRev=s=>(s||"").includes("REVISION");
          const revCount=active.filter(p=>isRev(p.status)).length;
          return <>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
              {[[active.length,"Active Jobs",C.bl],[closed.length,"Closed Jobs",C.w3],[revCount,"Revision Required",revCount?C.or:C.w3]].map(([v,l,c],i)=>
                <div key={i} style={{...S.cd,borderLeft:`3px solid ${c}`,padding:mob?16:20}}><div style={{fontSize:32,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:13,color:C.w3,marginTop:2}}>{l}</div></div>)}
            </div>
            {(()=>{const activeP=permits.filter(p=>!["Closed","Issued"].includes(p.status));const needResp=permits.filter(p=>p.status==="Comments Received"&&(p.comments||[]).some(c=>c.responseStatus==="Not Started"||c.responseStatus==="In Progress")).length;const pend30=activeP.filter(p=>p.dateSubmitted&&(new Date()-new Date(p.dateSubmitted+"T00:00:00"))/(1e3*86400)>30).length;return <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:14,marginBottom:20}}>
              {[[activeP.length,"Active Permits","#22D3EE"],[needResp,"Comments Need Response",needResp?C.or:C.w3],[pend30,"Pending > 30 Days",pend30?C.rd:C.w3]].map(([v,l,c],i)=>
                <div key={"pm"+i} style={{...S.cd,borderLeft:`3px solid ${c}`,cursor:"pointer",padding:mob?16:20}} onClick={()=>setPg("permits")}><div style={{fontSize:32,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:13,color:C.w3,marginTop:2}}>{l}</div></div>)}
            </div>;})()}

            {pendTotal>0&&<div style={{...S.cd,borderLeft:`3px solid ${C.rd}`,marginBottom:20,background:C.rdb,padding:mob?16:20}}>
              <div style={{...S.fxsb,marginBottom:10}}><div style={{...S.fxc,gap:8}}><span style={{fontSize:22}}>⚠</span><span style={{fontSize:16,fontWeight:700,color:C.rd}}>REVISIONS & CHANGE ORDERS</span></div><span style={{fontSize:28,fontWeight:700,color:C.rd}}>{pendTotal}</span></div>
              {projWithIssues.map(p=>{const pco=(p.changeOrders||[]).filter(co=>co.status==="Pending");const prev=(p.revisions||[]).filter(r=>r.status==="Open");return <div key={p.id} style={{padding:"8px 0",borderTop:`1px solid ${C.bd}`}}>
                <span style={{fontSize:13,fontWeight:600,color:C.w,cursor:"pointer",textDecoration:"underline"}} onClick={()=>{sSP(p.id);setPg("projects");}}>{p.clientName}</span>
                {prev.length>0&&<span style={{fontSize:12,color:C.or,marginLeft:8}}>{prev.length} revision{prev.length>1?"s":""}</span>}
                {pco.length>0&&<span style={{fontSize:12,color:C.rd,marginLeft:8}}>{pco.length} CO</span>}
                {prev.map(r=><div key={r.id} style={{fontSize:11,color:C.or,marginLeft:16,marginTop:3}}>↺ {r.description}{r.inspection?` (${r.inspection})`:""}</div>)}
                {pco.map(co=><div key={co.id} style={{fontSize:11,color:C.w3,marginLeft:16,marginTop:3}}>$ {co.description}{co.cost?` ($${co.cost})`:""}</div>)}
              </div>;})}
            </div>}

            {/* SPREADSHEET TABLE / MOBILE CARDS */}
            <div style={{...S.cd,padding:0,overflow:"auto",marginBottom:16}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:14,fontWeight:700,margin:0}}>Job Scope Matrix</h3><span style={{fontSize:11,color:C.w3}}>{active.length} active · {closed.length} closed</span></div>
              {mob?<div style={{padding:8}}>{active.map((p,idx)=><div key={p.id} style={{padding:"10px 12px",background:isRev(p.status)?C.rdb:idx%2===0?C.b3:"transparent",borderBottom:`1px solid ${C.bd}`,borderRadius:6,marginBottom:4}}>
                <div style={{...S.fxsb,marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:C.w}}>{p.clientName}</span><span style={{fontSize:11,color:C.w3}}>{p.city}</span></div>
                {p.address&&p.address!=="TBD"&&<div style={{fontSize:11,color:C.w2,marginBottom:4}}><AddrLink a={p.address} c={p.city}/></div>}
                <div style={{fontSize:11,color:isRev(p.status)?C.or:C.w2,fontWeight:isRev(p.status)?700:400,marginBottom:6}}>{p.status||"—"}</div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{cols.filter(c=>(p.scopes||[]).includes(c)).map(c=>{const sn={"Windows & Doors":"W/D",Roofing:"ROOF",Structural:"STRUCT",Electrical:"ELEC",Plumbing:"PLMB",Mechanical:"MECH"};return <span key={c} style={{fontSize:9,fontWeight:600,padding:"2px 8px",borderRadius:10,background:colC[c]+"22",color:colC[c]}}>{sn[c]}</span>;})}</div>
              </div>)}
              {closed.length>0&&<details style={{marginTop:6,padding:"0 4px"}}><summary style={{fontSize:11,color:C.w3,cursor:"pointer",padding:"6px 0"}}>Closed ({closed.length})</summary>{closed.map(p=><div key={p.id} style={{padding:"6px 12px",borderBottom:`1px solid ${C.bd}`,opacity:0.5}}><span style={{fontSize:12,color:C.w3}}>{p.clientName}</span><span style={{fontSize:10,color:C.w3,marginLeft:8}}>{p.city}</span></div>)}</details>}
              </div>
              :<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{background:C.b3}}>
                  <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:C.w,borderBottom:`1px solid ${C.bd}`,position:"sticky",left:0,background:C.b3,minWidth:140}}>NAME</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:C.w,borderBottom:`1px solid ${C.bd}`,minWidth:100}}>CITY</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:C.w2,borderBottom:`1px solid ${C.bd}`,minWidth:180}}>ADDRESS</th>
                  <th style={{padding:"10px 12px",textAlign:"left",fontWeight:700,color:C.w2,borderBottom:`1px solid ${C.bd}`,minWidth:220}}>STATUS</th>
                  {cols.map(c=>{const sn={"Windows & Doors":"W/D",Roofing:"ROOF",Structural:"STRUCT",Electrical:"ELEC",Plumbing:"PLMB",Mechanical:"MECH"};return <th key={c} style={{padding:"10px 8px",textAlign:"center",fontWeight:700,color:colC[c],borderBottom:`1px solid ${C.bd}`,minWidth:65}}>{sn[c]||c}</th>;})}
                </tr></thead>
                <tbody>
                  {active.map((p,idx)=><tr key={p.id} style={{background:isRev(p.status)?C.rdb:idx%2===0?C.b2:"transparent",borderBottom:`1px solid ${C.bd}`,transition:"background 0.1s",cursor:"default"}}>
                    <td style={{padding:"8px 14px",fontWeight:600,color:C.w,whiteSpace:"nowrap"}}>{p.clientName}</td>
                    <td style={{padding:"8px 12px",color:C.w3,fontSize:12}}>{p.city}</td>
                    <td style={{padding:"8px 12px",color:C.w2,fontSize:12}}>{p.address&&p.address!=="TBD"?<AddrLink a={p.address} c={p.city}/>:"—"}</td>
                    <td style={{padding:"8px 12px",fontSize:12,color:isRev(p.status)?C.or:C.w2,fontWeight:isRev(p.status)?700:400}}>{p.status||"—"}</td>
                    {cols.map(c=>{const has=(p.scopes||[]).includes(c);return <td key={c} style={{padding:"8px 8px",textAlign:"center"}}>{has?<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:colC[c]}}/>:<span style={{color:C.b3}}>—</span>}</td>;})}
                  </tr>)}
                  {closed.length>0&&<><tr><td colSpan={5+cols.length} style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:C.w3,background:C.b3,borderBottom:`1px solid ${C.bd}`,letterSpacing:1}}>CLOSED JOBS</td></tr>
                  {closed.map((p,idx)=><tr key={p.id} style={{background:"transparent",borderBottom:`1px solid ${C.bd}`,opacity:0.5}}>
                    <td style={{padding:"5px 12px",fontWeight:600,color:C.w3,whiteSpace:"nowrap"}}>{p.clientName}</td>
                    <td style={{padding:"5px 8px",color:C.w3,fontSize:10}}>{p.city}</td>
                    <td style={{padding:"5px 8px",color:C.w3,fontSize:10}}>{p.address&&p.address!=="TBD"?<AddrLink a={p.address} c={p.city}/>:"—"}</td>
                    <td style={{padding:"5px 8px",fontSize:10,color:C.w3}}>CLOSED</td>
                    {cols.map(c=>{const has=(p.scopes||[]).includes(c);return <td key={c} style={{padding:"5px 6px",textAlign:"center"}}>{has?<span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.w3}}/>:<span style={{color:C.b3}}>—</span>}</td>;})}
                  </tr>)}</>}
                </tbody>
              </table>}
            </div>

            {/* CITY + PERMITS + PHASE in 3 columns */}
            {(()=>{
              const psc={issued:0,review:0,none:0};proj.forEach(p=>{const ps=(p.permitStatus||"").toLowerCase();if(ps==="issued")psc.issued++;else if(ps==="in review")psc.review++;else psc.none++;});
              const phases={permitting:0,progress:0,done:0,paused:0,commence:0};active.forEach(p=>{const st=(p.status||"").toLowerCase();if(st.includes("permit")||st.includes("review"))phases.permitting++;else if(st.includes("progress")||st.includes("active")||st.includes("commenced")||st.includes("work"))phases.progress++;else if(st.includes("done")||st.includes("final")||st.includes("closed soon"))phases.done++;else if(st.includes("pause")||st.includes("insurance")||st.includes("waiting"))phases.paused++;else if(st.includes("commence"))phases.commence++;else phases.progress++;});
              return <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:14}}>
                <div style={{...S.cd,padding:mob?16:20}}><h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>By City</h3>
                  {Object.entries(cc).sort((a,b)=>b[1]-a[1]).map(([c,n])=><div key={c} style={{...S.fxsb,padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}><span style={{fontSize:13}}>{c}</span><span style={{fontSize:16,fontWeight:700,color:C.bl}}>{n}</span></div>)}
                </div>
                <div style={{...S.cd,padding:mob?16:20}}><h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Permit Status</h3>
                  {[["Issued / Approved",psc.issued,C.gr],["In Review",psc.review,C.or],["Not Set",psc.none,C.w3]].map(([l,v,c])=><div key={l} style={{...S.fxsb,padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{...S.fxc,gap:8}}><div style={{width:10,height:10,borderRadius:"50%",background:c}}/><span style={{fontSize:13}}>{l}</span></div><span style={{fontSize:16,fontWeight:700,color:c}}>{v}</span></div>)}
                  <p style={{fontSize:11,color:C.w3,marginTop:8}}>Set in project Edit</p>
                </div>
                <div style={{...S.cd,padding:mob?16:20}}><h3 style={{fontSize:15,fontWeight:700,marginBottom:12}}>Jobs by Phase</h3>
                  {[["In Permitting",phases.permitting,C.or],["In Progress",phases.progress,C.bl],["Nearly Done / Finals",phases.done,C.gr],["On Pause",phases.paused,C.w3]].map(([l,v,c])=><div key={l} style={{...S.fxsb,padding:"8px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{...S.fxc,gap:8}}><div style={{width:10,height:10,borderRadius:"50%",background:c}}/><span style={{fontSize:13}}>{l}</span></div><span style={{fontSize:16,fontWeight:700,color:c}}>{v}</span></div>)}
                </div>
              </div>;
            })()}
          </>;
        })()}

        {pg==="sheet"&&!selI&&(()=>{
          const ws=new Date(week+"T00:00:00");const days=Array.from({length:5},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d.toISOString().split("T")[0];});
          const pend=insp.filter(i=>!i.completed&&(!i.date||i.date<days[0]||i.date>days[4]));
          const iDragStart=(e,id)=>{inspDragRef.current=id;setInspDragId(id);e.dataTransfer.setData("text/plain",id);e.dataTransfer.effectAllowed="move";};
          const iDragEnd=()=>{inspDragRef.current=null;setInspDragId(null);setInspDropDay(null);};
          const iDrop=(e,date)=>{e.preventDefault();setInspDropDay(null);const id=inspDragRef.current||e.dataTransfer.getData("text/plain");if(id){setI(v=>v.map(x=>x.id===id?{...x,date:date}:x));inspDragRef.current=null;setInspDragId(null);}};
          const iDragOver=(e,date)=>{e.preventDefault();e.dataTransfer.dropEffect="move";setInspDropDay(date);};
          return <>
            <div data-print-header="" style={{display:"none",justifyContent:"center",alignItems:"center",marginBottom:14,paddingBottom:10,borderBottom:"3px solid #000",textAlign:"center"}}><div style={{textAlign:"center"}}><div style={{fontSize:22,fontWeight:800,letterSpacing:1}}>Stacy Bomar Construction</div><div style={{fontSize:12,fontWeight:600,letterSpacing:2,marginTop:4,textTransform:"uppercase"}}>Inspection List — {fmt(days[0])} to {fmt(days[4])}</div></div></div>
            <div style={{...S.fxsb,marginBottom:20,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:mob?16:24,fontWeight:700,margin:0}}>INSPECTION LIST</h1><p style={{fontSize:12,color:C.w3,marginTop:4}}>{fmt(days[0])} — {fmt(days[4])}</p></div><div data-noprint="" style={{display:"flex",gap:6}}>{!mob&&<button style={S.bs} onClick={()=>window.print()}>Print</button>}<button style={{...S.btn,padding:mob?"10px 16px":"6px 14px",fontSize:mob?13:12}} onClick={()=>sM("insp")}>+ Schedule</button></div></div>
            <div data-noprint="" style={{...S.fx,gap:6,marginBottom:12}}><button style={{...S.bs,padding:mob?"10px 16px":"6px 14px"}} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()-7);sWk(d.toISOString().split("T")[0]);}}>←</button><button style={{...S.bs,color:C.bl,padding:mob?"10px 16px":"6px 14px"}} onClick={()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);sWk(d.toISOString().split("T")[0]);}}>This Week</button><button style={{...S.bs,padding:mob?"10px 16px":"6px 14px"}} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()+7);sWk(d.toISOString().split("T")[0]);}}>→</button></div>
            {!mob&&<div data-col-header="" data-noprint="" style={{...S.hdr,background:C.bl,borderRadius:"8px 8px 0 0"}}>{["NAME","CITY","PERMIT","TYPE","ADDRESS"].map(h=><div key={h} style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:1}}>{h}</div>)}</div>}
            {days.map(d=>{const di=insp.filter(i=>i.date===d);const isT=d===td();const isDrop=inspDropDay===d;return <div key={d} onDragOver={e=>iDragOver(e,d)} onDragLeave={()=>setInspDropDay(null)} onDrop={e=>iDrop(e,d)}>
              <div data-day-header="" style={{...S.fxc,gap:6,background:isDrop?C.bl+"55":isT?C.bll:C.b3,padding:mob?"10px 14px":"6px 14px",borderBottom:`1px solid ${C.bd}`,border:isDrop?`2px solid ${C.bl}`:"2px solid transparent",transition:"background 0.15s, border 0.15s"}}><span style={{fontSize:mob?13:11,fontWeight:700,color:isT?C.bl:C.w}}>{fmt(d)}</span><span style={{fontSize:mob?12:10,color:isT?C.bl:C.w3}}>{fDay(d)}</span>{isT&&<span style={S.bg(C.bl,"#fff")}>TODAY</span>}{isDrop&&<span style={{fontSize:10,color:C.bl,marginLeft:4}}>Drop here</span>}<span style={{fontSize:mob?12:10,color:C.w3,marginLeft:"auto"}}>{di.length}</span></div>
              {di.length===0?<div style={{padding:isDrop?"14px":"8px 14px",color:C.w3,fontSize:11,background:isDrop?C.bll:C.b2,borderBottom:`1px solid ${C.bd}`,transition:"padding 0.15s, background 0.15s"}}>{isDrop?"Drop to move here":"—"}</div>:
              di.map(i=>{const p=proj.find(x=>x.id===i.projectId);const isOv=!i.completed&&i.date<td();const rC=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;const rL=i.result==="pass"?"Pass":i.result==="fail"?"Fail":"Open";return(
                <div data-insp-row="" key={i.id} draggable={!mob} onDragStart={e=>iDragStart(e,i.id)} onDragEnd={iDragEnd} onClick={()=>{if(!inspDragId){sSI(i.id);setPg("detail");}}} style={{padding:mob?"12px 14px":"10px 16px",background:isOv?C.rdb:i.result==="fail"?C.rdb:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:mob?"pointer":"grab",opacity:inspDragId===i.id?0.4:1,transition:"opacity 0.15s, background 0.1s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span data-name="" style={{fontSize:mob?14:13,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</span><div style={{display:"flex",alignItems:"center",gap:6}}><div data-status-dot="" style={{width:mob?8:8,height:mob?8:8,borderRadius:"50%",background:rC}}/><span data-result="" style={{fontSize:mob?12:12,color:rC,fontWeight:600}}>{rL}</span></div></div>
                  <div data-type="" style={{fontSize:mob?13:13,color:C.bl,fontWeight:600}}>{fT(i.type,ct)}</div>
                  <div data-detail="" style={{fontSize:mob?12:12,color:C.w3,marginTop:3}}>{p?.city}{p?.address&&p?.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}{i.permitNum?` · Permit: ${i.permitNum}`:""}</div>
                </div>);})}
            </div>;})}
            {pend.length>0&&<><div data-pend-header="" style={{background:C.orb,padding:"7px 14px",borderTop:`2px solid ${C.or}`,marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:C.or}}>PENDING ({pend.length})</span></div>{pend.map(i=>{const p=proj.find(x=>x.id===i.projectId);return(
              <div data-insp-row="" key={i.id} draggable onDragStart={e=>iDragStart(e,i.id)} onDragEnd={iDragEnd} onClick={()=>{if(!inspDragId){sSI(i.id);setPg("detail");}}} style={{padding:"8px 14px",background:C.b2,borderBottom:`1px solid ${C.bd}`,cursor:"grab",opacity:inspDragId===i.id?0.4:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span data-name="" style={{fontSize:12,fontWeight:600,textTransform:"uppercase"}}>{p?.clientName}</span><span data-result="" style={{fontSize:10,color:C.or}}>Pending</span></div>
                <div data-type="" style={{fontSize:11,color:C.or,fontWeight:600}}>{fT(i.type,ct)}</div>
                <div data-detail="" style={{fontSize:10,color:C.w3,marginTop:2}}>{p?.city}{p?.address&&p?.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}{i.permitNum?` · Permit: ${i.permitNum}`:""}</div>
              </div>);})}</>}
          </>;
        })()}

        {pg==="detail"&&selI&&(()=>{const i=insp.find(x=>x.id===selI);if(!i)return null;const p=proj.find(x=>x.id===i.projectId);
          const stColor=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;
          const stLabel=i.result==="pass"?"PASSED":i.result==="fail"?"FAILED":i.completed?"COMPLETED":"SCHEDULED";
          return <>
          <button style={{...S.bs,marginBottom:14}} onClick={()=>{sSI(null);setPg("sheet");}}>← Back</button>
          <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:mob?16:20,fontWeight:700,margin:0}}>{fT(i.type,ct)}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p?.clientName} · {p?.city} · {fmt(i.date)}</p>{i.permitNum&&<p style={{fontSize:11,color:C.bl,marginTop:3}}>Permit: {i.permitNum}</p>}</div>
          <div style={{...S.fx,gap:6,flexWrap:"wrap"}}>
            {!i.result&&<><button style={{...S.btn,background:C.gr,color:C.bg,padding:mob?"12px 20px":"6px 14px",fontSize:mob?14:12}} onClick={()=>{setI(v=>v.map(x=>x.id===i.id?{...x,completed:true,result:"pass",completedAt:td()}:x));logAct("passed inspection",`${fT(i.type,ct)} for ${p?.clientName}`);}}>✓ Pass</button><button style={{...S.btn,background:C.rd,color:"#fff",padding:mob?"12px 20px":"6px 14px",fontSize:mob?14:12}} onClick={()=>{setI(v=>v.map(x=>x.id===i.id?{...x,completed:true,result:"fail",completedAt:td()}:x));logAct("failed inspection",`${fT(i.type,ct)} for ${p?.clientName}`);}}>✗ Fail</button></>}
            {i.result&&<button style={{...S.bs,padding:mob?"12px 20px":"6px 14px",fontSize:mob?14:12}} onClick={()=>{setI(v=>v.map(x=>x.id===i.id?{...x,completed:false,result:"",completedAt:""}:x));logAct("reset inspection",`${fT(i.type,ct)} for ${p?.clientName}`);}}>Reset</button>}
            <button style={{...S.bs,color:C.rd,padding:mob?"12px 20px":"6px 14px",fontSize:mob?14:12}} onClick={()=>{logAct("deleted inspection",`${fT(i.type,ct)} for ${p?.clientName}`);setI(v=>v.filter(x=>x.id!==i.id));sSI(null);setPg("sheet");}}>Delete</button>
          </div></div>
          <div style={S.cd}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:stColor}}/><span style={{fontSize:13,fontWeight:600,color:stColor}}>{stLabel}</span></div>{i.notes&&<p style={{fontSize:12,color:C.w2,marginTop:6}}>Notes: {i.notes}</p>}</div>
        </>;})()}

        {pg==="projects"&&!selP&&<>
          <div style={{...S.fxsb,marginBottom:20}}><div><h1 style={{fontSize:mob?16:24,fontWeight:700,margin:0}}>Projects</h1><p style={{fontSize:12,color:C.w3,marginTop:4}}>{proj.length} jobs</p></div><button style={{...S.btn,padding:mob?"10px 16px":"6px 14px",fontSize:mob?13:12}} onClick={()=>sM("proj")}>+ New</button></div>
          <input style={{...S.inp,fontSize:mob?16:12,padding:mob?"12px 14px":"8px 12px"}} value={search} onChange={e=>sSr(e.target.value)} placeholder="Search..."/>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(320px,1fr))",gap:mob?8:14}}>
            {proj.filter(p=>(p.clientName+" "+p.city+" "+p.address).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"})).map(p=>
              <div key={p.id} style={{...S.cd,cursor:"pointer",borderLeft:`3px solid ${(p.revisions||[]).some(r=>r.status==="Open")||(p.changeOrders||[]).some(co=>co.status==="Pending")?C.rd:p.hoa?C.or:C.bl}`}} onClick={()=>sSP(p.id)}>
                <div style={{...S.fxsb,marginBottom:6}}><span style={{fontSize:14,fontWeight:600}}>{p.clientName}</span><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{(p.revisions||[]).filter(r=>r.status==="Open").length>0&&<span style={S.bg(C.orb,C.or)}>↺ {(p.revisions||[]).filter(r=>r.status==="Open").length} REV</span>}{(p.changeOrders||[]).filter(co=>co.status==="Pending").length>0&&<span style={S.bg(C.rdb,C.rd)}>$ {(p.changeOrders||[]).filter(co=>co.status==="Pending").length} CO</span>}{p.hoa&&<span style={S.bg(C.orb,C.or)}>HOA</span>}{p.permitStatus&&<span style={S.bg(p.permitStatus==="Issued"?C.grl:C.orb,p.permitStatus==="Issued"?C.gr:C.or)}>{p.permitStatus}</span>}</div></div>
                <div style={{fontSize:12,color:C.w3}}>{p.city}{p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</div>
                {p.permitNum&&<div style={{fontSize:11,color:C.bl,marginTop:3}}>{p.permitNum}</div>}
                {p.scopes&&p.scopes.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:6}}>{p.scopes.map(sc=><span key={sc} style={{fontSize:9,fontWeight:600,padding:"3px 9px",borderRadius:12,background:sc==="Structural"?"#2D1F4E":sc==="Plumbing"?C.bll:sc==="Electrical"?C.rdb:sc==="Roofing"?"#3B2410":sc==="Windows & Doors"?C.grl:sc==="Mechanical"?C.orb:C.b3,color:sc==="Structural"?"#A78BFA":sc==="Plumbing"?C.bl:sc==="Electrical"?C.rd:sc==="Roofing"?"#FB923C":sc==="Windows & Doors"?C.gr:sc==="Mechanical"?"#FCD34D":C.w2}}>{sc}</span>)}</div>}
              </div>)}
          </div>
        </>}

        {pg==="projects"&&selP&&(()=>{const p=proj.find(x=>x.id===selP);if(!p)return null;const pi=insp.filter(i=>i.projectId===selP);return <>
          <button style={{...S.bs,marginBottom:14}} onClick={()=>sSP(null)}>← Back</button>
          <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:mob?16:20,fontWeight:700,margin:0}}>{p.clientName}</h1><p style={{fontSize:12,color:C.w3,marginTop:3}}>{p.city}{p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</p></div><div style={{...S.fx,gap:6}}><button style={{...S.bs,padding:mob?"10px 14px":"6px 14px",fontSize:mob?13:12}} onClick={()=>sEP(p)}>Edit</button><button style={{...S.btn,padding:mob?"10px 14px":"6px 14px",fontSize:mob?13:12}} onClick={()=>sM("insp")}>+ Insp</button><button style={{...S.bs,color:C.rd,padding:mob?"10px 14px":"6px 14px",fontSize:mob?13:12}} onClick={()=>{logAct("deleted project",p.clientName);setP(v=>v.filter(x=>x.id!==selP));sSP(null);}}>Del</button></div></div>
          <div style={{...S.fx,gap:6,flexWrap:"wrap",marginBottom:12}}>{p.hoa&&<span style={S.bg(C.orb,C.or)}>HOA</span>}{p.permitNum&&<span style={S.bg(C.bll,C.bl)}>{p.permitNum}</span>}{p.permitStatus&&<span style={S.bg(p.permitStatus==="Issued"?C.grl:C.orb,p.permitStatus==="Issued"?C.gr:C.or)}>Permit: {p.permitStatus}</span>}{p.assignee&&<span style={S.bg(C.grl,C.gr)}>👤 {p.assignee}</span>}</div>
          <RevisionSection revisions={p.revisions||[]} onUpdate={revs=>setP(v=>v.map(x=>x.id===selP?{...x,revisions:revs}:x))} logAct={logAct} projectName={p.clientName} mob={mob} inspections={insp.filter(i=>i.projectId===selP)} ct={ct} todos={todos} setTodos={setTodos} user={user} projectId={selP}/>
          <COSection changeOrders={p.changeOrders||[]} onUpdate={cos=>setP(v=>v.map(x=>x.id===selP?{...x,changeOrders:cos}:x))} logAct={logAct} projectName={p.clientName} mob={mob} todos={todos} setTodos={setTodos} user={user} projectId={selP}/>
          {p.scopeNotes&&<div style={S.cd}><p style={{margin:0,fontSize:12,color:C.w2,lineHeight:1.5}}>{p.scopeNotes}</p></div>}
          <div style={S.cd}><h4 style={{fontSize:13,fontWeight:700,marginBottom:8}}>Notes</h4>
            {(p.comments||[]).map(c=><div key={c.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}><div style={{fontSize:11,color:C.w2}}>{c.text}</div><div style={{fontSize:9,color:C.w3,marginTop:2}}>{fmt(c.date)}</div></div>)}
            {!(p.comments||[]).length&&<p style={{fontSize:11,color:C.w3}}>No notes yet</p>}
            <div style={{...S.fx,gap:6,marginTop:8}}><input id="cm" style={{...S.inp,marginBottom:0,flex:1}} placeholder="Add note..." onKeyDown={e=>{if(e.key==="Enter"&&e.target.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:e.target.value.trim(),date:td()}]}:x));e.target.value="";}}} /><button style={S.btn} onClick={()=>{const el=document.getElementById("cm");if(el?.value.trim()){setP(v=>v.map(x=>x.id===selP?{...x,comments:[...(x.comments||[]),{id:uid(),text:el.value.trim(),date:td()}]}:x));el.value="";}}}>Add</button></div>
          </div>
          <LinksSection mob={mob} links={p.links||[]} projectId={selP} logAct={logAct} projectName={p.clientName} onAdd={(lk)=>setP(v=>v.map(x=>x.id===selP?{...x,links:[...(x.links||[]),{id:uid(),...lk,date:td()}]}:x))} onDel={(lid)=>setP(v=>v.map(x=>x.id===selP?{...x,links:(x.links||[]).filter(l=>l.id!==lid)}:x))} onUpdate={(lid,upd)=>setP(v=>v.map(x=>x.id===selP?{...x,links:(x.links||[]).map(l=>l.id===lid?{...l,...upd}:l)}:x))}/>
          <h4 style={{fontSize:13,fontWeight:700,margin:"12px 0 8px"}}>Inspections ({pi.length})</h4>
          {pi.map(i=>{const rc=i.result==="pass"?C.gr:i.result==="fail"?C.rd:C.or;const rl=i.result==="pass"?"Pass":i.result==="fail"?"Fail":"Open";const rb=i.result==="pass"?C.grl:i.result==="fail"?C.rdb:C.orb;return <div key={i.id} style={S.rw}><div style={{width:6,height:6,borderRadius:"50%",background:rc}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{fT(i.type,ct)}</div><div style={{fontSize:10,color:C.w3}}>{fmt(i.date)} · {i.permitNum||"—"}</div></div><span style={S.bg(rb,rc)}>{rl}</span></div>;})}
        </>;})()}

        {pg==="scheduling"&&<SchedTab proj={proj} sched={sched} setSched={setSched} week={week} sWk={sWk} mob={mob} logAct={logAct}/>}
        {pg==="permits"&&<PermitsTab proj={proj} permits={permits} setPermits={setPermits} pg={pg} setPg={setPg} mob={mob} logAct={logAct} companyDocs={companyDocs} setCompanyDocs={setCompanyDocs} user={user}/>}
        {pg==="todos"&&<TodoTab todos={todos} setTodos={setTodos} proj={proj} mob={mob} logAct={logAct} user={user}/>}

        {pg==="activity"&&isAdmin&&(()=>{
          if(!actLog.length)loadLog();
          const fmtTs=(ts)=>{const d=new Date(ts);return d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});};
          const actColor={added:C.gr,scheduled:C.bl,updated:C.or,deleted:C.rd,passed:C.gr,failed:C.rd,reset:C.w3,uploaded:C.bl,moved:C.or,removed:C.rd};
          const getVerb=(a)=>{const w=a.toLowerCase().split(" ")[0];return actColor[w]||C.w2;};
          return <>
            <div style={{...S.fxsb,marginBottom:20,alignItems:"center"}}><h1 style={{fontSize:mob?16:24,fontWeight:700,margin:0}}>Activity Log</h1><button onClick={loadLog} style={{...S.bs,fontSize:11}}>Refresh</button></div>
            {!actLog.length&&<p style={{color:C.w3,fontSize:13}}>No activity recorded yet.</p>}
            {actLog.map(a=><div key={a.id} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.bd}`,alignItems:"flex-start"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:getVerb(a.action),marginTop:6,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:mob?13:12}}><span style={{fontWeight:700,color:C.w}}>{a.user}</span> <span style={{color:C.w2}}>{a.action}</span></div>
                {a.detail&&<div style={{fontSize:mob?12:11,color:C.w3,marginTop:2}}>{a.detail}</div>}
              </div>
              <span style={{fontSize:10,color:C.w3,whiteSpace:"nowrap",flexShrink:0}}>{fmtTs(a.ts)}</span>
            </div>)}
          </>;
        })()}

        {modal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>sM(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":28,width:"100%",maxWidth:mob?"100%":560,maxHeight:mob?"90vh":"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>{modal==="insp"?"Schedule Inspections":"New Project"}</h2><button onClick={()=>sM(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          {modal==="insp"&&<InspF pr={proj} ok={items=>{setI(v=>[...v,...items.map(i=>({...i,id:uid(),createdAt:td(),completed:false}))]);const pName=proj.find(x=>x.id===items[0]?.projectId)?.clientName;logAct("scheduled "+items.length+" inspection"+(items.length>1?"s":""),pName?`for ${pName}`:"");sM(null);}} ct={ct} aC={t=>setCt(v=>[...v,t])} pre={selP}/>}
          {modal==="proj"&&<PF ok={p=>{setP(v=>[...v,{...p,id:uid(),comments:[],createdAt:td()}]);logAct("added project",p.clientName);sM(null);}}/>}
        </div></div>}
        {editP&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>sEP(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":28,width:"100%",maxWidth:mob?"100%":560,maxHeight:mob?"90vh":"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
          <div style={{...S.fxsb,marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>Edit Project</h2><button onClick={()=>sEP(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
          <EF p={editP} ok={u=>{setP(v=>v.map(p=>p.id===editP.id?{...p,...u}:p));logAct("updated project",editP.clientName);sEP(null);}}/>
        </div></div>}

      </div></div>
      {mob&&<div data-mobnav="" style={{position:"fixed",bottom:0,left:0,right:0,background:C.b2,borderTop:`1px solid ${C.bd}`,display:"flex",zIndex:900,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {mobNavItems.map(([id,lb])=>{const act=pg===id||(pg==="detail"&&id==="sheet");return <button key={id} onClick={()=>{setPg(id);sSI(null);sSP(null);}} style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",fontFamily:"inherit"}}>
          <span style={{fontSize:16}}>{id==="dashboard"?"📊":id==="projects"?"🏗":id==="sheet"?"📋":id==="permits"?"📜":id==="todos"?"✅":id==="activity"?"📝":"📅"}</span>
          <span style={{fontSize:9,fontWeight:act?700:500,color:act?C.bl:C.w3}}>{lb}</span>
          {id==="sheet"&&ovd>0&&<span style={{position:"absolute",top:4,marginLeft:24,fontSize:8,fontWeight:700,background:C.or,color:C.bg,borderRadius:8,padding:"1px 4px"}}>{ovd}</span>}
          {id==="projects"&&pendTotal>0&&<span style={{position:"absolute",top:4,marginLeft:24,fontSize:8,fontWeight:700,background:C.rd,color:"#fff",borderRadius:8,padding:"1px 4px"}}>{pendTotal}</span>}
        </button>;})}
      </div>}
    </div>
  );
}

function RevisionSection({revisions,onUpdate,logAct,projectName,mob,inspections,ct,todos,setTodos,user,projectId}){
  const[adding,setAdding]=useState(false);const[desc,setDesc]=useState("");const[insp2,setInsp2]=useState("");const[notes,setNotes]=useState("");
  const open=revisions.filter(r=>r.status==="Open");
  const resub=revisions.filter(r=>r.status==="Resubmitted");
  const resolved=revisions.filter(r=>r.status==="Resolved");
  const linkedTodos=(revId)=>(todos||[]).filter(t=>t.linkedRevId===revId);
  const addRev=()=>{if(!desc.trim())return;const revId=uid();const r={id:revId,description:desc.trim(),inspection:insp2,notes:notes.trim(),status:"Open",createdAt:td()};onUpdate([...revisions,r]);if(logAct)logAct("added revision",`"${desc.trim()}" for ${projectName}`);if(setTodos){const t={id:uid(),text:`Revision: ${desc.trim()} — ${projectName}`,done:false,priority:"High",projectId:projectId||"",assignee:"",createdBy:user?.displayName||"System",createdAt:td(),doneAt:"",doneBy:"",linkedRevId:revId,linkedType:"revision"};setTodos(v=>[t,...v]);}setDesc("");setInsp2("");setNotes("");setAdding(false);};
  const updateStatus=(id,status)=>{onUpdate(revisions.map(r=>r.id===id?{...r,status,resolvedAt:status==="Resolved"?td():""}:r));if(logAct)logAct(`${status.toLowerCase()} revision`,`for ${projectName}`);};
  const delRev=(id)=>{onUpdate(revisions.filter(r=>r.id!==id));if(logAct)logAct("removed revision",projectName);};
  const hasOpen=open.length>0;
  const allTypes=[...DT,...ct].map(t=>`${t.p}- ${t.l}`);
  const inspTypes=[...new Set([...allTypes,...inspections.map(i=>fT(i.type,ct))])];
  return <div style={{...S.cd,borderLeft:`3px solid ${hasOpen?C.or:C.bd}`}}>
    <div style={{...S.fxsb,marginBottom:hasOpen||resub.length||resolved.length?10:0,alignItems:"center"}}>
      <div style={{...S.fxc,gap:8}}>
        {hasOpen&&<span style={{fontSize:16}}>↺</span>}
        <h4 style={{fontSize:13,fontWeight:700,margin:0,color:hasOpen?C.or:C.w}}>Revisions{hasOpen?` (${open.length} Open)`:""}</h4>
      </div>
      <button onClick={()=>setAdding(!adding)} style={{...S.bs,fontSize:10,padding:mob?"6px 10px":"4px 8px"}}>{adding?"Cancel":"+ Add"}</button>
    </div>
    {adding&&<div style={{background:C.bg,borderRadius:8,padding:mob?12:10,border:`1px solid ${C.bd}`,marginBottom:10}}>
      <input style={{...S.inp,fontSize:mob?13:12}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What needs to be revised? (e.g. Wrong NOA on window permit)"/>
      <select style={{...S.inp,fontSize:mob?13:12}} value={insp2} onChange={e=>setInsp2(e.target.value)}>
        <option value="">Which inspection failed? (optional)</option>
        {inspTypes.map(t=><option key={t} value={t}>{t}</option>)}
      </select>
      <input style={{...S.inp,fontSize:mob?13:12}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Notes (optional, e.g. city comments reference #)"/>
      <button onClick={addRev} style={{...S.btn,width:"100%",padding:mob?"10px":"6px 14px"}}>Add Revision</button>
    </div>}
    {open.map(r=>{const lt=linkedTodos(r.id);return <div key={r.id} style={{background:C.orb,borderRadius:8,padding:mob?"12px":"8px 10px",marginBottom:6,border:`1px solid ${C.or}33`}}>
      <div style={{...S.fxsb,marginBottom:4}}><span style={{fontSize:mob?13:12,fontWeight:700,color:C.or}}>{r.description}</span><span style={{fontSize:10,color:C.w3}}>{fmt(r.createdAt)}</span></div>
      {r.inspection&&<div style={{fontSize:11,color:C.rd,fontWeight:600,marginBottom:2}}>Failed: {r.inspection}</div>}
      {r.notes&&<div style={{fontSize:11,color:C.w3,marginBottom:4}}>{r.notes}</div>}
      {lt.length>0&&<div style={{marginTop:4,marginBottom:4}}>{lt.map(t=><div key={t.id} style={{fontSize:10,color:t.done?C.gr:C.or,display:"flex",gap:4,alignItems:"center"}}><span>{t.done?"✓":"○"}</span><span style={{textDecoration:t.done?"line-through":"none"}}>{t.text}</span>{t.assignee&&<span style={{color:C.w3}}>— {t.assignee}</span>}</div>)}</div>}
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={()=>updateStatus(r.id,"Resubmitted")} style={{...S.btn,fontSize:10,padding:mob?"6px 12px":"4px 10px",background:C.bl}}>Resubmitted</button>
        <button onClick={()=>updateStatus(r.id,"Resolved")} style={{...S.btn,fontSize:10,padding:mob?"6px 12px":"4px 10px",background:C.gr,color:C.bg}}>Resolved</button>
        <button onClick={()=>delRev(r.id)} style={{...S.bs,fontSize:10,padding:mob?"6px 12px":"4px 10px",color:C.rd,marginLeft:"auto"}}>Delete</button>
      </div>
    </div>;})}
    {resub.length>0&&<><div style={{fontSize:10,fontWeight:600,color:C.bl,marginTop:6,marginBottom:4,letterSpacing:0.5}}>RESUBMITTED</div>
      {resub.map(r=><div key={r.id} style={{background:C.bll,borderRadius:8,padding:mob?"10px":"6px 10px",marginBottom:4,border:`1px solid ${C.bl}33`}}>
        <div style={{...S.fxsb}}><span style={{fontSize:11,fontWeight:600,color:C.bl}}>{r.description}</span><span style={{fontSize:10,color:C.w3}}>{fmt(r.createdAt)}</span></div>
        {r.inspection&&<div style={{fontSize:10,color:C.w3}}>Failed: {r.inspection}</div>}
        <div style={{display:"flex",gap:6,marginTop:4}}>
          <button onClick={()=>updateStatus(r.id,"Resolved")} style={{...S.btn,fontSize:9,padding:"3px 8px",background:C.gr,color:C.bg}}>Mark Resolved</button>
          <button onClick={()=>updateStatus(r.id,"Open")} style={{...S.bs,fontSize:9,padding:"3px 8px"}}>Reopen</button>
        </div>
      </div>)}</>}
    {resolved.length>0&&<details style={{marginTop:6}}>
      <summary style={{fontSize:11,color:C.w3,cursor:"pointer",padding:"4px 0"}}>Resolved ({resolved.length})</summary>
      {resolved.map(r=><div key={r.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`,opacity:0.6}}>
        <div style={{...S.fxsb,alignItems:"center"}}><span style={{fontSize:11,color:C.w2}}>{r.description}</span><div style={{...S.fx,gap:6,alignItems:"center"}}><span style={S.bg(C.grl,C.gr)}>Resolved</span><button onClick={()=>updateStatus(r.id,"Open")} style={{...S.bs,fontSize:9,padding:"3px 8px"}}>Reopen</button></div></div>
        {r.inspection&&<span style={{fontSize:10,color:C.w3}}>{r.inspection}</span>}
      </div>)}
    </details>}
    {!revisions.length&&!adding&&<p style={{fontSize:11,color:C.w3,margin:0}}>No revisions</p>}
  </div>;
}

function COSection({changeOrders,onUpdate,logAct,projectName,mob,todos,setTodos,user,projectId}){
  const[adding,setAdding]=useState(false);const[desc,setDesc]=useState("");const[cost,setCost]=useState("");const[reason,setReason]=useState("");
  const pending=changeOrders.filter(co=>co.status==="Pending");
  const resolved=changeOrders.filter(co=>co.status!=="Pending");
  const linkedTodos=(coId)=>(todos||[]).filter(t=>t.linkedCOId===coId);
  const addCO=()=>{if(!desc.trim())return;const coId=uid();const co={id:coId,description:desc.trim(),cost:cost.trim(),reason:reason.trim(),status:"Pending",createdAt:td()};onUpdate([...changeOrders,co]);if(logAct)logAct("added change order",`"${desc.trim()}" for ${projectName}`);if(setTodos){const t={id:uid(),text:`CO: ${desc.trim()} — ${projectName}`,done:false,priority:"High",projectId:projectId||"",assignee:"",createdBy:user?.displayName||"System",createdAt:td(),doneAt:"",doneBy:"",linkedCOId:coId,linkedType:"changeOrder"};setTodos(v=>[t,...v]);}setDesc("");setCost("");setReason("");setAdding(false);};
  const updateStatus=(id,status)=>{onUpdate(changeOrders.map(co=>co.id===id?{...co,status,resolvedAt:status!=="Pending"?td():""}:co));if(logAct)logAct(`${status.toLowerCase()} change order`,`for ${projectName}`);};
  const delCO=(id)=>{onUpdate(changeOrders.filter(co=>co.id!==id));if(logAct)logAct("removed change order",projectName);};
  const hasPending=pending.length>0;
  return <div style={{...S.cd,borderLeft:`3px solid ${hasPending?C.rd:C.bd}`}}>
    <div style={{...S.fxsb,marginBottom:hasPending||resolved.length?10:0,alignItems:"center"}}>
      <div style={{...S.fxc,gap:8}}>
        {hasPending&&<span style={{fontSize:16}}>⚠</span>}
        <h4 style={{fontSize:13,fontWeight:700,margin:0,color:hasPending?C.rd:C.w}}>Change Orders{hasPending?` (${pending.length} Pending)`:""}</h4>
      </div>
      <button onClick={()=>setAdding(!adding)} style={{...S.bs,fontSize:10,padding:mob?"6px 10px":"4px 8px"}}>{adding?"Cancel":"+ Add"}</button>
    </div>
    {adding&&<div style={{background:C.bg,borderRadius:8,padding:mob?12:10,border:`1px solid ${C.bd}`,marginBottom:10}}>
      <input style={{...S.inp,fontSize:mob?13:12}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description (e.g. Window NOA revision needed)"/>
      <div style={{display:"flex",gap:6}}>
        <input style={{...S.inp,fontSize:mob?13:12,flex:1}} value={cost} onChange={e=>setCost(e.target.value)} placeholder="Cost impact (optional, e.g. 1500)"/>
        <input style={{...S.inp,fontSize:mob?13:12,flex:2}} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (optional)"/>
      </div>
      <button onClick={addCO} style={{...S.btn,width:"100%",padding:mob?"10px":"6px 14px"}}>Add Change Order</button>
    </div>}
    {pending.map(co=>{const lt=linkedTodos(co.id);return <div key={co.id} style={{background:C.rdb,borderRadius:8,padding:mob?"12px":"8px 10px",marginBottom:6,border:`1px solid ${C.rd}33`}}>
      <div style={{...S.fxsb,marginBottom:4}}><span style={{fontSize:mob?13:12,fontWeight:700,color:C.rd}}>{co.description}</span><span style={{fontSize:10,color:C.w3}}>{fmt(co.createdAt)}</span></div>
      {co.cost&&<div style={{fontSize:11,color:C.or,fontWeight:600,marginBottom:2}}>Cost: ${co.cost}</div>}
      {co.reason&&<div style={{fontSize:11,color:C.w3,marginBottom:4}}>{co.reason}</div>}
      {lt.length>0&&<div style={{marginTop:4,marginBottom:4}}>{lt.map(t=><div key={t.id} style={{fontSize:10,color:t.done?C.gr:C.rd,display:"flex",gap:4,alignItems:"center"}}><span>{t.done?"✓":"○"}</span><span style={{textDecoration:t.done?"line-through":"none"}}>{t.text}</span>{t.assignee&&<span style={{color:C.w3}}>— {t.assignee}</span>}</div>)}</div>}
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={()=>updateStatus(co.id,"Approved")} style={{...S.btn,fontSize:10,padding:mob?"6px 12px":"4px 10px",background:C.gr,color:C.bg}}>Approve</button>
        <button onClick={()=>updateStatus(co.id,"Completed")} style={{...S.btn,fontSize:10,padding:mob?"6px 12px":"4px 10px",background:C.bl}}>Complete</button>
        <button onClick={()=>delCO(co.id)} style={{...S.bs,fontSize:10,padding:mob?"6px 12px":"4px 10px",color:C.rd,marginLeft:"auto"}}>Delete</button>
      </div>
    </div>;})}
    {resolved.length>0&&<details style={{marginTop:pending.length?6:0}}>
      <summary style={{fontSize:11,color:C.w3,cursor:"pointer",padding:"4px 0"}}>Resolved ({resolved.length})</summary>
      {resolved.map(co=><div key={co.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`,opacity:0.6}}>
        <div style={{...S.fxsb,alignItems:"center"}}><span style={{fontSize:11,color:C.w2}}>{co.description}</span><div style={{...S.fx,gap:6,alignItems:"center"}}><span style={S.bg(co.status==="Approved"?C.grl:C.bll,co.status==="Approved"?C.gr:C.bl)}>{co.status}</span><button onClick={()=>updateStatus(co.id,"Pending")} style={{...S.bs,fontSize:9,padding:"3px 8px"}}>Reopen</button></div></div>
        {co.cost&&<span style={{fontSize:10,color:C.w3}}>${co.cost}</span>}
      </div>)}
    </details>}
    {!changeOrders.length&&!adding&&<p style={{fontSize:11,color:C.w3,margin:0}}>No change orders</p>}
  </div>;
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
          <div><div style={S.lb}>Date *</div><input style={{...S.inp,fontSize:14,padding:"10px 12px"}} type="date" value={r.date} onChange={e=>updRow(i,{date:e.target.value})}/></div>
          <div><div style={S.lb}>Permit #</div><input style={{...S.inp,fontSize:14,padding:"10px 12px"}} value={r.permitNum} onChange={e=>updRow(i,{permitNum:e.target.value})} placeholder="B25-05040"/></div>
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
  const allSc=["Structural","Plumbing","Electrical","Roofing","Windows & Doors","Mechanical"];
  const scC={Structural:"#A78BFA",Plumbing:C.bl,Electrical:C.rd,Roofing:"#FB923C","Windows & Doors":C.gr,Mechanical:"#FCD34D"};
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
  const allSc=["Structural","Plumbing","Electrical","Roofing","Windows & Doors","Mechanical"];
  const scC={Structural:"#A78BFA",Plumbing:C.bl,Electrical:C.rd,Roofing:"#FB923C","Windows & Doors":C.gr,Mechanical:"#FCD34D"};
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
function SchedTab({proj,sched,setSched,week,sWk,mob,logAct}){
  const[assignCrew,setAssignCrew]=useState(null);
  const ws=new Date(week+"T00:00:00");const days=Array.from({length:5},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d.toISOString().split("T")[0];});
  const active=[...proj].filter(p=>(p.status||"")!=="CLOSED").sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"}));
  const getAssign=(crewId,date)=>sched.filter(s=>s.crewId===crewId&&s.date===date);
  const addAssign=(crewId,date,projectId,notes)=>{setSched(v=>[...v,{id:uid(),crewId,date,projectId,notes:notes||""}]);const cr=CREWS.find(c=>c.id===crewId);const p=proj.find(x=>x.id===projectId);if(logAct)logAct("scheduled crew",`${cr?.name||crewId} → ${p?.clientName||"?"} on ${fmt(date)}`);};
  const rmAssign=(id)=>{const a=sched.find(s=>s.id===id);const cr=CREWS.find(c=>c.id===a?.crewId);const p=proj.find(x=>x.id===a?.projectId);if(logAct)logAct("removed crew assignment",`${cr?.name||"?"} from ${p?.clientName||"?"}`);setSched(v=>v.filter(s=>s.id!==id));};
  return <>
    <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}><div><h1 style={{fontSize:20,fontWeight:700,margin:0}}>CREW SCHEDULING</h1><p style={{fontSize:11,color:C.w3,marginTop:3}}>{fmt(days[0])} — {fmt(days[4])}</p></div></div>
    <div style={{...S.fx,gap:6,marginBottom:16}}><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()-7);sWk(d.toISOString().split("T")[0]);}}>←</button><button style={{...S.bs,color:C.bl}} onClick={()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);sWk(d.toISOString().split("T")[0]);}}>This Week</button><button style={S.bs} onClick={()=>{const d=new Date(ws);d.setDate(d.getDate()+7);sWk(d.toISOString().split("T")[0]);}}>→</button></div>

    {mob?
      days.map(d=>{const isT=d===td();const dayAssigns=sched.filter(s=>s.date===d);const crewsWithWork=CREWS.filter(cr=>dayAssigns.some(s=>s.crewId===cr.id));const crewsOff=CREWS.filter(cr=>{const a=getAssign(cr.id,d);return a.length>0&&a.every(x=>x.projectId==="OFF");});return <div key={d} style={{marginBottom:14}}>
        <div style={{background:isT?C.bll:C.b3,padding:"12px 14px",borderRadius:"8px 8px 0 0",display:"flex",alignItems:"center",gap:6}}>
          <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14,fontWeight:700,color:isT?C.bl:C.w}}>{fDay(d)}</span>{isT&&<span style={S.bg(C.bl,"#fff")}>TODAY</span>}</div><span style={{fontSize:11,color:isT?C.bl:C.w3}}>{fmt(d)}</span></div>
          <div style={{textAlign:"right"}}><span style={{fontSize:18,fontWeight:700,color:isT?C.bl:C.w}}>{dayAssigns.filter(a=>a.projectId!=="OFF").length}</span><div style={{fontSize:9,color:C.w3}}>assigned</div></div>
        </div>
        <div style={{background:C.b2,borderRadius:"0 0 8px 8px",overflow:"hidden",border:`1px solid ${C.bd}`,borderTop:"none"}}>
          {crewsWithWork.filter(cr=>!crewsOff.includes(cr)).map(cr=>{const assigns=getAssign(cr.id,d).filter(a=>a.projectId!=="OFF");return <div key={cr.id} style={{padding:"10px 12px",borderBottom:`1px solid ${C.bd}`}}>
            <div style={{...S.fxc,gap:6,marginBottom:6}}><div style={{width:10,height:10,borderRadius:"50%",background:cr.color}}/><span style={{fontSize:13,fontWeight:700,color:cr.color}}>{cr.name}</span></div>
            {assigns.map(a=>{const p=proj.find(x=>x.id===a.projectId);return(
              <div key={a.id} style={{background:cr.color+"14",border:`1px solid ${cr.color}33`,borderRadius:8,padding:"8px 12px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{p?.clientName||"?"}</div>{p?.city&&<div style={{fontSize:11,color:C.w3,marginTop:2}}>{p.city}{p.address&&p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</div>}{a.notes&&<div style={{fontSize:11,color:cr.color,marginTop:3,fontWeight:500}}>{a.notes}</div>}</div>
                <button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:14,padding:"6px",marginLeft:8}} onClick={()=>rmAssign(a.id)}>✕</button>
              </div>);})}
          </div>;})}
          {crewsOff.length>0&&<div style={{padding:"8px 12px",borderBottom:`1px solid ${C.bd}`,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}><span style={{fontSize:10,fontWeight:600,color:C.w3,marginRight:4}}>OFF:</span>{crewsOff.map(cr=><span key={cr.id} style={{fontSize:11,color:C.w3,background:C.w3+"18",padding:"3px 8px",borderRadius:4,display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:"50%",background:cr.color,display:"inline-block"}}/>{cr.name}<button style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:10,padding:"0 2px",marginLeft:2}} onClick={()=>{const a=getAssign(cr.id,d).find(x=>x.projectId==="OFF");if(a)rmAssign(a.id);}}>✕</button></span>)}</div>}
          {!crewsWithWork.length&&<div style={{padding:"14px",color:C.w3,fontSize:12,textAlign:"center"}}>No crews assigned</div>}
          <button style={{width:"100%",padding:"12px",border:"none",borderTop:`1px solid ${C.bd}`,background:"transparent",color:C.bl,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}} onClick={()=>setAssignCrew({crewId:null,date:d})}>+ Assign Crew</button>
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
                    <div><div style={{fontSize:11,fontWeight:600,color:C.w}}>{p?.clientName||"?"}</div>{p?.city&&<div style={{fontSize:9,color:C.w3}}>{p.city}{p.address&&p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</div>}{a.notes&&<div style={{fontSize:9,color:cr.color,marginTop:1}}>{a.notes}</div>}</div>
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
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`,background:C.b3,display:"flex",justifyContent:"space-between",alignItems:"center"}}><h3 style={{fontSize:13,fontWeight:700,margin:0}}>PAYROLL — {fmt(days[0])} to {fmt(days[4])}</h3>{hasWork&&<span style={{fontSize:16,fontWeight:700,color:C.bl}}>{totalDays} day{totalDays!==1?"s":""}</span>}</div>
        {!hasWork?<div style={{padding:"14px 16px",color:C.w3,fontSize:11}}>No assignments yet</div>:
        mob?<div>
          {payroll.filter(cr=>cr.daysWorked>0||cr.daysOff>0).map(cr=><div key={cr.id} style={{padding:"10px 14px",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:cr.color,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:cr.color}}>{cr.name}</div>
              <div style={{display:"flex",gap:4,marginTop:4}}>{days.map(d=>{const a=getAssign(cr.id,d);const worked=a.length>0&&!a.every(x=>x.projectId==="OFF");const off=a.length>0&&a.every(x=>x.projectId==="OFF");const dayLetter=["M","T","W","T","F"][days.indexOf(d)];return <div key={d} style={{width:32,height:32,borderRadius:6,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:worked?cr.color+"22":off?C.w3+"18":C.bg,border:`1px solid ${worked?cr.color+"44":off?C.w3+"33":C.bd}`}}><span style={{fontSize:8,fontWeight:600,color:C.w3,lineHeight:1}}>{dayLetter}</span><span style={{fontSize:10,fontWeight:700,color:worked?cr.color:off?C.w3:C.w3+"66",lineHeight:1}}>{worked?"\u2713":off?"off":"-"}</span></div>;})}</div>
            </div>
            <div style={{textAlign:"center",flexShrink:0}}><div style={{fontSize:20,fontWeight:700,color:cr.daysWorked>0?C.w:C.w3}}>{cr.daysWorked}</div><div style={{fontSize:8,color:C.w3,fontWeight:600}}>DAYS</div></div>
          </div>)}
        </div>:
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>
            <th style={{padding:"8px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:C.w3,letterSpacing:1}}>CREW</th>
            {days.map(d=><th key={d} style={{padding:"8px 4px",textAlign:"center",fontSize:9,fontWeight:600,color:C.w3,letterSpacing:0.5}}>{new Date(d+"T00:00:00").toLocaleDateString("en-US",{weekday:"short"}).toUpperCase()}</th>)}
            <th style={{padding:"8px 16px",textAlign:"center",fontSize:10,fontWeight:700,color:C.bl,letterSpacing:1}}>TOTAL</th>
            <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.w3,letterSpacing:1}}>CREW</th>
          </tr></thead>
          <tbody>
            {payroll.map((cr,idx)=><tr key={cr.id} style={{borderBottom:`1px solid ${C.bd}`,background:idx%2===0?"transparent":C.bg}}>
              <td style={{padding:"8px 16px",whiteSpace:"nowrap"}}><div style={{...S.fxc,gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:cr.color}}/><span style={{fontWeight:600,color:cr.color,fontSize:12}}>{cr.name}</span></div></td>
              {days.map(d=>{const a=getAssign(cr.id,d);const worked=a.length>0&&!a.every(x=>x.projectId==="OFF");const off=a.length>0&&a.every(x=>x.projectId==="OFF");return <td key={d} style={{padding:"8px 4px",textAlign:"center"}}>{worked?<span style={{fontSize:14}}>&#10003;</span>:off?<span style={{fontSize:10,color:C.w3,fontWeight:600}}>OFF</span>:<span style={{color:C.w3}}>—</span>}</td>;})}
              <td style={{padding:"8px 16px",textAlign:"center",fontWeight:700,fontSize:14,color:cr.daysWorked>0?C.w:C.w3}}>{cr.daysWorked}</td>
              <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}><span style={{fontSize:11,fontWeight:600,color:cr.color}}>{cr.name}</span></td>
            </tr>)}
            <tr style={{borderTop:`2px solid ${C.bd}`,background:C.b3}}>
              <td style={{padding:"10px 16px",fontWeight:700,fontSize:12}}>TOTAL</td>
              <td colSpan={days.length}></td>
              <td style={{padding:"10px 16px",textAlign:"center",fontWeight:700,fontSize:16,color:C.bl}}>{totalDays}</td>
              <td></td>
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
        <div style={{fontSize:10,color:C.w3}}>{p.city}{p.address&&p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</div>
      </div>)}
      {!fl.length&&<p style={{fontSize:11,color:C.w3,padding:8}}>No matching projects</p>}
    </div>
    <div style={S.lb}>Notes (optional)</div>
    <input style={S.inp} value={notes} onChange={e=>sN(e.target.value)} placeholder="e.g. framing, drywall, start at 7am"/>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={{...S.btn,opacity:pid?1:0.5}} onClick={()=>{if(pid)onPick(pid,notes);}}>Assign</button></div>
  </div>;
}
function LinksSection({links,onAdd,onDel,onUpdate,projectId,mob,logAct,projectName}){
  const[label,sL]=useState("");const[url,sU]=useState("");const[uploading,setUploading]=useState(false);const[progress,setProg]=useState(0);const[mode,setMode]=useState("upload");const[uploadErr,setUploadErr]=useState("");const[addCat,setAddCat]=useState("pre");const[addFolder,setAddFolder]=useState("");
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
            onAdd({label:file.name,url:dlUrl,storagePath:path,fileType:file.type,fileSize:file.size,category:addCat,folder:addFolder||""});if(logAct)logAct("uploaded file",`${file.name} to ${projectName}`);
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
  const add=()=>{if(label.trim()&&url.trim()){onAdd({label:label.trim(),url:url.trim(),category:addCat,folder:addFolder||""});sL("");sU("");}};
  const fmtSize=(b)=>{if(!b)return"";if(b<1024)return b+"B";if(b<1048576)return(b/1024).toFixed(1)+"KB";return(b/1048576).toFixed(1)+"MB";};
  const[newFolder,setNewFolder]=useState("");const[addFolderSide,setAddFolderSide]=useState(null);const[selFolder,setSelFolder]=useState(null);const[dragId,setDragId]=useState(null);const[dragOver,setDragOver]=useState(null);const[actionMenu,setActionMenu]=useState(null);
  const preFiles=links.filter(l=>(l.category||"pre")==="pre");
  const postFiles=links.filter(l=>l.category==="post");
  const getFolders=(files)=>{const folders=new Set();files.forEach(f=>{if(f.folder)folders.add(f.folder);});return[...folders].sort();};
  const preFolders=getFolders(preFiles);
  const postFolders=getFolders(postFiles);
  const createFolder=(cat)=>{if(newFolder.trim()){onAdd({label:".folder",url:"",category:cat,folder:newFolder.trim(),isFolder:true});setNewFolder("");setAddFolderSide(null);}};
  const dragIdRef=useRef(null);
  const onDragStart=(e,id)=>{dragIdRef.current=id;setDragId(id);e.dataTransfer.setData("text/plain",id);e.dataTransfer.effectAllowed="move";};
  const onDragEnd=()=>{dragIdRef.current=null;setDragId(null);setDragOver(null);};
  const dropToFolder=(e,folder,cat)=>{e.preventDefault();e.stopPropagation();setDragOver(null);const id=dragIdRef.current||e.dataTransfer.getData("text/plain");if(id){onUpdate(id,{folder:folder,category:cat});dragIdRef.current=null;setDragId(null);}};
  const dropToSide=(e,cat)=>{e.preventDefault();setDragOver(null);const id=dragIdRef.current||e.dataTransfer.getData("text/plain");if(id){onUpdate(id,{folder:"",category:cat});dragIdRef.current=null;setDragId(null);}};
  const onFolderDragOver=(e,key)=>{e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="move";setDragOver(key);};
  const truncName=(name,max)=>{if(!name||name.length<=max)return name;const ext=name.lastIndexOf(".")>0?name.slice(name.lastIndexOf(".")):"";;return name.slice(0,max-ext.length-1)+"…"+ext;};
  const renderFile=(lk,otherCat,folders)=>mob?
    <div key={lk.id} style={{background:C.b3,borderRadius:8,padding:"10px 12px",marginBottom:6}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>{icon(lk.label)}</span>
        <div style={{flex:1,minWidth:0}}>
          <a href={lk.url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:C.bl,fontWeight:600,textDecoration:"none",display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{truncName(lk.label,35)}</a>
          {lk.fileSize&&<span style={{fontSize:10,color:C.w3}}>{fmtSize(lk.fileSize)}</span>}
        </div>
        <button onClick={()=>setActionMenu(actionMenu===lk.id?null:lk.id)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,color:C.w2,cursor:"pointer",fontSize:14,padding:"4px 8px",minWidth:32,textAlign:"center"}}>⋯</button>
      </div>
      {actionMenu===lk.id&&<div style={{display:"flex",gap:6,marginTop:8,paddingTop:8,borderTop:`1px solid ${C.bd}`}}>
        <button onClick={()=>{onUpdate(lk.id,{category:otherCat});setActionMenu(null);}} style={{flex:1,padding:"8px 0",borderRadius:6,border:`1px solid ${C.bd}`,background:C.b2,color:C.w2,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>{otherCat==="post"?"Move to Post":"Move to Pre"}</button>
        <button onClick={()=>{handleDel(lk);setActionMenu(null);}} style={{padding:"8px 14px",borderRadius:6,border:"none",background:C.rdb,color:C.rd,cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>Delete</button>
      </div>}
    </div>
  :<div key={lk.id} draggable onDragStart={e=>onDragStart(e,lk.id)} onDragEnd={onDragEnd} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:`1px solid ${C.bd}`,cursor:"grab",opacity:dragId===lk.id?0.4:1}}>
    <span style={{fontSize:12}}>{icon(lk.label)}</span>
    <div style={{flex:1,minWidth:0}}>
      <a href={lk.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.bl,fontWeight:600,cursor:"pointer",textDecoration:"underline",wordBreak:"break-all"}}>{lk.label}</a>
      {lk.fileSize&&<span style={{fontSize:8,color:C.w3,marginLeft:4}}>{fmtSize(lk.fileSize)}</span>}
    </div>
    <button onClick={()=>onUpdate(lk.id,{category:otherCat})} title={otherCat==="post"?"Move to Post Approved":"Move to Pre Job"} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:4,color:C.w3,cursor:"pointer",fontSize:9,padding:"2px 5px",fontFamily:"inherit"}}>{otherCat==="post"?"→":"←"}</button>
    <button onClick={()=>handleDel(lk)} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:11,padding:"2px 4px"}}>✕</button>
  </div>;
  const renderSide=(files,folders,cat,otherCat,color,title)=>{
    const unfiled=files.filter(f=>!f.folder);
    return <div style={{background:C.bg,borderRadius:10,padding:mob?14:10,border:`1px solid ${C.bd}`}} onDragOver={mob?undefined:e=>{e.preventDefault();e.dataTransfer.dropEffect="move";if(!dragOver)setDragOver(cat+":unfiled");}} onDrop={mob?undefined:e=>dropToSide(e,cat)}>
      <div style={{...S.fxsb,marginBottom:10}}>
        <div style={{...S.fxc,gap:8}}><div style={{width:10,height:10,borderRadius:"50%",background:color}}/><span style={{fontSize:mob?13:11,fontWeight:700,color:color,letterSpacing:0.5}}>{title}</span><span style={{fontSize:mob?11:9,color:C.w3,background:C.b3,borderRadius:10,padding:"2px 8px"}}>({files.filter(f=>!f.isFolder).length})</span></div>
        <button onClick={()=>setAddFolderSide(cat)} style={{background:"none",border:`1px solid ${C.bd}`,borderRadius:6,color:C.w3,cursor:"pointer",fontSize:mob?11:9,padding:mob?"6px 10px":"2px 6px",fontFamily:"inherit"}}>+ Folder</button>
      </div>
      {addFolderSide===cat&&<div style={{...S.fx,gap:4,marginBottom:8}}>
        <input autoFocus style={{...S.inp,marginBottom:0,fontSize:mob?12:10,flex:1}} value={newFolder} onChange={e=>setNewFolder(e.target.value)} placeholder="Folder name..." onKeyDown={e=>{if(e.key==="Enter")createFolder(cat);}}/>
        <button style={{...S.btn,fontSize:mob?12:10,padding:mob?"6px 12px":"4px 8px"}} onClick={()=>createFolder(cat)}>Add</button>
        <button style={{...S.bs,fontSize:mob?12:10,padding:mob?"6px 12px":"4px 8px"}} onClick={()=>{setNewFolder("");setAddFolderSide(null);}}>✕</button>
      </div>}
      {folders.map(folder=>{const folderFiles=files.filter(f=>f.folder===folder&&!f.isFolder);const isOpen=selFolder===cat+":"+folder;const isDragTarget=dragOver===cat+":"+folder;return <div key={folder} style={{marginBottom:6}}>
        <div onClick={()=>setSelFolder(isOpen?null:cat+":"+folder)} onDragOver={mob?undefined:e=>onFolderDragOver(e,cat+":"+folder)} onDragLeave={mob?undefined:()=>setDragOver(null)} onDrop={mob?undefined:e=>dropToFolder(e,folder,cat)} style={{...S.fxc,gap:6,padding:mob?"8px 10px":"5px 8px",background:isDragTarget?color+"33":C.b3,borderRadius:6,cursor:"pointer",border:`2px solid ${isDragTarget?color:C.bd}`,transition:"background 0.15s, border 0.15s"}}>
          <span style={{fontSize:mob?14:11}}>{isOpen?"📂":"📁"}</span>
          <span style={{fontSize:mob?13:11,fontWeight:600,flex:1}}>{folder}</span>
          <span style={{fontSize:mob?11:9,color:C.w3}}>{folderFiles.length}</span>
          <button onClick={e=>{e.stopPropagation();onDel(links.find(l=>l.isFolder&&l.folder===folder&&(l.category||"pre")===cat)?.id);}} style={{background:"none",border:"none",color:C.w3,cursor:"pointer",fontSize:mob?12:9,padding:mob?"4px 6px":"0 2px"}}>✕</button>
        </div>
        {isOpen&&<div style={{paddingLeft:mob?10:8,borderLeft:`2px solid ${color}33`,marginLeft:mob?10:8,marginTop:4}}>
          {folderFiles.map(lk=>renderFile(lk,otherCat,folders))}
          {!folderFiles.length&&<p style={{fontSize:mob?11:9,color:C.w3,margin:"4px 0"}}>{mob?"No files in this folder":"Empty folder — drag files here"}</p>}
        </div>}
      </div>;})}
      {unfiled.filter(f=>!f.isFolder).length>0&&<>
        {folders.length>0&&<div style={{fontSize:mob?11:9,fontWeight:600,color:C.w3,marginTop:8,marginBottom:6,letterSpacing:0.5}}>UNFILED</div>}
        {unfiled.filter(f=>!f.isFolder).map(lk=>renderFile(lk,otherCat,folders))}
      </>}
      {files.filter(f=>!f.isFolder).length===0&&folders.length===0&&<p style={{fontSize:mob?12:10,color:C.w3,margin:0}}>No files yet</p>}
    </div>;
  };
  return <div style={S.cd}><h4 style={{fontSize:mob?15:13,fontWeight:700,marginBottom:12}}>Files & Links</h4>
    <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:mob?10:12,marginBottom:12}}>
      {renderSide(preFiles,preFolders,"pre","post",C.or,"PRE JOB")}
      {renderSide(postFiles,postFolders,"post","pre",C.gr,"POST APPROVED")}
    </div>
    <div style={{display:"flex",flexDirection:mob?"column":"row",gap:6,marginBottom:8,alignItems:mob?"stretch":"center"}}>
      <div style={{...S.fx,gap:6,alignItems:"center"}}>
        <span style={{fontSize:mob?12:10,color:C.w3}}>Add to:</span>
        <button onClick={()=>setAddCat("pre")} style={{...S.bs,fontSize:mob?12:10,padding:mob?"6px 14px":"3px 10px",background:addCat==="pre"?C.orb:"transparent",color:addCat==="pre"?C.or:C.w3,border:`1px solid ${addCat==="pre"?C.or:C.bd}`}}>Pre Job</button>
        <button onClick={()=>setAddCat("post")} style={{...S.bs,fontSize:mob?12:10,padding:mob?"6px 14px":"3px 10px",background:addCat==="post"?C.grl:"transparent",color:addCat==="post"?C.gr:C.w3,border:`1px solid ${addCat==="post"?C.gr:C.bd}`}}>Post Approved</button>
      </div>
      {(addCat==="pre"?preFolders:postFolders).length>0&&<select style={{...S.inp,marginBottom:0,fontSize:mob?12:10,width:mob?"100%":"auto",padding:mob?"8px 10px":"3px 8px"}} value={addFolder} onChange={e=>setAddFolder(e.target.value)}>
        <option value="">No folder</option>{(addCat==="pre"?preFolders:postFolders).map(f=><option key={f} value={f}>{f}</option>)}
      </select>}
    </div>
    <div style={{...S.fx,gap:6,marginBottom:8}}>
      <button onClick={()=>setMode("upload")} style={{...S.bs,fontSize:mob?12:10,padding:mob?"8px 14px":"4px 10px",background:mode==="upload"?C.bll:"transparent",color:mode==="upload"?C.bl:C.w3,border:`1px solid ${mode==="upload"?C.bl:C.bd}`,flex:mob?1:undefined}}>Upload File</button>
      <button onClick={()=>setMode("link")} style={{...S.bs,fontSize:mob?12:10,padding:mob?"8px 14px":"4px 10px",background:mode==="link"?C.bll:"transparent",color:mode==="link"?C.bl:C.w3,border:`1px solid ${mode==="link"?C.bl:C.bd}`,flex:mob?1:undefined}}>Paste Link</button>
    </div>
    {mode==="upload"&&<div>
      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:mob?18:14,borderRadius:10,border:`2px dashed ${C.bd}`,cursor:uploading?"default":"pointer",color:C.w3,fontSize:mob?14:12,background:C.bg}}>
        <input type="file" multiple style={{display:"none"}} onChange={handleUpload} disabled={uploading}/>
        {uploading?<span style={{color:C.bl}}>Uploading... {progress}%</span>:<span>{mob?"Tap to choose files":"Click to choose files (permits, photos, plans)"}</span>}
      </label>
      {uploading&&<div style={{height:4,background:C.bd,borderRadius:2,marginTop:8,overflow:"hidden"}}><div style={{height:"100%",background:C.bl,borderRadius:2,width:`${progress}%`,transition:"width 0.2s"}}/></div>}
      {uploadErr&&<div style={{fontSize:mob?12:11,color:C.rd,marginTop:6,padding:mob?10:8,background:C.rdb,borderRadius:6,wordBreak:"break-all"}}>{uploadErr}</div>}
    </div>}
    {mode==="link"&&<div style={{display:"flex",flexDirection:mob?"column":"row",gap:6}}>
      <input style={{...S.inp,marginBottom:0,flex:1,fontSize:mob?14:12,padding:mob?"10px 12px":"8px 12px"}} value={label} onChange={e=>sL(e.target.value)} placeholder="Label (e.g. Building Permit)"/>
      <input style={{...S.inp,marginBottom:0,flex:2,fontSize:mob?14:12,padding:mob?"10px 12px":"8px 12px"}} value={url} onChange={e=>sU(e.target.value)} placeholder="Paste link (Google Drive, etc.)" onKeyDown={e=>{if(e.key==="Enter")add();}}/>
      <button style={{...S.btn,fontSize:mob?14:12,padding:mob?"10px 14px":"6px 14px"}} onClick={add}>Add</button>
    </div>}
  </div>;
}
const CITIES=["Davie","Deerfield Beach","Fort Lauderdale","Hollywood","Margate","Miramar","Pembroke Pines","Plantation","Pompano Beach","Sunrise","Tamarac","West Park","Weston","Broward County"];
const PERMIT_TYPES=["Building","Electrical","Mechanical","Plumbing","Roofing"];
const PERMIT_STATUSES=["Not Submitted","Submitted","In Review","Comments Received","Approved","Issued","Closed"];
const SPEC_WRITERS=["Lamar","Tanner","Habitat","CRA","Beth","Jay","Jim","Jenn","SOFI","Igo","Tabber"];
const pStatColor=s=>s==="Issued"||s==="Approved"?C.gr:s==="Comments Received"?C.rd:s==="In Review"||s==="Submitted"?C.or:s==="Closed"?C.w3:"#22D3EE";

function PermitsTab({proj,permits,setPermits,pg,setPg,mob,logAct,companyDocs,setCompanyDocs,user}){
  const[selProj,setSelProj]=useState(null);
  const[modal,sM]=useState(null);
  const[search,sSr]=useState("");
  const[addingComment,setAddingComment]=useState(null);
  const[showDocs,setShowDocs]=useState(false);

  const active=[...proj].filter(p=>(p.status||"")!=="CLOSED").sort((a,b)=>a.clientName.localeCompare(b.clientName,undefined,{sensitivity:"base"}));
  const projPermits=pid=>permits.filter(p=>p.projectId===pid);
  const unresolvedFor=pid=>{let c=0;projPermits(pid).forEach(pm=>(pm.comments||[]).forEach(cm=>{if(cm.responseStatus==="Not Started"||cm.responseStatus==="In Progress")c++;}));return c;};

  // Project detail view - show all permits for one project
  if(selProj){
    const p=proj.find(x=>x.id===selProj);
    if(!p)return null;
    const pPerms=projPermits(selProj);
    return <>
      <button style={{...S.bs,marginBottom:14}} onClick={()=>setSelProj(null)}>← All Projects</button>
      <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <h1 style={{fontSize:mob?16:20,fontWeight:700,margin:0}}>{p.clientName}</h1>
          <p style={{fontSize:12,color:C.w3,marginTop:3}}>{p.city}{p.address&&p.address!=="TBD"?<> · <AddrLink a={p.address} c={p.city}/></>:""}</p>
        </div>
        <button style={S.btn} onClick={()=>sM("addPermit")}>+ Add Permit</button>
      </div>

      {pPerms.length===0&&<div style={{...S.cd,textAlign:"center",padding:30}}><p style={{color:C.w3,fontSize:13}}>No permits yet for this project</p><button style={{...S.btn,marginTop:8}} onClick={()=>sM("addPermit")}>+ Add First Permit</button></div>}

      {pPerms.map(pm=>{
        const stC=pStatColor(pm.status);
        const comments=pm.comments||[];
        const unresolved=comments.filter(c=>c.responseStatus==="Not Started"||c.responseStatus==="In Progress").length;
        return <div key={pm.id} style={{...S.cd,marginBottom:12,borderLeft:`3px solid ${stC}`}}>
          {/* Permit header */}
          <div style={{...S.fxsb,marginBottom:8,flexWrap:"wrap",gap:6}}>
            <div style={{...S.fxc,gap:8}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:stC}}/>
              <div>
                <div style={{fontSize:14,fontWeight:700}}>{pm.permitType}</div>
                <div style={{fontSize:11,color:C.bl}}>{pm.permitNumber||"No permit # yet"}</div>
              </div>
            </div>
            <div style={{...S.fxc,gap:6}}>
              <span style={{fontSize:10,fontWeight:600,color:stC}}>{pm.status}</span>
              {unresolved>0&&<span style={S.bg(C.rdb,C.rd)}>{unresolved} need response</span>}
            </div>
          </div>

          {/* Quick info row */}
          <div style={{...S.fx,gap:14,flexWrap:"wrap",marginBottom:10,fontSize:12,color:C.w3}}>
            {pm.specWriter&&<span>Spec: <b style={{color:C.w2}}>{pm.specWriter}</b></span>}
            {pm.dateSubmitted&&<span>Submitted: <b style={{color:C.w2}}>{fmt(pm.dateSubmitted)}</b></span>}
            {pm.dateApproved&&<span>Approved: <b style={{color:C.gr}}>{fmt(pm.dateApproved)}</b></span>}
            {pm.portalUrl&&<a href={pm.portalUrl} target="_blank" rel="noopener noreferrer" style={{color:C.bl,cursor:"pointer",textDecoration:"underline"}}>City Portal</a>}
          </div>

          {/* Inline edit row */}
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"auto auto auto auto",gap:6,marginBottom:8,alignItems:"center"}}>
            <input style={{...S.inp,marginBottom:0,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}} value={pm.permitNumber||""} onChange={e=>{const v=e.target.value;setPermits(pr=>pr.map(x=>x.id===pm.id?{...x,permitNumber:v}:x));}} placeholder="Permit #"/>
            <select style={{...S.inp,marginBottom:0,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}} value={pm.status} onChange={e=>{const v=e.target.value;setPermits(pr=>pr.map(x=>x.id===pm.id?{...x,status:v}:x));if(logAct)logAct("updated permit status",`${pm.clientName} ${pm.permitType||"permit"} → ${v}`);}}>
              {PERMIT_STATUSES.map(st=><option key={st} value={st}>{st}</option>)}
            </select>
            <select style={{...S.inp,marginBottom:0,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}} value={pm.specWriter||""} onChange={e=>{const v=e.target.value;setPermits(pr=>pr.map(x=>x.id===pm.id?{...x,specWriter:v}:x));}}>
              <option value="">Spec Writer</option>{SPEC_WRITERS.map(w=><option key={w} value={w}>{w}</option>)}
            </select>
            <button onClick={()=>{if(logAct)logAct("deleted permit",`${pm.permitType||"permit"} for ${pm.clientName}`);setPermits(v=>v.filter(x=>x.id!==pm.id));}} style={{...S.bs,color:C.rd,fontSize:mob?13:11,padding:mob?"10px":"6px 10px"}}>Delete</button>
          </div>

          {/* Comments */}
          {comments.length>0&&<div style={{background:C.bg,borderRadius:8,padding:8,marginBottom:8,border:`1px solid ${C.bd}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.w3,marginBottom:6,letterSpacing:0.5}}>CITY COMMENTS</div>
            {comments.map(cm=>{
              const rsC=cm.responseStatus==="Resolved"?C.gr:cm.responseStatus==="Responded"?C.bl:cm.responseStatus==="In Progress"?C.or:C.rd;
              return <div key={cm.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.bd}`}}>
                <div style={{...S.fxsb}}><span style={{fontSize:11,fontWeight:600}}>{cm.reviewer||"Reviewer"} · {fmt(cm.date)}</span>
                  <div style={{...S.fxc,gap:4}}>
                    <select value={cm.responseStatus} onChange={e=>{const ns=e.target.value;setPermits(v=>v.map(x=>x.id===pm.id?{...x,comments:x.comments.map(cc=>cc.id===cm.id?{...cc,responseStatus:ns}:cc)}:x));}} style={{...S.inp,marginBottom:0,padding:mob?"6px 8px":"2px 6px",fontSize:mob?12:9,width:"auto"}}>
                      {["Not Started","In Progress","Responded","Resolved"].map(rs=><option key={rs} value={rs}>{rs}</option>)}
                    </select>
                    <div style={{width:6,height:6,borderRadius:"50%",background:rsC}}/>
                    <button onClick={()=>setPermits(v=>v.map(x=>x.id===pm.id?{...x,comments:x.comments.filter(cc=>cc.id!==cm.id)}:x))} style={{background:"none",border:"none",color:C.rd,cursor:"pointer",fontSize:10}}>✕</button>
                  </div>
                </div>
                <p style={{fontSize:12,color:C.w2,margin:"3px 0",lineHeight:1.4}}>{cm.commentText}</p>
                {cm.responseNotes&&<p style={{fontSize:10,color:C.bl,margin:0}}>↳ {cm.responseNotes}</p>}
              </div>;
            })}
          </div>}

          {/* Add comment inline */}
          {addingComment===pm.id?<div style={{background:C.bg,borderRadius:8,padding:mob?12:10,border:`1px solid ${C.bl}`}}>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr auto",gap:6,marginBottom:6}}>
              <input id={"cmr-"+pm.id} style={{...S.inp,marginBottom:0,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}} placeholder="Reviewer name"/>
              <input id={"cmd-"+pm.id} type="date" defaultValue={td()} style={{...S.inp,marginBottom:0,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}}/>
            </div>
            <textarea id={"cmt-"+pm.id} style={{...S.inp,marginBottom:6,fontSize:mob?14:11,minHeight:mob?60:50,resize:"vertical",padding:mob?"10px 12px":"8px 12px"}} placeholder="What did the city say?"/>
            <input id={"cmn-"+pm.id} style={{...S.inp,marginBottom:6,fontSize:mob?14:11,padding:mob?"10px 12px":"8px 12px"}} placeholder="Your response (optional)"/>
            <div style={{...S.fx,gap:6,justifyContent:"flex-end"}}>
              <button style={S.bs} onClick={()=>setAddingComment(null)}>Cancel</button>
              <button style={S.btn} onClick={()=>{
                const r=document.getElementById("cmr-"+pm.id)?.value||"";
                const d=document.getElementById("cmd-"+pm.id)?.value||td();
                const t=document.getElementById("cmt-"+pm.id)?.value||"";
                const n=document.getElementById("cmn-"+pm.id)?.value||"";
                if(!t.trim())return;
                setPermits(v=>v.map(x=>x.id===pm.id?{...x,status:x.status==="In Review"||x.status==="Submitted"?"Comments Received":x.status,comments:[...(x.comments||[]),{id:uid(),date:d,reviewer:r,commentText:t.trim(),responseStatus:n?"Responded":"Not Started",responseNotes:n,responseDate:n?td():""}]}:x));
                setAddingComment(null);
              }}>Save Comment</button>
            </div>
          </div>:
          <button onClick={()=>setAddingComment(pm.id)} style={{...S.bs,fontSize:11,width:"100%",padding:"8px",textAlign:"center"}}>+ Add City Comment</button>}
        </div>;
      })}

      {/* Add Permit Modal */}
      {modal==="addPermit"&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",zIndex:1000}} onClick={()=>sM(null)}><div style={{background:C.b2,borderRadius:mob?"14px 14px 0 0":14,padding:mob?"20px 16px":28,width:"100%",maxWidth:mob?"100%":540,maxHeight:mob?"90vh":"80vh",overflow:"auto",border:`1px solid ${C.bd}`}} onClick={e=>e.stopPropagation()}>
        <div style={{...S.fxsb,marginBottom:12}}><h2 style={{fontSize:16,fontWeight:700,margin:0}}>Add Permit — {p.clientName}</h2><button onClick={()=>sM(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:16}}>✕</button></div>
        <QuickPermitForm city={p.city} ok={pm=>{setPermits(v=>[...v,{...pm,id:uid(),projectId:selProj,clientName:p.clientName,city:p.city||pm.city,comments:[],files:[],actionNeeded:false,createdAt:td(),updatedAt:td()}]);if(logAct)logAct("added permit",`${pm.permitType||"permit"} for ${p.clientName}`);sM(null);}}/>
      </div></div>}
    </>;
  }

  // Main list — grouped by project
  const projsWithPermits=active.filter(p=>projPermits(p.id).length>0);
  const projsWithout=active.filter(p=>projPermits(p.id).length===0);
  const searchFl=p=>{if(!search)return true;const s=search.toLowerCase();return p.clientName.toLowerCase().includes(s)||p.city.toLowerCase().includes(s)||(p.address||"").toLowerCase().includes(s);};

  return <>
    <div style={{...S.fxsb,marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div><h1 style={{fontSize:mob?16:24,fontWeight:700,margin:0}}>PERMITS</h1><p style={{fontSize:11,color:C.w3,marginTop:3}}>{permits.length} permits across {projsWithPermits.length} projects</p></div>
      <button style={{...S.bs,padding:mob?"10px 14px":"8px 16px",fontSize:mob?13:13,background:showDocs?C.bll:C.b2,color:showDocs?C.bl:C.w2,borderColor:showDocs?C.bl:C.bd}} onClick={()=>setShowDocs(!showDocs)}>📁 Company Docs ({companyDocs.filter(d=>!d.isFolder).length})</button>
    </div>
    {showDocs&&<CompanyDocsSection docs={companyDocs} setDocs={setCompanyDocs} mob={mob} user={user} logAct={logAct}/>}
    <input style={{...S.inp,maxWidth:mob?"100%":300,fontSize:mob?16:12,padding:mob?"12px 14px":"8px 12px"}} value={search} onChange={e=>sSr(e.target.value)} placeholder="Search projects..."/>

    {/* Projects with permits */}
    {projsWithPermits.filter(searchFl).map(p=>{
      const pPerms=projPermits(p.id);
      const unresolved=unresolvedFor(p.id);
      const statuses=pPerms.map(pm=>pm.status);
      const hasComments=statuses.includes("Comments Received");
      return <div key={p.id} style={{...S.cd,marginBottom:10,cursor:"pointer",borderLeft:`3px solid ${hasComments?C.rd:unresolved?C.or:C.bl}`}} onClick={()=>setSelProj(p.id)}>
        <div style={{...S.fxsb,marginBottom:4}}>
          <div>
            <span style={{fontSize:14,fontWeight:700}}>{p.clientName}</span>
            <span style={{fontSize:11,color:C.w3,marginLeft:8}}>{p.city}</span>
          </div>
          <div style={{...S.fxc,gap:6}}>
            {unresolved>0&&<span style={S.bg(C.rdb,C.rd)}>{unresolved} unresolved</span>}
            <span style={{fontSize:11,color:C.bl,fontWeight:600}}>{pPerms.length} permit{pPerms.length!==1?"s":""} →</span>
          </div>
        </div>
        <div style={{...S.fx,gap:6,flexWrap:"wrap"}}>{pPerms.map(pm=>{const stC=pStatColor(pm.status);return <span key={pm.id} style={{...S.bg(stC+"22",stC),fontSize:10,padding:"3px 8px"}}>{pm.permitType}{pm.permitNumber?` · ${pm.permitNumber}`:""} — {pm.status}</span>;})}</div>
      </div>;
    })}

    {/* Projects without permits */}
    {projsWithout.filter(searchFl).length>0&&<>
      <div style={{fontSize:11,fontWeight:700,color:C.w3,letterSpacing:1,marginTop:16,marginBottom:8}}>PROJECTS WITHOUT PERMITS ({projsWithout.filter(searchFl).length})</div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:8}}>
        {projsWithout.filter(searchFl).map(p=><div key={p.id} style={{...S.cd,cursor:"pointer",padding:"10px 14px"}} onClick={()=>setSelProj(p.id)}>
          <div style={{fontSize:13,fontWeight:600}}>{p.clientName}</div>
          <div style={{fontSize:10,color:C.w3}}>{p.city}</div>
        </div>)}
      </div>
    </>}
  </>;
}

function QuickPermitForm({city,ok}){
  const[f,s]=useState({permitType:"Building",permitNumber:"",status:"Not Submitted",specWriter:"",dateSubmitted:td(),portalUrl:"",city:city||""});
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <div><div style={S.lb}>Permit Type *</div><select style={S.inp} value={f.permitType} onChange={e=>s({...f,permitType:e.target.value})}>{PERMIT_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      <div><div style={S.lb}>Permit #</div><input style={S.inp} value={f.permitNumber} onChange={e=>s({...f,permitNumber:e.target.value})} placeholder="B25-04632"/></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <div><div style={S.lb}>Status</div><select style={S.inp} value={f.status} onChange={e=>s({...f,status:e.target.value})}>{PERMIT_STATUSES.map(st=><option key={st} value={st}>{st}</option>)}</select></div>
      <div><div style={S.lb}>Spec Writer</div><select style={S.inp} value={f.specWriter} onChange={e=>s({...f,specWriter:e.target.value})}><option value="">None</option>{SPEC_WRITERS.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      <div><div style={S.lb}>Date Submitted</div><input style={S.inp} type="date" value={f.dateSubmitted} onChange={e=>s({...f,dateSubmitted:e.target.value})}/></div>
      <div><div style={S.lb}>City</div><select style={S.inp} value={f.city} onChange={e=>s({...f,city:e.target.value})}><option value="">Select...</option>{CITIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    </div>
    <div style={S.lb}>Portal URL</div>
    <input style={S.inp} value={f.portalUrl} onChange={e=>s({...f,portalUrl:e.target.value})} placeholder="https://..."/>
    <div style={{...S.fx,justifyContent:"flex-end"}}><button style={S.btn} onClick={()=>ok(f)}>Add Permit</button></div>
  </div>;
}

function CompanyDocsSection({docs,setDocs,mob,user,logAct}){
  const CATS=[{id:"noa",label:"NOAs",color:C.bl},{id:"insurance",label:"Insurance",color:C.gr},{id:"license",label:"Licenses",color:"#FCD34D"},{id:"template",label:"Templates",color:"#A78BFA"},{id:"other",label:"Other",color:C.w3}];
  const[cat,setCat]=useState("noa");const[search,setSearch]=useState("");const[uploading,setUploading]=useState(false);const[progress,setProg]=useState(0);const[uploadErr,setUploadErr]=useState("");
  const me=user?.displayName||"User";
  const icon=l=>{const k=(l||"").toLowerCase();if(k.match(/\.(jpg|jpeg|png|gif|webp|heic)$/))return"📷";if(k.match(/\.(pdf)$/))return"📋";if(k.match(/\.(doc|docx)$/))return"📝";if(k.match(/\.(xls|xlsx|csv)$/))return"📊";return"📄";};
  const fmtSize=(b)=>{if(!b)return"";if(b<1024)return b+"B";if(b<1048576)return(b/1024).toFixed(1)+"KB";return(b/1048576).toFixed(1)+"MB";};
  const handleUpload=async(e)=>{
    const files=e.target.files;if(!files||!files.length)return;
    setUploading(true);setUploadErr("");
    for(let i=0;i<files.length;i++){
      const file=files[i];
      const path=`company/${cat}/${Date.now()}_${file.name}`;
      const sRef=ref(storage,path);
      try{
        const task=uploadBytesResumable(sRef,file);
        await new Promise((resolve,reject)=>{
          task.on("state_changed",(snap)=>{setProg(Math.round((snap.bytesTransferred/snap.totalBytes)*100));},(err)=>{reject(err);},async()=>{
            const dlUrl=await getDownloadURL(task.snapshot.ref);
            setDocs(v=>[...v,{id:uid(),label:file.name,url:dlUrl,storagePath:path,fileType:file.type,fileSize:file.size,category:cat,uploadedBy:me,uploadedAt:td()}]);
            if(logAct)logAct("uploaded company doc",`${file.name} (${cat})`);
            resolve();
          });
        });
      }catch(err){setUploadErr(err.code+": "+err.message);}
    }
    setUploading(false);setProg(0);e.target.value="";
  };
  const handleDel=async(d)=>{
    if(!window.confirm(`Delete "${d.label}"?`))return;
    if(d.storagePath){try{await deleteObject(ref(storage,d.storagePath));}catch(e){console.error("Delete error:",e);}}
    setDocs(v=>v.filter(x=>x.id!==d.id));
    if(logAct)logAct("deleted company doc",d.label);
  };
  const filtered=docs.filter(d=>d.category===cat&&(!search||d.label.toLowerCase().includes(search.toLowerCase())));
  const catColor=CATS.find(c=>c.id===cat)?.color||C.bl;
  return <div style={{...S.cd,marginBottom:16,borderLeft:`3px solid ${catColor}`}}>
    <div style={{...S.fxsb,marginBottom:12,alignItems:"center",flexWrap:"wrap",gap:8}}>
      <h3 style={{fontSize:mob?14:16,fontWeight:700,margin:0}}>📁 Company Documents</h3>
      <label style={{...S.btn,padding:mob?"10px 14px":"8px 16px",fontSize:mob?13:13,cursor:uploading?"default":"pointer",opacity:uploading?0.6:1,display:"inline-block"}}>
        {uploading?`Uploading... ${progress}%`:"+ Upload File"}
        <input type="file" multiple onChange={handleUpload} disabled={uploading} style={{display:"none"}}/>
      </label>
    </div>
    <div style={{...S.fx,gap:6,marginBottom:12,flexWrap:"wrap"}}>
      {CATS.map(c=>{const count=docs.filter(d=>d.category===c.id).length;return <button key={c.id} onClick={()=>setCat(c.id)} style={{...S.bs,padding:mob?"10px 14px":"8px 14px",fontSize:mob?13:12,background:cat===c.id?c.color+"22":"transparent",color:cat===c.id?c.color:C.w3,borderColor:cat===c.id?c.color:C.bd}}>{c.label} ({count})</button>;})}
    </div>
    <input style={{...S.inp,fontSize:mob?16:13,padding:mob?"12px 14px":"10px 14px"}} value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${CATS.find(c=>c.id===cat)?.label}...`}/>
    {uploadErr&&<div style={{fontSize:11,color:C.rd,marginBottom:8}}>{uploadErr}</div>}
    {!filtered.length&&<p style={{fontSize:13,color:C.w3,margin:"12px 0 0",textAlign:"center"}}>No {CATS.find(c=>c.id===cat)?.label.toLowerCase()} uploaded yet.</p>}
    {filtered.length>0&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:8,marginTop:4}}>
      {filtered.sort((a,b)=>(b.uploadedAt||"").localeCompare(a.uploadedAt||"")).map(d=><div key={d.id} style={{background:C.bg,borderRadius:8,padding:mob?12:14,border:`1px solid ${C.bd}`,display:"flex",alignItems:"flex-start",gap:10}}>
        <span style={{fontSize:24,flexShrink:0}}>{icon(d.label)}</span>
        <div style={{flex:1,minWidth:0}}>
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{fontSize:mob?14:13,color:C.bl,fontWeight:600,textDecoration:"none",wordBreak:"break-word",display:"block"}}>{d.label}</a>
          <div style={{fontSize:11,color:C.w3,marginTop:3}}>{fmtSize(d.fileSize)} · {d.uploadedBy||"?"} · {fmt(d.uploadedAt)}</div>
        </div>
        <button onClick={()=>handleDel(d)} style={{background:"none",border:"none",color:C.w3,cursor:"pointer",fontSize:mob?16:14,padding:"4px 6px",flexShrink:0}}>✕</button>
      </div>)}
    </div>}
  </div>;
}

function TodoTab({todos,setTodos,proj,mob,logAct,user}){
  const[text,setText]=useState("");const[project,setProject]=useState("");const[priority,setPriority]=useState("Normal");const[filter,setFilter]=useState("active");const[linkTo,setLinkTo]=useState("");
  const me=user.displayName||"User";
  const allLinks=[];
  proj.forEach(p=>{(p.revisions||[]).filter(r=>r.status!=="Resolved").forEach(r=>allLinks.push({type:"revision",id:r.id,label:`Revision: ${r.description} — ${p.clientName}`,projectId:p.id}));(p.changeOrders||[]).filter(co=>co.status==="Pending").forEach(co=>allLinks.push({type:"changeOrder",id:co.id,label:`CO: ${co.description} — ${p.clientName}`,projectId:p.id}));});
  const add=()=>{if(!text.trim())return;const link=allLinks.find(l=>`${l.type}:${l.id}`===linkTo);const t={id:uid(),text:text.trim(),done:false,priority,projectId:link?link.projectId:(project||""),assignee:"",createdBy:me,createdAt:td(),doneAt:"",doneBy:"",linkedRevId:link&&link.type==="revision"?link.id:"",linkedCOId:link&&link.type==="changeOrder"?link.id:"",linkedType:link?link.type:""};setTodos(v=>[t,...v]);logAct("added todo",text.trim());setText("");setProject("");setPriority("Normal");setLinkTo("");};
  const toggle=(id)=>setTodos(v=>v.map(t=>t.id===id?{...t,done:!t.done,doneAt:!t.done?td():"",doneBy:!t.done?me:""}:t));
  const take=(id)=>setTodos(v=>v.map(t=>t.id===id?{...t,assignee:t.assignee===me?"":me}:t));
  const del=(id)=>{const t=todos.find(x=>x.id===id);setTodos(v=>v.filter(x=>x.id!==id));if(t)logAct("deleted todo",t.text);};
  const filtered=filter==="active"?todos.filter(t=>!t.done):filter==="done"?todos.filter(t=>t.done):todos;
  const priColor={High:C.rd,Normal:C.bl,Low:C.w3};
  const sortedTodos=[...filtered].sort((a,b)=>{if(a.done!==b.done)return a.done?1:-1;const po={High:0,Normal:1,Low:2};return(po[a.priority]||1)-(po[b.priority]||1);});
  const activeCount=todos.filter(t=>!t.done).length;const doneCount=todos.filter(t=>t.done).length;
  return <>
    <div style={{...S.fxsb,marginBottom:16,alignItems:"center",flexWrap:"wrap",gap:8}}>
      <h1 style={{fontSize:mob?16:24,fontWeight:700,margin:0}}>To Do <span style={{fontSize:14,fontWeight:500,color:C.w3}}>({activeCount} open)</span></h1>
    </div>
    <div style={{...S.cd,marginBottom:16}}>
      <input style={{...S.inp,marginBottom:8,fontSize:mob?16:12,padding:mob?"12px 14px":"8px 12px"}} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")add();}} placeholder="What needs to be done?"/>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"auto auto 1fr auto",gap:8,alignItems:"center"}}>
        <select style={{...S.inp,marginBottom:0,fontSize:mob?14:12,padding:mob?"10px 12px":"8px 12px"}} value={priority} onChange={e=>setPriority(e.target.value)}>
          <option value="High">High</option><option value="Normal">Normal</option><option value="Low">Low</option>
        </select>
        <select style={{...S.inp,marginBottom:0,fontSize:mob?14:12,padding:mob?"10px 12px":"8px 12px"}} value={project} onChange={e=>setProject(e.target.value)}>
          <option value="">No project</option>
          {[...proj].sort((a,b)=>a.clientName.localeCompare(b.clientName)).map(p=><option key={p.id} value={p.id}>{p.clientName}</option>)}
        </select>
        <button style={{...S.btn,padding:mob?"12px 14px":"6px 14px",fontSize:mob?14:12,gridColumn:mob?"1 / -1":"auto"}} onClick={add}>Add To Do</button>
      </div>
      {allLinks.length>0&&<select style={{...S.inp,marginBottom:0,marginTop:8,fontSize:mob?14:12,padding:mob?"10px 12px":"8px 12px"}} value={linkTo} onChange={e=>setLinkTo(e.target.value)}>
        <option value="">Link to revision or change order (optional)</option>
        {allLinks.map(l=><option key={`${l.type}:${l.id}`} value={`${l.type}:${l.id}`}>{l.label}</option>)}
      </select>}
    </div>
    <div style={{...S.fx,gap:6,marginBottom:14}}>
      {[["active","Active ("+activeCount+")"],["done","Done ("+doneCount+")"],["all","All"]].map(([k,lb])=>
        <button key={k} onClick={()=>setFilter(k)} style={{...S.bs,background:filter===k?C.bll:"transparent",color:filter===k?C.bl:C.w3,borderColor:filter===k?C.bl:C.bd,padding:mob?"10px 14px":"6px 14px",fontSize:mob?13:12}}>{lb}</button>
      )}
    </div>
    {!sortedTodos.length&&<p style={{color:C.w3,fontSize:mob?14:13}}>{filter==="done"?"No completed items.":"Nothing to do — nice!"}</p>}
    <div style={{paddingBottom:mob?70:0}}>
    {sortedTodos.map(t=>{const pj=proj.find(x=>x.id===t.projectId);return <div key={t.id} style={{...S.cd,marginBottom:8,opacity:t.done?0.55:1,padding:mob?"14px 12px":16}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:mob?14:12}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:mob?15:13,fontWeight:600,textDecoration:t.done?"line-through":"none",color:t.done?C.w3:C.w,wordBreak:"break-word",lineHeight:1.4}}>{t.text}</div>
          <div style={{...S.fx,gap:6,marginTop:mob?6:4,flexWrap:"wrap",alignItems:"center"}}>
            <span style={S.bg(t.priority==="High"?C.rdb:t.priority==="Low"?"transparent":C.bll,priColor[t.priority])}>{t.priority}</span>
            {pj&&<span style={S.bg(C.bll,C.bl)}>{pj.clientName}</span>}
            {t.assignee&&<span style={S.bg(C.grl,C.gr)}>👤 {t.assignee}</span>}
            {t.linkedType==="revision"&&<span style={S.bg(C.orb,C.or)}>↺ Revision</span>}
            {t.linkedType==="changeOrder"&&<span style={S.bg(C.rdb,C.rd)}>⚠ CO</span>}
            <span style={{fontSize:mob?11:10,color:C.w3}}>{t.createdBy} · {fmt(t.createdAt)}{t.doneAt?` · Done by ${t.doneBy||"?"} ${fmt(t.doneAt)}`:""}</span>
          </div>
        </div>
        <button onClick={()=>del(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.w3,fontSize:mob?18:14,padding:mob?"6px 10px":"2px 6px",flexShrink:0}}>✕</button>
      </div>
      <div style={{...S.fx,gap:8,marginTop:mob?10:8}}>
        {!t.done&&<button onClick={()=>take(t.id)} style={{...S.bs,flex:1,padding:mob?"10px 0":"6px 0",fontSize:mob?13:12,background:t.assignee===me?C.grl:"transparent",color:t.assignee===me?C.gr:C.w2,borderColor:t.assignee===me?C.gr:C.bd}}>{t.assignee===me?"Assigned to me":t.assignee?`Take from ${t.assignee}`:"Take Task"}</button>}
        <button onClick={()=>toggle(t.id)} style={{...S.btn,flex:1,padding:mob?"10px 0":"6px 0",fontSize:mob?13:12,background:t.done?C.b3:C.gr,color:t.done?C.w2:C.bg}}>{t.done?"Reopen":"Mark Done"}</button>
      </div>
    </div>;})}
    </div>
  </>;
}
