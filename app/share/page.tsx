"use client";
import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink } from "lucide-react";

type SharedContent={kind:"text"|"video";content:string;mediaUrl:string|null;contentType:string|null;createdAt:string};
function stamp(value:number){if(!Number.isFinite(value))return "0:00";const m=Math.floor(value/60),s=Math.floor(value%60);return m+":"+String(s).padStart(2,"0");}
export default function SharedLinkPage(){
 const pathname=usePathname(),token=String(pathname.split("/").filter(Boolean)[1]||"");
 const [data,setData]=useState<SharedContent|null>(null),[loading,setLoading]=useState(true),[missing,setMissing]=useState(false),[playing,setPlaying]=useState(false),[muted,setMuted]=useState(false),[time,setTime]=useState(0),[duration,setDuration]=useState(0),[volume,setVolume]=useState(1),[copied,setCopied]=useState(false);
 const videoRef=useRef<HTMLVideoElement|null>(null),playerRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{const slug=String(window.location.pathname.split("/").filter(Boolean)[1]||"");if(!slug){setMissing(true);setLoading(false);return;}setToken(slug);},[]);
 useEffect(()=>{if(!token)return;let alive=true;fetch(API_BASE+"/public/shares/"+encodeURIComponent(token),{cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.error||"missing");return d as SharedContent;}).then(d=>{if(alive)setData(d);}).catch(()=>{if(alive)setMissing(true);}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[token]);
 const mediaSrc=data?.mediaUrl?API_BASE+data.mediaUrl:"";
 async function togglePlay(){const v=videoRef.current;if(!v)return;if(v.paused){try{await v.play();setPlaying(true);}catch{setPlaying(false);}}else{v.pause();setPlaying(false);}}
 function toggleMute(){const v=videoRef.current;if(!v)return;v.muted=!v.muted;setMuted(v.muted);}
 function changeVolume(value:number){const v=videoRef.current;if(!v)return;v.volume=value;v.muted=value===0;setVolume(value);setMuted(v.muted);}
 function seek(value:number){const v=videoRef.current;if(!v||!Number.isFinite(v.duration))return;v.currentTime=value;setTime(value);}
 async function fullscreen(){const el=playerRef.current;if(!el)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await el.requestFullscreen();}catch{}}
 async function share(){const link=window.location.href;try{if(navigator.share)await navigator.share({title:"محتوای NOVYRA",url:link});else{await navigator.clipboard.writeText(link);setCopied(true);}}catch{}}
 async function copy(){try{await navigator.clipboard.writeText(window.location.href);setCopied(true);}catch{setCopied(false);}}
 if(loading)return <main className="nv-shared-page" dir="rtl"><div className="nv-shared-status">در حال بارگذاری محتوا…</div></main>;
 if(missing||!data)return <main className="nv-shared-page" dir="rtl"><div className="nv-shared-missing"><div className="nv-shared-brand">N</div><h1>این محتوا وجود ندارد</h1><p>ممکن است صاحب محتوا آن را حذف کرده باشد یا لینک معتبر نباشد.</p><a href="/">باز کردن NOVYRA <ExternalLink size={16}/></a></div></main>;
 return <main className="nv-shared-page" dir="rtl">
  <header className="nv-shared-top"><a href="/" className="nv-shared-wordmark"><span>N</span> NOVYRA</a><button type="button" onClick={()=>void share()}>اشتراک‌گذاری</button></header>
  <article className="nv-shared-content">
   {data.kind==="video"?<div className="nv-shared-player" ref={playerRef}>
    <video ref={videoRef} src={mediaSrc} playsInline preload="metadata" onLoadedMetadata={e=>setDuration(e.currentTarget.duration||0)} onTimeUpdate={e=>setTime(e.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onVolumeChange={e=>{setMuted(e.currentTarget.muted);setVolume(e.currentTarget.volume);}}/>
    <div className="nv-shared-player-controls"><button type="button" onClick={()=>void togglePlay()} aria-label={playing?"توقف":"پخش"}>{playing?<Pause/>:<Play/>}</button><span>{stamp(time)}</span><input aria-label="موقعیت ویدیو" type="range" min="0" max={duration||0} step="0.1" value={Math.min(time,duration||0)} onChange={e=>seek(Number(e.target.value))}/><span>{stamp(duration)}</span><button type="button" onClick={toggleMute} aria-label="صدا">{muted||volume===0?<VolumeX/>:<Volume2/>}</button><input className="nv-shared-volume" aria-label="بلندی صدا" type="range" min="0" max="1" step="0.05" value={muted?0:volume} onChange={e=>changeVolume(Number(e.target.value))}/><button type="button" onClick={()=>void fullscreen()} aria-label="تمام صفحه"><Maximize/></button></div>
    </div>:<div className="nv-shared-text"><div className="nv-shared-text-label">متن اشتراک‌گذاری‌شده</div><p>{data.content}</p></div>}
   <footer className="nv-shared-actions"><button type="button" onClick={()=>void copy()}><span>⧉</span>{copied?"کپی شد":"کپی لینک"}</button><button type="button" onClick={()=>void share()}><span>↗</span>اشتراک‌گذاری</button><a href="/">باز کردن NOVYRA <ExternalLink size={16}/></a></footer>
  </article>
  <p className="nv-shared-footer">اشتراک‌گذاری‌شده با NOVYRA</p>
 </main>;
}