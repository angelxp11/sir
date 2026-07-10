import React, { useEffect, useState } from 'react';
import './miperfil.css';
import { auth } from '../../server/server';
import { obtenerInformacionUsuarioPorUid } from '../../server/funtions';

// Convierte claves tipo "idTienda" o "correo_electronico" en etiquetas legibles.
const humanizeKey = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());

export default function MiPerfil({ usuario: usuarioProp }) {
  const [usuario, setUsuario] = useState(usuarioProp || null);
  const [loading, setLoading] = useState(!usuarioProp);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (usuarioProp) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const current = auth.currentUser;
        if (!current) {
          setUsuario(null);
          return;
        }

        const data = await obtenerInformacionUsuarioPorUid(current.uid);
        // Fallback to basic auth info if no Firestore doc
        if (data) setUsuario(data);
        else setUsuario({ uid: current.uid, correo: current.email });
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [usuarioProp]);

  return (
    <div className="mi-perfil">
      <div className="perfil-header">
        <span className="eyebrow">Tu cuenta</span>
        <h2>Mi Perfil</h2>
        <p>Información asociada a tu cuenta.</p>
      </div>

      {loading && <div className="mi-perfil-state">Cargando perfil...</div>}
      {!loading && error && <div className="mi-perfil-state">Error: {error}</div>}
      {!loading && !error && !usuario && (
        <div className="mi-perfil-state">No hay usuario conectado.</div>
      )}

      {!loading && !error && usuario && (
        <div className="perfil-card">
          {Object.keys(usuario).map((key) => (
            <div className="perfil-row" key={key}>
              <div className="perfil-key">{humanizeKey(key)}</div>
              <div className="perfil-value">{String(usuario[key])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}