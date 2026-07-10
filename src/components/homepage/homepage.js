import React from "react";
import "./homepage.css";
import Navbar from "../../resources/navbar/navbar";
import MiPerfil from "../miperfil/miperfil";
import MiTienda from "../mitienda/miTienda";
import EditarPersonal from "../editarpersonal/editarpersonal";
import TiposInventario from "../tiposinventarios/tiposinventario";
import CrearInventario from "../crearinventario/crearinventario";
import InventariosGuardados from "../inventariosguardados/inventariosguardados";
import { useState } from "react";
import {
  FiArrowLeft,
  FiUser,
  FiShoppingBag,
  FiEdit3,
  FiList,
  FiPlusCircle,
  FiArchive,
} from "react-icons/fi";

// Mismos destinos que el sidebar, así el dashboard y el navbar nunca se
// desincronizan: agregar una vista en un solo lugar la muestra en ambos.
const QUICK_ACTIONS = [
  { view: "mi-perfil", label: "Mi Perfil", desc: "Consulta y actualiza tus datos personales.", icon: FiUser },
  { view: "mi-tienda", label: "Mi Tienda", desc: "Administra la información de tu tienda.", icon: FiShoppingBag },
  { view: "editar-personal", label: "Editar Personal", desc: "Gestiona los datos de tu equipo de trabajo.", icon: FiEdit3 },
  { view: "tipos-inventarios", label: "Tipos de inventarios", desc: "Define las categorías de tu inventario.", icon: FiList },
  { view: "crear-inventario", label: "Crear inventario", desc: "Registra un nuevo inventario desde cero.", icon: FiPlusCircle },
  { view: "inventarios-guardados", label: "Inventarios guardados", desc: "Revisa y edita los inventarios ya creados.", icon: FiArchive },
];

const VIEW_COMPONENTS = {
  "mi-perfil": MiPerfil,
  "mi-tienda": MiTienda,
  "editar-personal": EditarPersonal,
  "tipos-inventarios": TiposInventario,
  "crear-inventario": CrearInventario,
  "inventarios-guardados": InventariosGuardados,
};

export default function HomePage({ onLogout, usuario }) {
  const [activeView, setActiveView] = useState('dashboard');

  const displayName = usuario?.nombre || usuario?.displayName || usuario?.correo || "usuario";

  const handleNavigate = (view) => {
    setActiveView(view);
  };

  const goHome = () => setActiveView('dashboard');

  const ActiveComponent = VIEW_COMPONENTS[activeView];

  return (
    <div className="home">
      <Navbar
        onLogout={onLogout}
        usuario={usuario}
        onNavigate={handleNavigate}
        activeView={activeView}
      />

      <main className="main-content">
        {activeView === 'dashboard' ? (
          <section className="quick-actions-section">
            <div className="section-heading">
              <span className="eyebrow">Accesos rápidos</span>
              <h2>Bienvenido{usuario ? `, ${displayName}` : ''}</h2>
              <p>Las mismas secciones del menú lateral, listas para usar desde aquí.</p>
            </div>

            <div className="quick-actions">
              {QUICK_ACTIONS.map(({ view, label, desc, icon: Icon }) => (
                <button
                  key={view}
                  type="button"
                  className="action-card"
                  onClick={() => handleNavigate(view)}
                >
                  <span className="action-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{label}</h3>
                  <p>{desc}</p>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="view-section">
            <button type="button" className="back-btn" onClick={goHome}>
              <FiArrowLeft size={18} />
              Volver al inicio
            </button>

            {ActiveComponent && (
              <ActiveComponent usuario={activeView === 'mi-perfil' ? usuario : undefined} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}