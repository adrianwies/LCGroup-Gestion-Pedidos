import { useEffect, useState } from "react";
import { HorizontalScroller } from "./HorizontalScroller";
import "./record-picker.css";
import "./record-picker-multi.css";
import { showToast } from "./Toast";

export type PickerKind = "client" | "seller";

export function RecordPicker({
  kind,
  close,
  choose,
  multiple = false,
  initialSelected = [],
  chooseMany,
}: {
  kind: PickerKind;
  close: () => void;
  choose: (row: any) => void;
  multiple?: boolean;
  initialSelected?: any[];
  chooseMany?: (rows: any[]) => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "code" | "name">("all");
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<any[]>(initialSelected);
  const [error, setError] = useState("");
  const title = kind === "client" ? "Buscar cliente" : "Buscar vendedor";
  const endpoint = kind === "client" ? "/entities/clients" : "/sellers";

  useEffect(() => {
    setBusy(true);
    setError("");
    fetch(`/api${endpoint}?q=${encodeURIComponent(q)}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el catálogo.");
        return r.json();
      })
      .then(setRows)
      .catch((e) => {
        setRows([]);
        setError(e.message);
        showToast(e.message,"error");
      })
      .finally(() => setBusy(false));
  }, [q, endpoint]);

  const filtered = rows.filter((row) => {
    const needle = q.toLocaleLowerCase();
    if (!needle || mode === "all") return true;
    if (mode === "code") return row.code?.toLocaleLowerCase().includes(needle);
    return row.name?.toLocaleLowerCase().includes(needle);
  });

  return (
    <div className="record-picker-backdrop" role="dialog" aria-modal="true">
      <div className="record-picker">
        <header>
          <div>
            <h2>{title}</h2>
            <p>Encuentra rápidamente por código o nombre.</p>
          </div>
          <button onClick={close}>Cerrar</button>
        </header>
        <div className="record-picker-controls">
          <div className="picker-tabs">
            <button
              className={mode === "all" ? "active" : ""}
              onClick={() => setMode("all")}
            >
              Código y nombre
            </button>
            <button
              className={mode === "code" ? "active" : ""}
              onClick={() => setMode("code")}
            >
              Solo código
            </button>
            <button
              className={mode === "name" ? "active" : ""}
              onClick={() => setMode("name")}
            >
              Solo nombre
            </button>
          </div>
          <label className="record-search">
            <span>⌕</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Buscar ${kind === "client" ? "cliente" : "vendedor"} por código o nombre`}
            />
          </label>
        </div>
        <HorizontalScroller
          className={`record-results ${kind === "client" ? "client-record-results" : "seller-record-results"}`}
        >
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                {kind === "client" && <th>R.U.C.</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const marked = selected.some((x) => x.code === row.code);
                return (
                  <tr
                    key={row.id ?? row.code}
                    className={marked ? "record-selected" : ""}
                  >
                    <td>
                      <b>{row.code}</b>
                    </td>
                    <td>{row.name}</td>
                    {kind === "client" && <td>{row.ruc}</td>}
                    <td>
                      <button
                        className={marked ? "selected-button" : ""}
                        onClick={() => {
                          if (!multiple) return choose(row);
                          setSelected(
                            marked
                              ? selected.filter((x) => x.code !== row.code)
                              : [...selected, row],
                          );
                        }}
                      >
                        {marked ? "Seleccionado ✓" : "Seleccionar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!busy && !filtered.length && (
            <div className="record-empty">No se encontraron resultados.</div>
          )}
          {busy && <div className="record-empty">Buscando…</div>}
          {error && (
            <div className="record-error">
              {error} Cierra la ventana e inténtalo nuevamente.
            </div>
          )}
        </HorizontalScroller>
        {multiple && (
          <footer className="record-picker-footer">
            <span>
              <b>{selected.length}</b> seleccionado(s)
            </span>
            <div>
              <button className="record-cancel" onClick={close}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!selected.length) {
                    showToast("Selecciona al menos un registro antes de continuar.", "warning");
                    return;
                  }
                  chooseMany?.(selected);
                }}
              >
                Agregar seleccionados
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
