"use client";
import {useRef} from "react";

export function PatternLock({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const seen=useRef(new Set<string>());
 const drawing=useRef(false);
 function addPoint(target:EventTarget|null){
  const point=(target as HTMLElement|null)?.closest<HTMLElement>("[data-pattern-point]");
  const n=point?.dataset.patternPoint;
  if(n&&!seen.current.has(n)){
   seen.current.add(n);
   onChange([...seen.current].join("-"));
  }
 }
 function start(e:React.PointerEvent<HTMLDivElement>){
  if(!(e.target as HTMLElement).closest("[data-pattern-point]"))return;
  e.preventDefault();
  seen.current.clear();
  onChange("");
  drawing.current=true;
  e.currentTarget.setPointerCapture(e.pointerId);
  addPoint(e.target);
 }
 function move(e:React.PointerEvent<HTMLDivElement>){
  if(!drawing.current)return;
  e.preventDefault();
  addPoint(document.elementFromPoint(e.clientX,e.clientY));
 }
 function stop(e:React.PointerEvent<HTMLDivElement>){
  drawing.current=false;
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 return <div className="nv-pattern" style={{touchAction:"none",userSelect:"none"}} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
  {Array.from({length:9},(_,i)=>String(i+1)).map(n=><button key={n} data-pattern-point={n} type="button" aria-label={`Pattern point ${n}`} className={value.split("-").includes(n)?"selected":""} style={{touchAction:"none"}}>{value.split("-").includes(n)?"●":"○"}</button>)}
  <button className="nv-pattern-clear" type="button" onClick={()=>{seen.current.clear();drawing.current=false;onChange("");}}>Clear</button>
 </div>;
}
