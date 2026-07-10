import React, { useEffect, useState } from "react";
import "./miTienda.css";
import {
  obtenerTiendaPorId,
  crearTienda,
  editarTienda,
  obtenerInformacionUsuarioPorCorreo,
  obtenerInformacionUsuariosPorIds,
  agregarPersonalATienda,
  quitarPersonalDeTienda,
  asegurarRolGerente,
  obtenerInformacionUsuarioPorUid,
} from "../../server/funtions";
import { auth } from "../../server/server";

export default function MiTienda() {
  const [user, setUser] = useState(null);
  const [tienda, setTienda] = useState(null);
  const [nombre, setNombre] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffSearch, setStaffSearch] = useState({ user: null, loading: false, error: null });
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

  useEffect(() => {
    const email = staffEmail.trim().toLowerCase();

    if (!email) {
      setStaffSearch({ user: null, loading: false, error: null });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStaffSearch({ user: null, loading: false, error: "Ingresa un correo válido" });
      return;
    }

    let isMounted = true;
    const searchUser = async () => {
      setStaffSearch((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const target = await obtenerInformacionUsuarioPorCorreo(email);
        if (isMounted) {
          if (target) {
            setStaffSearch({ user: target, loading: false, error: null });
          } else {
            setStaffSearch({ user: null, loading: false, error: "Usuario no encontrado" });
          }
        }
      } catch (err) {
        if (isMounted) {
          setStaffSearch({ user: null, loading: false, error: err.message || "No se pudo buscar el usuario" });
        }
      }
    };

    searchUser();

    return () => {
      isMounted = false;
    };
  }, [staffEmail]);

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
      let currentUser = user;
      if (currentRol === 'GERENTE' && (currentUser.rol !== 'GERENTE' && currentUser.role !== 'GERENTE')) {
        await asegurarRolGerente(currentUser.id || currentUser.uid);
        const refreshed = await obtenerInformacionUsuarioPorUid(currentUser.id || currentUser.uid);
        setUser(refreshed);
        currentUser = refreshed;
      }
      if (tienda) {
        // sólo el gerente asociado puede editar
        if (tienda.manager && tienda.manager !== (currentUser.id || currentUser.uid)) {
          alert('Sólo el gerente de esta tienda puede editarla.');
          return;
        }
        await editarTienda(tienda.id, { nombre });
      } else {
        const id = await crearTienda(nombre, currentUser.id);
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
      let currentUser = user;
      const currentRol = (currentUser.rol || currentUser.role || '').toString().toUpperCase();
      if (currentRol === 'GERENTE' && (currentUser.rol !== 'GERENTE' && currentUser.role !== 'GERENTE')) {
        await asegurarRolGerente(currentUser.id || currentUser.uid);
        const refreshed = await obtenerInformacionUsuarioPorUid(currentUser.id || currentUser.uid);
        setUser(refreshed);
        currentUser = refreshed;
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
      let currentUser = user;
      const currentRol = (currentUser.rol || currentUser.role || '').toString().toUpperCase();
      if (currentRol === 'GERENTE' && (currentUser.rol !== 'GERENTE' && currentUser.role !== 'GERENTE')) {
        await asegurarRolGerente(currentUser.id || currentUser.uid);
        const refreshed = await obtenerInformacionUsuarioPorUid(currentUser.id || currentUser.uid);
        setUser(refreshed);
        currentUser = refreshed;
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

  if (loading) {
    return (
      <div className="mi-tienda">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="mi-tienda">
      <div className="mi-tienda-header">
        <span className="eyebrow">Tu negocio</span>
        <h2>Mi Tienda</h2>
        <p>Administra el nombre de tu tienda y el personal con acceso.</p>
      </div>

      <div className="card">
        <h2>🏪 Datos de la tienda</h2>

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

                {staffEmail && (
                  <div className="staff-search-result">
                    {staffSearch.loading && <p className="staff-search-loading">Buscando usuario...</p>}
                    {!staffSearch.loading && staffSearch.error && (
                      <p className="staff-search-error">{staffSearch.error}</p>
                    )}
                    {!staffSearch.loading && staffSearch.user && (
                      <p className="staff-search-success">
                        Usuario encontrado: <strong>{staffSearch.user.nombre || staffSearch.user.correo || staffSearch.user.id}</strong>
                      </p>
                    )}
                  </div>
                )}

                <button onClick={handleAddStaff}>Agregar personal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}