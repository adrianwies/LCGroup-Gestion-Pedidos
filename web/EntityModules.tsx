import { useEffect, useState } from "react";
import "./entity-modules.css";
import "./entity-edit.css";
import { RecordPicker } from "./RecordPicker";
import { HorizontalScroller } from "./HorizontalScroller";
import { showToast } from "./Toast";
const api = async (path: string, init?: RequestInit) => {
  const r = await fetch("/api" + path, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!r.ok) { const message=(await r.json().catch(()=>({message:"No se pudo completar la operación."}))).message||"No se pudo completar la operación."; showToast(message,"error"); throw Error(message); }
  return r.status === 204 ? null : r.json();
};
export function ClientsModule({ role = "Admin" }: { role?: string }) {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [editing, setEditing] = useState<any | null>(null),
    [importing, setImporting] = useState(false),
    [msg, setMsg] = useState("");
  const load = () =>
    api("/entities/clients?q=" + encodeURIComponent(q)).then(setRows);
  useEffect(() => {
    void load();
  }, [q]);
  return (
    <section className="entity-page">
      <Header
        eyebrow="MAESTROS"
        title="Clientes"
        text="Administra datos fiscales, direcciones y vendedores asignados."
        add={() => setEditing({})}
        importing={role === "Admin" ? () => setImporting(true) : undefined}
      />
      <ListSearch q={q} setQ={setQ} count={rows.length} />
      <HorizontalScroller className="entity-list">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Razón social</th>
              <th>R.U.C.</th>
              <th>Dirección</th>
              <th>Vendedor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.code}</b>
                </td>
                <td>{x.name}</td>
                <td>{x.ruc}</td>
                <td>{x.fiscalAddress || "—"}</td>
                <td>
                  <span className="seller-chip">
                    {x.sellerCode || "Sin asignar"}
                  </span>
                </td>
                <td>
                  <button className="edit-row" onClick={() => setEditing(x)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScroller>
      {editing && (
        <ClientForm
          role={role}
          client={editing.id ? editing : undefined}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {importing && (
        <ImportModal
          close={() => setImporting(false)}
          done={(x) => {
            showToast(x,"success");
            setImporting(false);
            load();
          }}
        />
      )}
    </section>
  );
}
export function SellersModule() {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<any[]>([]),
    [editing, setEditing] = useState<any | null>(null),
    [importing, setImporting] = useState(false),
    [msg, setMsg] = useState("");
  const load = () => api("/sellers?q=" + encodeURIComponent(q)).then(setRows);
  useEffect(() => {
    void load();
  }, [q]);
  return (
    <section className="entity-page">
      <Header
        eyebrow="VENTAS"
        title="Vendedores"
        text="Mantén los códigos comerciales y sus divisiones o segmentos."
        add={() => setEditing({})}
        importing={() => setImporting(true)}
      />
      <ListSearch q={q} setQ={setQ} count={rows.length} />
      <HorizontalScroller className="entity-list">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Vendedor / Descripción</th>
              <th>División</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.code}>
                <td>
                  <b>{x.code}</b>
                </td>
                <td>{x.name}</td>
                <td>{x.division || "—"}</td>
                <td>
                  <span className="active-chip">Activo</span>
                </td>
                <td><button className="edit-row" onClick={() => setEditing(x)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScroller>
      {editing && (
        <SellerForm
          seller={editing.code ? editing : undefined}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
      {importing && (
        <ImportModal
          close={() => setImporting(false)}
          done={(x) => {
            showToast(x,"success");
            setImporting(false);
            load();
          }}
        />
      )}
    </section>
  );
}
export function StockModule() {
  const [file, setFile] = useState<File>(),
    [importOpen, setImportOpen] = useState(false),
    [msg, setMsg] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [products, setProducts] = useState<any[]>([]),
    [q, setQ] = useState(""),
    [availability, setAvailability] = useState("all");
  const load = async () => {
    setLoading(true);
    try {
      setProducts(await api("/stock/products"));
      setError("");
    } catch (e: any) {
      setError(e.message || "No se pudo consultar el stock.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const normalized = q.trim().toLocaleLowerCase("es");
  const visible = products.filter((x) => {
    const matches = !normalized || `${x.code} ${x.description} ${x.size}`.toLocaleLowerCase("es").includes(normalized);
    const stockMatches = availability === "all" || (availability === "available" ? x.stock > 0 : x.stock <= 0);
    return matches && stockMatches;
  });
  const available = products.filter((x) => x.stock > 0).length;
  const perseoBoxes = products.reduce((sum, x) => sum + Number(x.stock || 0), 0);
  const totalBoxes = products.reduce((sum, x) => sum + Number(x.totalStock || 0), 0);
  const importStock = async () => {
    if (!file) { showToast("Selecciona un archivo Excel antes de actualizar el stock.", "warning"); return; }
    setBusy(true);
    setMsg("");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api("/stock/import", { method: "POST", body: form });
      showToast(`Stock reemplazado: ${result.imported} productos. PERSEO: ${Number(result.perseoBoxes).toLocaleString("es-PE")} cajas.`,"success");
      await load();
      setFile(undefined);
      setImportOpen(false);
    } catch (e: any) {
      setError(e.message || "No se pudo importar el archivo.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="entity-page stock-page">
      <div className="entity-heading">
        <div>
          <span>INVENTARIO</span>
          <h1>Stock</h1>
          <p>Consulta existencias y actualiza el inventario desde el formato oficial.</p>
        </div>
        <div><button onClick={() => { setError(""); setImportOpen(true); }}>⇧ Importar Excel</button></div>
      </div>
      <div className="stock-summary" aria-label="Resumen de inventario">
        <article><span>Productos cargados</span><strong>{products.length.toLocaleString("es-PE")}</strong></article>
        <article><span>Con existencias</span><strong>{available.toLocaleString("es-PE")}</strong></article>
        <article><span>Cajas en PERSEO</span><strong>{perseoBoxes.toLocaleString("es-PE", { maximumFractionDigits: 3 })}</strong></article>
        <article><span>Total general</span><strong>{totalBoxes.toLocaleString("es-PE", { maximumFractionDigits: 3 })}</strong></article>
      </div>
      <div className="stock-inventory">
        <div className="stock-list-head">
          <div><h2>Stock cargado</h2><p>Consulta los productos y existencias del último archivo procesado.</p></div>
          <span>{visible.length.toLocaleString("es-PE")} resultado{visible.length === 1 ? "" : "s"}</span>
        </div>
        <div className="stock-list-tools">
          <label className="stock-search"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, descripción o presentación" aria-label="Buscar productos" /></label>
          <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Filtrar por disponibilidad">
            <option value="all">Todos los productos</option>
            <option value="available">Con stock</option>
            <option value="empty">Sin stock</option>
          </select>
        </div>
        <div className="stock-table-wrap">
          <table className="stock-table">
            <thead><tr><th>Código</th><th>Producto</th><th>Size</th><th>Pack</th><th>PERSEO</th><th>TOTAL</th><th>Actualizado (Lima)</th></tr></thead>
            <tbody>
              {visible.map((x) => <tr key={x.code}>
                <td><b>{x.code}</b></td><td>{x.description}</td><td>{x.size || "—"}</td><td>{x.pack}</td>
                <td><span className={`stock-level ${x.stock > 0 ? "positive" : "empty"}`}>{Number(x.stock).toLocaleString("es-PE", { maximumFractionDigits: 3 })}</span></td>
                <td>{Number(x.totalStock).toLocaleString("es-PE", { maximumFractionDigits: 3 })}</td>
                <td>{new Date(x.updatedAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })}</td>
              </tr>)}
            </tbody>
          </table>
          {!loading && visible.length === 0 && <div className="stock-empty">No hay productos que coincidan con los filtros.</div>}
          {loading && <div className="stock-empty">Cargando inventario...</div>}
        </div>
      </div>
      {importOpen && <div className="entity-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setImportOpen(false); }}>
        <div className="entity-dialog stock-import-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-import-title">
          <header><div><h2 id="stock-import-title">Importar stock</h2><p>Reemplaza el inventario vigente utilizando el archivo Excel oficial.</p></div><button aria-label="Cerrar" disabled={busy} onClick={() => setImportOpen(false)}>×</button></header>
          <div className="stock-import-body">
            <div className="stock-import-note"><strong>Columnas requeridas</strong><span>Código, Descripción, Size, Pack, PERSEO y TOTAL. PERSEO se utiliza como stock vendible.</span></div>
            <label className="stock-file-picker"><span>Archivo Excel</span><input type="file" accept=".xlsx" onChange={(e) => { setFile(e.target.files?.[0]); setError(""); }}/><small>{file ? file.name : "Selecciona un archivo .xlsx"}</small></label>
            {error && <div className="stock-error">{error}</div>}
          </div>
          <footer className="stock-import-footer"><button className="secondary" disabled={busy} onClick={() => setImportOpen(false)}>Cancelar</button><button className="primary-action" disabled={busy} onClick={importStock}>{busy ? "Actualizando..." : "Actualizar stock"}</button></footer>
        </div>
      </div>}
    </section>
  );
}
function Header({
  eyebrow,
  title,
  text,
  add,
  importing,
}: {
  eyebrow: string;
  title: string;
  text: string;
  add: () => void;
  importing?: () => void;
}) {
  return (
    <div className="entity-heading">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div>
        {importing && (
          <button className="outline-action" onClick={importing}>
            ⇧ Importar Excel
          </button>
        )}
        <button onClick={add}>＋ Nuevo</button>
      </div>
    </div>
  );
}
function ListSearch({
  q,
  setQ,
  count,
}: {
  q: string;
  setQ: (x: string) => void;
  count: number;
}) {
  return (
    <div className="entity-tools">
      <label>
        <span>⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código, nombre o RUC"
        />
      </label>
      <small>{count} resultado(s)</small>
    </div>
  );
}
function ClientForm({
  role,
  client,
  close,
  saved,
}: {
  role: string;
  client?: any;
  close: () => void;
  saved: () => void;
}) {
  const empty = {
    code: "",
    name: "",
    ruc: "",
    fiscalAddress: "",
    deliveryAddress: "",
    paymentTerms: "",
    sellerCode: "",
  };
  const [v, setV] = useState<any>(client ?? empty);
  const [sellerName, setSellerName] = useState("");
  const [pickingSeller, setPickingSeller] = useState(false);
  useEffect(() => {
    if (!v.sellerCode) {
      setSellerName("");
      return;
    }
    api("/sellers?q=" + encodeURIComponent(v.sellerCode)).then((rows) => {
      const exact = rows.find(
        (x: any) => x.code.toLowerCase() === v.sellerCode.toLowerCase(),
      );
      setSellerName(exact?.name ?? "Código no encontrado");
    });
  }, [v.sellerCode]);
  return (
    <Modal
      title={client ? "Editar cliente" : "Nuevo cliente"}
      subtitle={
        client
          ? "Actualiza sus datos y reasigna el vendedor cuando sea necesario."
          : "Registra los datos comerciales del cliente."
      }
      close={close}
    >
      <form
        className="entity-form"
        onInvalid={(e) => { e.preventDefault(); showToast("Completa los campos obligatorios del cliente.", "warning"); }}
        onSubmit={async (e) => {
          e.preventDefault();
          await api(client ? `/entities/clients/${client.id}` : "/entities/clients", {
            method: client ? "PUT" : "POST",
            body: JSON.stringify(v),
          });
          saved();
        }}
      >
        {[
          ["code", "Código"],
          ["name", "Razón social"],
          ["ruc", "R.U.C."],
          ["fiscalAddress", "Dirección fiscal"],
          ["deliveryAddress", "Dirección de entrega"],
          ["paymentTerms", "Forma de pago"],
        ].map(([k, l]) => (
          <label className={k.includes("Address") ? "wide" : ""} key={k}>
            {l}
            <input
              required={["code", "name", "ruc"].includes(k)}
              value={v[k]}
              onChange={(e) => setV({ ...v, [k]: e.target.value })}
            />
          </label>
        ))}
        <label className="seller-form-field">
          Código de vendedor
          <div className="form-lookup">
            <input
              required={role === "Seller"}
              value={v.sellerCode}
              onChange={(e) => setV({ ...v, sellerCode: e.target.value })}
              placeholder="Escribe el código"
            />
            <button
              type="button"
              onClick={() => setPickingSeller(true)}
              aria-label="Buscar vendedor"
            >
              ⌕
            </button>
          </div>
          <small>{sellerName || "Sin vendedor asignado"}</small>
        </label>
        <footer>
          <button type="button" className="outline-action" onClick={close}>
            Cancelar
          </button>
          <button>{client ? "Guardar cambios" : "Guardar cliente"}</button>
        </footer>
      </form>
      {pickingSeller && (
        <RecordPicker
          kind="seller"
          close={() => setPickingSeller(false)}
          choose={(row) => {
            setV({ ...v, sellerCode: row.code });
            setSellerName(row.name);
            setPickingSeller(false);
          }}
        />
      )}
    </Modal>
  );
}
function SellerForm({
  seller,
  close,
  saved,
}: {
  seller?: any;
  close: () => void;
  saved: () => void;
}) {
  const [v, setV] = useState({ code: seller?.code ?? "", name: seller?.name ?? "", division: seller?.division ?? "" });
  return (
    <Modal
      title={seller ? "Editar vendedor" : "Nuevo vendedor"}
      subtitle={seller ? "Actualiza el nombre y la división comercial." : "Registra el código y la división comercial."}
      close={close}
    >
      <form
        className="entity-form"
        onInvalid={(e) => { e.preventDefault(); showToast("Completa los campos obligatorios del vendedor.", "warning"); }}
        onSubmit={async (e) => {
          e.preventDefault();
          await api(seller ? `/sellers/${encodeURIComponent(seller.code)}` : "/sellers", { method: seller ? "PUT" : "POST", body: JSON.stringify(v) });
          saved();
        }}
      >
        <label>
          Código
          <input
            required
            disabled={Boolean(seller)}
            value={v.code}
            onChange={(e) => setV({ ...v, code: e.target.value })}
          />
        </label>
        <label>
          Vendedor / Descripción
          <input
            required
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
          />
        </label>
        <label className="wide">
          División o segmento
          <input
            value={v.division}
            onChange={(e) => setV({ ...v, division: e.target.value })}
            placeholder="Ej. Licores, alimentos, oficina"
          />
        </label>
        <footer>
          <button type="button" className="outline-action" onClick={close}>
            Cancelar
          </button>
          <button>{seller ? "Guardar cambios" : "Guardar vendedor"}</button>
        </footer>
      </form>
    </Modal>
  );
}
function ImportModal({
  close,
  done,
}: {
  close: () => void;
  done: (x: string) => void;
}) {
  const [file, setFile] = useState<File>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title="Importar clientes y vendedores"
      subtitle="Usa DOC INFO.xlsx o un archivo con el mismo formato."
      close={close}
    >
      <div className="import-zone">
        <span>⇧</span>
        <p>
          Columnas esperadas: Código, R.U.C., Razón, Dirección, código y nombre
          del vendedor.
        </p>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0])}
        />
        {file && <b>{file.name}</b>}
        {error && <em>{error}</em>}
        <div>
          <button className="outline-action" onClick={close}>
            Cancelar
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              if (!file) { showToast("Selecciona un archivo Excel antes de importar.", "warning"); return; }
              try {
                setBusy(true);
                const f = new FormData();
                f.append("file", file!);
                const r = await api("/entities/import", {
                  method: "POST",
                  body: f,
                });
                const duplicates = r.duplicateClientCodes
                  ? ` ${r.duplicateClientCodes} código(s) duplicado(s) del archivo se consolidaron.`
                  : "";
                done(`${r.clients} clientes y ${r.sellers} vendedores vinculados.${duplicates}`);
              } catch (e: any) {
                setError(e.message);
                setBusy(false);
              }
            }}
          >
            {busy ? "Importando..." : "Importar y actualizar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function Modal({
  title,
  subtitle,
  close,
  children,
}: {
  title: string;
  subtitle: string;
  close: () => void;
  children: any;
}) {
  return (
    <div className="entity-backdrop">
      <div className="entity-dialog">
        <header>
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        {children}
      </div>
    </div>
  );
}
