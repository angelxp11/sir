import React, { useEffect, useState } from "react";
import "./crearinventario.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  obtenerTiposInventarioPorTienda,
  obtenerTipoInventarioPorId,
  crearInventarioDesdeTipo,
} from "../../server/funtions";
import { showToast } from "../../resources/toastcontainer/ToastContainer";

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const current = auth.currentUser;
      if (!current) {
        setLoading(false);
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
        const key = `${cat.nombre}||${item.nombre}`;
        details[key] = { bodega: "", linea: "" };
      });
    });
    return details;
  };

  const handleSelectTipo = async (tipoId) => {
    setSelectedTipoId(tipoId);
    setExpandedCategories({});
    if (!tipoId) {
      setTipoDetalle(null);
      setItemDetails({});
      return;
    }

    const tipo = await obtenerTipoInventarioPorId(tipoId);
    setTipoDetalle(tipo);
    setItemDetails(initializeItemDetails(tipo));
  };

  const handleDetailChange = (key, field, value) => {
    setItemDetails((current) => ({
      ...current,
      [key]: {
        ...current[key],
        [field]: value,
      },
    }));
  };

  const toggleCategory = (categoriaNombre) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoriaNombre]: !current[categoriaNombre],
    }));
  };

  const getCategoriaCounts = (categoria) => {
    if (!categoria?.items) return null;

    const totalItems = categoria.items.length;
    let bodegaCompletos = 0;
    let lineaCompletos = 0;
    let incompletos = 0;

    categoria.items.forEach((item) => {
      const key = `${categoria.nombre}||${item.nombre}`;
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
    } catch (error) {
      console.error(error);
      showToast("Error creando el inventario.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="crear-inventario">Cargando...</div>;
  }

  if (!user) {
    return <div className="crear-inventario">Necesitas iniciar sesión para ver esta sección.</div>;
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

              return (
                <div className="categoria-accordion" key={categoria.nombre}>
                  <button
                    className="categoria-header"
                    onClick={() => toggleCategory(categoria.nombre)}
                    type="button"
                  >
                    <span className="categoria-toggle">
                      <svg
                        className={`toggle-icon ${isExpanded ? "expanded" : ""}`}
                        width="20"
                        height="20"
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
                    <h4>{categoria.nombre}</h4>
                    {counts && (
                      <>
                        {counts.type === "incompleto" ? (
                          <span className="incomplete-badge">
                            {counts.count} incompletos
                          </span>
                        ) : (
                          <div className="progress-badge">
                            <span className="progress-item bodega-progress">
                              Bodega: <strong>{counts.bodega}/{counts.total}</strong>
                            </span>
                            <span className="progress-item linea-progress">
                              Linea: <strong>{counts.linea}/{counts.total}</strong>
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="categoria-content">
                      {(categoria.items || []).map((item) => {
                        const key = `${categoria.nombre}||${item.nombre}`;
                        const detail = itemDetails[key] || { bodega: "", linea: "" };
                        return (
                          <div className="item-row" key={key}>
                            <span>{item.nombre}</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              value={detail.bodega}
                              onChange={(e) => handleDetailChange(key, "bodega", e.target.value.replace(/[^0-9.,]/g, ""))}
                              placeholder="BODEGA"
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              value={detail.linea}
                              onChange={(e) => handleDetailChange(key, "linea", e.target.value.replace(/[^0-9.,]/g, ""))}
                              placeholder="LINEA"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <button className="btn" type="button" onClick={handleCreateInventario} disabled={saving}>
              {saving ? "Guardando inventario..." : "Guardar inventario"}
            </button>
          </div>
        ) : (
          <p>Selecciona un tipo para ver sus categorías e items.</p>
        )}
      </div>
    </div>
  );
}