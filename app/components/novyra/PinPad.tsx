"use client";
export function PinPad({value,onChange}:{value:string;onChange:(v:string)=>void}){return <div className="nv-pinpad" aria-label="PIN entry">{[1,2,3,4,5,6,7,8,9,0].map(n=><button type="button" key={n} onClick={()=>onChange((value+n).slice(0,12))}>{n}</button>)}<button type="button" onClick={()=>onChange(value.slice(0,-1))} aria-label="Delete">⌫</button></div>;}
