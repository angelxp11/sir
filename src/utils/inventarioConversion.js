export function normalizeMeasurementMode(value, fallback = "unidad") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "paquete") return "paquete";
  if (normalized === "unidad") return "unidad";
  return fallback === "paquete" ? "paquete" : "unidad";
}

export function normalizeItemConfig(item = {}) {
  const tipoUnidad = normalizeMeasurementMode(item?.tipoUnidad, "unidad");
  const equivalenciaUnidades = Number(item?.equivalenciaUnidades || 0);

  return {
    ...item,
    tipoUnidad,
    equivalenciaUnidades: Number.isFinite(equivalenciaUnidades) && equivalenciaUnidades > 0 ? equivalenciaUnidades : 1,
  };
}

export function convertToUnits(value, item = {}, selectedMode = null) {
  const normalizedItem = normalizeItemConfig(item);
  const measurementMode = normalizeMeasurementMode(selectedMode, normalizedItem.tipoUnidad);
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) return "";

  const parsed = Number(cleanValue.replace(/,/g, "."));
  if (!Number.isFinite(parsed)) return "";

  if (measurementMode === "paquete") {
    return parsed * normalizedItem.equivalenciaUnidades;
  }

  return parsed;
}
