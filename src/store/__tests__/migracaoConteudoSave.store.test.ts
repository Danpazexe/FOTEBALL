/**
 * Migração de CONTEÚDO no load: um save guarda o mundo de quando foi criado. Se o
 * seed cresceu depois (a Primera Divisão passou de 3 → 20 clubes), o load injeta
 * os clubes/jogadores FALTANTES no mundo-mestre — sem tocar nos existentes. Assim
 * um save antigo (ex.: carreira no Man City feita antes da Argentina crescer)
 * passa a enxergar os 20 no mercado, sem recomeçar a carreira.
 */
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const argentinos = <T extends {divisao?: string}>(clubes: T[]): T[] =>
  clubes.filter(c => c.divisao === 'Primera División');

describe('migração de conteúdo do seed no load', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('injeta os clubes novos do seed que faltam no save (Primera 3 → 20)', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id); // clube brasileiro
    const snap = montarSnapshot(estado());
    const todosArg = argentinos(snap.todosClubes ?? []);
    expect(todosArg.length).toBe(20);

    // Simula um SAVE ANTIGO: só 3 clubes argentinos + os jogadores deles.
    const manter = new Set(todosArg.slice(0, 3).map(c => c.id));
    const removidos = new Set(
      todosArg.filter(c => !manter.has(c.id)).map(c => c.id),
    );
    snap.todosClubes = (snap.todosClubes ?? []).filter(
      c => c.divisao !== 'Primera División' || manter.has(c.id),
    );
    snap.todosJogadores = (snap.todosJogadores ?? []).filter(
      j => !removidos.has(j.clubeId ?? ''),
    );
    expect(argentinos(snap.todosClubes).length).toBe(3);

    // Ao carregar, a migração recompleta os 20.
    const aplicado = aplicarSnapshot(snap);
    const argsDepois = argentinos(aplicado.todosClubes ?? []);
    expect(argsDepois.length).toBe(20);
    // Preserva exatamente os 3 originais do save.
    for (const id of manter) {
      expect(argsDepois.some(c => c.id === id)).toBe(true);
    }
    // Os jogadores dos clubes reinjetados voltam ao mundo.
    const idsClubesReinjetados = argsDepois
      .filter(c => removidos.has(c.id))
      .map(c => c.id);
    for (const clubeId of idsClubesReinjetados) {
      expect(
        (aplicado.todosJogadores ?? []).some(j => j.clubeId === clubeId),
      ).toBe(true);
    }
  });

  it('é idempotente: save já completo não ganha clubes duplicados', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id);
    const snap = montarSnapshot(estado());
    const antes = (snap.todosClubes ?? []).length;
    const aplicado = aplicarSnapshot(snap);
    expect((aplicado.todosClubes ?? []).length).toBe(antes);
    // Sem ids duplicados.
    const ids = (aplicado.todosClubes ?? []).map(c => c.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });
});
