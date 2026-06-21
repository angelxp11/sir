import React, { useState, useEffect, useRef } from 'react';
import './navbar.css';
import { FiMenu, FiChevronLeft } from 'react-icons/fi';

const Navbar = ({ onLogout, usuario, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const hideTimeoutRef = useRef(null);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
    resetAutoHideTimer();
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    resetAutoHideTimer();
  };

  const resetAutoHideTimer = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    
    // Solo auto-hide en móviles
    if (window.innerWidth <= 768) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 5000);
    }
  };

  useEffect(() => {
    const handleMouseMove = () => {
      resetAutoHideTimer();
    };

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Inicializar en base al tamaño
    if (window.innerWidth > 768) {
      setIsOpen(true);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Mantener clases en el body para controlar el layout (colapso / cerrado)
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    // Cuando está cerrado en desktop, añadimos clase para ajustar el margin del contenido
    const isDesktop = window.innerWidth > 768;
    document.body.classList.toggle('sidebar-closed', !isOpen && isDesktop);
  }, [isCollapsed, isOpen]);

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  };

  const handleNav = (e, view) => {
    e.preventDefault();
    if (onNavigate) onNavigate(view);
    handleLinkClick();
  };

  return (
    <>
      {/* Toggle button para móviles */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <FiChevronLeft size={20} />
        ) : (
          <FiMenu size={20} />
        )}
      </button>

      {/* Overlay para móviles */}
      {isOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={closeSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <a href="/" className="sidebar-brand">
            <i className="ti ti-package"></i>
            {!isCollapsed && <span>Inventario</span>}
          </a>
          <button
            className="collapse-btn"
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            title={isCollapsed ? 'Expandir' : 'Contraer'}
          >
            <i className={`ti ${isCollapsed ? 'ti-arrow-right' : 'ti-arrow-left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            <li className="sidebar-item">
              <a href="#" className="sidebar-link" onClick={(e) => handleNav(e, 'mi-perfil')}>
                <i className="ti ti-user"></i>
                {!isCollapsed && <span>Mi Perfil</span>}
              </a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link" onClick={(e) => handleNav(e, 'mi-tienda')}>
                <i className="ti ti-building"></i>
                {!isCollapsed && <span>Mi Tienda</span>}
              </a>
            </li>
            <li className="sidebar-item">
              <a href="#" className="sidebar-link" onClick={(e) => handleNav(e, 'editar-personal')}>
                <i className="ti ti-pencil"></i>
                {!isCollapsed && <span>Editar Personal</span>}
              </a>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-link logout-btn" onClick={() => { if (onLogout) onLogout(); }}>
            <i className="ti ti-logout"></i>
            {!isCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Navbar;