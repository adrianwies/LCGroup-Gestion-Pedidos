import { useEffect, useMemo, useRef, useState } from "react";
import "./notifications.css";
import "./notifications-polish.css";
import "./notification-settings.css";

type Notice={id:number;type:string;title:string;message:string;createdAt:string;isRead:boolean;actionUrl?:string;soundEnabled?:boolean};
const labels:Record<string,string>={order:"Pedidos",approval:"Aprobaciones",rejection:"Rechazos",credit:"Créditos",billing:"Facturación",stock:"Stock",system:"Sistema"};

export function NotificationBell({onOpenOrder}:{onOpenOrder:(number:string)=>void}){
 const[items,setItems]=useState<Notice[]>([]),[open,setOpen]=useState(false),[filter,setFilter]=useState("all");
 const root=useRef<HTMLDivElement>(null),cursor=useRef(0),closeButton=useRef<HTMLButtonElement>(null);
 const load=()=>fetch("/api/notifications").then(r=>r.ok?r.json():[]).then((v:Notice[])=>{setItems(v);cursor.current=Math.max(cursor.current,...v.map(x=>x.id),0)}).catch(()=>{});
 useEffect(()=>{void load()},[]);
 useEffect(()=>{const stream=new EventSource(`/api/notifications/stream?after=${cursor.current}`);stream.addEventListener("notification",event=>{const notice=JSON.parse((event as MessageEvent).data) as Notice;cursor.current=Math.max(cursor.current,notice.id);setItems(v=>[{...notice,isRead:false},...v.filter(x=>x.id!==notice.id)].slice(0,100));window.dispatchEvent(new CustomEvent("app:notification",{detail:notice}));if(document.visibilityState==="visible"&&notice.soundEnabled!==false)sound()});return()=>stream.close()},[]);
 useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};document.addEventListener("mousedown",close);window.addEventListener("keydown",escape);return()=>{document.removeEventListener("mousedown",close);window.removeEventListener("keydown",escape)}},[]);
 useEffect(()=>{document.body.classList.toggle("notifications-open",open);if(open)window.setTimeout(()=>closeButton.current?.focus(),0);return()=>document.body.classList.remove("notifications-open")},[open]);
 const unread=items.filter(x=>!x.isRead).length,visible=useMemo(()=>items.filter(x=>filter==="all"||x.type===filter),[items,filter]);
 const read=async(id:number)=>{await fetch(`/api/notifications/${id}/read`,{method:"PUT"});setItems(v=>v.map(x=>x.id===id?{...x,isRead:true}:x))};
 const openNotice=async(x:Notice)=>{await read(x.id);const number=x.message.match(/(?:orden|pedido)\s+([A-Z0-9_-]+-\d{2}-\d{4}-\d{4})/i)?.[1];if(number){setOpen(false);onOpenOrder(number)}};
 const readAll=async()=>{await fetch("/api/notifications/read-all",{method:"PUT"});setItems(v=>v.map(x=>({...x,isRead:true})))};
 const when=(value:string)=>new Intl.DateTimeFormat("es-PE",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value+(/Z$|[+-]\d\d:\d\d$/.test(value)?"":"Z")));
 return <div className="notice-root" ref={root}>
  <button className="notice-bell notice-text" aria-label={`Notificaciones${unread?`, ${unread} sin leer`:""}`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}>Notificaciones{unread>0&&<span>{unread>99?"99+":unread}</span>}</button>
  {open&&<><button className="notice-backdrop" aria-label="Cerrar notificaciones" onClick={()=>setOpen(false)}/><section className="notice-panel" role="dialog" aria-modal="true" aria-label="Notificaciones">
   <header><div><b>Notificaciones</b><small>{unread?`${unread} sin leer`:"Todo al día"}</small></div><div className="notice-head-actions">{unread>0&&<button onClick={readAll}>Marcar leídas</button>}<button ref={closeButton} className="notice-close" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></div></header>
   <div className="notice-filters" aria-label="Filtrar notificaciones"><button className={filter==="all"?"on":""} onClick={()=>setFilter("all")}>Todas</button>{Object.entries(labels).filter(([key])=>items.some(x=>x.type===key)).map(([key,label])=><button className={filter===key?"on":""} onClick={()=>setFilter(key)} key={key}>{label}</button>)}</div>
   <div className="notice-list">{visible.length?visible.map(x=>{const linked=/(?:orden|pedido)\s+[A-Z0-9_-]+-\d{2}-\d{4}-\d{4}/i.test(x.message);return <button key={x.id} className={`${x.isRead?"":"unread"} ${linked?"linked":""}`} onClick={()=>openNotice(x)}><i className={`notice-type type-${x.type}`} aria-hidden="true"/><span><b>{x.title}</b><em>{x.message}</em><small>{when(x.createdAt)}{linked&&<strong> · Ver pedido</strong>}</small></span>{!x.isRead&&<u aria-label="Sin leer"/>}</button>}):<div className="notice-empty"><span aria-hidden="true">✓</span><b>{filter==="all"?"Todo al día":"Sin resultados"}</b><small>No hay alertas para mostrar en este filtro.</small></div>}</div>
  </section></>}
 </div>
}
function sound(){try{const AudioContext=window.AudioContext||(window as any).webkitAudioContext,ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=720;gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.12)}catch{}}
