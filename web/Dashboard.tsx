import { useEffect, useState } from "react";
const paths: Record<string, string> = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  orders:
    "M5 3h14v18l-2-1.5L15 21l-3-1.5L9 21l-2-1.5L5 21V3z M8 8h8 M8 12h8 M8 16h5",
  clients:
    "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6",
  stock: "M3 10l9-6 9 6v11H3V10z M7 21v-7h10v7 M3 10h18",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  layers: "M2 7l10-5 10 5-10 5L2 7z M2 12l10 5 10-5",
  settings: "M12 2.5l1.4 2.1 2.5.4 1.7-1.8 3.2 3.2-1.8 1.7.4 2.5 2.1 1.4-2.1 1.4-.4 2.5 1.8 1.7-3.2 3.2-1.7-1.8-2.5.4-1.4 2.1-1.4-2.1-2.5-.4-1.7 1.8-3.2-3.2 1.8-1.7-.4-2.5L2.5 12l2.1-1.4L5 8.1 3.2 6.4l3.2-3.2L8.1 5l2.5-.4L12 2.5z M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
};
export function NavIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
export function Dashboard({
  role,
  navigate,
}: {
  role: string;
  navigate: (v: string) => void;
}) {
  const [orders, setOrders] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [clients, setClients] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/workflow/orders")
      .then((r) => r.json())
      .then(setOrders);
    fetch("/api/products?q=")
      .then((r) => r.json())
      .then(setProducts);
    fetch("/api/entities/clients?q=")
      .then((r) => r.json())
      .then(setClients);
  }, []);
  const modules = [
    {
      id: "orders",
      name: "Órdenes de pedido",
      desc: "Emite pedidos comerciales usando productos disponibles y clientes registrados.",
      icon: "orders",
      metric: orders.length,
      label: "pedidos",
    },
    {
      id: "clients",
      name: "Clientes",
      desc: "Administra datos fiscales, direcciones de entrega y condiciones comerciales.",
      icon: "clients",
      metric: clients.length,
      label: "clientes",
    },
    {
      id: "stock",
      name: "Inventario y stock",
      desc: "Consulta productos disponibles y actualiza existencias desde el formato Excel.",
      icon: "stock",
      metric: products.length,
      label: "productos",
      admin: true,
    },
  ].filter((m) => role === "Approver" || role === "Billing" ? m.id === "orders" : !m.admin || role === "Admin");
  const statusCount = {
    accepted: orders.filter((o) => o.status === "Accepted").length,
    pending: orders.filter((o) => o.status === "Pending").length,
    annulled: orders.filter((o) => o.status === "Annulled").length,
  };
  const statusTotal = Math.max(orders.length, 1);
  const acceptedAngle = (statusCount.accepted / statusTotal) * 360;
  const pendingAngle = acceptedAngle + (statusCount.pending / statusTotal) * 360;
  const orderTotal = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const stockRanking = [...products].sort((a, b) => Number(b.stock) - Number(a.stock)).slice(0, 5);
  const highestStock = Math.max(...stockRanking.map((p) => Number(p.stock)), 1);
  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">INICIO</span>
          <h1>Resumen general</h1>
          <p>
            Una experiencia clara y conectada para gestionar pedidos, clientes e
            inventario.
          </p>
        </div>
        <span className="version-pill">LC GROUP</span>
      </div>
      <div className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-badge">
            <i /> GESTIÓN COMERCIAL
          </span>
          <h2>
            Tu operación comercial,
            <br />
            simple y conectada.
          </h2>
          <p>
            Stock actualizado, clientes organizados y pedidos emitidos desde una
            misma plataforma profesional.
          </p>
          <button onClick={() => { if (role === "Admin" || role === "Seller") sessionStorage.setItem("demo.newOrder", "1"); navigate("orders"); }}>
            {role === "Approver" ? "Revisar órdenes" : role === "Billing" ? "Ver órdenes aprobadas" : "Crear una orden"} <NavIcon name="arrow" size={18} />
          </button>
        </div>
        <div className="hero-brand neutral-hero-art" aria-hidden="true">
          <img className="theme-logo-light" src="/branding/logolcgroup.png" alt="" />
          <img className="theme-logo-dark" src="/branding/logolcgroup-white.png" alt="" />
        </div>
      </div>
      <div className="dashboard-metrics">
        <div>
          <span>Módulos habilitados</span>
          <b>{modules.length}</b>
          <small>Según el perfil de acceso</small>
          <NavIcon name="grid" />
        </div>
        <div>
          <span>Productos disponibles</span>
          <b>{products.filter((p) => p.stock > 0).length}</b>
          <small>Con existencias registradas</small>
          <NavIcon name="layers" />
        </div>
        <div>
          <span>Órdenes emitidas</span>
          <b>{orders.length}</b>
          <small>Historial comercial</small>
          <NavIcon name="orders" />
        </div>
      </div>
      <div className="reports-heading">
        <div><h2>Indicadores operativos</h2><p>Resumen calculado con la información disponible en el sistema.</p></div>
      </div>
      <div className="mini-reports">
        <article className="report-card status-report">
          <header><div><span>ÓRDENES</span><h3>Estado de pedidos</h3></div><b>{orders.length}</b></header>
          <div className="status-chart">
            <div className="donut" style={{background: orders.length ? `conic-gradient(#356b5d 0 ${acceptedAngle}deg,#d6a348 ${acceptedAngle}deg ${pendingAngle}deg,#a96a64 ${pendingAngle}deg 360deg)` : "#e7eae6"}}><span><b>{orders.length}</b><small>Total</small></span></div>
            <ul><li><i className="accepted"/><span>Aceptadas</span><b>{statusCount.accepted}</b></li><li><i className="pending"/><span>Pendientes</span><b>{statusCount.pending}</b></li><li><i className="annulled"/><span>Anuladas</span><b>{statusCount.annulled}</b></li></ul>
          </div>
        </article>
        <article className="report-card amount-report">
          <header><div><span>ACTIVIDAD COMERCIAL</span><h3>Importe de pedidos</h3></div><NavIcon name="orders" size={19}/></header>
          <strong>S/ {orderTotal.toLocaleString("es-PE", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong><p>Importe acumulado de las órdenes visibles para tu perfil.</p>
          <div className="report-progress"><i style={{width: `${orders.length ? Math.max((statusCount.accepted / orders.length) * 100, 4) : 0}%`}}/></div><small>{orders.length ? Math.round((statusCount.accepted / orders.length) * 100) : 0}% de pedidos aceptados</small>
        </article>
        <article className="report-card stock-report">
          <header><div><span>INVENTARIO</span><h3>Productos con mayor stock</h3></div><NavIcon name="stock" size={19}/></header>
          <div className="stock-bars">{stockRanking.map((product) => <div key={product.code}><span title={product.description}>{product.code}</span><i><b style={{width: `${Math.max((Number(product.stock) / highestStock) * 100, 2)}%`}}/></i><strong>{Number(product.stock).toLocaleString("es-PE", {maximumFractionDigits: 3})}</strong></div>)}{!stockRanking.length && <p>Sin productos registrados.</p>}</div>
        </article>
      </div>
      <div className="modules-heading">
        <div>
          <h2>Módulos del sistema</h2>
          <p>Accede a las funciones principales del sistema de demostración.</p>
        </div>
      </div>
      <div className="module-tiles">
        {modules.map((m) => (
          <button key={m.id} onClick={() => navigate(m.id)}>
            <span className="module-icon">
              <NavIcon name={m.icon} size={22} />
            </span>
            <div>
              <small>{m.label.toUpperCase()}</small>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
            <strong>{m.metric}</strong>
            <NavIcon name="arrow" size={17} />
          </button>
        ))}
      </div>
    </section>
  );
}
