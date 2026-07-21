import { applySharedItemConfigs, buildItemConfigOverrides, getItemStorageKey } from './inventarioConversion';

describe('getItemStorageKey', () => {
  it('usa el id del item cuando está disponible', () => {
    expect(getItemStorageKey('Lácteos', { id: 'item-42', nombre: 'Leche' })).toBe('id:item-42');
  });

  it('usa el nombre y la categoría como respaldo', () => {
    expect(getItemStorageKey('Lácteos', { nombre: 'Leche' })).toBe('Lácteos||Leche');
  });
});

describe('applySharedItemConfigs', () => {
  it('propaga el tipo y la equivalencia de un item compartido por id', () => {
    const categorias = [
      {
        nombre: 'Lácteos',
        items: [
          { id: 'item-42', nombre: 'Leche', tipoUnidad: 'unidad', equivalenciaUnidades: 1 },
          { id: 'item-99', nombre: 'Yogur', tipoUnidad: 'unidad', equivalenciaUnidades: 1 },
        ],
      },
    ];

    const overrides = buildItemConfigOverrides([
      {
        nombre: 'Lácteos',
        items: [{ id: 'item-42', nombre: 'Leche', tipoUnidad: 'paquete', equivalenciaUnidades: 12 }],
      },
    ]);

    const result = applySharedItemConfigs(categorias, overrides);

    expect(result[0].items[0]).toMatchObject({
      id: 'item-42',
      tipoUnidad: 'paquete',
      equivalenciaUnidades: 12,
    });
    expect(result[0].items[1]).toMatchObject({
      id: 'item-99',
      tipoUnidad: 'unidad',
      equivalenciaUnidades: 1,
    });
  });
});
