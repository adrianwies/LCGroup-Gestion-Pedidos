import { useEffect, useMemo, useRef, useState } from "react";
import "./notifications.css";
import "./notifications-polish.css";
import "./notification-settings.css";

type Notice={id:number;type:string;title:string;message:string;createdAt:string;isRead:boolean;actionUrl?:string;soundEnabled?:boolean};
const labels:Record<string,string>={order:"Pedidos",approval:"Aprobaciones",rejection:"Rechazos",credit:"Créditos",billing:"Facturación",stock:"Stock",system:"Sistema"};
function NoticeIcon({notice}:{notice:Notice}) {
 const title=notice.title.toLocaleLowerCase("es-PE");
 const kind=title.includes("entregado")?"delivered":title.includes("ruta")?"route":title.includes("listo")?"ready":title.includes("preparación")?"packing":notice.type;
 const paths:Record<string,string>={delivered:"M3 11l9-8 9 8v10H3z M8 14l3 3 5-6",route:"M2 6h12v11H2z M14 10h4l4 4v3h-8z M6 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4",ready:"M3 10l9-7 9 7v11H3z M7 21v-7h10v7 M8 10h8",packing:"M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",billing:"M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6",approval:"M4 12l5 5L20 6 M5 4h14v4 M5 8v12h14v-8",rejection:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M9 9l6 6 M15 9l-6 6",stock:"M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10",credit:"M3 6h18v12H3z M3 10h18 M7 15h3",order:"M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",system:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 10v6 M12 7h.01"};
 return <i className={`notice-type notice-icon-${kind}`} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]||paths.system}/></svg></i>;
}

export function NotificationBell({onOpenOrder}:{onOpenOrder:(number:string)=>void}){
 const[items,setItems]=useState<Notice[]>([]),[open,setOpen]=useState(false),[filter,setFilter]=useState("all");
 const root=useRef<HTMLDivElement>(null),cursor=useRef(0),closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;let stream:EventSource|undefined;const start=async()=>{try{const r=await fetch("/api/notifications");if(!r.ok)throw Error();const v:Notice[]=await r.json();if(!active)return;setItems(v);cursor.current=Math.max(0,...v.map(x=>x.id));}catch{}if(!active)return;stream=new EventSource(`/api/notifications/stream?after=${cursor.current}`);stream.addEventListener("notification",event=>{const notice=JSON.parse((event as MessageEvent).data) as Notice;if(notice.id<=cursor.current)return;cursor.current=notice.id;setItems(v=>[{...notice,isRead:false},...v.filter(x=>x.id!==notice.id)].slice(0,100));window.dispatchEvent(new CustomEvent("app:notification",{detail:notice}));if(document.visibilityState==="visible"&&notice.soundEnabled!==false)sound()});};void start();return()=>{active=false;stream?.close()}},[]);
 useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};document.addEventListener("mousedown",close);window.addEventListener("keydown",escape);return()=>{document.removeEventListener("mousedown",close);window.removeEventListener("keydown",escape)}},[]);
 useEffect(()=>{document.body.classList.toggle("notifications-open",open);if(open)window.setTimeout(()=>closeButton.current?.focus(),0);return()=>document.body.classList.remove("notifications-open")},[open]);
 const unread=items.filter(x=>!x.isRead).length,visible=useMemo(()=>items.filter(x=>filter==="all"||x.type===filter),[items,filter]);
 const read=async(id:number)=>{await fetch(`/api/notifications/${id}/read`,{method:"PUT"});setItems(v=>v.map(x=>x.id===id?{...x,isRead:true}:x))};
 const orderNumber=(x:Notice)=>{if(!x.actionUrl||!x.actionUrl.startsWith("/?orderNumber="))return null;return new URL(x.actionUrl,location.origin).searchParams.get("orderNumber")};
 const openNotice=async(x:Notice)=>{await read(x.id);const number=orderNumber(x);if(number){setOpen(false);onOpenOrder(number)}};
 const readAll=async()=>{await fetch("/api/notifications/read-all",{method:"PUT"});setItems(v=>v.map(x=>({...x,isRead:true})))};
 const when=(value:string)=>new Intl.DateTimeFormat("es-PE",{timeZone:"America/Lima",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(value+(/Z$|[+-]\d\d:\d\d$/.test(value)?"":"Z")));
 return <div className="notice-root" ref={root}>
  <button className="notice-bell" aria-label={`Notificaciones${unread?`, ${unread} sin leer`:""}`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unread>0&&<span>{unread>99?"99+":unread}</span>}</button>
  {open&&<><button className="notice-backdrop" aria-label="Cerrar notificaciones" onClick={()=>setOpen(false)}/><section className="notice-panel" role="dialog" aria-modal="true" aria-label="Notificaciones">
   <header><div><b>Notificaciones</b><small>{unread?`${unread} sin leer`:"Todo al día"}</small></div><div className="notice-head-actions">{unread>0&&<button onClick={readAll}>Marcar leídas</button>}<button ref={closeButton} className="notice-close" onClick={()=>setOpen(false)} aria-label="Cerrar">×</button></div></header>
   <div className="notice-filters" aria-label="Filtrar notificaciones"><button className={filter==="all"?"on":""} onClick={()=>setFilter("all")}>Todas</button>{Object.entries(labels).filter(([key])=>items.some(x=>x.type===key)).map(([key,label])=><button className={filter===key?"on":""} onClick={()=>setFilter(key)} key={key}>{label}</button>)}</div>
   <div className="notice-list">{visible.length?visible.map(x=>{const linked=!!orderNumber(x);return <button key={x.id} className={`${x.isRead?"":"unread"} ${linked?"linked":""}`} onClick={()=>openNotice(x)}><NoticeIcon notice={x}/><span><b>{x.title}</b><em>{x.message}</em><small>{when(x.createdAt)}{linked&&<strong> · Ver pedido</strong>}</small></span>{!x.isRead&&<u aria-label="Sin leer"/>}</button>}):<div className="notice-empty"><span aria-hidden="true">✓</span><b>{filter==="all"?"Todo al día":"Sin resultados"}</b><small>No hay alertas para mostrar en este filtro.</small></div>}</div>
  </section></>}
 </div>
}
function sound(){try{const AudioContext=window.AudioContext||(window as any).webkitAudioContext,ctx=new AudioContext(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=720;gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.12)}catch{}}
