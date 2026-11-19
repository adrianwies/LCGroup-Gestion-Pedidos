import { useEffect, useState } from "react";
import { RecordPicker } from "./RecordPicker";
import { HorizontalScroller } from "./HorizontalScroller";
import "./users-module.css";
import "./user-multicode.css";
import { showToast } from "./Toast";

const api = async (path: string, init?: RequestInit) => {
  const r = await fetch("/api" + path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!r.ok) { const message=(await r.json().catch(()=>({message:"No se pudo completar la operación."}))).message; showToast(message,"error"); throw Error(message); }
  return r.json();
};

export function UsersModule() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const load = () => api("/users").then(setRows);
  useEffect(() => {
    void load();
  }, []);
  const filtered = rows.filter((x) =>
    `${x.userName} ${(x.sellerCodes || []).join(" ")} ${(x.sellerNames || []).join(" ")}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <section className="entity-page users-page">
      <div className="entity-heading">
        <div>
          <span>SEGURIDAD</span>
          <h1>Usuarios y accesos</h1>
          <p>Crea cuentas para vendedores y consulta su actividad comercial.</p>
        </div>
        <div>
          <button onClick={() => setEditing({})}>＋ Nuevo usuario</button>
        </div>
      </div>
      <div className="entity-tools">
        <label>
          <span>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por usuario, código o vendedor"
          />
        </label>
        <small>{filtered.length} cuenta(s)</small>
      </div>
      <HorizontalScroller className="entity-list">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Perfil</th>
              <th>Cód. vendedor</th>
              <th>Vendedor asociado</th>
              <th>Órdenes</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.userName}</b>
                </td>
                <td>{x.role === "Admin" ? "Administrador" : x.role === "Approver" ? "Aprobador de pedidos" : x.role === "Billing" ? "Facturación" : "Vendedor"}</td>
                <td>
                  <div className="multi-code-list">
                    {x.sellerCodes?.length
                      ? x.sellerCodes.map((code: string) => (
                          <span key={code}>{code}</span>
                        ))
                      : "—"}
                  </div>
                </td>
                <td>
                  {x.sellerNames?.length ? x.sellerNames.join(" · ") : "—"}
                </td>
                <td>
                  <span className="order-count">{x.orders}</span>
                </td>
                <td>
                  <span className={x.active ? "active-chip" : "inactive-chip"}>
                    {x.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <div className="user-row-actions">
                    <button className="edit-row" onClick={() => setEditing(x)}>Editar</button>
                    {x.role !== "Admin" && (
                    <button
                      className="edit-row"
                      onClick={async () => {
                        await api(`/workflow/users/${x.id}/status`, {
                          method: "PUT",
                          body: JSON.stringify({ active: !x.active }),
                        });
                        showToast(x.active ? "Cuenta desactivada." : "Cuenta activada.",x.active?"warning":"success");
                        load();
                      }}
                    >
                      {x.active ? "Desactivar" : "Activar"}
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </HorizontalScroller>
      {editing && (
        <UserForm
          user={editing.id ? editing : undefined}
          close={() => setEditing(null)}
          saved={() => {
            const updated=Boolean(editing.id);
            setEditing(null);
            showToast(updated ? "Usuario actualizado correctamente." : "Usuario creado correctamente.","success");
            load();
          }}
        />
      )}
    </section>
  );
}

function UserForm({ user, close, saved }: { user?: any; close: () => void; saved: () => void }) {
  const [v, setV] = useState({
    userName: user?.userName ?? "",
    password: "",
    role: user?.role ?? "Seller",
    sellerCodes: (user?.sellerCodes ?? []) as string[],
    approvalArea: user?.approvalArea ?? "",
    active: user?.active ?? true,
  });
  const [selected, setSelected] = useState<{ code: string; name: string }[]>(
    (user?.sellerCodes ?? []).map((code: string, index: number) => ({ code, name: user?.sellerNames?.[index] ?? code })),
  );
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState("");
  const [mixedWarning, setMixedWarning] = useState(false);
  const differentPeople =
    new Set(
      selected
        .map((x) => x.name.trim().split(/\s+/)[0]?.toLocaleLowerCase())
        .filter(Boolean),
    ).size > 1;
  return (
    <div className="entity-backdrop">
      <div className="entity-dialog user-dialog">
        <header>
          <div>
            <h2>{user ? "Editar usuario" : "Nuevo usuario"}</h2>
            <p>{user ? "Actualiza su nombre, perfil, estado y códigos de vendedor." : "Asigna una cuenta personal y sus códigos de vendedor."}</p>
          </div>
          <button onClick={close}>×</button>
        </header>
        <form
          className="entity-form"
          onInvalid={(e) => { e.preventDefault(); showToast("Completa los campos obligatorios. La contraseña debe tener al menos 8 caracteres.", "warning"); }}
          onSubmit={async (e) => {
            e.preventDefault();
            if (differentPeople && !mixedWarning) {
              setMixedWarning(true);
              showToast("Los códigos seleccionados parecen pertenecer a personas distintas. Confirma para continuar.", "warning");
              return;
            }
            try {
              await api(user ? `/workflow/users/${user.id}` : "/workflow/users", { method: user ? "PUT" : "POST", body: JSON.stringify(v) });
              saved();
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          <label>
            Usuario
            <input
              required
              value={v.userName}
              onChange={(e) => setV({ ...v, userName: e.target.value })}
              autoComplete="off"
            />
          </label>
          <label>
            {user ? "Nueva contraseña" : "Contraseña"}
            <input
              required={!user}
              minLength={8}
              type="password"
              value={v.password}
              onChange={(e) => setV({ ...v, password: e.target.value })}
              autoComplete="new-password"
            />
            <small>{user ? "Déjala vacía para conservar la contraseña actual." : "Mínimo 8 caracteres."}</small>
          </label>
          <label>
            Perfil
            <select
              value={v.role}
              onChange={(e) => {
                const role = e.target.value;
                setV({
                  ...v,
                  role,
                  sellerCodes: role === "Seller" ? v.sellerCodes : [],
                  approvalArea: "",
                });
                if (role !== "Seller") setSelected([]);
              }}
            >
              <option value="Seller">Vendedor</option>
              <option value="Approver">Aprobador de pedidos</option>
              <option value="Billing">Facturación</option>
              <option value="Admin">Administrador</option>
            </select>
          </label>
          {v.role === "Approver" && <label className="wide">Aprobación dinámica<small>Esta cuenta participará automáticamente en la aprobación de todas las órdenes pendientes mientras permanezca activa.</small></label>}
          {v.role === "Seller" && (
            <label className="wide">
              Códigos de vendedor
              <button
                className="multi-seller-add"
                type="button"
                onClick={() => setPicker(true)}
              >
                ＋ Agregar código
              </button>
              <div className="selected-sellers">
                {selected.map((seller) => (
                  <div key={seller.code}>
                    <span>
                      <b>{seller.code}</b>
                      <small>{seller.name}</small>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = selected.filter(
                          (x) => x.code !== seller.code,
                        );
                        setSelected(next);
                        setV({ ...v, sellerCodes: next.map((x) => x.code) });
                        setMixedWarning(false);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {!selected.length && (
                  <p>
                    Selecciona uno o varios códigos, por ejemplo Licores y
                    Alimentos.
                  </p>
                )}
              </div>
            </label>
          )}
          {user && (
            <label className="wide user-active-field">
              <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
              <span>Cuenta activa</span>
            </label>
          )}
          {mixedWarning && (
            <div className="mixed-warning">
              <b>Los vendedores parecen ser personas diferentes.</b>
              <span>
                Seleccionaste {selected.map((x) => x.name).join(" y ")}. Revisa
                la selección o pulsa “Crear de todos modos”.
              </span>
            </div>
          )}
          {error && <div className="user-form-error">{error}</div>}
          <footer>
            <button type="button" className="outline-action" onClick={close}>
              Cancelar
            </button>
            <button>
              {mixedWarning ? (user ? "Guardar de todos modos" : "Crear de todos modos") : (user ? "Guardar cambios" : "Crear usuario")}
            </button>
          </footer>
        </form>
        {picker && (
          <RecordPicker
            kind="seller"
            multiple
            initialSelected={selected}
            close={() => setPicker(false)}
            choose={() => {}}
            chooseMany={(rows) => {
              const next = rows.map((row) => ({
                code: row.code,
                name: row.name,
              }));
              setSelected(next);
              setV({ ...v, sellerCodes: next.map((x) => x.code) });
              setMixedWarning(false);
              setPicker(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
