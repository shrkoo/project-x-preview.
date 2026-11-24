"use client";
import {useRef,useState} from "react";
export function PatternLock({value,onChange}:{value:string;onChange:(v:string)=>void}){const [drawing,setDrawing]=useState(false);const seen=useRef(new Set<string>());function add(n:string){if(!seen.current.has(n)){seen.current.add(n);onChange([...seen.current].join("-"));}}
 return <div className="nv-pattern" onPointerUp={()=>setDrawing(false)} onPointerLeave={()=>setDrawing(false)}>{Array.from({length:9},(_,i)=>String(i+1)).map(n=><button key={n} type="button" aria-label={`Pattern point ${n}`} className={value.split("-").includes(n)?"selected":""} onPointerDown={e=>{e.preventDefault();seen.current.clear();setDrawing(true);add(n);}} onPointerEnter={()=>drawing&&add(n)}>{value.split("-").includes(n)?"●":"○"}</button>)}<button className="nv-pattern-clear" type="button" onClick={()=>{seen.current.clear();onChange("");}}>Clear</button></div>;
}
