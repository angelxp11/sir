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

export default function HomePage({ onLogout, usuario }) {
  const [activeView, setActiveView] = useState('dashboard');

  const handleNavigate = (view) => {
    setActiveView(view);
  };

  return (
    <div className="home">
      <Navbar onLogout={onLogout} usuario={usuario} onNavigate={handleNavigate} />

      <main className="main-content">
        {activeView === 'dashboard' && (
          <>
            <section className="hero">
              <div className="hero-content">
                <h1>Bienvenido a Nuestra Plataforma</h1>
                <p>
                  Gestiona toda tu información de manera rápida,
                  segura y desde cualquier dispositivo.
                </p>

                <button className="hero-btn">Comenzar Ahora</button>
              </div>
            </section>

            <section className="cards-section">
              <h2>Nuestros Servicios</h2>

              <div className="cards">
                <div className="card">
                  <h3>Gestión</h3>
                  <p>Administra tus procesos de forma eficiente.</p>
                </div>

                <div className="card">
                  <h3>Seguridad</h3>
                  <p>Protegemos tus datos con altos estándares.</p>
                </div>

                <div className="card">
                  <h3>Reportes</h3>
                  <p>Obtén información en tiempo real.</p>
                </div>
              </div>
            </section>
          </>
        )}

        {activeView === 'mi-perfil' && <MiPerfil usuario={usuario} />}
        {activeView === 'mi-tienda' && <MiTienda />}
        {activeView === 'editar-personal' && <EditarPersonal />}
        {activeView === 'tipos-inventarios' && <TiposInventario />}
        {activeView === 'crear-inventario' && <CrearInventario />}
        {activeView === 'inventarios-guardados' && <InventariosGuardados />}
      </main>
    </div>
  );
}