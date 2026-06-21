import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./components/login/login";
import HomePage from "./components/homepage/homepage";
import ToastContainer, { showToast } from "./resources/toastcontainer/ToastContainer";
import Loading from "./resources/loading/loading";
import { auth } from "./server/server";
import { onAuthStateChanged } from "firebase/auth";
import { cerrarSesion, obtenerInformacionUsuarioPorCorreo } from "./server/funtions";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        setIsLoading(true);
        try {
          const info = await obtenerInformacionUsuarioPorCorreo(user.email);
          setUsuario(info);
          showToast(`Bienvenido ${info?.nombre || user.email}`, "success");
        } catch (err) {
          console.error("No se pudo obtener info de usuario:", err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUsuario(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await cerrarSesion();
      showToast("Sesión cerrada correctamente", "success");
    } catch (error) {
      console.error(error);
      showToast("Error al cerrar sesión", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <Loading text="Verificando sesión..." />;
  }

  return (
    <div className="App">
      {isLoading && <Loading text="Cargando..." />}
      <ToastContainer />
      {isLoggedIn ? (
        <HomePage usuario={usuario} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsLoggedIn(true)} setLoading={setIsLoading} />
      )}
    </div>
  );
}

export default App;
