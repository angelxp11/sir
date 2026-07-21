import React, { useCallback, useEffect, useState } from "react";
import "./crearinventario.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  obtenerTiposInventarioPorTienda,
  obtenerTipoInventarioPorId,
  crearInventarioDesdeTipo,
} from "../../server/funtions";
import { showToast } from "../../resources/toastcontainer/ToastContainer";
import { convertToUnits, convertValueBetweenModes, normalizeItemConfig, getItemStorageKey } from "../../utils/inventarioConversion";

const DRAFT_STORAGE_KEY = "sir_crear_inventario_draft";

export default function CrearInventario() {
  const [user, setUser] = useState(null);
  const [tiendaId, setTiendaId] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [selectedTipoId, setSelectedTipoId] = useState("");
  const [tipoDetalle, setTipoDetalle] = useState(null);
  const [itemDetails, setItemDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const current = auth.currentUser;
      if (!current) {
        setLoading(false);
        setDraftLoaded(true);
        return;
      }

      const usuario = await obtenerInformacionUsuarioPorUid(current.uid);
      setUser(usuario);
      const tienda = usuario?.idTienda;
      setTiendaId(tienda || null);

      if (tienda) {
        await loadTipos(tienda);
      }
      setLoading(false);
    };

    load();
  }, []);

  const loadTipos = async (idTienda) => {
    const tiposList = await obtenerTiposInventarioPorTienda(idTienda);
    setTipos(tiposList || []);
  };

  const initializeItemDetails = (tipo) => {
    if (!tipo?.categorias) return {};
    const details = {};
    tipo.categorias.forEach((cat) => {
      (cat.items || []).forEach((item) => {
        const key = getItemStorageKey(cat.nombre, item);
        const normalizedItem = normalizeItemConfig(item);
        details[key] = {
          bodega: "",
          linea: "",
          bodegaModoRegistro: normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad",
          lineaModoRegistro: normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad",
        };
      });
    });
    return details;
  };

  const loadTipoDetalle = useCallback(async (tipoId, initialItemDetails = null) => {
    if (!tipoId) {
      setTipoDetalle(null);
      setItemDetails({});
      return;
    }

    const tipo = await obtenerTipoInventarioPorId(tipoId);
    setTipoDetalle(tipo);
    setItemDetails(initialItemDetails || initializeItemDetails(tipo));
  }, []);

  const handleSelectTipo = async (tipoId) => {
    setSelectedTipoId(tipoId);
    setExpandedCategories({});
    await loadTipoDetalle(tipoId);
  };

  const handleDetailChange = (key, field, value) => {
    setItemDetails((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [field]: value,
      },
    }));
  };

  const handleModeChange = (key, modeField, valueField, itemConfig, currentMode, nextMode, currentValue) => {
    const convertedValue = convertValueBetweenModes(currentValue, itemConfig, currentMode, nextMode);

    setItemDetails((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        [modeField]: nextMode,
        [valueField]: convertedValue,
      },
    }));
  };

  const toggleCategory = (categoriaNombre) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoriaNombre]: !current[categoriaNombre],
    }));
  };

  useEffect(() => {
    if (!draftLoaded || !user) return;

    const payload = {
      selectedTipoId,
      itemDetails,
      expandedCategories,
      updatedAt: Date.now(),
    };

    if (!selectedTipoId && !Object.keys(itemDetails).length && !Object.keys(expandedCategories).length) {
      window.localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${user?.id || user?.uid || "guest"}`);
      return;
    }

    window.localStorage.setItem(
      `${DRAFT_STORAGE_KEY}:${user?.id || user?.uid || "guest"}`,
      JSON.stringify(payload)
    );
  }, [draftLoaded, expandedCategories, itemDetails, selectedTipoId, user]);

  useEffect(() => {
    if (!user || draftLoaded || loading) return;

    try {
      const rawDraft = window.localStorage.getItem(`${DRAFT_STORAGE_KEY}:${user?.id || user?.uid || "guest"}`);
      if (!rawDraft) {
        setDraftLoaded(true);
        return;
      }

      const parsed = JSON.parse(rawDraft);
      if (parsed.selectedTipoId) {
        setSelectedTipoId(parsed.selectedTipoId);
        setExpandedCategories(parsed.expandedCategories || {});
        setItemDetails(parsed.itemDetails || {});
        loadTipoDetalle(parsed.selectedTipoId, parsed.itemDetails || {});
      } else if (parsed.itemDetails) {
        setItemDetails(parsed.itemDetails || {});
        setExpandedCategories(parsed.expandedCategories || {});
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftLoaded, loadTipoDetalle, loading, user]);

  const getCategoriaCounts = (categoria) => {
    if (!categoria?.items) return null;

    const totalItems = categoria.items.length;
    let bodegaCompletos = 0;
    let lineaCompletos = 0;
    let incompletos = 0;

    categoria.items.forEach((item) => {
      const key = getItemStorageKey(categoria.nombre, item);
      const detail = itemDetails[key] || { bodega: "", linea: "" };

      // Un item es incompleto si AMBOS campos están vacíos
      if (!detail.bodega && !detail.linea) {
        incompletos++;
      } else {
        // Si al menos uno tiene datos, contar completos
        if (detail.bodega) bodegaCompletos++;
        if (detail.linea) lineaCompletos++;
      }
    });

    // Si todos están vacíos, retornar incompletos
    if (bodegaCompletos === 0 && lineaCompletos === 0) {
      return { type: "incompleto", count: incompletos };
    }

    // Si al menos uno tiene datos, retornar progreso
    return {
      type: "progreso",
      bodega: bodegaCompletos,
      linea: lineaCompletos,
      total: totalItems,
    };
  };

  const handleCreateInventario = async () => {
    if (!selectedTipoId) {
      showToast("Selecciona un tipo de inventario antes de crear el inventario.", "error");
      return;
    }

    const nombreInventarioUsuario =
      user?.nombre || user?.displayName || user?.correo || "Inventario";

    setSaving(true);
    try {
      await crearInventarioDesdeTipo(
        selectedTipoId,
        tiendaId,
        user,
        itemDetails,
        nombreInventarioUsuario
      );
      showToast("Inventario guardado correctamente", "success");
      setTipoDetalle(null);
      setSelectedTipoId("");
      setItemDetails({});
      setExpandedCategories({});
      if (user) {
        window.localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${user?.id || user?.uid || "guest"}`);
      }
    } catch (error) {
      console.error(error);
      showToast("Error creando el inventario.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="crear-inventario"><p className="state-message">Cargando...</p></div>;
  }

  if (!user) {
    return <div className="crear-inventario"><p className="state-message">Necesitas iniciar sesión para ver esta sección.</p></div>;
  }

  if (!tiendaId) {
    return (
      <div className="crear-inventario">
        <h2>Crear inventario</h2>
        <p>No se encontró una tienda asociada a tu usuario.</p>
      </div>
    );
  }

  return (
    <div className="crear-inventario">
      <div className="inventario-card">
        <h2>Crear inventario</h2>
        <p>Selecciona un tipo de inventario y registra BODEGA y LINEA para cada item.</p>
        <div className="hint-row">
          <span className="draft-hint">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 5v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            El borrador se guarda automáticamente en tu dispositivo
          </span>
          <span className="draft-hint">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M4 7l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 7v6l6 3 6-3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Si eliges paquete, convertimos la cantidad a unidades automáticamente
          </span>
        </div>

        <label>Tipo de inventario</label>
        <select
          value={selectedTipoId}
          onChange={(e) => handleSelectTipo(e.target.value)}
        >
          <option value="">Selecciona un tipo</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>

        {tipoDetalle ? (
          <div className="categorias">
            {tipoDetalle.categorias?.map((categoria) => {
              const isExpanded = expandedCategories[categoria.nombre];
              const counts = getCategoriaCounts(categoria);

              const isComplete = counts?.type === "progreso" && counts.bodega === counts.total && counts.linea === counts.total;

              return (
                <div className={`categoria-accordion ${isExpanded ? "is-expanded" : ""}`} key={categoria.nombre}>
                  <button
                    className="categoria-header"
                    onClick={() => toggleCategory(categoria.nombre)}
                    type="button"
                    aria-expanded={!!isExpanded}
                  >
                    <span className="categoria-toggle">
                      <svg
                        className={`toggle-icon ${isExpanded ? "expanded" : ""}`}
                        width="18"
                        height="18"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M7 8L10 11L13 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="categoria-title">
                      <h4>{categoria.nombre}</h4>
                      <span className="categoria-item-count">{(categoria.items || []).length} items</span>
                    </span>
                    {counts && (
                      <>
                        {counts.type === "incompleto" ? (
                          <span className="incomplete-badge">
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                              <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.8" />
                              <path d="M10 6.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                              <circle cx="10" cy="13" r="0.9" fill="currentColor" />
                            </svg>
                            {counts.count} sin datos
                          </span>
                        ) : (
                          <div className="progress-wrap">
                            <div className="progress-bars">
                              <div className="progress-bar-item">
                                <span className="progress-bar-label">Bod.</span>
                                <div className="progress-bar-track">
                                  <div
                                    className="progress-bar-fill bodega-fill"
                                    style={{ width: `${counts.total ? (counts.bodega / counts.total) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="progress-bar-count">{counts.bodega}/{counts.total}</span>
                              </div>
                              <div className="progress-bar-item">
                                <span className="progress-bar-label">Lín.</span>
                                <div className="progress-bar-track">
                                  <div
                                    className="progress-bar-fill linea-fill"
                                    style={{ width: `${counts.total ? (counts.linea / counts.total) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="progress-bar-count">{counts.linea}/{counts.total}</span>
                              </div>
                            </div>
                            {isComplete && (
                              <span className="completo-check" title="Categoría completa">
                                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                                  <path d="M5 10.5l3.2 3.2L15 6.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="categoria-content">
                      {(categoria.items || []).map((item) => {
                        const key = getItemStorageKey(categoria.nombre, item);
                        const normalizedItem = normalizeItemConfig(item);
                        const detail = itemDetails[key] || {
                          bodega: "",
                          linea: "",
                          bodegaModoRegistro: normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad",
                          lineaModoRegistro: normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad",
                        };
                        const bodegaMode = detail.bodegaModoRegistro || detail.modoRegistro || (normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad");
                        const lineaMode = detail.lineaModoRegistro || detail.modoRegistro || (normalizedItem.tipoUnidad === "paquete" ? "paquete" : "unidad");
                        const previewBodega = convertToUnits(detail.bodega || "", normalizedItem, bodegaMode);
                        const previewLinea = convertToUnits(detail.linea || "", normalizedItem, lineaMode);
                        const packageHint = normalizedItem.tipoUnidad === "paquete"
                          ? `1 paquete = ${normalizedItem.equivalenciaUnidades} unidades`
                          : "Se registra en unidades";
                        return (
                          <div className="item-row" key={key}>
                            <span className="item-name">{item.nombre}</span>
                            <div className="item-input-stack field-bodega">
                              <div className="mode-toggle">
                                <span className="field-label">
                                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                                    <path d="M3 6.5l7-3.2 7 3.2-7 3.2-7-3.2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M3 6.5v7l7 3.2 7-3.2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Bodega
                                </span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={bodegaMode === "paquete"}
                                    onChange={(e) => handleModeChange(
                                      key,
                                      "bodegaModoRegistro",
                                      "bodega",
                                      normalizedItem,
                                      bodegaMode,
                                      e.target.checked ? "paquete" : "unidad",
                                      detail.bodega || ""
                                    )}
                                  />
                                  <span className="toggle-slider" />
                                  <span className="toggle-label">{bodegaMode === "paquete" ? "Paquete" : "Unidad"}</span>
                                </label>
                              </div>
                              <small className="conversion-hint">
                                {bodegaMode === "paquete" ? packageHint : "Se registra en unidades"}
                              </small>
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                value={detail.bodega}
                                onChange={(e) => handleDetailChange(key, "bodega", e.target.value.replace(/[^0-9.,]/g, ""))}
                                placeholder={bodegaMode === "paquete" ? "Paquetes" : "Unidades"}
                              />
                              <small className="conversion-hint">
                                {bodegaMode === "paquete"
                                  ? `Equivale a ${previewBodega}${previewBodega === "" ? "" : " unidades"}`
                                  : "Se registra en unidades"}
                              </small>
                            </div>
                            <div className="item-input-stack field-linea">
                              <div className="mode-toggle">
                                <span className="field-label">
                                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                                    <path d="M3 5h14M3 10h10M3 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                  </svg>
                                  Línea
                                </span>
                                <label className="toggle-switch">
                                  <input
                                    type="checkbox"
                                    checked={lineaMode === "paquete"}
                                    onChange={(e) => handleModeChange(
                                      key,
                                      "lineaModoRegistro",
                                      "linea",
                                      normalizedItem,
                                      lineaMode,
                                      e.target.checked ? "paquete" : "unidad",
                                      detail.linea || ""
                                    )}
                                  />
                                  <span className="toggle-slider" />
                                  <span className="toggle-label">{lineaMode === "paquete" ? "Paquete" : "Unidad"}</span>
                                </label>
                              </div>
                              <small className="conversion-hint">
                                {lineaMode === "paquete" ? packageHint : "Se registra en unidades"}
                              </small>
                              <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*[.,]?[0-9]*"
                                value={detail.linea}
                                onChange={(e) => handleDetailChange(key, "linea", e.target.value.replace(/[^0-9.,]/g, ""))}
                                placeholder={lineaMode === "paquete" ? "Paquetes" : "Unidades"}
                              />
                              <small className="conversion-hint">
                                {lineaMode === "paquete"
                                  ? `Equivale a ${previewLinea}${previewLinea === "" ? "" : " unidades"}`
                                  : "Se registra en unidades"}
                              </small>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="save-bar">
              <button className="btn" type="button" onClick={handleCreateInventario} disabled={saving}>
                {saving && <span className="spinner" />}
                {saving ? "Guardando inventario..." : "Guardar inventario"}
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path d="M4 8l8-4 8 4-8 4-8-4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 8v8l8 4 8-4V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 12v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <p>Selecciona un tipo para ver sus categorías e items.</p>
          </div>
        )}
      </div>
    </div>
  );
}