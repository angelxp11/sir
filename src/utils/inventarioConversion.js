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

export function convertValueBetweenModes(value, item = {}, currentMode = null, targetMode = null) {
  const normalizedItem = normalizeItemConfig(item);
  const fromMode = normalizeMeasurementMode(currentMode, normalizedItem.tipoUnidad);
  const toMode = normalizeMeasurementMode(targetMode, normalizedItem.tipoUnidad);
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) return "";

  const parsed = Number(cleanValue.replace(/,/g, "."));
  if (!Number.isFinite(parsed)) return "";

  if (fromMode === toMode) return cleanValue;

  if (fromMode === "paquete" && toMode === "unidad") {
    return String(parsed * normalizedItem.equivalenciaUnidades);
  }

  if (fromMode === "unidad" && toMode === "paquete") {
    const converted = parsed / normalizedItem.equivalenciaUnidades;
    return Number.isInteger(converted) ? String(converted) : String(converted.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1"));
  }

  return cleanValue;
}
