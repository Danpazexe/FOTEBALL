/**
 * Fluxo de ESCALAÇÃO "como um usuário" — percorre as ações reais da tela Tática
 * pelas funções puras que a UI chama: escalar os 11 melhores, substituir um
 * titular por um reserva (toque), e mover jogadores entre Banco e "Fora do jogo".
 * Garante o comportamento de ponta a ponta (não só peças isoladas).
 */
import {montarFormacao, trocarTitular} from '../defaults';
import {
  TAMANHO_BANCO,
  alternarBanco,
} from '../../../../engine/tactics/formacaoOps';
import type {Player, Position} from '../../../../types';

function jogador(
  id: string,
  posicao: Position,
  overall: number,
  extra: Partial<Player> = {},
): Player {
  return {
    id,
    nome: `Jogador ${id}`,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall,
      passe: overall,
      marcacao: overall,
      desarme: overall,
      velocidade: overall,
      resistencia: overall,
      forca: overall,
      reflexos: overall,
      posicionamento: overall,
      drible: overall,
      cabeceio: overall,
      cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 70,
    valorMercado: 1_000_000,
    salario: 10_000,
    contratoAte: '2030-12-31',
    clubeId: 'time',
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
    ...extra,
  };
}

// Elenco realista: 11 titulares aptos + reservas + 1 lesionado + 1 suspenso.
function elenco(): Player[] {
  const titularesPos: Position[] = [
    'GOL',
    'LD',
    'ZAG',
    'ZAG',
    'LE',
    'VOL',
    'MC',
    'MEI',
    'PD',
    'CA',
    'PE',
  ];
  const titulares = titularesPos.map((pos, i) => jogador(`t${i}`, pos, 85 - i));
  const reservasAptos = [
    jogador('rGOL', 'GOL', 78),
    jogador('rZAG', 'ZAG', 80),
    jogador('rMC', 'MC', 79),
    jogador('rCA', 'CA', 81),
    jogador('rLD', 'LD', 74),
  ];
  const lesionado = jogador('LES', 'ZAG', 90, {lesionado: true});
  const suspenso = jogador('SUS', 'CA', 91, {suspenso: true});
  return [...titulares, ...reservasAptos, lesionado, suspenso];
}

describe('fluxo de escalação (como usuário)', () => {
  it('1) toca "Escalar 11 melhores": XI por posição, SEM lesionado/suspenso', () => {
    const f = montarFormacao(elenco(), '4-3-3');

    // 11 titulares, todos aptos.
    expect(f.titulares).toHaveLength(11);
    for (const t of f.titulares) {
      expect(t.jogadorId).not.toBe('LES');
      expect(t.jogadorId).not.toBe('SUS');
    }
    // Cada slot foi para um jogador da posição certa (nada de improviso havendo apto).
    const goleiro = f.titulares.find(t => t.posicao === 'GOL');
    expect(goleiro?.jogadorId).toBe('t0'); // o GOL titular 85, não o lesionado 90
    // "Melhores por posição": o CA reserva (81) SUPERA o CA titular fraco (t9=76)
    // e vira titular — o auto-escalador promove o melhor daquela posição.
    const ca = f.titulares.find(t => t.posicao === 'CA');
    expect(ca?.jogadorId).toBe('rCA');
  });

  it('2) o banco NÃO tem indisponíveis (vão pro "fora do jogo") e cabe no teto', () => {
    const f = montarFormacao(elenco(), '4-3-3');
    expect(f.reservas.length).toBeLessThanOrEqual(TAMANHO_BANCO);
    expect(f.reservas).not.toContain('LES');
    expect(f.reservas).not.toContain('SUS');
    // O goleiro reserva (78) não supera o titular (85) → fica no banco.
    expect(f.reservas).toContain('rGOL');
  });

  it('3) substitui titular por reserva (toque A→B): reserva entra, titular vai pro banco', () => {
    const f = montarFormacao(elenco(), '4-3-3');
    const slotGOL = f.titulares.findIndex(t => t.posicao === 'GOL');
    const titularSaindo = f.titulares[slotGOL].jogadorId; // goleiro titular (t0)
    const reservaEntrando = 'rGOL'; // goleiro reserva, está no banco

    const depois = trocarTitular(f, slotGOL, reservaEntrando);

    expect(depois.titulares[slotGOL].jogadorId).toBe(reservaEntrando);
    expect(depois.titulares[slotGOL].posicao).toBe('GOL'); // slot mantém a posição
    expect(depois.reservas).toContain(titularSaindo); // o que saiu foi pro banco
    expect(depois.reservas).not.toContain(reservaEntrando); // o que entrou saiu do banco
  });

  it('4) tira um reserva do banco (−): vai pro fora e NÃO volta sozinho', () => {
    const f = montarFormacao(elenco(), '4-3-3');
    const alvo = f.reservas[0];

    const depois = alternarBanco(f, alvo);

    expect(depois.reservas).not.toContain(alvo); // saiu do banco (→ fora do jogo)
    expect(depois.reservas.length).toBe(f.reservas.length - 1); // sem auto-refill
  });

  it('5) chama um reserva apto de volta pro banco (+): entra', () => {
    const f = montarFormacao(elenco(), '4-3-3');
    const alvo = f.reservas[0];
    const semEle = alternarBanco(f, alvo); // primeiro tira
    const deVolta = alternarBanco(semEle, alvo); // e chama de novo

    expect(deVolta.reservas).toContain(alvo);
  });

  it('6) titular NUNCA vai pro banco pelo +/− do banco', () => {
    const f = montarFormacao(elenco(), '4-3-3');
    const titularId = f.titulares[5].jogadorId;
    const depois = alternarBanco(f, titularId);
    expect(depois.reservas).not.toContain(titularId);
    expect(depois).toBe(f); // no-op
  });
});
