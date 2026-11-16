/** Resultado común de cualquier importación (previsualización antes de guardar). */
export interface StatBlock { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

export type ImportErrorCode = 'bad_size' | 'bad_checksum' | 'bad_species' | 'unsupported' | 'bad_text';

export class ImportError extends Error {
  constructor(public code: ImportErrorCode, message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface ImportedPokemon {
  source: 'pk6' | 'showdown';
  generation: number | null;
  /** Número de Pokédex nacional (formatos binarios) */
  speciesId: number | null;
  /** Nombre de especie (texto de Showdown); en binarios se resuelve con el catálogo */
  speciesName: string | null;
  formIndex: number;
  nickname: string | null;       // null si no tiene apodo propio
  level: number | null;          // null si el archivo no lo guarda (se pedirá al usuario)
  gender: 'M' | 'F' | 'N' | null;
  natureId: number | null;
  natureName: string | null;
  abilityId: number | null;
  abilityName: string | null;
  moveIds: number[];
  moveNames: string[];
  heldItemId: number | null;
  heldItemName: string | null;
  isShiny: boolean;
  teraType: string | null;
  ivs: StatBlock | null;
  evs: StatBlock | null;
  stats: StatBlock | null;       // estadísticas finales, solo si el archivo las incluye
  otName: string | null;
  tid: number | null;
  sid: number | null;
  /** Huella para avisar de posibles duplicados (no fusiona nada por sí sola) */
  fingerprint: string | null;
  /** Avisos para la previsualización (forma no resuelta, nombre desconocido...) */
  warnings: string[];
}
