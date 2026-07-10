import React, { useState } from "react";
import "./register.css";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../server/server";
import { showToast } from "../../resources/toastcontainer/ToastContainer";

export default function Register({ onRegisterSuccess, setLoading, onGoToLogin }) {
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    password: "",
    confirmarPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      showToast("El nombre completo es obligatorio", "error");
      return;
    }

    if (!form.correo.trim()) {
      showToast("El correo electrónico es obligatorio", "error");
      return;
    }

    if (!form.password) {
      showToast("La contraseña es obligatoria", "error");
      return;
    }

    if (form.password.length < 6) {
      showToast("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }

    if (form.password !== form.confirmarPassword) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }

    setLoading?.(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.correo.trim().toLowerCase(),
        form.password
      );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "usuarios", uid), {
        uid,
        nombre: form.nombre.trim(),
        correo: form.correo.trim().toLowerCase(),
        fechaRegistro: new Date(),
        activo: true,
      });

      showToast("Registro exitoso. Ya puedes iniciar sesión", "success");
      onRegisterSuccess?.();
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      showToast(err.message || "No se pudo completar el registro", "error");
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <span className="register-eyebrow">SIR</span>
          <h1>Crear cuenta</h1>
          <p>Regístrate para comenzar a usar el sistema.</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <div className="input-group">
            <label>Nombre completo</label>
            <input
              type="text"
              name="nombre"
              placeholder="Juan Pérez"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Correo electrónico</label>
            <input
              type="email"
              name="correo"
              placeholder="correo@ejemplo.com"
              value={form.correo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group password-group">
            <label>Contraseña</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="********"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <div className="input-group password-group">
            <label>Confirmar contraseña</label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmarPassword"
                placeholder="********"
                value={form.confirmarPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button type="submit" className="register-btn">
            Registrarme
          </button>

          <p className="auth-link">
            ¿Ya tienes cuenta?{" "}
            <button type="button" className="link-button" onClick={onGoToLogin}>
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
