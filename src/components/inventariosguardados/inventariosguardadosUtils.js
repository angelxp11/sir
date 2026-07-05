const getKey = (categoriaNombre, itemNombre) => `${categoriaNombre}||${itemNombre}`;

export function normalizeExportMode(value) {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();
  if (normalized === "bodega" || normalized === "linea" || normalized === "ambos") {
    return normalized;
  }

  return null;
}

export function buildInventarioPayload(inventario, itemDetails, mode = "ambos") {
  const normalizedMode = normalizeExportMode(mode) || "ambos";

  const categorias = (inventario.categorias || []).map((categoria) => ({
    nombre: categoria.nombre,
    items: (categoria.items || []).map((item) => {
      const key = getKey(categoria.nombre, item.nombre);
      const detail = itemDetails[key] || { bodega: item.bodega || "", linea: item.linea || "" };
      const payloadItem = { nombre: item.nombre };

      if (normalizedMode !== "linea") {
        payloadItem.bodega = detail.bodega;
      }

      if (normalizedMode !== "bodega") {
        payloadItem.linea = detail.linea;
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
