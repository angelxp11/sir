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

const createEmptyItem = () => ({ id: `${Date.now()}-${Math.random()}`, nombre: "", unidad: "" });
const createEmptyCategory = () => ({ id: `${Date.now()}-${Math.random()}`, nombre: "", items: [createEmptyItem()] });

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
          items: cat.items.map((item) =>
            item.id === itemId ? { ...item, [field]: value } : item
          ),
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
    const header = ["Nombre del item", "Categoría", "Unidad de medida"];
    const ejemplos = [
      ["Arroz", "Granos", "kg"],
      ["Leche entera", "Lácteos", "L"],
      ["Detergente", "Aseo", "unidad"],
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
        ([nombre, items]) => ({ id: `${Date.now()}-${Math.random()}`, nombre, items })
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
          .map((item) => ({
            nombre: item.nombre.trim(),
            unidad: (item.unidad || "").trim(),
          }))
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
            ? cat.items.map((item) => ({
                id: `${Date.now()}-${Math.random()}`,
                nombre: item.nombre || "",
                unidad: item.unidad || "",
              }))
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
          <span className="eyebrow">Inventario</span>
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
        <span className="eyebrow">Inventario</span>
        <h2>Tipos de inventarios</h2>
        <p>Define nombres, categorías y items para los inventarios de tu tienda.</p>
      </div>

      <section className="tipos-form">
        <h3>
          {editingTipoId ? "Editar tipo de inventario" : "Crear nuevo tipo de inventario"}
        </h3>
        {!isGerente() && (
          <p className="warning">Solo el gerente puede crear o editar tipos de inventario.</p>
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
              Elegir archivo
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
              Descargar plantilla
            </button>
          </div>
          <small>Columna A = Nombre del item, Columna B = Categoría, Columna C = Unidad de medida</small>
        </div>

        {categorias.map((categoria, catIndex) => (
          <div className="category-card" key={categoria.id}>
            <div className="category-header">
              <div>
                <label>Categoría {catIndex + 1}</label>
                <input
                  value={categoria.nombre}
                  onChange={(e) => changeCategoryName(categoria.id, e.target.value)}
                  placeholder="Nombre de categoría"
                  disabled={!isGerente()}
                />
              </div>
              {categorias.length > 1 && isGerente() && (
                <button
                  className="icon-btn danger"
                  onClick={() => removeCategory(categoria.id)}
                  type="button"
                  title="Eliminar categoría"
                >
                  Eliminar categoría
                </button>
              )}
            </div>

            <div className="items-list">
              {categoria.items.map((item) => (
                <div className="item-row" key={item.id}>
                  <input
                    value={item.nombre}
                    onChange={(e) => changeItemField(categoria.id, item.id, "nombre", e.target.value)}
                    placeholder="Nombre del item"
                    disabled={!isGerente()}
                  />
                  <input
                    value={item.unidad}
                    onChange={(e) => changeItemField(categoria.id, item.id, "unidad", e.target.value)}
                    placeholder="Unidad de medida"
                    disabled={!isGerente()}
                  />
                  {categoria.items.length > 1 && isGerente() && (
                    <button
                      className="icon-btn danger ghost"
                      onClick={() => removeItem(categoria.id, item.id)}
                      type="button"
                      title="Quitar item"
                    >
                      ✕
                    </button>
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
                + Agregar item
              </button>
            )}
          </div>
        ))}

        {isGerente() && (
          <div className="form-actions">
            <button className="btn secondary" type="button" onClick={addCategory}>
              + Agregar categoría
            </button>
            {editingTipoId && (
              <button className="btn ghost" type="button" onClick={handleCancelEdit}>
                Cancelar edición
              </button>
            )}
            <button className="btn primary" type="button" onClick={handleSaveTipo}>
              {editingTipoId ? "Guardar cambios" : "Guardar tipo de inventario"}
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </section>

      <section className="tipos-list">
        <h3>Tipos de inventario existentes</h3>
        {tipos.length === 0 ? (
          <p>No hay tipos de inventario definidos aún.</p>
        ) : (
          tipos.map((tipo) => (
            <div
              className={`tipo-card ${editingTipoId === tipo.id ? "editing" : ""}`}
              key={tipo.id}
            >
              <div className="tipo-card-header">
                <div className="tipo-title">
                  <strong>{tipo.nombre}</strong>
                </div>
                {isGerente() && (
                  <div className="tipo-card-actions">
                    <button
                      className="btn secondary small"
                      type="button"
                      onClick={() => handleEditTipo(tipo)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn danger small"
                      type="button"
                      onClick={() => handleDeleteTipo(tipo)}
                      disabled={deletingTipoId === tipo.id}
                    >
                      {deletingTipoId === tipo.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
              {tipo.categorias?.map((cat) => (
                <div className="tipo-category" key={`${tipo.id}-${cat.nombre}`}>
                  <h4>{cat.nombre}</h4>
                  <ul>
                    {cat.items?.map((item) => (
                      <li key={`${tipo.id}-${cat.nombre}-${item.nombre}`}>
                        {item.nombre}
                        {item.unidad ? ` — ${item.unidad}` : ""}
                      </li>
                    ))}
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