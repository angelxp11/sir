import React, { useState } from "react";
import "./login.css";
import { iniciarSesionConCorreoYContrasena } from "../../server/funtions";
import { showToast } from "../../resources/toastcontainer/ToastContainer";

export default function Login({ onLoginSuccess, setLoading, onGoToRegister }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      await iniciarSesionConCorreoYContrasena(correo, password);
      showToast("Inicio de sesión exitoso", "success");
      onLoginSuccess();
    } catch (err) {
      console.error("Error de inicio de sesión:", err);
      showToast("No se pudo iniciar sesión. Verifica tus credenciales.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Iniciar Sesión</h1>
          <p>Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="input-group password-group">
            <label>Contraseña</label>

            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? " Ocultar" : " Ver Contraseña"}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn">
            Ingresar
          </button>

          <p className="auth-link">
            ¿No tienes cuenta?{" "}
            <button type="button" className="link-button" onClick={onGoToRegister}>
              Regístrate
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}