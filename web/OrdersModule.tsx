import { useEffect, useMemo, useState } from "react";
import { HorizontalScroller } from "./HorizontalScroller";
import "./orders-module.css";
import "./order-fix.css";
import "./order-history.css";
import "./order-approvals.css";
import "./order-review.css";
import { OrderEditor as OrderModal } from "./OrderEditor";
import { showToast } from "./Toast";
import { printProfessionalOrder, saveProfessionalOrderPdf } from "./OrderDocument";

type Product = {
  code: string;
  description: string;
  size: string;
  stock: number;
  unitPrice: number;
};
type Client = {
  id: number;
  code: string;
  name: string;
  ruc: string;
  fiscalAddress: string;
  deliveryAddress: string;
  paymentTerms: string;
};
type Item = Product & { quantity: number; price: number };
type Order = {
  id: number;
  number: string;
  createdAt: string;
  client: string;
  seller: string;
  total: number;
  status: "Pending" | "Accepted" | "Annulled";
  approvalSummary: string;
  currentUserDecision: "" | "Approved" | "Rejected";
};
type Detail = {
  id: number;
  number: string;
  createdAt: string;
  clientCode: string;
  client: string;
  ruc: string;
  fiscalAddress: string;
  deliveryAddress: string;
  paymentTerms: string;
  deliveryNotes: string;
  seller: string;
  sellerCode?: string;
  status?: string;
  approvalSummary?: string;
  currentUserDecision?: string;
  alfredoApproval?: string;
  creditsApproval?: string;
  items: {
    productCode: string;
    description: string;
    size?: string;
    pack?: number;
    saleType?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }[];
  total: number;
};
type ApprovalAudit = { area: string; userName: string; decision: "Approved" | "Rejected"; decidedAt: string };
const request = async (path: string, init?: RequestInit) => {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!r.ok) { const message=(await r.json().catch(()=>({message:"No se pudo completar la operación."}))).message; showToast(message,"error"); throw Error(message); }
  return r.status === 204 ? null : r.json();
};

async function printOrder(id: number) {
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return;
  const d: Detail = await request("/workflow/orders/" + id + "/print");
  const esc=(value:unknown)=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]!));
  const rows = d.items
    .map(
      (i) =>
        `<tr><td>${esc(i.productCode)}</td><td class="n">${i.quantity}</td><td>${esc(i.saleType||"Unidad")}</td><td>${esc(i.description)}</td><td>${esc(i.size||"—")}</td><td class="n">${i.pack||1}</td><td class="n">S/ ${i.unitPrice.toFixed(2)}</td><td class="n"><b>S/ ${i.amount.toFixed(2)}</b></td></tr>`,
    )
    .join("");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)}</title><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17252f;font-size:9.5px;margin:0}.head{display:grid;grid-template-columns:150px 1fr 150px;align-items:center;border-bottom:3px solid #0077b6;padding:0 0 10px;margin-bottom:12px}.head img{max-width:135px;max-height:52px;object-fit:contain}.head h1{text-align:center;font-size:21px;color:#003b5c;margin:0}.head address{text-align:right;font-style:normal;color:#52636d;line-height:1.45}.bar,th,.total{background:#0069a6;color:white}.bar{font-weight:bold;padding:6px 8px}.info{display:grid;grid-template-columns:1fr 1fr;border:1px solid #cad6dd}.info div{display:grid;grid-template-columns:115px 1fr;min-height:29px;border-bottom:1px solid #dfe6ea}.info div:nth-child(odd){border-right:1px solid #dfe6ea}.info span{background:#eef5f8;font-weight:bold;padding:7px}.info b{padding:7px;font-weight:500;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;margin-top:12px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th,td{padding:6px 5px;border:1px solid #cad6dd}th{font-size:8px}.n{text-align:right;white-space:nowrap}.total{margin-left:auto;width:280px;display:flex;justify-content:space-between;padding:9px 13px;font-weight:bold;font-size:13px}.notes{margin-top:12px;border:1px solid #cad6dd;padding:8px;min-height:42px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="head"><img src="${location.origin}/branding/logolcgroup.png" alt="LC Group"><h1>ORDEN DE PEDIDO</h1><address>Jr. Perseo 152 - Urb. La Campina<br>Chorrillos - Lima<br>Teléfono: (01) 467-5800</address></div><div class="bar">DATOS DEL CLIENTE Y DEL PEDIDO</div><div class="info"><div><span>Cliente</span><b>${esc(d.client)}</b></div><div><span>Código de cliente</span><b>${esc(d.clientCode)}</b></div><div><span>Dirección fiscal</span><b>${esc(d.fiscalAddress)}</b></div><div><span>Cód. de vendedor</span><b>${esc(d.seller)}</b></div><div><span>RUC / documento</span><b>${esc(d.ruc)}</b></div><div><span>Fecha</span><b>${new Date(d.createdAt).toLocaleDateString("es-PE")}</b></div><div><span>Forma de pago</span><b>${esc(d.paymentTerms)}</b></div><div><span>N.º de pedido</span><b>${esc(d.number)}</b></div><div style="grid-column:1/-1"><span>Dirección de entrega</span><b>${esc(d.deliveryAddress)}</b></div></div><table><thead><tr><th>Código</th><th>Cantidad</th><th>Tipo</th><th>Descripción</th><th>Size</th><th>Pack</th><th>Precio de venta</th><th>Importe</th></tr></thead><tbody>${rows}</tbody></table><div class="total"><span>TOTAL GENERAL</span><span>S/ ${d.total.toFixed(2)}</span></div><div class="notes"><b>Observaciones de entrega:</b><br>${esc(d.deliveryNotes || "—")}</div><script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`,
  );
  w.document.close();
}

async function saveOrderPdf(id: number) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"),import("jspdf-autotable")]);
  const d: Detail = await request("/workflow/orders/" + id + "/print");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await fetch("/branding/logolcgroup.png").then(r=>r.blob()).then(blob=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob)}));
  doc.addImage(logo,"PNG",14,10,40,15,undefined,"FAST");
  doc.setTextColor(0,59,92);doc.setFontSize(17);doc.setFont("helvetica","bold");doc.text("ORDEN DE PEDIDO",105,18,{align:"center"});
  doc.setTextColor(75,92,102);doc.setFontSize(8);doc.setFont("helvetica","normal");doc.text(["Jr. Perseo 152 - Urb. La Campina, Chorrillos - Lima","Teléfono: (01) 467-5800"],196,13,{align:"right"});
  doc.setDrawColor(0,105,166);doc.setLineWidth(0.8);doc.line(14,29,196,29);
  doc.setFontSize(8.5);doc.setTextColor(25,39,48);
  const info=[["Cliente",d.client,"Código de cliente",d.clientCode],["Dirección fiscal",d.fiscalAddress,"RUC / documento",d.ruc],["Código vendedor",d.seller,"Forma de pago",d.paymentTerms],["Fecha",new Date(d.createdAt).toLocaleDateString("es-PE"),"N.º de pedido",d.number],["Dirección de entrega",d.deliveryAddress,"Observaciones",d.deliveryNotes||"—"]];
  autoTable(doc,{startY:34,body:info,theme:"grid",styles:{fontSize:7.5,cellPadding:2,textColor:[25,39,48]},columnStyles:{0:{fontStyle:"bold",fillColor:[238,245,248],cellWidth:29},1:{cellWidth:61},2:{fontStyle:"bold",fillColor:[238,245,248],cellWidth:29},3:{cellWidth:61}},margin:{left:14,right:14}});
  const start=(doc as any).lastAutoTable.finalY+5;
  autoTable(doc,{startY:start,head:[["Código","Cantidad","Tipo","Descripción","Size","Pack","Precio de venta","Importe"]],body:d.items.map(i=>[i.productCode,String(i.quantity),i.saleType||"Unidad",i.description,i.size||"—",String(i.pack||1),`S/ ${i.unitPrice.toFixed(2)}`,`S/ ${i.amount.toFixed(2)}`]),theme:"grid",headStyles:{fillColor:[0,105,166],textColor:255,fontSize:7,fontStyle:"bold"},styles:{fontSize:6.8,cellPadding:1.8,overflow:"linebreak"},columnStyles:{0:{cellWidth:20},1:{cellWidth:15,halign:"right"},2:{cellWidth:16},3:{cellWidth:44},4:{cellWidth:15},5:{cellWidth:12,halign:"right"},6:{cellWidth:25,halign:"right"},7:{cellWidth:25,halign:"right",fontStyle:"bold"}},margin:{left:14,right:14},didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(100);doc.text(`Pedido ${d.number} · Página ${doc.getNumberOfPages()}`,105,291,{align:"center"})}});
  let y=(doc as any).lastAutoTable.finalY+6;if(y>270){doc.addPage();y=20}doc.setFillColor(0,105,166);doc.rect(126,y,70,10,"F");doc.setTextColor(255);doc.setFontSize(10);doc.setFont("helvetica","bold");doc.text("TOTAL GENERAL",130,y+6.5);doc.text(`S/ ${d.total.toFixed(2)}`,192,y+6.5,{align:"right"});
  doc.save(`Orden-${d.number}.pdf`);showToast("PDF generado correctamente.","success");
}

export function OrdersModule({ user = { role: "Seller" } }: { user?: any }) {
  const [orders, setOrders] = useState<Order[]>([]),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [users, setUsers] = useState<any[]>([]),
    [userFilter, setUserFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [detail, setDetail] = useState<Detail>(),
    [message, setMessage] = useState("");
  const load = () =>
    request("/workflow/orders" + (userFilter ? `?userId=${userFilter}` : "")).then(
      setOrders,
    );
  useEffect(() => {
    void load();
  }, [userFilter]);
  useEffect(() => { if ((user.role === "Admin" || user.role === "Seller") && sessionStorage.getItem("demo.newOrder")) { sessionStorage.removeItem("demo.newOrder"); setOpen(true); } }, [user.role]);
  useEffect(() => {
    if (user.role === "Admin") request("/users").then(setUsers);
  }, [user.role]);
  useEffect(()=>{const openNumber=async(number:string)=>{const order=orders.find(x=>x.number===number);if(!order)return;sessionStorage.removeItem("demo.openOrder");try{setDetail(await request(`/workflow/orders/${order.id}`))}catch(e:any){setMessage(e.message)}};const stored=sessionStorage.getItem("demo.openOrder");if(stored)void openNumber(stored);const handler=(e:Event)=>void openNumber((e as CustomEvent<string>).detail);window.addEventListener("demo:open-order",handler);return()=>window.removeEventListener("demo:open-order",handler)},[orders]);
  const filtered = useMemo(
    () =>
      orders.filter((o) =>
        (!statusFilter || o.status === statusFilter) && `${o.number} ${o.client} ${o.seller}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [orders, query, statusFilter],
  );
  const decide=async(id:number,decision:"Approved"|"Rejected")=>{try{await request(`/workflow/orders/${id}/decision`,{method:"POST",body:JSON.stringify({decision})});showToast(decision==="Approved"?"Aprobación registrada.":"Orden cancelada y stock restaurado.",decision==="Approved"?"success":"warning");await load()}catch(e:any){setMessage(e.message)}};
  return (
    <section className="module-page">
      <div className="module-intro">
        <div>
          <div className="eyebrow">VENTAS</div>
          <h2>Órdenes de pedido</h2>
          <p>
            Gestiona los pedidos de clientes y consulta su historial comercial.
          </p>
        </div>
        {(user.role === "Admin" || user.role === "Seller") && <button className="primary-action" onClick={() => setOpen(true)}>
          ＋ Nueva orden
        </button>}
      </div>
      <div className="summary-row">
        <div className="summary-card">
          <span>Pendientes</span>
          <b>{orders.filter(o=>o.status==="Pending").length}</b>
        </div>
        <div className="summary-card">
          <span>Aceptados</span>
          <b>{orders.filter(o=>o.status==="Accepted").length}</b>
        </div>
        <div className="summary-card cancelled-summary">
          <span>Cancelados</span>
          <b>{orders.filter(o=>o.status==="Annulled").length}</b>
        </div>
      </div>
      <div className="card list-card">
        <div className="list-tools">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por número, cliente o vendedor"
            />
          </div>
          <div className="order-filters"><select className="order-status-filter" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="Pending">Pendientes</option><option value="Accepted">Aceptados</option><option value="Annulled">Cancelados</option></select>{user.role === "Admin" ? (
            <select
              className="order-user-filter"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
            >
              <option value="">Todos los usuarios</option>
              {users.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.userName}
                  {x.sellerCode ? ` · ${x.sellerCode}` : ""}
                </option>
              ))}
            </select>
          ) : user.role === "Approver" ? (
            <span className="own-history">Mis aprobaciones</span>
          ) : user.role === "Billing" ? (
            <span className="own-history">Facturación · órdenes aprobadas</span>
          ) : (
            <span className="own-history">Mi historial</span>
          )}</div>
        </div>
        <HorizontalScroller className="order-table-wrap">
          <table className="order-table">
            <thead>
              <tr>
                <th>N.º de pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th className="money">Total</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b className="order-number">{o.number}</b>
                  </td>
                  <td>{new Date(o.createdAt).toLocaleDateString("es-PE")}</td>
                  <td>
                    <b>{o.client}</b>
                  </td>
                  <td>{o.seller}</td>
                  <td>
                    <span className={`status-pill ${o.status.toLowerCase()}`}>{o.status === "Accepted" ? "Aceptado" : o.status === "Annulled" ? "Cancelado" : "Pendiente"}</span>
                    <small className="approval-progress">Aprobaciones: {o.approvalSummary}</small>
                  </td>
                  <td className="money">
                    <b>S/ {o.total.toFixed(2)}</b>
                  </td>
                  <td>
                    <div className="document-actions"><button className="view-order" onClick={async()=>setDetail(await request(`/workflow/orders/${o.id}`))}>Ver detalle</button>{o.status === "Accepted" && user.role !== "Approver" ? <><button className="pdf-button" onClick={() => void printProfessionalOrder(o.id,request)}>Imprimir</button><button className="pdf-button" onClick={() => void saveProfessionalOrderPdf(o.id,request)}>Guardar PDF</button></> : user.role === "Approver" && o.status === "Pending" && !o.currentUserDecision ? <div className="approval-actions"><button onClick={()=>decide(o.id,"Approved")}>Aprobar</button><button className="reject-order" onClick={()=>decide(o.id,"Rejected")}>Rechazar</button></div> : <span className="print-locked">{o.status === "Accepted" ? "Aprobación completada" : o.currentUserDecision ? "Decisión registrada" : "Esperando aprobación"}</span>}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="airy-empty">
              <div>▤</div>
              <h3>Aún no hay pedidos</h3>
              <p>Crea la primera orden para comenzar el historial.</p>
            </div>
          )}
        </HorizontalScroller>
      </div>
      {detail&&<DynamicOrderReview detail={detail} close={()=>setDetail(undefined)} decide={user.role==="Approver"&&detail.status==="Pending"&&!detail.currentUserDecision?async decision=>{await decide(detail.id,decision);setDetail(undefined)}:undefined}/>} 
      {open && (
        <OrderModal
          close={() => setOpen(false)}
          saved={() => {
            setOpen(false);
            showToast("Pedido emitido correctamente.","success");
            load();
          }}
        />
      )}
    </section>
  );
}

function DynamicOrderReview({detail:d,close,decide}:{detail:Detail;close:()=>void;decide?:((x:"Approved"|"Rejected")=>void)}){
 const[history,setHistory]=useState<ApprovalAudit[]>([]);
 useEffect(()=>{request(`/workflow/orders/${d.id}/history`).then(setHistory).catch(()=>setHistory([]))},[d.id]);
 const label=(s?:string)=>s==="Accepted"?"Aceptado":s==="Annulled"?"Cancelado":"Pendiente";
 return <div className="review-backdrop" role="dialog" aria-modal="true"><div className="review-dialog"><header><div><span>REVISIÓN DE PEDIDO</span><h2>{d.number}</h2><p>Revisa todos los datos y el registro de decisiones.</p></div><button onClick={close}>×</button></header><div className="review-body"><div className="review-status"><span className={`status-pill ${(d.status||"").toLowerCase()}`}>{label(d.status)}</span><div><b>Aprobaciones completadas</b><b>{d.approvalSummary||"0/0"}</b></div></div><div className="approval-history"><div className="approval-history-title"><b>Registro de aprobadores</b><small>Decisiones guardadas con usuario, fecha y hora</small></div>{history.length?<div className="approval-history-list">{history.map(x=><div key={`${x.userName}-${x.decidedAt}`}><span className={x.decision.toLowerCase()}>{x.decision==="Approved"?"Aprobado":"Rechazado"}</span><b>{x.userName}</b><small>Usuario aprobador</small><time>{new Date(x.decidedAt).toLocaleString("es-PE",{dateStyle:"medium",timeStyle:"short"})}</time></div>)}</div>:<p className="approval-history-empty">Aún no se registraron decisiones.</p>}</div><section className="review-info"><div><span>Cliente</span><b>{d.client}</b></div><div><span>Código de cliente</span><b>{d.clientCode}</b></div><div><span>RUC</span><b>{d.ruc}</b></div><div><span>Fecha</span><b>{new Date(d.createdAt).toLocaleString("es-PE")}</b></div><div><span>Vendedor</span><b>{d.seller}</b></div><div><span>Código vendedor</span><b>{d.sellerCode||d.seller}</b></div><div className="wide"><span>Dirección fiscal</span><b>{d.fiscalAddress||"—"}</b></div><div className="wide"><span>Dirección de entrega</span><b>{d.deliveryAddress||"—"}</b></div><div><span>Forma de pago</span><b>{d.paymentTerms||"—"}</b></div><div className="wide"><span>Observaciones</span><b>{d.deliveryNotes||"Sin observaciones"}</b></div></section><HorizontalScroller className="review-lines"><table><thead><tr><th>Código</th><th>Descripción</th><th>Presentación</th><th>Cantidad</th><th>Precio unit.</th><th>Importe</th></tr></thead><tbody>{d.items.map(x=><tr key={x.productCode}><td><b>{x.productCode}</b></td><td>{x.description}</td><td>{(x as any).size||"—"}</td><td>{x.quantity}</td><td>S/ {x.unitPrice.toFixed(2)}</td><td><b>S/ {x.amount.toFixed(2)}</b></td></tr>)}</tbody></table></HorizontalScroller></div><footer><div><span>TOTAL</span><b>S/ {d.total.toFixed(2)}</b></div><div><button className="secondary" onClick={close}>Cerrar</button>{decide&&<><button className="review-reject" onClick={()=>decide("Rejected")}>Rechazar</button><button onClick={()=>decide("Approved")}>Aprobar orden</button></>}</div></footer></div></div>
}

function OrderReview({detail:d,close,decide,area}:{detail:Detail;close:()=>void;decide?:((x:"Approved"|"Rejected")=>void);area?:string}){
 const[history,setHistory]=useState<ApprovalAudit[]>([]);
 useEffect(()=>{request(`/orders/${d.id}/approval-history`).then(setHistory).catch(()=>setHistory([]))},[d.id]);
 const label=(s?:string)=>s==="Accepted"?"Aceptado":s==="Annulled"?"Cancelado":"Pendiente";
 const approval=(s?:string)=>s==="Approved"?"Aprobado":s==="Rejected"?"Rechazado":"Pendiente";
 const canDecide=decide&&((area==="Alfredo"&&!d.alfredoApproval)||(area==="Credits"&&!d.creditsApproval));
 return <div className="review-backdrop" role="dialog" aria-modal="true"><div className="review-dialog"><header><div><span>REVISIÓN DE PEDIDO</span><h2>{d.number}</h2><p>Revisa todos los datos antes de aprobar o rechazar.</p></div><button onClick={close}>×</button></header><div className="review-body"><div className="review-status"><span className={`status-pill ${(d.status||"").toLowerCase()}`}>{label(d.status)}</span><div><b>Alfredo: {approval(d.alfredoApproval)}</b><b>Créditos: {approval(d.creditsApproval)}</b></div></div><div className="approval-history"><div className="approval-history-title"><b>Registro de aprobaciones</b><small>Decisiones guardadas con fecha y hora</small></div>{history.length?<div className="approval-history-list">{history.map(x=><div key={`${x.area}-${x.decidedAt}`}><span className={x.decision.toLowerCase()}>{x.decision==="Approved"?"Aprobado":"Rechazado"}</span><b>{x.area==="Credits"?"Créditos":x.area}</b><small>por {x.userName}</small><time>{new Date(x.decidedAt).toLocaleString("es-PE",{dateStyle:"medium",timeStyle:"short"})}</time></div>)}</div>:<p className="approval-history-empty">Aún no se registraron decisiones.</p>}</div><section className="review-info"><div><span>Cliente</span><b>{d.client}</b></div><div><span>Código de cliente</span><b>{d.clientCode}</b></div><div><span>RUC</span><b>{d.ruc}</b></div><div><span>Fecha</span><b>{new Date(d.createdAt).toLocaleString("es-PE")}</b></div><div><span>Vendedor</span><b>{d.seller}</b></div><div><span>Código vendedor</span><b>{d.sellerCode||d.seller}</b></div><div className="wide"><span>Dirección fiscal</span><b>{d.fiscalAddress||"—"}</b></div><div className="wide"><span>Dirección de entrega</span><b>{d.deliveryAddress||"—"}</b></div><div><span>Forma de pago</span><b>{d.paymentTerms||"—"}</b></div><div className="wide"><span>Observaciones</span><b>{d.deliveryNotes||"Sin observaciones"}</b></div></section><HorizontalScroller className="review-lines"><table><thead><tr><th>Código</th><th>Descripción</th><th>Presentación</th><th>Cantidad</th><th>Precio unit.</th><th>Importe</th></tr></thead><tbody>{d.items.map(x=><tr key={x.productCode}><td><b>{x.productCode}</b></td><td>{x.description}</td><td>{(x as any).size||"—"}</td><td>{x.quantity}</td><td>S/ {x.unitPrice.toFixed(2)}</td><td><b>S/ {x.amount.toFixed(2)}</b></td></tr>)}</tbody></table></HorizontalScroller></div><footer><div><span>TOTAL</span><b>S/ {d.total.toFixed(2)}</b></div><div><button className="secondary" onClick={close}>Cerrar</button>{canDecide&&<><button className="review-reject" onClick={()=>decide!("Rejected")}>Rechazar</button><button onClick={()=>decide!("Approved")}>Aprobar orden</button></>}</div></footer></div></div>
}

function LegacyOrderModal({
  close,
  saved,
}: {
  close: () => void;
  saved: () => void;
}) {
  const [clients, setClients] = useState<Client[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [client, setClient] = useState<Client>(),
    [cq, setCq] = useState(""),
    [pq, setPq] = useState(""),
    [items, setItems] = useState<Item[]>([]),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [seller, setSeller] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    request("/clients?q=" + encodeURIComponent(cq)).then(setClients);
  }, [cq]);
  useEffect(() => {
    request("/products?q=" + encodeURIComponent(pq)).then(setProducts);
  }, [pq]);
  useEffect(() => {
    request("/auth/me").then((x) => setSeller(x.user));
  }, []);
  const total = items.reduce((a, i) => a + i.quantity * i.price, 0);
  const submit = async () => {
    if (busy) return;
    if (!client) { showToast("Selecciona un cliente antes de emitir el pedido.", "warning"); return; }
    if (!items.length) { showToast("Agrega al menos un producto al pedido.", "warning"); return; }
    const invalidQuantity = items.find((item) => item.quantity <= 0);
    if (invalidQuantity) { showToast(`Ingresa una cantidad válida para ${invalidQuantity.description}.`, "warning"); return; }
    const withoutStock = items.find((item) => item.quantity > item.stock);
    if (withoutStock) { showToast(`Stock insuficiente para ${withoutStock.description}. Disponible: ${withoutStock.stock}.`, "warning"); return; }
    setBusy(true);
    setError("");
    try {
      const created = await request("/orders", {
        method: "POST",
        body: JSON.stringify({
          clientId: client!.id,
          deliveryAddress: client!.deliveryAddress,
          deliveryNotes: notes,
          paymentTerms: client!.paymentTerms,
          items: items.map((i) => ({
            productCode: i.code,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
        }),
      });
      await printOrder(created.id);
      saved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal order-modal" role="dialog" aria-modal="true">
      <div className="order-dialog">
        <div className="dialog-header">
          <div>
            <span className="eyebrow">NUEVO PEDIDO</span>
            <h2>Crear orden de pedido</h2>
            <p>Completa los datos y agrega productos con stock disponible.</p>
          </div>
          <button className="close-button" onClick={close}>
            ×
          </button>
        </div>
        <div className="dialog-body">
          <div className="form-section">
            <div className="section-title">
              <span>1</span>
              <div>
                <b>Datos del cliente y del pedido</b>
                <small>Información del formato oficial</small>
              </div>
            </div>
            <label>
              Cliente
              <div className="lookup">
                <input
                  value={cq}
                  onChange={(e) => {
                    setCq(e.target.value);
                    setClient(undefined);
                  }}
                  placeholder="Buscar por código, RUC o nombre"
                />
                <span>⌕</span>
              </div>
            </label>
            {!client && cq && (
              <div className="picker-panel">
                {clients.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setClient(c);
                      setCq(c.name);
                    }}
                  >
                    <div>
                      <b>{c.name}</b>
                      <small>
                        {c.code} · RUC {c.ruc}
                      </small>
                    </div>
                    <span>Seleccionar</span>
                  </button>
                ))}
              </div>
            )}
            {client && (
              <div className="order-data-grid">
                <label>
                  Cliente
                  <input value={client.name} readOnly />
                </label>
                <label>
                  Código de cliente
                  <input value={client.code} readOnly />
                </label>
                <label>
                  Dirección fiscal
                  <input value={client.fiscalAddress || ""} readOnly />
                </label>
                <label>
                  Cód. de vendedor
                  <input value={seller} readOnly />
                </label>
                <label>
                  RUC
                  <input value={client.ruc} readOnly />
                </label>
                <label>
                  Fecha
                  <input
                    value={new Date().toLocaleDateString("es-PE")}
                    readOnly
                  />
                </label>
                <label>
                  Forma de pago
                  <input value={client.paymentTerms || ""} readOnly />
                </label>
                <label>
                  Dirección de entrega
                  <input value={client.deliveryAddress || ""} readOnly />
                </label>
              </div>
            )}
          </div>
          <div className="form-section">
            <div className="section-title">
              <span>2</span>
              <div>
                <b>Productos del pedido</b>
                <small>Código, cantidad, descripción, precio e importe</small>
              </div>
            </div>
            <label>
              Buscar producto
              <div className="lookup">
                <input
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  placeholder="Escribe el código o descripción"
                />
                <span>⌕</span>
              </div>
            </label>
            {pq && (
              <div className="picker-panel product-picker">
                {products
                  .filter(
                    (p) => p.stock > 0 && !items.some((i) => i.code === p.code),
                  )
                  .slice(0, 6)
                  .map((p) => (
                    <button
                      key={p.code}
                      onClick={() => {
                        setItems([
                          ...items,
                          { ...p, quantity: 1, price: p.unitPrice },
                        ]);
                        setPq("");
                      }}
                    >
                      <div>
                        <b>{p.description}</b>
                        <small>
                          {p.code} · {p.size}
                        </small>
                      </div>
                      <span className="stock-chip">Stock {p.stock}</span>
                    </button>
                  ))}
              </div>
            )}
            <div className="dialog-table">
              <table>
                <thead>
                  <tr>
                    <th>Cód. producto</th>
                    <th>Cantidad</th>
                    <th>Descripción</th>
                    <th>Stock</th>
                    <th>Precio unit.</th>
                    <th>Importe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i, n) => (
                    <tr key={i.code}>
                      <td>
                        <b>{i.code}</b>
                      </td>
                      <td>
                        <input
                          type="number"
                          min=".001"
                          max={i.stock}
                          value={i.quantity}
                          onChange={(e) =>
                            setItems(
                              items.map((x, k) =>
                                k === n
                                  ? { ...x, quantity: +e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>{i.description}</td>
                      <td>{i.stock}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step=".01"
                          value={i.price}
                          onChange={(e) =>
                            setItems(
                              items.map((x, k) =>
                                k === n ? { ...x, price: +e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <b>S/ {(i.quantity * i.price).toFixed(2)}</b>
                      </td>
                      <td>
                        <button
                          className="remove-line"
                          onClick={() =>
                            setItems(items.filter((_, k) => k !== n))
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!items.length && (
                <div className="line-empty">
                  Agrega productos usando el buscador.
                </div>
              )}
            </div>
          </div>
          <div className="form-section">
            <div className="section-title">
              <span>3</span>
              <div>
                <b>Observaciones de entrega</b>
                <small>Indicaciones adicionales</small>
              </div>
            </div>
            <label>
              Obs. de entrega
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Horario, referencia o indicaciones para la entrega"
              />
            </label>
          </div>
        </div>
        <div className="dialog-footer">
          <div>
            {error && <span className="inline-error">{error}</span>}
            <span className="grand-total">
              TOTAL <b>S/ {total.toFixed(2)}</b>
            </span>
          </div>
          <div>
            <button className="secondary" onClick={close}>
              Cancelar
            </button>
            <button
              disabled={busy}
              onClick={submit}
            >
              {busy ? "Emitiendo..." : "Emitir e imprimir PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
