import React, { useEffect, useState } from "react";
import "./editarpersonal.css";
import { auth } from "../../server/server";
import {
  obtenerInformacionUsuarioPorUid,
  obtenerTiendaPorId,
  obtenerInformacionUsuariosPorIds,
  actualizarUsuario,
} from "../../server/funtions";

export default function EditarPersonal() {
  const [user, setUser] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formValues, setFormValues] = useState({
    nombre: "",
    correo: "",
    rol: "",
    idTienda: "",
    activo: true,
  });
  const [tiendaNombre, setTiendaNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const isManager = (u) => {
    if (!u) return false;
    const rol = (u.rol || u.role || "").toString().toUpperCase();
    return rol === "GERENTE" || u.isGerente === true;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const current = auth.currentUser;
      let u = null;
      if (current) {
        u = await obtenerInformacionUsuarioPorUid(current.uid);
      } else {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored?.uid) u = await obtenerInformacionUsuarioPorUid(stored.uid);
      }
      setUser(u);

      if (!u || !isManager(u) || !u.idTienda) {
        setLoading(false);
        return;
      }

      const tiendaData = await obtenerTiendaPorId(u.idTienda);
      setTienda(tiendaData);
      setTiendaNombre(tiendaData?.nombre || "");

      if (tiendaData?.personal?.length) {
        const members = await obtenerInformacionUsuariosPorIds(tiendaData.personal);
        setStaff(members);
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleSelect = (member) => {
    setSelectedMember(member);
    setFormValues({
      nombre: member.nombre || "",
      correo: member.correo || "",
      rol: member.rol || member.role || "",
      idTienda: member.idTienda || "",
      activo: member.activo !== undefined ? member.activo : true,
    });
    setTiendaNombre(tienda?.nombre || "");
    setMessage(null);
  };

  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedMember) return;
    if (!isManager(user)) {
      setMessage({ type: "error", text: "Solo el gerente puede editar personal." });
      return;
    }

    try {
      await actualizarUsuario(selectedMember.id, {
        nombre: formValues.nombre,
        correo: formValues.correo,
        rol: formValues.rol,
        idTienda: formValues.idTienda,
        activo: formValues.activo,
      });
      const members = await obtenerInformacionUsuariosPorIds(tienda.personal || []);
      setStaff(members);
      const refreshed = members.find((m) => m.id === selectedMember.id);
      setSelectedMember(refreshed || selectedMember);
      setMessage({ type: "success", text: "Información del personal actualizada." });
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error al actualizar información." });
    }
  };

  if (loading) {
    return (
      <div className="editar-personal">
        <div className="editar-personal-state">Cargando...</div>
      </div>
    );
  }

  if (!user || !isManager(user)) {
    return (
      <div className="editar-personal">
        <div className="editar-personal-state">
          Acceso denegado: solo el gerente puede editar personal.
        </div>
      </div>
    );
  }

  if (!tienda) {
    return (
      <div className="editar-personal">
        <div className="editar-personal-state">
          No se encontró una tienda asociada a este gerente.
        </div>
      </div>
    );
  }

  return (
    <div className="editar-personal">
      <div className="editar-header">
        <span className="eyebrow">Tu equipo</span>
        <h2>Editar Personal</h2>
        <p>Selecciona un miembro del personal para actualizar sus datos.</p>
      </div>

      <div className="editar-card">
        <div className="editar-grid">
          <div className="staff-list">
            <h3>Personal de la tienda</h3>
            {staff.length === 0 ? (
              <p>No hay personal asignado.</p>
            ) : (
              <ul>
                {staff.map((member) => (
                  <li
                    key={member.id}
                    className={selectedMember?.id === member.id ? "selected" : ""}
                    onClick={() => handleSelect(member)}
                  >
                    <div>
                      <strong>{member.nombre || member.correo || member.id}</strong>
                      <span>{member.correo || "Sin correo"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="staff-form">
            <h3>Datos del personal</h3>
            {selectedMember ? (
              <>
                <label>Nombre</label>
                <input
                  type="text"
                  value={formValues.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                />

                <label>Correo</label>
                <input
                  type="email"
                  value={formValues.correo}
                  onChange={(e) => handleChange("correo", e.target.value)}
                />

                <label>Rol</label>
                <select
                  value={formValues.rol}
                  onChange={(e) => handleChange("rol", e.target.value)}
                >
                  <option value="GERENTE">GERENTE</option>
                  <option value="LIDER">LIDER</option>
                </select>

                <label>Tienda</label>
                <input type="text" value={tiendaNombre} readOnly />

                <label>Estado</label>
                <select
                  value={formValues.activo ? "activo" : "inactivo"}
                  onChange={(e) => handleChange("activo", e.target.value === "activo")}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>

                <button onClick={handleSave}>Guardar cambios</button>
                {message && (
                  <p className={`message ${message.type}`}>{message.text}</p>
                )}
              </>
            ) : (
              <p>Selecciona un miembro del personal para editar sus datos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}