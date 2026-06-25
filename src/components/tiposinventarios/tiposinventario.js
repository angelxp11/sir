import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import "./tiposinventario.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  crearTipoInventario,
  obtenerTiposInventarioPorTienda,
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

  const handleExcelFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

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

  const handleSaveTipo = async () => {
    if (!tipoNombre.trim()) {
      setMessage("Debes escribir el nombre del tipo de inventario.");
      return;
    }

    const payload = categorias
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

    if (!payload.length) {
      setMessage("Debes definir al menos una categor�a con uno o m�s items.");
      return;
    }

    try {
      await crearTipoInventario(tiendaId, tipoNombre.trim(), payload);
      setMessage("Tipo de inventario guardado correctamente.");
      setTipoNombre("");
      setCategorias([createEmptyCategory()]);
      await loadTipos(tiendaId);
    } catch (error) {
      console.error(error);
      setMessage("Error al guardar el tipo de inventario.");
    }
  };

  if (loading) {
    return <div className="tipos-inventario">Cargando tipos de inventario...</div>;
  }

  if (!user) {
    return <div className="tipos-inventario">Necesitas iniciar sesi�n para ver esta secci�n.</div>;
  }

  if (!tiendaId) {
    return (
      <div className="tipos-inventario">
        <h2>Tipos de inventarios</h2>
        <p>No se encontr� una tienda asociada a tu usuario.</p>
      </div>
    );
  }

  return (
    <div className="tipos-inventario">
      <div className="tipos-header">
        <h2>Tipos de inventarios</h2>
        <p>Define nombres, categor�as y items para los inventarios de tu tienda.</p>
      </div>

      <section className="tipos-form">
        <h3>Crear nuevo tipo de inventario</h3>
        {!isGerente() && (
          <p className="warning">Solo el gerente puede crear tipos de inventario.</p>
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
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelFileChange}
            disabled={!isGerente()}
          />
          <small>Columna A = Nombre del item, Columna B = Categoría, Columna C = Unidad de medida</small>
        </div>

        {categorias.map((categoria, catIndex) => (
          <div className="category-card" key={categoria.id}>
            <div className="category-header">
              <div>
                <label>Categor�a {catIndex + 1}</label>
                <input
                  value={categoria.nombre}
                  onChange={(e) => changeCategoryName(categoria.id, e.target.value)}
                  placeholder="Nombre de categor�a"
                  disabled={!isGerente()}
                />
              </div>
              {categorias.length > 1 && isGerente() && (
                <button
                  className="small-btn danger"
                  onClick={() => removeCategory(categoria.id)}
                  type="button"
                >
                  Eliminar categor�a
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
                      className="small-btn danger"
                      onClick={() => removeItem(categoria.id, item.id)}
                      type="button"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isGerente() && (
              <button
                className="small-btn"
                type="button"
                onClick={() => addItem(categoria.id)}
              >
                Agregar item
              </button>
            )}
          </div>
        ))}

        {isGerente() && (
          <div className="form-actions">
            <button className="btn" type="button" onClick={addCategory}>
              Agregar categor�a
            </button>
            <button className="btn primary" type="button" onClick={handleSaveTipo}>
              Guardar tipo de inventario
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </section>

      <section className="tipos-list">
        <h3>Tipos de inventario existentes</h3>
        {tipos.length === 0 ? (
          <p>No hay tipos de inventario definidos a�n.</p>
        ) : (
          tipos.map((tipo) => (
            <div className="tipo-card" key={tipo.id}>
              <div className="tipo-title">
                <strong>{tipo.nombre}</strong>
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
