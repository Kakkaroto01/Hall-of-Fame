/** Pastel de cada tipo para el fondo de la tarjeta (el nombre del tipo siempre va en texto). */
export const TYPE_PASTEL: Record<string, string> = {
  normal: '#e6e3d8', fire: '#ffd9c7', water: '#cfe3ff', electric: '#fff1b8', grass: '#d4efc9',
  ice: '#d3f1f3', fighting: '#f2cfcb', poison: '#e6d0ee', ground: '#efe0c3', flying: '#dde3fa',
  psychic: '#fbd1e1', bug: '#e2eebe', rock: '#e8e0c8', ghost: '#d9d3ea', dragon: '#d1d6f7',
  dark: '#d6d0cc', steel: '#dde3e8', fairy: '#fbdbe9',
};

export const TYPE_NAME_ES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
};

export const pastelFor = (type?: string | null) => TYPE_PASTEL[type ?? ''] ?? TYPE_PASTEL.normal;
