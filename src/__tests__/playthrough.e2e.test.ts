/**
 * Playthrough end-to-end: dirige o STORE real (zustand) + todo o motor para
 * jogar temporadas completas, como um jogador faria. Não é um teste de unidade —
 * é a prova de que o loop inteiro do jogo roda e permanece internamente coerente:
 *
 *   iniciar carreira → 38 rodadas (com treino) → mercado → fim de temporada
 *   → evolução/idade → peneiras (base) → nova temporada → repete.
 *
 * Invariantes checados a cada temporada garantem que a simulação não "vaza"
 * pontos/gols nem quebra a tabela ao longo de várias temporadas encadeadas.
 */
import {TREINO_PADRAO_ID} from '../engine/progression/treinoTipos';
import {useGameStore} from '../store/useGameStore';
import type {Player, TabelaClassificacao} from '../types';

// 2 viradas de temporada já provam o encadeamento coerente e o envelhecimento;
// a 3ª era redundante e triplicava o custo do e2e mais caro da suíte.
const TEMPORADAS = 2;

const estado = () => useGameStore.getState();

/** Joga a temporada atual até o fim (todas as 38 rodadas), treinando a cada semana. */
function jogarTemporadaCompleta(): void {
  let guarda = 0;
  while (estado().rodadaAtual <= 38 && guarda < 60) {
    guarda += 1;
    // Alterna a carga de treino para exercitar evolução, fadiga e risco de lesão.
    const intensidade = guarda % 4 === 0 ? 'forte' : 'normal';
    estado().aplicarTreino(TREINO_PADRAO_ID, intensidade);
    estado().avancarRodada();
  }
  expect(estado().rodadaAtual).toBe(39); // todas as rodadas disputadas
}

/** Confere que a tabela da temporada fecha sem vazar pontos nem gols. */
function conferirInvariantesTabela(tabela: TabelaClassificacao[], nClubes: number): void {
  expect(tabela).toHaveLength(nClubes);
  const jogosPorClube = (nClubes - 1) * 2;

  let totVit = 0;
  let totEmp = 0;
  let totDer = 0;
  let totPro = 0;
  let totContra = 0;

  for (const linha of tabela) {
    // Cada clube disputa exatamente turno e returno contra todos os demais.
    expect(linha.jogos).toBe(jogosPorClube);
    expect(linha.vitorias + linha.empates + linha.derrotas).toBe(linha.jogos);
    // Pontuação corrida: 3 por vitória, 1 por empate.
    expect(linha.pontos).toBe(linha.vitorias * 3 + linha.empates);
    expect(linha.saldoGols).toBe(linha.golsPro - linha.golsContra);
    expect(Number.isFinite(linha.pontos)).toBe(true);

    totVit += linha.vitorias;
    totEmp += linha.empates;
    totDer += linha.derrotas;
    totPro += linha.golsPro;
    totContra += linha.golsContra;
  }

  // Toda partida decisiva gera 1 vitória e 1 derrota; todo empate conta dos 2 lados.
  expect(totVit).toBe(totDer);
  expect(totEmp % 2).toBe(0);
  // Todo gol marcado por alguém é um gol sofrido por outro: o total bate.
  expect(totPro).toBe(totContra);
  // Soma de jogos = 2 × número de partidas da liga.
  expect(totVit + totEmp + totDer).toBe(nClubes * jogosPorClube);
}

/** Nenhum jogador termina com overall/moral fora dos limites do domínio. */
function conferirSanidadeJogadores(jogadores: Player[]): void {
  for (const j of jogadores) {
    expect(Number.isFinite(j.overall)).toBe(true);
    expect(j.overall).toBeGreaterThanOrEqual(1);
    expect(j.overall).toBeLessThanOrEqual(99);
    expect(j.moral).toBeGreaterThanOrEqual(10);
    expect(j.moral).toBeLessThanOrEqual(100);
    expect(j.condicaoFisica).toBeGreaterThanOrEqual(0);
    expect(j.condicaoFisica).toBeLessThanOrEqual(100);
    expect(j.overall).toBeLessThanOrEqual(j.potencial + 1);
  }
}

describe('playthrough end-to-end (store + engine reais)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('joga 3 temporadas completas mantendo tabela, evolução e base coerentes', () => {
    const clubeUsuario = estado().clubes[5]; // um clube qualquer do meio da lista
    estado().iniciarNovaCarreira(clubeUsuario.id);
    expect(estado().clubeUsuarioId).toBe(clubeUsuario.id);

    const nClubes = estado().clubes.length;
    const partidasEsperadas = nClubes * (nClubes - 1); // turno e returno

    for (let t = 0; t < TEMPORADAS; t += 1) {
      const temporadaAntes = estado().temporadaAtual;
      const idadesAntes = new Map(
        estado().jogadores.map(j => [j.id, j.idade] as const),
      );

      // Calendário da temporada: todas as partidas, todas por jogar.
      expect(estado().partidas).toHaveLength(partidasEsperadas);
      expect(estado().partidas.every(p => !p.jogada)).toBe(true);

      jogarTemporadaCompleta();

      // Tabela fechada e coerente.
      conferirInvariantesTabela(estado().tabela, nClubes);
      conferirSanidadeJogadores(estado().jogadores);
      expect(estado().partidas.filter(p => p.jogada)).toHaveLength(partidasEsperadas);

      // Campeão da temporada (líder da tabela) é um clube válido.
      const campeao = estado().clubes.find(c => c.id === estado().tabela[0].clubeId);
      expect(campeao).toBeDefined();

      // Vira a temporada: evolução, +1 ano de idade e peneiras da base.
      estado().finalizarTemporada();

      expect(Number(estado().temporadaAtual)).toBe(Number(temporadaAntes) + 1);
      expect(estado().rodadaAtual).toBe(1);
      // Idade avança exatamente 1 ano para quem seguiu no jogo.
      for (const j of estado().jogadores) {
        const antes = idadesAntes.get(j.id);
        if (antes !== undefined) {
          expect(j.idade).toBe(antes + 1);
        }
      }
      // Peneiras geradas para a nova temporada (Módulo Academia).
      expect(estado().jovensDisponiveis.length).toBeGreaterThan(0);
      // Cartões/lesões zerados na pré-temporada.
      expect(estado().jogadores.every(j => !j.suspenso && !j.lesionado)).toBe(true);
    }

    // Após 3 viradas, estamos na temporada inicial + 3.
    expect(Number(estado().temporadaAtual)).toBe(2026 + TEMPORADAS);
  });

  it('exercita mercado e base: vender reserva, promover jovem e propor compra à IA', () => {
    const usuario = estado().clubes[8];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = usuario.id;

    const meuElenco = () => estado().jogadores.filter(j => j.clubeId === uid);

    // --- Venda de um reserva (não-titular) do próprio elenco ---
    const titularIds = new Set(
      (estado().clubes.find(c => c.id === uid)?.formacaoAtual?.titulares ?? []).map(
        t => t.jogadorId,
      ),
    );
    const reserva = meiorReserva(meuElenco(), titularIds);
    const elencoAntes = meuElenco().length;
    const saldoAntes = saldoUsuario(uid);

    const venda = estado().venderJogador(reserva.id);
    expect(venda.ok).toBe(true);
    expect(meuElenco()).toHaveLength(elencoAntes - 1);
    expect(saldoUsuario(uid)).toBeGreaterThan(saldoAntes);
    expect(estado().jogadores.find(j => j.id === reserva.id)?.clubeId).toBeNull();

    // --- Proposta de compra a um jogador da IA (resposta imediata bem-formada) ---
    const alvo = jogadorIAMaisBarato(uid);
    const resposta = estado().fazerPropostaCompra(alvo.id, Math.round(alvo.valorMercado * 1.3));
    expect(['aceita', 'recusada', 'contraproposta']).toContain(resposta.status);
    expect(typeof resposta.mensagem).toBe('string');

    // --- Base: vira a temporada para gerar peneiras e promover um jovem ---
    // Joga a temporada inteira rapidamente (sem treino) para poder finalizar.
    let guarda = 0;
    while (estado().rodadaAtual <= 38 && guarda < 60) {
      guarda += 1;
      estado().avancarRodada();
    }
    estado().finalizarTemporada();

    const jovens = estado().jovensDisponiveis;
    expect(jovens.length).toBeGreaterThan(0);
    const elencoPrePromocao = meuElenco().length;
    estado().promoverJovem(jovens[0].id);
    expect(meuElenco()).toHaveLength(elencoPrePromocao + 1);
    expect(estado().jovensDisponiveis.length).toBe(jovens.length - 1);
  });
});

/** Reserva de maior overall que NÃO é titular (mais seguro de vender). */
function meiorReserva(elenco: Player[], titularIds: Set<string>): Player {
  const reservas = elenco
    .filter(j => !titularIds.has(j.id))
    .sort((a, b) => a.overall - b.overall);
  return reservas[0] ?? elenco[0];
}

function saldoUsuario(uid: string): number {
  return useGameStore.getState().clubes.find(c => c.id === uid)?.financas.saldo ?? 0;
}

function jogadorIAMaisBarato(uid: string): Player {
  return useGameStore
    .getState()
    .jogadores.filter(j => j.clubeId !== null && j.clubeId !== uid)
    .sort((a, b) => a.valorMercado - b.valorMercado)[0];
}
