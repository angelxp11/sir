export function normalizeMeasurementMode(value, fallback = "unidad") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "paquete") return "paquete";
  if (normalized === "unidad") return "unidad";
  return fallback === "paquete" ? "paquete" : "unidad";
}

export function getItemStorageKey(categoriaNombre, item = {}) {
  if (item?.id) return `id:${item.id}`;
  return `${categoriaNombre}||${item?.nombre || ""}`;
}

export function getItemReferenceId(item = {}) {
  if (item?.id) return item.id;

  const rawValue = item?.equivalenciaUnidades;
  if (typeof rawValue === "string" && rawValue.trim()) {
    const numericValue = Number(rawValue.replace(/,/g, "."));
    if (!Number.isFinite(numericValue)) return rawValue.trim();
  }

  return "";
}

export function buildItemConfigOverrides(categorias = []) {
  const overrides = {};

  (categorias || []).forEach((categoria) => {
    (categoria.items || []).forEach((item) => {
      if (!item?.id) return;
      const normalizedItem = normalizeItemConfig(item);
      overrides[item.id] = {
        tipoUnidad: normalizedItem.tipoUnidad,
        equivalenciaUnidades: normalizedItem.equivalenciaUnidades,
      };
    });
  });

  return overrides;
}

export function applySharedItemConfigs(categorias = [], overrides = {}) {
  return (categorias || []).map((categoria) => ({
    ...categoria,
    items: (categoria.items || []).map((item) => {
      if (!item?.id || !overrides[item.id]) return item;
      const normalizedItem = normalizeItemConfig(item);
      return {
        ...item,
        tipoUnidad: overrides[item.id].tipoUnidad || normalizedItem.tipoUnidad,
        equivalenciaUnidades: overrides[item.id].equivalenciaUnidades ?? normalizedItem.equivalenciaUnidades,
      };
    }),
  }));
}

export function normalizeItemConfig(item = {}) {
  const tipoUnidad = normalizeMeasurementMode(item?.tipoUnidad, "unidad");
  const rawEquivalencia = item?.equivalenciaUnidades;
  const parsedEquivalencia = typeof rawEquivalencia === "number"
    ? rawEquivalencia
    : Number(String(rawEquivalencia ?? "").replace(/,/g, "."));
  const equivalenciaUnidades = Number.isFinite(parsedEquivalencia) && parsedEquivalencia > 0
    ? parsedEquivalencia
    : 1;

  return {
    ...item,
    tipoUnidad,
    equivalenciaUnidades,
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
