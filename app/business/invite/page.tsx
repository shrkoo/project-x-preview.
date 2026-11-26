"use client";

import {useEffect,useState} from "react";
import {apiRequest} from "../../lib/api";

export default function BusinessInvitePage(){
 const [token,setToken]=useState("");
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("در حال بررسی دعوت‌نامه…");
 const [accepted,setAccepted]=useState(false);
 useEffect(()=>{
  const value=new URLSearchParams(window.location.search).get("token")||"";
  setToken(value);
  if(!value)setMessage("لینک دعوت‌نامه معتبر نیست.");
  else setMessage("برای پذیرش دعوت، ابتدا با همان ایمیلی که دعوت‌نامه به آن ارسال شده وارد حساب NOVYRA شوید.");
 },[]);
 const accept=async()=>{
  if(!token)return;
  setBusy(true);
  try{
   const result=await apiRequest<{ok:boolean;workspaceId:string;role:string}>("/business/team/accept",{method:"POST",body:JSON.stringify({token})});
   setAccepted(true);
   setMessage("دعوت‌نامه پذیرفته شد. اکنون عضو فضای کسب‌وکار هستید.");
   window.history.replaceState({},"",window.location.pathname);
   localStorage.setItem("novyra-business-last-workspace",result.workspaceId);
  }catch(error){
   setMessage((error as Error).message||"پذیرش دعوت‌نامه ناموفق بود. ابتدا وارد حساب شوید و دوباره تلاش کنید.");
  }finally{setBusy(false);}
 };
 return <main dir="rtl" style={{minHeight:"100dvh",display:"grid",placeItems:"center",padding:"24px",background:"#f4f6fa",fontFamily:"Tahoma,Arial,sans-serif",color:"#172033"}}>
  <section style={{width:"min(100%,480px)",background:"#fff",border:"1px solid #e4e8ef",borderRadius:20,padding:28,boxShadow:"0 18px 60px rgba(18,32,55,.08)"}}>
   <small style={{letterSpacing:3,color:"#64748b"}}>NOVYRA BUSINESS</small>
   <h1 style={{fontSize:24,margin:"14px 0"}}>دعوت به فضای کسب‌وکار</h1>
   <p style={{lineHeight:2,color:"#526078"}}>{message}</p>
   {!accepted&&<div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:24}}>
    <button onClick={accept} disabled={!token||busy} style={{border:0,borderRadius:10,padding:"12px 20px",background:"#172b4d",color:"#fff",fontWeight:700,opacity:!token||busy?.6:1}}>{busy?"در حال پذیرش…":"پذیرش دعوت‌نامه"}</button>
    <a href="/" style={{border:"1px solid #d8dee8",borderRadius:10,padding:"12px 20px",color:"#172b4d",textDecoration:"none"}}>ورود به NOVYRA</a>
   </div>}
   {accepted&&<a href="/" style={{display:"inline-block",marginTop:20,color:"#172b4d"}}>بازگشت به NOVYRA</a>}
  </section>
 </main>;
}
