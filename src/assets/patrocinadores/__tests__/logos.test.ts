/**
 * Mapa de logos: cada patrocinador do catálogo resolve um asset; id desconhecido
 * cai no fallback (undefined) — a UI então mostra a inicial do nome.
 */
import {CATALOGO_PATROCINADORES} from '../../../engine/patrocinio/catalogo';
import {logoPatrocinador, logosPatrocinadores} from '../index';

describe('mapa de logos dos patrocinadores', () => {
  it('tem um asset para cada um dos 36 patrocinadores do catálogo', () => {
    expect(Object.keys(logosPatrocinadores)).toHaveLength(36);
    for (const patrocinador of CATALOGO_PATROCINADORES) {
      expect(logoPatrocinador(patrocinador.id)).toBeDefined();
    }
  });

  it('id desconhecido resolve para undefined (fallback na UI)', () => {
    expect(logoPatrocinador('marca_inexistente')).toBeUndefined();
  });
});
