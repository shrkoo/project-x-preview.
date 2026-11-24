"use client";
import {BriefcaseBusiness,UserRound} from "lucide-react";
export type WorkspaceMode="personal"|"business";
export function ModeSwitcher({mode,onChange,onCreateBusiness}:{mode:WorkspaceMode;onChange:(mode:WorkspaceMode)=>void;onCreateBusiness?:()=>void}){
 return <div className="nv-mode-switch" role="group" aria-label="Workspace mode"><button type="button" aria-pressed={mode==="personal"} className={mode==="personal"?"active":""} onClick={()=>onChange("personal")}><UserRound size={17}/>Personal</button><button type="button" aria-pressed={mode==="business"} className={mode==="business"?"active":""} onClick={()=>mode==="business"?onChange("business"):onCreateBusiness?.()}><BriefcaseBusiness size={17}/>Business</button></div>;
}
