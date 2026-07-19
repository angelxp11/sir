import { buildInventarioPayload } from './inventariosguardadosUtils';

describe('buildInventarioPayload', () => {
  it('exporta los valores visibles convertidos a unidades', () => {
    const inventario = {
      id: 'inv-1',
      nombreInventario: 'Inventario prueba',
      tipoInventarioNombre: 'Bodega',
      categorias: [
        {
          nombre: 'Lácteos',
          items: [
            {
              nombre: 'Leche',
              tipoUnidad: 'paquete',
              equivalenciaUnidades: 4,
            },
          ],
        },
      ],
    };

    const itemDetails = {
      'Lácteos||Leche': {
        bodega: '2',
        linea: '3',
        bodegaModoRegistro: 'paquete',
        lineaModoRegistro: 'paquete',
      },
    };

    const payload = buildInventarioPayload(inventario, itemDetails, 'ambos');

    expect(payload.categorias[0].items[0]).toEqual({
      nombre: 'Leche',
      bodega: 8,
      linea: 12,
    });
  });
});
