import React, { useState, useEffect } from 'react';
import './navbar.css';
import {
  FiChevronsLeft,
  FiChevronsRight,
  FiBox,
  FiUser,
  FiShoppingBag,
  FiEdit3,
  FiList,
  FiPlusCircle,
  FiArchive,
  FiLogOut,
} from 'react-icons/fi';

const NAV_ITEMS = [
  { view: 'mi-perfil', label: 'Mi Perfil', icon: FiUser },
  { view: 'mi-tienda', label: 'Mi Tienda', icon: FiShoppingBag },
  { view: 'editar-personal', label: 'Editar Personal', icon: FiEdit3 },
  { view: 'tipos-inventarios', label: 'Tipos de inventarios', icon: FiList },
  { view: 'crear-inventario', label: 'Crear inventario', icon: FiPlusCircle },
  { view: 'inventarios-guardados', label: 'Inventarios guardados', icon: FiArchive },
];

const Navbar = ({ onLogout, usuario, onNavigate, activeView }) => {
  const displayName = usuario?.nombre || usuario?.displayName || usuario?.correo || "usuario";

  // El navbar inicia oculto y se cierra al entrar a cualquier sección.
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('sidebar-collapsed', isMobile && isCollapsed);
  }, [isCollapsed]);

  const handleNav = (e, view) => {
    e.preventDefault();
    if (onNavigate) onNavigate(view);
    // Al elegir una opción se vuelve a ocultar el navbar.
    setIsCollapsed(true);
  };

  return (
    <>
    {!isCollapsed && (
      <div className="sidebar-backdrop" onClick={() => setIsCollapsed(true)} />
    )}
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <a
          href="/"
          className="sidebar-brand"
          onClick={(e) => handleNav(e, 'dashboard')}
        >
          <FiBox size={24} />
          {!isCollapsed && <span>Inventario{usuario ? ` · ${displayName}` : ''}</span>}
        </a>
        <button
          className="collapse-btn"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          title={isCollapsed ? 'Expandir' : 'Contraer'}
        >
          {isCollapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
            <li className="sidebar-item" key={view}>
              <button
                type="button"
                className={`sidebar-link ${activeView === view ? 'active' : ''}`}
                onClick={(e) => handleNav(e, view)}
                aria-current={activeView === view ? 'page' : undefined}
              >
                <Icon size={20} />
                {!isCollapsed && <span>{label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link logout-btn" onClick={() => { if (onLogout) onLogout(); }}>
          <FiLogOut size={20} />
          {!isCollapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
    </>
  );
};

export default Navbar;