import React, { useEffect, useState } from "react";
import "./editar.css";

const sanitizeDecimalInput = (value) => {
  if (value === "") return "";
  const sanitized = String(value)
    .replace(/[^0-9.]/g, "")
    .replace(/(\.)(?=.*\.)/g, "");
  return sanitized;
};

export default function EditarItemModal({ open, item, onClose, onSave }) {
  const [draft, setDraft] = useState(item || {});

  useEffect(() => {
    if (open) {
      setDraft(
        item || {
          nombre: "",
          unidad: "",
          tipoUnidad: "unidad",
          equivalenciaUnidades: 1,
        }
      );
    }
  }, [open, item]);

  if (!open || !item) return null;

  const handleChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    const nextItem = {
      ...draft,
      tipoUnidad: draft.tipoUnidad === "paquete" ? "paquete" : "unidad",
      equivalenciaUnidades:
        draft.tipoUnidad === "paquete"
          ? sanitizeDecimalInput(draft.equivalenciaUnidades ?? 1)
          : 1,
    };

    onSave(nextItem);
  };

  return (
    <div className="item-edit-overlay" role="presentation" onClick={onClose}>
      <div className="item-edit-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="item-edit-header">
          <div>
            <p className="item-edit-eyebrow">Edición rápida</p>
            <h3>{item.nombre || "Editar item"}</h3>
          </div>
          <button className="item-edit-close" type="button" onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className="item-edit-body">
          <div className="item-edit-field">
            <label>Nombre del item</label>
            <input
              value={draft.nombre || ""}
              onChange={(event) => handleChange("nombre", event.target.value)}
              placeholder="Nombre del item"
            />
          </div>

          <div className="item-edit-field">
            <label>Unidad de medida</label>
            <input
              value={draft.unidad || ""}
              onChange={(event) => handleChange("unidad", event.target.value)}
              placeholder="Unidad de medida"
            />
          </div>

          <div className="item-edit-field">
            <label>Se registra en</label>
            <select
              value={draft.tipoUnidad || "unidad"}
              onChange={(event) => handleChange("tipoUnidad", event.target.value)}
            >
              <option value="unidad">Unidad</option>
              <option value="paquete">Paquete</option>
            </select>
          </div>

          <div className="item-edit-field">
            <label>Unidades por paquete</label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              value={draft.equivalenciaUnidades ?? 1}
              onChange={(event) => handleChange("equivalenciaUnidades", sanitizeDecimalInput(event.target.value))}
              disabled={(draft.tipoUnidad || "unidad") !== "paquete"}
              placeholder="Ej: 12"
            />
          </div>
        </div>

        <div className="item-edit-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn primary" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
