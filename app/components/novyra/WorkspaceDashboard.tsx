"use client";
import {useState} from "react";
import {ArrowUpRight,ArrowDownRight,BriefcaseBusiness,Target,Wallet,UserRound} from "lucide-react";
import {ModeSwitcher,type WorkspaceMode} from "./ModeSwitcher";
import type {Locale} from "./i18n";
import {translate} from "./i18n";
export function WorkspaceDashboard({initialMode="personal",locale="en",hasBusiness=true,onCreateBusiness}:{initialMode?:WorkspaceMode;locale?:Locale;hasBusiness?:boolean;onCreateBusiness?:()=>void}){
 const [mode,setMode]=useState<WorkspaceMode>(initialMode),t=(key:string)=>translate(locale,key),money=new Intl.NumberFormat(locale,{style:"currency",currency:locale==="fa"?"USD":locale==="tr"?"TRY":locale==="de"?"EUR":"USD",maximumFractionDigits:0});
 const business=mode==="business";
 return <main className="nv-dashboard" dir={locale==="fa"||locale==="ar"?"rtl":"ltr"}>
  <header><div className="nv-brand"><span className="nv-logo">N</span><span>NOVYRA</span></div><div className="nv-profile-menu"><span>{t("profile")}</span><ModeSwitcher mode={mode} onChange={setMode} businessAvailable={hasBusiness} onCreateBusiness={onCreateBusiness} personalLabel={t("personal")} businessLabel={t("business")}/></div></header>
  <section className="nv-dashboard-heading"><small>{t("overview")}</small><h1>{business?t("businessBalance"):t("personalBalance")}</h1><p>{business?"Your business workspace at a glance.":"Your personal finances at a glance."}</p></section>
  <section className="nv-dashboard-balance"><div><small>{business?t("businessBalance"):t("personalBalance")}</small><strong>{money.format(business?24850:8420)}</strong><span><ArrowUpRight size={15}/> +8.4% this month</span></div><div className="nv-dashboard-orb">{business?<BriefcaseBusiness size={34}/>:<Wallet size={34}/>}</div></section>
  <section className="nv-dashboard-metrics"><article><small>{t("income")}</small><b>{money.format(business?18200:4250)}</b><span className="positive"><ArrowUpRight size={14}/> 12.8%</span></article><article><small>{t("expenses")}</small><b>{money.format(business?9650:2180)}</b><span className="negative"><ArrowDownRight size={14}/> 3.2%</span></article></section>
  <section className="nv-dashboard-panel"><div className="nv-dashboard-panel-head"><h2>{t("recent")}</h2><span>Last 30 days</span></div><div className="nv-dashboard-chart" aria-label="Spending chart">{[38,54,42,68,49,77,59,88,62,73,52,91,66,80,58,70,48,86,61,94,74,63,82,55,72,89,60,78].map((v,i)=><i key={i} style={{height:v+"%"}}/>)}</div><div className="nv-chart-legend"><span><i/>Income</span><span><i/>Expenses</span></div></section>
  <section className="nv-dashboard-panel"><div className="nv-dashboard-panel-head"><h2>{t("goals")}</h2><Target size={19}/></div><div className="nv-dashboard-goal"><div><b>{business?"Quarterly revenue":"Emergency fund"}</b><small>{money.format(business?18500:3200)} / {money.format(business?25000:5000)}</small></div><div className="nv-goal-track"><i style={{width:"72%"}}/></div></div><div className="nv-dashboard-goal"><div><b>{business?"Tax reserve":"Travel fund"}</b><small>{money.format(business?2400:850)} / {money.format(business?4000:2000)}</small></div><div className="nv-goal-track"><i style={{width:"43%"}}/></div></div></section>
 </main>;
}
