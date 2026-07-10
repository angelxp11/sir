import React, { useEffect, useState } from "react";
import "./inventariosguardados.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  obtenerInventariosPorTienda,
  obtenerInventarioPorId,
  actualizarInventario,
} from "../../server/funtions";
import { showToast } from "../../resources/toastcontainer/ToastContainer";
import { buildInventarioPayload } from "./inventariosguardadosUtils";

const getKey = (categoriaNombre, itemNombre) => `${categoriaNombre}||${itemNombre}`;

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function handleDownloadJSON(inventario, itemDetails, mode) {
  const payload = buildInventarioPayload(inventario, itemDetails, mode);

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(inventario.nombreInventario || inventario.tipoInventarioNombre || "inventario")
    .toLowerCase()
    .replace(/\s+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(ts) {
  if (!ts) return null;
  const ms = ts?.seconds ? ts.seconds * 1000 : ts;
  return new Date(ms).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InventariosGuardados() {
  const [user, setUser] = useState(null);
  const [tiendaId, setTiendaId] = useState(null);
  const [inventarios, setInventarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInventario, setSelectedInventario] = useState(null);
  const [itemDetails, setItemDetails] = useState({});
  const [modoEdicion, setModoEdicion] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [modoExportacion, setModoExportacion] = useState("ambos");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const current = auth.currentUser;
      if (!current) { setLoading(false); return; }

      const usuario = await obtenerInformacionUsuarioPorUid(current.uid);
      setUser(usuario);
      const tienda = usuario?.idTienda;
      setTiendaId(tienda || null);

      if (tienda) {
        const list = await obtenerInventariosPorTienda(tienda);
        setInventarios(list);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSelectInventario = async (inventarioId) => {
    const inventario = await obtenerInventarioPorId(inventarioId);
    setSelectedInventario(inventario);
    setModoEdicion(false);
    setItemDetails(inventario?.itemDetails || {});
    setCopiado(false);
  };

  const handleDetailChange = (key, field, value) => {
    setItemDetails((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const handleCopyJSON = async () => {
    if (!selectedInventario) return;
    const payload = buildInventarioPayload(selectedInventario, itemDetails, modoExportacion);
    const text = JSON.stringify(payload, null, 2);

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiado(true);
      showToast("JSON copiado al portapapeles", "success");
      setTimeout(() => setCopiado(false), 1800);
    } catch (error) {
      console.error(error);
      showToast("No se pudo copiar el JSON", "error");
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedInventario) return;
    try {
      await actualizarInventario(selectedInventario.id, {
        itemDetails,
        updatedByUid: user?.id || user?.uid || null,
        updatedByName: user?.nombre || user?.displayName || user?.correo || null,
      });
      showToast("Inventario actualizado correctamente", "success");
      const list = await obtenerInventariosPorTienda(tiendaId);
      setInventarios(list);
      const updated = await obtenerInventarioPorId(selectedInventario.id);
      setSelectedInventario(updated);
      setModoEdicion(false);
    } catch (error) {
      console.error(error);
      showToast("Error al actualizar inventario", "error");
    }
  };

  if (loading) {
    return (
      <div className="inventarios-guardados">
        <div className="inventarios-list">
          <h2>Inventarios guardados</h2>
          <p className="list-subtitle">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventarios-guardados">
      {/* ── Lista ── */}
      <div className="inventarios-list">
        <h2>Inventarios</h2>
        <p className="list-subtitle">{inventarios.length} guardado{inventarios.length !== 1 ? "s" : ""}</p>

        {inventarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No hay inventarios aún.</p>
          </div>
        ) : (
          <ul>
            {inventarios.map((inv) => (
              <li key={inv.id}>
                <button
                  type="button"
                  className={`inv-btn${selectedInventario?.id === inv.id ? " active" : ""}`}
                  onClick={() => handleSelectInventario(inv.id)}
                >
                  <span className="inv-btn-title">
                    {inv.nombreInventario || inv.tipoInventarioNombre || "Inventario"}
                  </span>
                  <span className="inv-btn-meta">
                    {inv.createdByName || ""}
                    {inv.createdAt ? ` · ${formatDate(inv.createdAt)}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Detalle ── */}
      <div className="inventario-detail">
        {selectedInventario ? (
          <>
            <div className="detail-header">
              <div className="detail-header-info">
                <h3>{selectedInventario.nombreInventario || selectedInventario.tipoInventarioNombre}</h3>
                <div className="detail-meta">
                  {selectedInventario.createdByName && (
                    <span className="meta-badge">👤 {selectedInventario.createdByName}</span>
                  )}
                  {selectedInventario.updatedByName && (
                    <span className="meta-badge">✏️ {selectedInventario.updatedByName}</span>
                  )}
                </div>
              </div>

              <div className="detail-actions">
                <div className="export-mode-group" title="Selecciona qué datos exportar">
                  <label className="export-mode-label" htmlFor="modo-exportacion">Exportar</label>
                  <select
                    id="modo-exportacion"
                    className="export-mode-select"
                    value={modoExportacion}
                    onChange={(event) => setModoExportacion(event.target.value)}
                  >
                    <option value="ambos">Bodega + Línea</option>
                    <option value="bodega">Solo bodega</option>
                    <option value="linea">Solo línea</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-download"
                  onClick={() => handleDownloadJSON(selectedInventario, itemDetails, modoExportacion)}
                  title="Descargar como JSON"
                >
                  <DownloadIcon /> JSON
                </button>
                <button
                  type="button"
                  className={`btn btn-copy${copiado ? " copied" : ""}`}
                  onClick={handleCopyJSON}
                  title="Copiar JSON al portapapeles"
                >
                  {copiado ? <><CheckIcon /> Copiado</> : <><CopyIcon /> Copiar JSON</>}
                </button>
                <button
                  type="button"
                  className={`btn btn-outline${modoEdicion ? " cancel" : ""}`}
                  onClick={() => setModoEdicion(!modoEdicion)}
                >
                  {modoEdicion ? "Cancelar" : <><EditIcon /> Editar</>}
                </button>
              </div>
            </div>

            {selectedInventario.tipoInventarioNombre && (
              <span className="tipo-badge">{selectedInventario.tipoInventarioNombre}</span>
            )}

            {(selectedInventario.categorias || []).map((categoria) => (
              <section key={categoria.nombre} className="categoria-detail">
                <h4>{categoria.nombre}</h4>
                {(categoria.items || []).map((item) => {
                  const key = getKey(categoria.nombre, item.nombre);
                  const detail = itemDetails[key] || { bodega: item.bodega || "", linea: item.linea || "" };
                  return (
                    <div className="item-row" key={key}>
                      <span className="item-name">{item.nombre}</span>
                      {modoEdicion ? (
                        <>
                          <div className="input-group">
                            <span className="input-label">Bodega</span>
                            <input
                              className="inv-input"
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              value={detail.bodega}
                              onChange={(e) =>
                                handleDetailChange(key, "bodega", e.target.value.replace(/[^0-9.,]/g, ""))
                              }
                              placeholder="0"
                            />
                          </div>
                          <div className="input-group">
                            <span className="input-label">Línea</span>
                            <input
                              className="inv-input"
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              value={detail.linea}
                              onChange={(e) =>
                                handleDetailChange(key, "linea", e.target.value.replace(/[^0-9.,]/g, ""))
                              }
                              placeholder="0"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="item-values-row">
                          <span className="value-chip chip-bodega">
                            <span className="chip-label">B</span>
                            {detail.bodega || "—"}
                          </span>
                          <span className="value-chip chip-linea">
                            <span className="chip-label">L</span>
                            {detail.linea || "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}

            {modoEdicion && (
              <div className="btn-save-bar">
                <button type="button" className="btn btn-outline cancel" onClick={() => setModoEdicion(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveChanges}>
                  <SaveIcon /> Guardar cambios
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="detail-empty">
            <div className="empty-icon">🗂️</div>
            <p>Selecciona un inventario para ver sus detalles.</p>
          </div>
        )}
      </div>
    </div>
  );
}