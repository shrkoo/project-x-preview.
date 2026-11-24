import fa from "../../locales/fa.json";
import en from "../../locales/en.json";
import ar from "../../locales/ar.json";
import tr from "../../locales/tr.json";
import de from "../../locales/de.json";
export type Locale = "fa" | "en" | "ar" | "tr" | "de";
export const localeMeta: Record<Locale,{label:string;dir:"rtl"|"ltr";tag:string}> = {
  fa:{label:"فارسی",dir:"rtl",tag:"fa-IR"},en:{label:"English",dir:"ltr",tag:"en"},ar:{label:"العربية",dir:"rtl",tag:"ar"},tr:{label:"Türkçe",dir:"ltr",tag:"tr"},de:{label:"Deutsch",dir:"ltr",tag:"de"}
};
const dictionaries: Record<Locale,Record<string,string>> = { fa, en, ar, tr, de };
export function detectLocale():Locale { if(typeof navigator==="undefined")return "en"; const lang=navigator.language.toLowerCase(); if(lang.startsWith("fa"))return "fa";if(lang.startsWith("ar"))return "ar";if(lang.startsWith("tr"))return "tr";if(lang.startsWith("de"))return "de";return "en"; }
export function translate(locale:Locale,key:string){return dictionaries[locale]?.[key]??dictionaries.en[key]??key;}
