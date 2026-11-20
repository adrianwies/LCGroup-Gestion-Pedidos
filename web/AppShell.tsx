import { useEffect, useRef, useState } from "react";
import { Dashboard, NavIcon } from "./Dashboard";
import { OrdersModule } from "./OrdersModule";
import { ClientsModule, SellersModule, StockModule } from "./EntityModules";
import { UsersModule } from "./UsersModule";
import { NotificationBell } from "./NotificationBell";
import { SettingsModule } from "./SettingsModule";
import { ToastHost, showToast } from "./Toast";
const api = async (path: string, init?: RequestInit, silent = false) => {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data=r.status===204?null:await r.json().catch(()=>null);
  if (!r.ok) { const message=data?.message||"No se pudo completar la acción."; if(!silent)showToast(message,"error"); throw Error(message); }
  if(r.status!==204&&data===null){const message="El servidor no devolvió una respuesta válida.";if(!silent)showToast(message,"error");throw Error(message)}
  return data;
};
export function AppShell() {
  const accountRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(),
    [view, setView] = useState("dashboard"),
    [userMenuOpen, setUserMenuOpen] = useState(false),
    [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    api("/auth/me", undefined, true)
      .then(setUser)
      .catch(() => {});
  }, []);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  useEffect(() => { const outside = (e: MouseEvent) => { if (accountRef.current && !accountRef.current.contains(e.target as Node)) setUserMenuOpen(false); }; const escape = (e: KeyboardEvent) => { if (e.key === "Escape") setUserMenuOpen(false); }; document.addEventListener("mousedown", outside); window.addEventListener("keydown", escape); return () => { document.removeEventListener("mousedown", outside); window.removeEventListener("keydown", escape); }; }, []);
  useEffect(() => { document.body.classList.toggle("compact-ui", localStorage.getItem("demo.density") === "compact"); }, []);
  useEffect(() => { if (!user) return; const url=new URL(location.href),number=url.searchParams.get("orderNumber"); if(number){sessionStorage.setItem("demo.openOrder",number);setView("orders");url.searchParams.delete("orderNumber");history.replaceState({},"",url.pathname+url.search+url.hash);window.setTimeout(()=>window.dispatchEvent(new CustomEvent("demo:open-order",{detail:number})),120)} }, [user]);
  if (!user) return <><ToastHost/><Login done={setUser} /></>;
  const navigateTo = (next: string) => { setView(next); setMobileMenuOpen(false); };
  const logout = () => api("/auth/logout", { method: "POST" }).then(() => location.reload());
  return (
    <div className="airy-app top-layout"><ToastHost />
      <header className="top-navigation">
        <a className="app-logo-link" href="/" aria-label="LC Group - Inicio"><img className="theme-logo theme-logo-light" src="/branding/logolcgroup.png" alt="LC Group" /><img className="theme-logo theme-logo-dark" src="/branding/logolcgroup-white.png" alt="" aria-hidden="true" /></a>
        <button className={`mobile-menu-toggle ${mobileMenuOpen ? "open" : ""}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Abrir menú" aria-expanded={mobileMenuOpen}><i/><i/><i/></button>
        <span className="mobile-title">Gestión comercial</span>
        <nav className={`top-links ${mobileMenuOpen ? "mobile-open" : ""}`} aria-label="Navegación principal">
          <div className="mobile-nav-head"><b>Menú principal</b><button onClick={() => setMobileMenuOpen(false)} aria-label="Cerrar menú">×</button></div>
          <button onClick={() => navigateTo("dashboard")} className={view === "dashboard" ? "on" : ""}><NavIcon name="grid" size={16}/><span>Inicio</span></button>
          <button onClick={() => navigateTo("orders")} className={view === "orders" ? "on" : ""}><NavIcon name="orders" size={16}/><span>Órdenes de pedido</span></button>
          {(user.role === "Admin" || user.role === "Seller") && <button onClick={() => navigateTo("clients")} className={view === "clients" ? "on" : ""}><NavIcon name="clients" size={16}/><span>Clientes</span></button>}
          {user.role === "Admin" && <button onClick={() => navigateTo("sellers")} className={view === "sellers" ? "on" : ""}><NavIcon name="clients" size={16}/><span>Vendedores</span></button>}
          {user.role === "Admin" && <button onClick={() => navigateTo("users")} className={view === "users" ? "on" : ""}><NavIcon name="clients" size={16}/><span>Usuarios</span></button>}
          {(user.role === "Admin" || user.role === "Seller") && <button onClick={() => navigateTo("stock")} className={view === "stock" ? "on" : ""}><NavIcon name="stock" size={16}/><span>Stock</span></button>}
        </nav>
        <div className="top-actions">
          <NotificationBell onOpenOrder={(number)=>{sessionStorage.setItem("demo.openOrder",number);setView("orders");window.setTimeout(()=>window.dispatchEvent(new CustomEvent("demo:open-order",{detail:number})),50)}} />
          <button className={`top-settings ${view === "settings" ? "on" : ""}`} onClick={() => navigateTo("settings")} aria-label="Abrir configuración" title="Configuración"><NavIcon name="settings" size={20}/></button>
          <div className="account-menu" ref={accountRef}>
            <button className="account-trigger" onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen} aria-label={`Cuenta de ${user.user}`}>
              <span className="account-avatar" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 21v-1.5a7.5 7.5 0 0 1 15 0V21"/></svg></span><span className="account-identity"><strong>{user.user}</strong><small>{user.role === "Admin" ? "Administrador" : user.role === "Approver" ? "Aprobador" : user.role === "Billing" ? "Facturación" : user.role === "Warehouse" ? "Almacén" : "Vendedor"}</small></span><svg className="account-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
            </button>
            {userMenuOpen && <div className="account-dropdown">
              <div><b>{user.user}</b><small>Sesión activa</small></div>
              <button onClick={logout}>Cerrar sesión</button>
            </div>}
          </div>
        </div>
      </header>
      {mobileMenuOpen && <button className="mobile-nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)}/>} 
      <main className="airy-main top-main">
          {view === "dashboard" ? (
            <Dashboard role={user.role} navigate={navigateTo} />
          ) : view === "orders" ? (
            <OrdersModule user={user} />
          ) : view === "clients" ? (
            <ClientsModule role={user.role} />
          ) : view === "sellers" ? (
            <SellersModule />
          ) : view === "users" ? (
            <UsersModule />
          ) : view === "stock" ? (
            <StockModule role={user.role} />
          ) : (
            <SettingsModule user={user} onLogout={logout} />
          )}
      </main>
    </div>
  );
}
function Login({ done }: { done: (x: any) => void }) {
  const [u, setU] = useState("admin"),
    [p, setP] = useState(""),
    [e, setE] = useState("");
  return (
    <div className="login">
      <form
        onSubmit={async (x) => {
          x.preventDefault();
          try {
            done(
              await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({ userName: u, password: p }),
              }),
            );
          } catch {
            setE("Usuario o contraseña incorrectos.");
          }
        }}
      >
        <img className="login-logo theme-logo-light" src="/branding/logolcgroup.png" alt="LC Group" />
        <img className="login-logo theme-logo-dark" src="/branding/logolcgroup-white.png" alt="" aria-hidden="true" />
        <h1>Bienvenido</h1>
        <p>Ingresa al entorno de demostración.</p>
        <label>
          Usuario
          <input value={u} onChange={(x) => setU(x.target.value)} />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={p}
            onChange={(x) => setP(x.target.value)}
          />
        </label>
        {e && <div className="error">{e}</div>}
        <button>Iniciar sesión</button>
      </form>
    </div>
  );
}
