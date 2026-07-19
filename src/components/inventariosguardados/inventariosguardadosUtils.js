import { convertToUnits, normalizeItemConfig, normalizeMeasurementMode } from "../../utils/inventarioConversion";

const getKey = (categoriaNombre, itemNombre) => `${categoriaNombre}||${itemNombre}`;

export function normalizeExportMode(value) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "bodega" || normalized === "linea" || normalized === "ambos") {
    return normalized;
  }

  return null;
}

export function getItemDetailState(item = {}, existingDetail = {}) {
  const defaultMode = normalizeMeasurementMode(item?.tipoUnidad, "unidad") === "paquete" ? "paquete" : "unidad";

  return {
    bodega: existingDetail?.bodega ?? "",
    linea: existingDetail?.linea ?? "",
    bodegaModoRegistro: existingDetail?.bodegaModoRegistro ?? existingDetail?.modoRegistro ?? defaultMode,
    lineaModoRegistro: existingDetail?.lineaModoRegistro ?? existingDetail?.modoRegistro ?? defaultMode,
  };
}

export function buildItemDetailsMap(inventario = {}, existingItemDetails = {}) {
  const details = {};

  (inventario.categorias || []).forEach((categoria) => {
    (categoria.items || []).forEach((item) => {
      const key = getKey(categoria.nombre, item.nombre);
      details[key] = getItemDetailState(item, existingItemDetails[key] || {});
    });
  });

  return details;
}

export function buildInventarioPayload(inventario, itemDetails, mode = "ambos") {
  const normalizedMode = normalizeExportMode(mode) || "ambos";

  const categorias = (inventario.categorias || []).map((categoria) => ({
    nombre: categoria.nombre,
    items: (categoria.items || []).map((item) => {
      const key = getKey(categoria.nombre, item.nombre);
      const detail = itemDetails[key] || { bodega: item.bodega || "", linea: item.linea || "" };
      const normalizedItem = normalizeItemConfig(item);
      const payloadItem = { nombre: item.nombre };

      if (normalizedMode !== "linea") {
        payloadItem.bodega = convertToUnits(detail.bodega, normalizedItem, detail.bodegaModoRegistro || detail.modoRegistro || normalizedItem.tipoUnidad);
      }

      if (normalizedMode !== "bodega") {
        payloadItem.linea = convertToUnits(detail.linea, normalizedItem, detail.lineaModoRegistro || detail.modoRegistro || normalizedItem.tipoUnidad);
      }

      return payloadItem;
    }),
  }));

  return {
    id: inventario.id,
    nombre: inventario.nombreInventario || inventario.tipoInventarioNombre || "Inventario",
    tipo: inventario.tipoInventarioNombre || null,
    creadoPor: inventario.createdByName || null,
    ultimaEdicion: inventario.updatedByName || null,
    exportadoEn: new Date().toISOString(),
    modoExportacion: normalizedMode,
    categorias,
  };
}