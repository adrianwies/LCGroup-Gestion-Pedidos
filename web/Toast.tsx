import { useEffect, useState } from "react";
import "./toasts.css";
export type ToastKind="success"|"error"|"warning"|"info";
type Toast={id:number;message:string;kind:ToastKind;duration:number};
let lastToast={message:"",kind:"info" as ToastKind,at:0};
export function showToast(message:string,kind:ToastKind="info",duration=4200){
  if(!message)return;
  const now=Date.now();
  if(lastToast.message===message&&lastToast.kind===kind&&now-lastToast.at<800)return;
  lastToast={message,kind,at:now};
  window.dispatchEvent(new CustomEvent("app:toast",{detail:{message,kind,duration}}));
}
export function ToastHost(){const[items,setItems]=useState<Toast[]>([]);useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent<Omit<Toast,"id">>).detail,id=Date.now()+Math.random();setItems(current=>[...current.slice(-3),{id,...detail}]);if(detail.duration>0)window.setTimeout(()=>setItems(current=>current.filter(x=>x.id!==id)),detail.duration)};window.addEventListener("app:toast",handler);return()=>window.removeEventListener("app:toast",handler)},[]);return <div className="toast-region" role="region" aria-label="Avisos"><div aria-live="polite" aria-atomic="true">{items.map(item=><div className={`app-toast ${item.kind}`} key={item.id} role={item.kind==="error"?"alert":"status"}><i aria-hidden="true">{item.kind==="success"?"✓":item.kind==="error"?"!":item.kind==="warning"?"!":"i"}</i><span>{item.message}</span><button onClick={()=>setItems(current=>current.filter(x=>x.id!==item.id))} aria-label="Cerrar aviso">×</button></div>)}</div></div>}
