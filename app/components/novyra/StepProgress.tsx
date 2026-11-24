export function StepProgress({step,label,locale="en"}:{step:number;label:string;locale?:string}){
 const value=new Intl.NumberFormat(locale,{useGrouping:false}).format(step);
 const total=new Intl.NumberFormat(locale,{useGrouping:false}).format(4);
 return <div className="nv-progress"><div className="nv-progress-copy"><span>{label}</span><strong>{value}/{total}</strong></div><div className="nv-progress-track"><i style={{width:`${step*25}%`}}/></div></div>;
}
