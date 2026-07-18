/**
 * Primera División (Argentina) deixou de ser liga degenerada de 3 clubes: agora
 * tem 20 clubes reais com elencos completos. Este teste trava a jogabilidade:
 * carreira iniciada num clube argentino gera uma liga de 20, todos com elenco, e
 * a calibração de load reconcilia os elencos gerados (overall = atributos: drift
 * zero — mesmo invariante PR-01 das outras ligas).
 */
import {calcularOverall} from '../engine/progression/overall';
import {useGameStore} from '../store/useGameStore';

const estado = () => useGameStore.getState();

describe('Primera División (Argentina) — liga jogável', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('tem 20 clubes no mundo mestre (não mais 3)', () => {
    const argentinos = estado().todosClubes.filter(
      c => c.divisao === 'Primera División',
    );
    expect(argentinos.length).toBe(20);
    // Os 3 originais continuam presentes.
    for (const id of ['club_boca_juniors', 'club_racing_club', 'club_lanus']) {
      expect(argentinos.some(c => c.id === id)).toBe(true);
    }
  });

  it('é jogável: liga de 20, elencos completos, calendário gerado', () => {
    const river = estado().todosClubes.find(c => c.id === 'club_river_plate');
    expect(river).toBeTruthy();
    estado().iniciarNovaCarreira(river!.id);

    expect(estado().clubes.length).toBe(20);
    expect(estado().clubes.every(c => c.divisao === 'Primera División')).toBe(
      true,
    );
    // Todo clube tem elenco jogável.
    for (const c of estado().clubes) {
      const elenco = estado().jogadores.filter(j => j.clubeId === c.id);
      expect(elenco.length).toBeGreaterThanOrEqual(18);
      // Pelo menos um goleiro por clube.
      expect(elenco.some(j => j.posicaoPrincipal === 'GOL')).toBe(true);
    }
    // Calendário de returno gerado.
    expect(estado().partidas.length).toBeGreaterThan(0);
  });

  it('mantém PR-01: sem drift overall×atributos após a calibração de load', () => {
    const river = estado().todosClubes.find(c => c.id === 'club_river_plate')!;
    estado().iniciarNovaCarreira(river.id);
    const drift = estado().jogadores.filter(
      j => calcularOverall(j.atributos, j.posicaoPrincipal) !== j.overall,
    );
    expect(drift.length).toBe(0);
  });
});
