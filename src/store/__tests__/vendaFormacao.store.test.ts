/**
 * Regressão do crash "Não há jogadores disponíveis": vender/emprestar um titular
 * precisa tirá-lo da FORMAÇÃO (não só do elenco). Senão fica um id fantasma que
 * resolve um XI vazio e derruba a simulação.
 */
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

/** Todo id na formação do clube deve pertencer ao elenco atual (sem fantasma). */
function semFantasma(clubeId: string): boolean {
  const clube = estado().clubes.find(c => c.id === clubeId)!;
  const elenco = new Set(clube.elenco);
  const ids = [
    ...(clube.formacaoAtual?.titulares.map(t => t.jogadorId) ?? []),
    ...(clube.formacaoAtual?.reservas ?? []),
  ];
  return ids.every(id => elenco.has(id));
}

describe('venderJogador saneia a formação (regressão do XI vazio)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('vender um titular remove o id da formação e mantém 11 (promove reserva)', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id);
    const uid = estado().clubeUsuarioId!;
    const usuario = estado().clubes.find(c => c.id === uid)!;
    const titularId = usuario.formacaoAtual!.titulares[0].jogadorId;

    const res = estado().venderJogador(titularId);
    expect(res.ok).toBe(true);

    const depois = estado().clubes.find(c => c.id === uid)!;
    const idsTitulares = depois.formacaoAtual!.titulares.map(t => t.jogadorId);
    expect(idsTitulares).not.toContain(titularId);
    expect(depois.formacaoAtual!.reservas).not.toContain(titularId);
    // Havia reservas → promove e mantém os 11.
    expect(depois.formacaoAtual!.titulares).toHaveLength(11);
    expect(semFantasma(uid)).toBe(true);
  });

  it('vender vários titulares em sequência + avançar rodada NÃO crasha', () => {
    estado().iniciarNovaCarreira(estado().clubes[6].id);
    const uid = estado().clubeUsuarioId!;

    // Vende titulares até esgotar reservas (esvazia o XI resolvido no limite).
    for (let i = 0; i < 15; i += 1) {
      const u = estado().clubes.find(c => c.id === uid)!;
      const vendavel = u.formacaoAtual!.titulares.find(t =>
        u.elenco.includes(t.jogadorId),
      );
      if (!vendavel) {
        break;
      }
      estado().venderJogador(vendavel.jogadorId);
      expect(semFantasma(uid)).toBe(true);
    }

    // Antes do fix, isto lançava "Não há jogadores disponíveis para a simulação".
    expect(() => estado().avancarRodada()).not.toThrow();
  });
});
