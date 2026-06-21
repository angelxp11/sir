import React, { useEffect, useState } from 'react';
import './miperfil.css';
import { auth } from '../../server/server';
import { obtenerInformacionUsuarioPorUid } from '../../server/funtions';

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

  if (loading) return <div className="mi-perfil">Cargando perfil...</div>;
  if (error) return <div className="mi-perfil">Error: {error}</div>;
  if (!usuario) return <div className="mi-perfil">No hay usuario conectado.</div>;

  return (
    <div className="mi-perfil">
      <h2>Mi Perfil</h2>
      <div className="perfil-card">
        {Object.keys(usuario).map((key) => (
          <div className="perfil-row" key={key}>
            <div className="perfil-key">{key}</div>
            <div className="perfil-value">{String(usuario[key])}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
