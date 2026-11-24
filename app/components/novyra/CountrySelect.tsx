"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {countries} from "../../data/countries";
import type {Locale} from "./i18n";

type Props={value:string;onChange:(value:string)=>void;locale:Locale;label:string;placeholder:string};
const digitMap:Record<string,string>={"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"};
function normalize(value:string){
 return value.normalize("NFKD").replace(/[\u064A\u0649]/g,"ی").replace(/\u0643/g,"ک").replace(/\u0629/g,"ه").replace(/[\u200c\u200d\ufeff]/g,"").replace(/[٠-٩۰-۹]/g,d=>digitMap[d]||d).replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().trim();
}
export function CountrySelect({value,onChange,locale,label,placeholder}:Props){
 const [open,setOpen]=useState(false),[query,setQuery]=useState(""),[active,setActive]=useState(0);
 const root=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),listId="nv-country-options";
 const names=useMemo(()=>{try{return new Intl.DisplayNames([locale],{type:"region"})}catch{return new Intl.DisplayNames(["en"],{type:"region"})}},[locale]);
 const items=useMemo(()=>{
  const q=normalize(query);
  return countries.map(c=>({...c,localized:names.of(c.code)||c.name})).map(c=>({...c,rank:!q?2:[c.localized,c.name,c.nativeName,c.code].some(s=>normalize(s).startsWith(q))?0:[c.localized,c.name,c.nativeName,c.code].some(s=>normalize(s).includes(q))?1:3}))
   .filter(c=>c.rank<3).sort((a,b)=>a.rank-b.rank||a.localized.localeCompare(b.localized,locale));
 },[query,names,locale]);
 const selected=useMemo(()=>countries.find(c=>c.code===value),[value]);
 useEffect(()=>{if(open){setQuery("");setActive(0);requestAnimationFrame(()=>search.current?.focus());}},[open]);
 useEffect(()=>{function outside(e:PointerEvent){if(!root.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",outside);return()=>document.removeEventListener("pointerdown",outside)},[]);
 function choose(code:string){onChange(code);setOpen(false);setQuery("");}
 function keyDown(e:React.KeyboardEvent){if(e.key==="ArrowDown"){e.preventDefault();setActive(v=>Math.min(v+1,items.length-1));}else if(e.key==="ArrowUp"){e.preventDefault();setActive(v=>Math.max(v-1,0));}else if(e.key==="Enter"&&open&&items[active]){e.preventDefault();choose(items[active].code)}else if(e.key==="Escape"){e.preventDefault();setOpen(false)}}
 return <div className="nv-field nv-country-field" ref={root}>
  <span>{label}</span>
  <button type="button" className="nv-country-trigger" role="combobox" aria-label={label} aria-expanded={open} aria-controls={listId} aria-haspopup="listbox" onClick={()=>setOpen(v=>!v)} onKeyDown={keyDown}>
   {selected?<><span aria-hidden="true">{selected.flag}</span><span>{names.of(selected.code)||selected.name}</span></>:<span className="nv-country-placeholder">{placeholder}</span>}
   <span className="nv-country-chevron" aria-hidden="true">⌄</span>
  </button>
  {open&&<div className="nv-country-popover" onKeyDown={keyDown}>
   <input ref={search} className="nv-country-search" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}} placeholder={placeholder} role="searchbox" aria-label={placeholder} autoComplete="off" />
   <ul id={listId} role="listbox" aria-label={label} className="nv-country-list">
    {items.length===0?<li className="nv-country-empty" role="option" aria-selected="false">{locale==="fa"?"نتیجه‌ای پیدا نشد":locale==="ar"?"لا توجد نتائج":locale==="tr"?"Sonuç bulunamadı":locale==="de"?"Keine Ergebnisse":"No results"}</li>:items.map((c,i)=><li key={c.code} id={`nv-country-${c.code}`} role="option" aria-selected={value===c.code} className={i===active?"active":""}><button type="button" onMouseEnter={()=>setActive(i)} onClick={()=>choose(c.code)}><span>{c.flag}</span><span>{c.localized}</span><small>{c.code}</small></button></li>)}
   </ul>
  </div>}
 </div>;
}
