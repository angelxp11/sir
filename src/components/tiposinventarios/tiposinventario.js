import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./tiposinventario.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  crearTipoInventario,
  obtenerTiposInventarioPorTienda,
  actualizarTipoInventario,
  eliminarTipoInventario,
} from "../../server/funtions";
import { normalizeItemConfig } from "../../utils/inventarioConversion";

const createEmptyItem = () => ({
  id: `${Date.now()}-${Math.random()}`,
  nombre: "",
  unidad: "",
  tipoUnidad: "unidad",
  equivalenciaUnidades: 1,
});
const createEmptyCategory = () => ({ id: `${Date.now()}-${Math.random()}`, nombre: "", items: [createEmptyItem()] });

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function BoxIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 15.5 9" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9L2.6 17a1.6 1.6 0 0 0 1.4 2.4h16a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="16.5" x2="12" y2="16.5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <line x1="12" y1="7.5" x2="12" y2="7.5" />
    </svg>
  );
}

const sanitizeDecimalInput = (value) => {
  if (value === "") return "";
  const sanitized = String(value)
    .replace(/[^0-9.]/g, "")
    .replace(/(\.)(?=.*\.)/g, "");
  return sanitized;
};

export default function TiposInventario() {
  const [user, setUser] = useState(null);
  const [tiendaId, setTiendaId] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoNombre, setTipoNombre] = useState("");
  const [categorias, setCategorias] = useState([createEmptyCategory()]);
  const [message, setMessage] = useState("");
  const [editingTipoId, setEditingTipoId] = useState(null);
  const [deletingTipoId, setDeletingTipoId] = useState(null);
  const [excelFileName, setExcelFileName] = useState("");

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

  const isGerente = () => {
    if (!user) return false;
    const rol = (user.rol || user.role || "").toString().toUpperCase();
    return rol === "GERENTE";
  };

  const changeCategoryName = (categoryId, value) => {
    setCategorias((current) =>
      current.map((cat) =>
        cat.id === categoryId ? { ...cat, nombre: value } : cat
      )
    );
  };

  const changeItemField = (categoryId, itemId, field, value) => {
    setCategorias((current) =>
      current.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id !== itemId) return item;

            if (field === "equivalenciaUnidades") {
              const sanitizedValue = sanitizeDecimalInput(value);
              return {
                ...item,
                equivalenciaUnidades: sanitizedValue === "" ? "" : sanitizedValue,
              };
            }

            if (field === "tipoUnidad") {
              return {
                ...item,
                tipoUnidad: value === "paquete" ? "paquete" : "unidad",
                equivalenciaUnidades:
                  value === "paquete" ? item.equivalenciaUnidades || 1 : 1,
              };
            }

            return { ...item, [field]: value };
          }),
        };
      })
    );
  };

  const addCategory = () => {
    setCategorias((current) => [...current, createEmptyCategory()]);
  };

  const removeCategory = (categoryId) => {
    setCategorias((current) => current.filter((cat) => cat.id !== categoryId));
  };

  const addItem = (categoryId) => {
    setCategorias((current) =>
      current.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: [...cat.items, createEmptyItem()] }
          : cat
      )
    );
  };

  const removeItem = (categoryId, itemId) => {
    setCategorias((current) =>
      current.map((cat) => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          items: cat.items.filter((item) => item.id !== itemId),
        };
      })
    );
  };

  const resetForm = () => {
    setTipoNombre("");
    setCategorias([createEmptyCategory()]);
    setEditingTipoId(null);
    setExcelFileName("");
  };

  const handleDownloadTemplate = () => {
    const header = ["Nombre del item", "Categoría", "Unidad de medida", "Tipo de medida", "Equivalencia por paquete"];
    const ejemplos = [
      ["Arroz", "Granos", "kg", "paquete", "12"],
      ["Leche entera", "Lácteos", "L", "unidad", "1"],
      ["Detergente", "Aseo", "unidad", "paquete", "6"],
    ];

    const hoja = XLSX.utils.aoa_to_sheet([header, ...ejemplos]);
    hoja["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 18 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Plantilla");
    XLSX.writeFile(libro, "plantilla_tipo_inventario.xlsx");
  };

  const handleExcelFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (!rows || rows.length === 0) {
        setMessage("El archivo Excel está vacío.");
        return;
      }

      const normalize = (value) => String(value || "").trim();
      const firstRow = rows[0].map(normalize);
      const hasHeader = firstRow.some((cell) =>
        /(item|nombre|categor[ií]a|unidad)/i.test(cell)
      );
      const startIndex = hasHeader ? 1 : 0;

      const newCategories = {};
      let importedCount = 0;

      for (let i = startIndex; i < rows.length; i += 1) {
        const row = rows[i];
        const itemName = normalize(row[0]);
        const categoryName = normalize(row[1]) || "Sin categoría";
        const unidad = normalize(row[2]);

        if (!itemName) continue;

        importedCount += 1;
        if (!newCategories[categoryName]) {
          newCategories[categoryName] = [];
        }

        newCategories[categoryName].push({
          id: `${Date.now()}-${Math.random()}`,
          nombre: itemName,
          unidad,
        });
      }

      const parsedCategories = Object.entries(newCategories).map(
        ([nombre, items]) => ({
          id: `${Date.now()}-${Math.random()}`,
          nombre,
          items: items.map((item) => ({
            ...item,
            tipoUnidad: "unidad",
            equivalenciaUnidades: 1,
          })),
        })
      );

      if (parsedCategories.length === 0) {
        setMessage("No se encontraron items válidos en el archivo Excel.");
        return;
      }

      setCategorias(parsedCategories);
      setMessage(`Importados ${importedCount} items desde Excel.`);
    } catch (error) {
      console.error(error);
      setMessage("Error leyendo el archivo Excel. Asegúrate de que tenga columnas A/B/C válidas.");
    }
  };

  const buildPayload = () => {
    return categorias
      .map((cat) => ({
        nombre: cat.nombre.trim(),
        items: cat.items
          .map((item) => {
            const normalizedItem = normalizeItemConfig(item);
            return {
              nombre: item.nombre.trim(),
              unidad: (item.unidad || "").trim(),
              tipoUnidad: normalizedItem.tipoUnidad,
              equivalenciaUnidades:
                normalizedItem.tipoUnidad === "paquete" ? normalizedItem.equivalenciaUnidades : 1,
            };
          })
          .filter((item) => item.nombre),
      }))
      .filter((cat) => cat.nombre && cat.items.length);
  };

  const handleSaveTipo = async () => {
    if (!tipoNombre.trim()) {
      setMessage("Debes escribir el nombre del tipo de inventario.");
      return;
    }

    const payload = buildPayload();

    if (!payload.length) {
      setMessage("Debes definir al menos una categoría con uno o más items.");
      return;
    }

    try {
      if (editingTipoId) {
        await actualizarTipoInventario(editingTipoId, tipoNombre.trim(), payload);
        setMessage("Tipo de inventario actualizado correctamente.");
      } else {
        await crearTipoInventario(tiendaId, tipoNombre.trim(), payload);
        setMessage("Tipo de inventario guardado correctamente.");
      }
      resetForm();
      await loadTipos(tiendaId);
    } catch (error) {
      console.error(error);
      setMessage(
        editingTipoId
          ? "Error al actualizar el tipo de inventario."
          : "Error al guardar el tipo de inventario."
      );
    }
  };

  const handleEditTipo = (tipo) => {
    setEditingTipoId(tipo.id);
    setTipoNombre(tipo.nombre || "");
    const cats = tipo.categorias?.length
      ? tipo.categorias.map((cat) => ({
          id: `${Date.now()}-${Math.random()}`,
          nombre: cat.nombre || "",
          items: cat.items?.length
            ? cat.items.map((item) => {
                const normalizedItem = normalizeItemConfig(item);
                return {
                  id: `${Date.now()}-${Math.random()}`,
                  nombre: item.nombre || "",
                  unidad: item.unidad || "",
                  tipoUnidad: normalizedItem.tipoUnidad,
                  equivalenciaUnidades: normalizedItem.equivalenciaUnidades,
                };
              })
            : [createEmptyItem()],
        }))
      : [createEmptyCategory()];
    setCategorias(cats);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage("");
  };

  const handleDeleteTipo = async (tipo) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${tipo.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      setDeletingTipoId(tipo.id);
      await eliminarTipoInventario(tipo.id);
      if (editingTipoId === tipo.id) {
        resetForm();
      }
      await loadTipos(tiendaId);
      setMessage("Tipo de inventario eliminado.");
    } catch (error) {
      console.error(error);
      setMessage("Error al eliminar el tipo de inventario.");
    } finally {
      setDeletingTipoId(null);
    }
  };

  if (loading) {
    return (
      <div className="tipos-inventario">
        <div className="tipos-inventario-state">Cargando tipos de inventario...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="tipos-inventario">
        <div className="tipos-inventario-state">
          Necesitas iniciar sesión para ver esta sección.
        </div>
      </div>
    );
  }

  if (!tiendaId) {
    return (
      <div className="tipos-inventario">
        <div className="tipos-header">
          <span className="eyebrow"><BoxIcon size={12} /> Inventario</span>
          <h2>Tipos de inventarios</h2>
        </div>
        <div className="tipos-inventario-state">
          No se encontró una tienda asociada a tu usuario.
        </div>
      </div>
    );
  }

  return (
    <div className="tipos-inventario">
      <div className="tipos-header">
        <span className="eyebrow"><BoxIcon size={12} /> Inventario</span>
        <h2>Tipos de inventarios</h2>
        <p>Define nombres, categorías y items para los inventarios de tu tienda.</p>
      </div>

      <section className="tipos-form">
        <h3>
          {editingTipoId ? "Editar tipo de inventario" : "Crear nuevo tipo de inventario"}
        </h3>
        {!isGerente() && (
          <p className="warning"><AlertIcon /> Solo el gerente puede crear o editar tipos de inventario.</p>
        )}

        <div className="field-group">
          <label>Nombre del tipo de inventario</label>
          <input
            value={tipoNombre}
            onChange={(e) => setTipoNombre(e.target.value)}
            placeholder="Ej: Inventario diario"
            disabled={!isGerente()}
          />
        </div>

        <div className="field-group excel-import">
          <label>Importar desde Excel</label>
          <div className="excel-import-controls">
            <label className={`file-upload-btn ${!isGerente() ? "disabled" : ""}`}>
              <UploadIcon /> Elegir archivo
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleExcelFileChange}
                disabled={!isGerente()}
              />
            </label>
            <span className="file-upload-name">
              {excelFileName || "Ningún archivo seleccionado"}
            </span>
            <button
              className="btn ghost small"
              type="button"
              onClick={handleDownloadTemplate}
            >
              <DownloadIcon /> Descargar plantilla
            </button>
          </div>
          <small><InfoIcon /> Columna A = Nombre del item, Columna B = Categoría, Columna C = Unidad de medida</small>
        </div>

        {categorias.map((categoria, catIndex) => (
          <div className="category-card" key={categoria.id}>
            <div className="category-header">
              <div>
                <span className="category-number">{catIndex + 1}</span>
                <div className="field-wrap">
                  <label>Categoría {catIndex + 1}</label>
                  <input
                    value={categoria.nombre}
                    onChange={(e) => changeCategoryName(categoria.id, e.target.value)}
                    placeholder="Nombre de categoría"
                    disabled={!isGerente()}
                  />
                </div>
              </div>
              {categorias.length > 1 && isGerente() && (
                <button
                  className="icon-btn danger"
                  onClick={() => removeCategory(categoria.id)}
                  type="button"
                  title="Eliminar categoría"
                >
                  <TrashIcon /> Eliminar categoría
                </button>
              )}
            </div>

            <div className="items-list">
              {categoria.items.map((item) => (
                <div className="item-row" key={item.id}>
                  <div className="item-field">
                    <label>Nombre del item</label>
                    <input
                      value={item.nombre}
                      onChange={(e) => changeItemField(categoria.id, item.id, "nombre", e.target.value)}
                      placeholder="Nombre del item"
                      disabled={!isGerente()}
                    />
                  </div>
                  <div className="item-field">
                    <label>Unidad de medida</label>
                    <input
                      value={item.unidad}
                      onChange={(e) => changeItemField(categoria.id, item.id, "unidad", e.target.value)}
                      placeholder="Unidad de medida"
                      disabled={!isGerente()}
                    />
                  </div>
                  <div className="item-config-group">
                    <div className="item-field">
                      <label>Se registra en</label>
                      <select
                        value={item.tipoUnidad || "unidad"}
                        onChange={(e) => changeItemField(categoria.id, item.id, "tipoUnidad", e.target.value)}
                        disabled={!isGerente()}
                      >
                        <option value="unidad">Unidad</option>
                        <option value="paquete">Paquete</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.]*"
                      step="any"
                      value={item.equivalenciaUnidades ?? 1}
                      onChange={(e) => changeItemField(categoria.id, item.id, "equivalenciaUnidades", sanitizeDecimalInput(e.target.value))}
                      placeholder="Unidades por paquete"
                      disabled={!isGerente() || (item.tipoUnidad || "unidad") !== "paquete"}
                    />
                    <small className="item-config-hint">
                      {(item.tipoUnidad || "unidad") === "paquete"
                        ? `Si registras 4 paquetes, se convertirán a ${item.equivalenciaUnidades || 1} × 4 unidades`
                        : "Se guardará como unidades simples."}
                    </small>
                  </div>
                  {categoria.items.length > 1 && isGerente() && (
                    <div className="item-row-remove">
                      <button
                        className="icon-btn danger ghost"
                        onClick={() => removeItem(categoria.id, item.id)}
                        type="button"
                        title="Quitar item"
                      >
                        <XIcon />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isGerente() && (
              <button
                className="icon-btn"
                type="button"
                onClick={() => addItem(categoria.id)}
              >
                <PlusIcon /> Agregar item
              </button>
            )}
          </div>
        ))}

        {isGerente() && (
          <div className="form-actions">
            <button className="btn secondary" type="button" onClick={addCategory}>
              <PlusIcon /> Agregar categoría
            </button>
            {editingTipoId && (
              <button className="btn ghost" type="button" onClick={handleCancelEdit}>
                <XIcon /> Cancelar edición
              </button>
            )}
            <button className="btn primary" type="button" onClick={handleSaveTipo}>
              <CheckCircleIcon /> {editingTipoId ? "Guardar cambios" : "Guardar tipo de inventario"}
            </button>
          </div>
        )}

        {message && <p className="message"><CheckCircleIcon /> {message}</p>}
      </section>

      <section className="tipos-list">
        <h3>Tipos de inventario existentes</h3>
        {tipos.length === 0 ? (
          <div className="tipos-list-empty">
            <BoxIcon size={30} />
            <p>No hay tipos de inventario definidos aún.</p>
          </div>
        ) : (
          tipos.map((tipo) => (
            <div
              className={`tipo-card ${editingTipoId === tipo.id ? "editing" : ""}`}
              key={tipo.id}
            >
              <div className="tipo-card-header">
                <div className="tipo-title">
                  <BoxIcon size={16} />
                  <strong>{tipo.nombre}</strong>
                </div>
                {isGerente() && (
                  <div className="tipo-card-actions">
                    <button
                      className="btn secondary small"
                      type="button"
                      onClick={() => handleEditTipo(tipo)}
                    >
                      <EditIcon /> Editar
                    </button>
                    <button
                      className="btn danger small"
                      type="button"
                      onClick={() => handleDeleteTipo(tipo)}
                      disabled={deletingTipoId === tipo.id}
                    >
                      <TrashIcon /> {deletingTipoId === tipo.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
              {tipo.categorias?.map((cat) => (
                <div className="tipo-category" key={`${tipo.id}-${cat.nombre}`}>
                  <h4>{cat.nombre}</h4>
                  <ul>
                    {cat.items?.map((item) => {
                      const esPaquete = item.tipoUnidad === "paquete";
                      return (
                        <li key={`${tipo.id}-${cat.nombre}-${item.nombre}`}>
                          <span>{item.nombre}</span>
                          <span className="item-meta">
                            {item.unidad && <span className="item-unidad">{item.unidad}</span>}
                            <span className={`item-tipo-chip ${esPaquete ? "paquete" : "unidad"}`}>
                              {esPaquete ? `paquete · ${item.equivalenciaUnidades || 1}u` : "unidad"}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}