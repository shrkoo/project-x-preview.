"use client";
import {BriefcaseBusiness,UserRound} from "lucide-react";
export type WorkspaceMode="personal"|"business";
export function ModeSwitcher({mode,onChange,onCreateBusiness,personalLabel="Personal",businessLabel="Business",businessAvailable=true}:{mode:WorkspaceMode;onChange:(mode:WorkspaceMode)=>void;onCreateBusiness?:()=>void;personalLabel?:string;businessLabel?:string;businessAvailable?:boolean}){
 return <div className="nv-mode-switch" role="group" aria-label="Workspace mode"><button type="button" aria-pressed={mode==="personal"} className={mode==="personal"?"active":""} onClick={()=>onChange("personal")}><UserRound size={17}/>{personalLabel}</button><button type="button" aria-pressed={mode==="business"} className={mode==="business"?"active":""} onClick={()=>businessAvailable?onChange("business"):onCreateBusiness?.()}><BriefcaseBusiness size={17}/>{businessLabel}</button></div>;
}
