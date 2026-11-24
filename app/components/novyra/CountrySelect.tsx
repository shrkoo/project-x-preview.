"use client";
import {useMemo,useState} from "react";
import {countries} from "../../data/countries";
import type {Locale} from "./i18n";
export function CountrySelect({value,onChange,locale,label,placeholder}:{value:string;onChange:(v:string)=>void;locale:Locale;label:string;placeholder:string}){
 const [query,setQuery]=useState("");const names=useMemo(()=>new Intl.DisplayNames([locale],{type:"region"}),[locale]);
 const items=useMemo(()=>countries.map(c=>({...c,localized:names.of(c.code)||c.name})).filter(c=>!query||[c.localized,c.name,c.nativeName,c.code].some(x=>x.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))).sort((a,b)=>a.localized.localeCompare(b.localized,locale)),[query,names,locale]);
 return <label className="nv-field"><span>{label}</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder} role="combobox" aria-expanded="true" aria-controls="nv-country-options" autoComplete="off"/><select id="nv-country-options" value={value} onChange={e=>onChange(e.target.value)} aria-label={label}><option value="">—</option>{items.map(c=><option key={c.code} value={c.code}>{c.flag} {c.localized}</option>)}</select></label>;
}
