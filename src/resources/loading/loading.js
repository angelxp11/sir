import React from "react";
import "./loading.css";

export default function Loading({ text = "Cargando..." }) {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="spinner"></div>
        <p>{text}</p>
      </div>
    </div>
  );
}