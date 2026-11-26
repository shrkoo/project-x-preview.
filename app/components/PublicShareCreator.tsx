"use client";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { Copy, Link2, Share2, Trash2, Upload, Video, FileText } from "lucide-react";

type ShareItem={id:string;kind:"text"|"video";content?:string;createdAt:string};
export default function PublicShareCreator(){
 const [kind,setKind]=useState<"text"|"video">("text");
 const [content,setContent]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [items,setItems]=useState<ShareItem[]>([]);
 const [createdLink,setCreatedLink]=useState("");
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState("");
 const inputRef=useRef<HTMLInputElement|null>(null),textInputRef=useRef<HTMLInputElement|null>(null);
 async function refresh(){try{const d=await apiRequest<{shares:ShareItem[]}>("/public/shares/mine");setItems(d.shares||[]);}catch(e){setNotice(e instanceof Error?e.message:"بارگذاری لینک‌ها ناموفق بود.");}}
 useEffect(()=>{void refresh();},[]);
 async function chooseTextFile(e:ChangeEvent<HTMLInputElement>){const next=e.target.files?.[0]||null;e.target.value="";if(!next)return;if(next.type!=="text/plain"&&!next.name.toLowerCase().endsWith(".txt")){setNotice("فقط فایل متنی TXT انتخاب کن.");return;}if(next.size>100*1024){setNotice("حجم فایل متنی نباید بیشتر از ۱۰۰ کیلوبایت باشد.");return;}setContent((await next.text()).slice(0,20000));setKind("text");setNotice("متن فایل بارگذاری شد.");}
 function chooseFile(e:ChangeEvent<HTMLInputElement>){const next=e.target.files?.[0]||null;e.target.value="";if(!next)return;if(!next.type.startsWith("video/")){setNotice("فقط فایل ویدیویی انتخاب کن.");return;}if(next.size>20*1024*1024){setNotice("حجم ویدیو بیشتر از سقف مجاز ۲۰ مگابایت است.");return;}setFile(next);setKind("video");setNotice("");}
 async function create(e:FormEvent){e.preventDefault();if(busy)return;if(kind==="text"&&!content.trim()){setNotice("متن را وارد کن.");return;}if(kind==="video"&&!file){setNotice("یک ویدیو انتخاب کن.");return;}setBusy(true);setNotice("");try{let data:{token:string};if(kind==="video"){const form=new FormData();form.append("file",file!);data=await apiRequest("/public/shares",{method:"POST",body:form});}else{data=await apiRequest("/public/shares",{method:"POST",body:JSON.stringify({content:content.trim()})});}const link=window.location.origin+"/share/"+data.token;setCreatedLink(link);setContent("");setFile(null);await refresh();setNotice("لینک عمومی ساخته شد.");}catch(e){setNotice(e instanceof Error?e.message:"ساخت لینک ناموفق بود.");}finally{setBusy(false);}}
 async function copyLink(){if(!createdLink)return;try{await navigator.clipboard.writeText(createdLink);setNotice("لینک کپی شد.");}catch{setNotice("کپی خودکار ممکن نیست؛ لینک را انتخاب و کپی کن.");}}
 async function shareLink(){if(!createdLink)return;if(navigator.share){try{await navigator.share({title:"محتوای NOVYRA",url:createdLink});}catch{}}else await copyLink();}
 async function remove(item:ShareItem){if(!window.confirm("این لینک و فایل آن برای همیشه حذف شود؟"))return;try{await apiRequest("/public/shares/manage/"+item.id,{method:"DELETE"});setItems(v=>v.filter(x=>x.id!==item.id));setNotice("محتوا و لینک حذف شدند.");}catch(e){setNotice(e instanceof Error?e.message:"حذف محتوا ناموفق بود.");}}
 return <section className="nv-public-share" dir="rtl">
  <div className="nv-public-share-heading"><div><span>لینک عمومی NOVYRA</span><h3>ساخت لینک برای متن یا ویدیو</h3><p>محتوا فقط با لینک قابل مشاهده است و خودکار وارد اکسپلور یا فید نمی‌شود.</p></div><Link2 size={22}/></div>
  <div className="nv-public-share-tabs"><button type="button" className={kind==="text"?"selected":""} onClick={()=>setKind("text")}><FileText size={16}/> متن</button><button type="button" className={kind==="video"?"selected":""} onClick={()=>setKind("video")}><Video size={16}/> ویدیو</button></div>
  <form onSubmit={create}>
   {kind==="text"?<><input ref={textInputRef} type="file" accept=".txt,text/plain" hidden onChange={chooseTextFile}/><button type="button" className="nv-public-share-file nv-public-share-text-file" onClick={()=>textInputRef.current?.click()}><Upload size={17}/> بارگذاری فایل متنی TXT</button><textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={20000} rows={6} placeholder="متن موردنظر را اینجا بنویس یا جای‌گذاری کن…"/></>:
    <><input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={chooseFile}/><button type="button" className="nv-public-share-file" onClick={()=>inputRef.current?.click()}><Upload size={18}/><span>{file?file.name:"انتخاب ویدیو (حداکثر ۲۰ مگابایت)"}</span></button>{file&&<small>{new Intl.NumberFormat("fa-IR",{maximumFractionDigits:2}).format(file.size/1024/1024)} MB</small>}</>}
   <button className="nv-public-share-submit" type="submit" disabled={busy}>{busy?"در حال ساخت لینک…":"ساخت لینک عمومی"}</button>
  </form>
  {createdLink&&<div className="nv-public-share-result"><label>لینک آماده است</label><input readOnly value={createdLink} dir="ltr" onFocus={e=>e.currentTarget.select()}/><div><button type="button" onClick={()=>void copyLink()}><Copy size={16}/> کپی لینک</button><button type="button" onClick={()=>void shareLink()}><Share2 size={16}/> اشتراک‌گذاری</button></div></div>}
  {notice&&<p className="nv-public-share-notice" role="status">{notice}</p>}
  <div className="nv-public-share-list"><h4>لینک‌های ساخته‌شده</h4>{items.length?items.map(item=><article key={item.id}><span className="nv-public-share-type">{item.kind==="video"?<Video size={16}/>:<FileText size={16}/>} {item.kind==="video"?"ویدیو":"متن"}</span><small>{new Date(item.createdAt).toLocaleDateString("fa-IR")}</small><button type="button" onClick={()=>void remove(item)} aria-label="حذف لینک"><Trash2 size={16}/> حذف</button></article>):<p>هنوز لینکی نساخته‌ای.</p>}</div>
 </section>;
}