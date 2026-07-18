/**
 * GUARDA DE BALANCEAMENTO do épico Overall Dinâmico (Onda 8). Joga uma
 * temporada completa + virada e trava os invariantes de balanceamento medidos
 * no laboratório — os "resultados suspeitos" do mandato não podem voltar:
 *  - overall SEMPRE derivado dos atributos (drift = 0) ao longo do jogo;
 *  - lesões numa taxa saudável (nem "toda partida", nem zero);
 *  - condição do elenco em equilíbrio (nem colapsa, nem fica 100%);
 *  - curva de idade real: jovens evoluem, veteranos regridem;
 *  - sem duplicação de jogadores no mundo.
 */
import {fadiga} from '../engine/physical/fisicoEngine';
import {calcularOverall} from '../engine/progression/overall';
import {TREINO_PADRAO_ID} from '../engine/progression/treinoTipos';
import {useGameStore} from '../store/useGameStore';

const estado = () => useGameStore.getState();
const media = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);

describe('balanceamento — temporada completa (Onda 8)', () => {
  it('mantém os invariantes de balanceamento ao longo de uma temporada + virada', () => {
    estado().reiniciarCarreira();
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const elencoIds = new Set(
      estado().jogadores.filter(j => j.clubeId === usuario.id).map(j => j.id),
    );
    const overall0 = new Map(estado().jogadores.map(j => [j.id, j.overall]));
    const idade0 = new Map(estado().jogadores.map(j => [j.id, j.idade]));

    let lesoes = 0;
    let jogos = 0;
    const condicoes: number[] = [];
    let guarda = 0;
    while (estado().rodadaAtual <= 38 && guarda < 60) {
      guarda += 1;
      estado().aplicarTreino(TREINO_PADRAO_ID, guarda % 4 === 0 ? 'forte' : 'normal');
      const antes = estado().jogadores.filter(j => j.lesionado).length;
      estado().avancarRodada();
      lesoes += Math.max(0, estado().jogadores.filter(j => j.lesionado).length - antes);
      jogos += estado().clubes.length / 2;
      const elenco = estado().jogadores.filter(j => elencoIds.has(j.id));
      condicoes.push(media(elenco.map(j => j.condicaoFisica)));
    }

    // PR-01: overall SEMPRE derivado dos atributos (nada de drift acumulado).
    const drift = estado().jogadores.filter(
      j => calcularOverall(j.atributos, j.posicaoPrincipal) !== j.overall,
    ).length;
    expect(drift).toBe(0);

    // Lesões numa faixa saudável: entre ~2% e ~15% das partidas (nem zero, nem
    // "toda partida"). Determinístico, então a faixa é estável.
    const taxaLesao = lesoes / jogos;
    expect(taxaLesao).toBeGreaterThan(0.01);
    expect(taxaLesao).toBeLessThan(0.15);

    // Condição em equilíbrio: elenco jogado NÃO colapsa (média > 55) nem fica
    // sempre cheio (média < 95) — rodízio importa, mas não é punitivo demais.
    const condMedia = media(condicoes);
    expect(condMedia).toBeGreaterThan(55);
    expect(condMedia).toBeLessThan(95);
    // Fadiga acompanha (derivação coerente, faixa 0-100).
    const fad = media(estado().jogadores.filter(j => elencoIds.has(j.id)).map(j => fadiga(j)));
    expect(fad).toBeGreaterThanOrEqual(0);
    expect(fad).toBeLessThanOrEqual(100);

    // Sem duplicação de jogadores no mundo mestre.
    const ids = estado().todosJogadores.map(j => j.id);
    expect(ids.length - new Set(ids).size).toBe(0);

    // Vira a temporada e checa a curva de idade real.
    estado().finalizarTemporada();
    let jovensQueCairam = 0;
    let veteranosQueCairam = 0;
    let veteranos = 0;
    for (const j of estado().jogadores) {
      if (!elencoIds.has(j.id)) {
        continue;
      }
      const ov0 = overall0.get(j.id);
      const id0 = idade0.get(j.id);
      if (ov0 === undefined || id0 === undefined) {
        continue;
      }
      if (id0 <= 21 && j.overall < ov0) {
        jovensQueCairam += 1;
      }
      if (id0 >= 33) {
        veteranos += 1;
        if (j.overall < ov0) {
          veteranosQueCairam += 1;
        }
      }
    }
    // Jovens titulares (minutos altos) não regridem numa temporada.
    expect(jovensQueCairam).toBe(0);
    // Veteranos regridem (curva de declínio real, não "ninguém regride").
    if (veteranos > 0) {
      expect(veteranosQueCairam).toBeGreaterThan(0);
    }

    // Ledger de desenvolvimento registrou a virada (com teto).
    expect(estado().ledgerDesenvolvimento.length).toBeGreaterThan(0);
    expect(estado().ledgerDesenvolvimento.length).toBeLessThanOrEqual(120);
  }, 120000);
});
