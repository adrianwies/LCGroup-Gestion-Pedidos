import { useEffect, useRef, useState } from "react";
import "./order-editor.css";
import "./order-density.css";
import { RecordPicker } from "./RecordPicker";
import { HorizontalScroller } from "./HorizontalScroller";
import { showToast } from "./Toast";
import "./order-lookups.css";
import "./order-table-responsive.css";
type Product = {
  code: string;
  description: string;
  size: string;
  pack: number;
  stock: number;
  stockUnits: number;
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
  sellerCode?: string;
};
type Line = Product & { rowId: string; quantity: number; price: number; saleType: "Unidad" | "Caja"; comment: string };
const req = async (path: string, init?: RequestInit) => {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!r.ok) { const message=(await r.json().catch(()=>({message:"No se pudo completar la operación."}))).message; showToast(message,/stock/i.test(message)?"warning":"error"); throw Error(message); }
  return r.json();
};
export function OrderEditor({
  close,
  saved,
}: {
  close: () => void;
  saved: () => void;
}) {
  const [client, setClient] = useState<Client>(),
    [sellerCode, setSellerCode] = useState(""),
    [sellerName, setSellerName] = useState(""),
    [clientPicker, setClientPicker] = useState(false),
    [sellerPicker, setSellerPicker] = useState(false),
    [lines, setLines] = useState<Line[]>([]),
    [picker, setPicker] = useState(false),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const productTable = useRef<HTMLDivElement>(null);
  const [tableEdge, setTableEdge] = useState({ left: true, right: false });
  const syncTableEdge = () => {
    const table = productTable.current;
    if (!table) return;
    setTableEdge({
      left: table.scrollLeft <= 2,
      right: table.scrollLeft + table.clientWidth >= table.scrollWidth - 2,
    });
  };
  const moveTable = (direction: -1 | 1) => {
    const table = productTable.current;
    if (!table) return;
    table.scrollBy({ left: direction * table.clientWidth * 0.72, behavior: "smooth" });
  };
  useEffect(() => {
    const frame = requestAnimationFrame(syncTableEdge);
    window.addEventListener("resize", syncTableEdge);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncTableEdge);
    };
  }, [lines.length]);
  useEffect(() => {
    if (!sellerCode) return setSellerName("");
    req("/sellers?q=" + encodeURIComponent(sellerCode)).then((rows) => {
      const exact = rows.find(
        (x: any) => x.code.toLowerCase() === sellerCode.toLowerCase(),
      );
      setSellerName(exact?.name ?? "Código no encontrado");
    });
  }, [sellerCode]);
  const lineUnits = (line: Line) => line.quantity * (line.saleType === "Caja" ? line.pack : 1);
  const total = lines.reduce((s, l) => s + l.quantity * l.price, 0);
  const emit = async () => {
    if (busy) return;
    if (!client) { showToast("Selecciona un cliente antes de emitir el pedido.", "warning"); return; }
    if (!sellerCode || sellerName === "Código no encontrado") { showToast("Selecciona un código de vendedor válido.", "warning"); return; }
    if (!lines.length) { showToast("Agrega al menos un producto al pedido.", "warning"); return; }
    const invalidQuantity = lines.find((line) => line.quantity <= 0 || !Number.isInteger(line.quantity));
    if (invalidQuantity) { showToast(`Ingresa una cantidad válida para ${invalidQuantity.description}.`, "warning"); return; }
    const requested = new Map<string, number>();
    lines.forEach((line) => requested.set(line.code, (requested.get(line.code) || 0) + lineUnits(line)));
    const withoutStock = lines.find((line) => (requested.get(line.code) || 0) > line.stockUnits);
    if (withoutStock) { showToast(`Stock insuficiente para ${withoutStock.description}. Disponible: ${withoutStock.stockUnits} unidades (${Math.floor(withoutStock.stockUnits / withoutStock.pack)} cajas completas).`, "warning"); return; }
    setBusy(true);
    setError("");
    try {
      await req("/orders", {
        method: "POST",
        body: JSON.stringify({
          clientId: client!.id,
          clientName: client!.name,
          clientCode: client!.code,
          clientRuc: client!.ruc,
          fiscalAddress: client!.fiscalAddress,
          sellerCode,
          deliveryAddress: client!.deliveryAddress,
          deliveryNotes: notes,
          paymentTerms: client!.paymentTerms,
          items: lines.map((l) => ({
            productCode: l.code,
            quantity: l.quantity,
            unitPrice: l.price,
            saleType: l.saleType,
          })),
        }),
      });
      saved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="compact-backdrop">
      <div className="compact-editor">
        <header>
          <div>
            <h2>Datos de la orden</h2>
            <p>
              Completa la información y selecciona productos con stock
              disponible.
            </p>
          </div>
          <button onClick={close}>Cerrar</button>
        </header>
        <div className="compact-scroll">
          <section className="compact-card order-fields">
            <label className="client-field">
              Cliente
              <div className="compact-lookup">
                <input
                  value={client ? `${client.code} · ${client.name}` : ""}
                  readOnly
                  placeholder="Selecciona un cliente"
                />
                <button
                  type="button"
                  onClick={() => setClientPicker(true)}
                  aria-label="Buscar cliente"
                >
                  ⌕
                </button>
              </div>
            </label>
            <label className="wide">
              Razón social / nombre del cliente
              <input value={client?.name || ""} onChange={e=>client&&setClient({...client,name:e.target.value})} disabled={!client} />
            </label>
            <label>
              Código de cliente
              <input value={client?.code || ""} onChange={e=>client&&setClient({...client,code:e.target.value})} />
            </label>
            <label>
              Fecha
              <input value={new Date().toLocaleDateString("es-PE")} readOnly />
            </label>
            <label className="seller-order-field">
              Cód. vendedor
              <div className="compact-lookup">
                <input
                  value={sellerCode}
                  onChange={(e) => setSellerCode(e.target.value)}
                  placeholder="Código"
                />
                <button
                  type="button"
                  onClick={() => setSellerPicker(true)}
                  aria-label="Buscar vendedor"
                >
                  ⌕
                </button>
              </div>
              <small>{sellerName || "Selecciona o escribe un código"}</small>
            </label>
            <label>
              RUC
              <input value={client?.ruc || ""} onChange={e=>client&&setClient({...client,ruc:e.target.value})} />
            </label>
            <label>
              Forma de pago
              <input value={client?.paymentTerms || ""} onChange={e=>client&&setClient({...client,paymentTerms:e.target.value})} />
            </label>
            <label className="wide">
              Dirección fiscal
              <input value={client?.fiscalAddress || ""} onChange={e=>client&&setClient({...client,fiscalAddress:e.target.value})} />
            </label>
            <label className="wide">
              Dirección de entrega
              <input value={client?.deliveryAddress || ""} onChange={e=>client&&setClient({...client,deliveryAddress:e.target.value})} />
            </label>
          </section>
          <section className="compact-card products-card">
            <div className="compact-section-head">
              <div>
                <h3>Productos de la orden</h3>
                <p>
                  Selecciona y edita los productos directamente en la tabla.
                </p>
              </div>
              <button onClick={() => setPicker(true)}>+ Agregar ítem</button>
            </div>
            <div className="compact-table">
              <div
                className="compact-table-scroll"
                ref={productTable}
                onScroll={syncTableEdge}
              >
                <table>
                <thead>
                  <tr>
                    <th>Código / Producto</th>
                    <th>Descripción comercial</th>
                    <th>Cantidad</th>
                    <th>Tipo</th>
                    <th>Stock disponible</th>
                    <th>Size</th>
                    <th>Pack</th>
                    <th>Precio de venta</th>
                    <th>Importe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, n) => (
                    <tr key={l.rowId}>
                      <td>
                        <b>{l.code}</b>
                        <button
                          className="mini-search"
                          onClick={() => setPicker(true)}
                        >
                          ⌕
                        </button>
                      </td>
                      <td>{l.description}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={l.quantity}
                          onChange={(e) =>
                            setLines(
                              lines.map((x, i) =>
                                i === n
                                  ? { ...x, quantity: +e.target.value }
                                  : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td><select value={l.saleType} onChange={e=>setLines(lines.map((x,i)=>i===n?{...x,saleType:e.target.value as "Unidad"|"Caja",price:e.target.value==="Caja"?x.unitPrice*x.pack:x.unitPrice}:x))}><option>Unidad</option><option>Caja</option></select></td>
                      <td><b>{l.stockUnits}</b> un. <small>({Math.floor(l.stockUnits/l.pack)} cajas)</small></td>
                      <td>{l.size || "—"}</td>
                      <td>{l.pack}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step=".01"
                          value={l.price}
                          onChange={(e) =>
                            setLines(
                              lines.map((x, i) =>
                                i === n ? { ...x, price: +e.target.value } : x,
                              ),
                            )
                          }
                        />
                      </td>
                      <td>
                        <b>S/ {(l.quantity * l.price).toFixed(2)}</b>
                      </td>
                      <td>
                        <button
                          className="line-remove"
                          onClick={() =>
                            setLines(lines.filter((_, i) => i !== n))
                          }
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
                {!lines.length && (
                  <div className="compact-empty">
                    Agrega una fila para seleccionar productos disponibles.
                  </div>
                )}
              </div>
              <nav className="table-scroll-nav" aria-label="Desplazar tabla de productos">
                {!tableEdge.left && (
                  <button
                    type="button"
                    onClick={() => moveTable(-1)}
                    aria-label="Ver columnas anteriores"
                  >
                    ‹
                  </button>
                )}
                {!tableEdge.right && (
                  <button
                    type="button"
                    onClick={() => moveTable(1)}
                    aria-label="Ver columnas siguientes"
                  >
                    ›
                  </button>
                )}
              </nav>
              <div className="table-summary">
                <span>{lines.length} producto(s)</span>
                <b>Total: S/ {total.toFixed(2)}</b>
              </div>
            </div>
          </section>
          <section className="compact-card">
            <label>
              Observaciones de entrega
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Horario, referencia o indicaciones de entrega"
              />
            </label>
          </section>
        </div>
        <footer>
          <span className="editor-total">
            TOTAL <b>S/ {total.toFixed(2)}</b>
          </span>
          {error && <span className="editor-error">{error}</span>}
          <button className="secondary" onClick={close}>
            Cancelar
          </button>
          <button
            disabled={busy}
            onClick={emit}
          >
            {busy ? "Emitiendo..." : "Emitir orden"}
          </button>
        </footer>
      </div>
      {picker && (
        <ProductPicker
          close={() => setPicker(false)}
          choose={(p) => {
            setLines([
              ...lines,
              { ...p, rowId: crypto.randomUUID(), quantity: 1, price: p.unitPrice, saleType: "Unidad", comment: "" },
            ]);
            setPicker(false);
          }}
        />
      )}
      {clientPicker && (
        <RecordPicker
          kind="client"
          close={() => setClientPicker(false)}
          choose={(row) => {
            setClient(row);
            setClientPicker(false);
          }}
        />
      )}
      {sellerPicker && (
        <RecordPicker
          kind="seller"
          close={() => setSellerPicker(false)}
          choose={(row) => {
            setSellerCode(row.code);
            setSellerName(row.name);
            setSellerPicker(false);
          }}
        />
      )}
    </div>
  );
}
function ProductPicker({
  close,
  choose,
}: {
  close: () => void;
  choose: (p: Product) => void;
}) {
  const [q, setQ] = useState(""),
    [rows, setRows] = useState<Product[]>([]);
  useEffect(() => {
    req("/products?q=" + encodeURIComponent(q)).then(setRows);
  }, [q]);
  return (
    <div className="picker-backdrop">
      <div className="product-modal">
        <header>
          <div>
            <h2>Seleccionar producto</h2>
            <p>
              Busca por código o descripción. Solo se muestran productos con
              stock.
            </p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <div className="product-search">
          <span>⌕</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o descripción"
          />
        </div>
        <HorizontalScroller className="product-results">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Stock</th>
                <th>Pack</th>
                <th>Presentación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((p) => p.stockUnits > 0)
                .map((p) => (
                  <tr key={p.code}>
                    <td>
                      <b>{p.code}</b>
                    </td>
                    <td>{p.description}</td>
                    <td>
                          <span className="available">{p.stockUnits} un.</span>
                    </td>
                    <td>{p.pack}</td>
                    <td>{p.size || "—"}</td>
                    <td>
                      <button
                        onClick={() => choose(p)}
                      >
                        Seleccionar
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </HorizontalScroller>
      </div>
    </div>
  );
}
