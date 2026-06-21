import React, { useEffect, useState } from "react";
import "./miTienda.css";
import {
  obtenerTiendaPorId,
  crearTienda,
  editarTienda,
  obtenerInformacionUsuarioPorCorreo,
  obtenerInformacionUsuariosPorIds,
  actualizarUsuario,
  agregarPersonalATienda,
  quitarPersonalDeTienda,
  asegurarRolGerente,
} from "../../server/funtions";
import { obtenerInformacionUsuarioPorUid } from "../../server/funtions";
import { auth } from "../../server/server";

export default function MiTienda() {
  const [user, setUser] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [nombre, setNombre] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Obtener usuario actual desde auth o localStorage como fallback
      const current = auth.currentUser;
      let u = null;
      if (current) {
        u = await obtenerInformacionUsuarioPorUid(current.uid);
      } else {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored?.uid) u = await obtenerInformacionUsuarioPorUid(stored.uid);
      }

      setUser(u);

      if (u?.idTienda) {
        const t = await obtenerTiendaPorId(u.idTienda);
        setTienda(t);
        setNombre(t?.nombre || "");
        const members = await obtenerInformacionUsuariosPorIds(t?.personal || []);
        setStaffMembers(members);
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleSave = async () => {
    if (!user) return;

    const isManager = (u) => {
      if (!u) return false;
      const rol = (u.rol || u.role || '').toString().toUpperCase();
      return rol === 'GERENTE' || u.isGerente === true;
    };

    if (!isManager(user)) {
      alert('Acceso denegado: sólo el gerente puede crear o editar la tienda.');
      return;
    }

    try {
      // Normalize role in Firestore if the stored role differs only by capitalization
      const currentRol = (user.rol || user.role || '').toString().toUpperCase();
      if (currentRol === 'GERENTE' && (user.rol !== 'GERENTE' && user.role !== 'GERENTE')) {
        await asegurarRolGerente(user.id || user.uid);
        // refresh user
        const refreshed = await obtenerInformacionUsuarioPorUid(user.id || user.uid);
        setUser(refreshed);
        user = refreshed;
      }
      if (tienda) {
        // sólo el gerente asociado puede editar
        if (tienda.manager && tienda.manager !== (user.id || user.uid)) {
          alert('Sólo el gerente de esta tienda puede editarla.');
          return;
        }
        await editarTienda(tienda.id, { nombre });
      } else {
        const id = await crearTienda(nombre, user.id);
        const t = await obtenerTiendaPorId(id);
        setTienda(t);
        const members = await obtenerInformacionUsuariosPorIds(t?.personal || []);
        setStaffMembers(members);
      }

      alert("Tienda guardada correctamente");
    } catch (e) {
      console.error(e);
      alert("Error guardando tienda: " + (e.message || e));
    }
  };

  const handleAddStaff = async () => {
    if (!user || !tienda) return;
    const isManager = (u) => {
      if (!u) return false;
      const rol = (u.rol || u.role || '').toString().toUpperCase();
      return rol === 'GERENTE' || u.isGerente === true;
    };

    if (!isManager(user)) {
      alert('Acceso denegado: sólo el gerente puede agregar personal.');
      return;
    }

    try {
      const currentRol = (user.rol || user.role || '').toString().toUpperCase();
      if (currentRol === 'GERENTE' && (user.rol !== 'GERENTE' && user.role !== 'GERENTE')) {
        await asegurarRolGerente(user.id || user.uid);
        const refreshed = await obtenerInformacionUsuarioPorUid(user.id || user.uid);
        setUser(refreshed);
        user = refreshed;
      }
      const target = await obtenerInformacionUsuarioPorCorreo(staffEmail);
      if (!target) {
        alert('Usuario no encontrado');
        return;
      }

      await agregarPersonalATienda(tienda.id, target.id);
      const t = await obtenerTiendaPorId(tienda.id);
      setTienda(t);
      const members = await obtenerInformacionUsuariosPorIds(t?.personal || []);
      setStaffMembers(members);
      setStaffEmail('');
      alert('Personal agregado correctamente');
    } catch (e) {
      console.error(e);
      alert('Error agregando personal: ' + (e.message || e));
    }
  };

  const handleRemoveStaff = async (uid) => {
    if (!user || !tienda) return;
    const isManager = (u) => {
      if (!u) return false;
      const rol = (u.rol || u.role || '').toString().toUpperCase();
      return rol === 'GERENTE' || u.isGerente === true;
    };

    if (!isManager(user)) {
      alert('Acceso denegado: sólo el gerente puede remover personal.');
      return;
    }

    try {
        const currentRol = (user.rol || user.role || '').toString().toUpperCase();
        if (currentRol === 'GERENTE' && (user.rol !== 'GERENTE' && user.role !== 'GERENTE')) {
          await asegurarRolGerente(user.id || user.uid);
          const refreshed = await obtenerInformacionUsuarioPorUid(user.id || user.uid);
          setUser(refreshed);
          user = refreshed;
        }
      await quitarPersonalDeTienda(tienda.id, uid);
      const t = await obtenerTiendaPorId(tienda.id);
      setTienda(t);
      const members = await obtenerInformacionUsuariosPorIds(t?.personal || []);
      setStaffMembers(members);
      alert('Personal removido correctamente');
    } catch (e) {
      console.error(e);
      alert('Error removiendo personal: ' + (e.message || e));
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="mi-tienda">
      <div className="card">
        <h2>🏪 Mi Tienda</h2>

        <label>Nombre de la tienda</label>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Tienda Central"
        />

        <button onClick={handleSave}>
          {tienda ? "Actualizar tienda" : "Crear tienda"}
        </button>

        {tienda && (
          <div className="info">
            <p>
              <b>ID:</b> {tienda.id}
            </p>
            <p>
              <b>Nombre de la tienda:</b> {tienda.nombre}
            </p>
            <p>
              <b>Manager:</b> {tienda.manager || 'Sin asignar'}
            </p>
            <div className="staff">
              <h4>Personal con acceso</h4>
              <ul>
                {(staffMembers || []).map((member) => (
                  <li key={member.id}>
                    <div>
                      <strong>{member.nombre || member.displayName || member.correo || member.id}</strong>
                      <div className="staff-meta">{member.correo || 'Sin correo'}</div>
                    </div>
                    <button onClick={() => handleRemoveStaff(member.id)}>Remover</button>
                  </li>
                ))}
              </ul>

              <div className="add-staff">
                <input
                  placeholder="Email del usuario"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                />
                <button onClick={handleAddStaff}>Agregar personal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}