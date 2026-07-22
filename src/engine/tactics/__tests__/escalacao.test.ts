/**
 * Lacunas de cobertura da escalação: criarFormacaoDefault (caminho padrão do
 * seed/nova carreira) e moverTitular (reposicionamento livre no campo — base
 * do drag-drop do editor). O resto do módulo é coberto por
 * escalacaoFluxo/formacaoEditor.
 */
import {criarFormacaoDefault, moverTitular} from '../escalacao';
import {TAMANHO_BANCO} from '../formacaoOps';
import type {Formacao, Player, Position} from '../../../types';

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
    forma: 0,
    valorMercado: 1_000_000,
    salario: 10_000,
    contratoAte: '2028-12-31',
    clubeId: 'clube',
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

/** Elenco 4-3-3 completo + sobras para o banco. */
function elencoCompleto(): Player[] {
  const posicoes: Position[] = [
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
  const titulares = posicoes.map((posicao, indice) =>
    jogador(`t${indice}`, posicao, 80),
  );
  const sobras = Array.from({length: TAMANHO_BANCO + 3}, (_, indice) =>
    jogador(`r${indice}`, 'MC', 60 + (indice % 10)),
  );
  return [...titulares, ...sobras];
}

describe('criarFormacaoDefault', () => {
  it('monta 4-3-3 com 11 titulares na posição certa e banco cheio no teto', () => {
    const formacao = criarFormacaoDefault(elencoCompleto());

    expect(formacao.tipo).toBe('4-3-3');
    expect(formacao.titulares).toHaveLength(11);
    // Cada especialista assume sua posição (compatibilidade domina overall).
    formacao.titulares.forEach(titular => {
      expect(titular.jogadorId.startsWith('t')).toBe(true);
    });
    expect(formacao.reservas).toHaveLength(TAMANHO_BANCO);
    // Todo titular sai com coordenada preenchida (preencherCoordenadas).
    formacao.titulares.forEach(titular => {
      expect(typeof titular.x).toBe('number');
      expect(typeof titular.y).toBe('number');
    });
  });

  it('é determinística: mesmo elenco produz a mesma formação', () => {
    expect(criarFormacaoDefault(elencoCompleto())).toEqual(
      criarFormacaoDefault(elencoCompleto()),
    );
  });
});

describe('moverTitular', () => {
  const base = (): Formacao => criarFormacaoDefault(elencoCompleto());

  it('reposiciona o slot, recalcula a posição pelo ponto e vira Personalizada', () => {
    const formacao = base();
    const movida = moverTitular(formacao, 10, 0.5, 0.05);

    expect(movida.tipo).toBe('Personalizada');
    const slot = movida.titulares[10];
    expect(slot?.x).toBe(0.5);
    expect(slot?.y).toBe(0.05);
    // y < 0.12 = linha de fundo própria ⇒ posição discreta GOL.
    expect(slot?.posicao).toBe('GOL');
    // Demais slots intactos (função pura, sem efeito colateral).
    movida.titulares.forEach((titular, indice) => {
      if (indice !== 10) {
        expect(titular).toEqual(formacao.titulares[indice]);
      }
    });
    expect(movida.reservas).toEqual(formacao.reservas);
  });

  it('é no-op para slot inexistente', () => {
    const formacao = base();
    expect(moverTitular(formacao, 99, 0.5, 0.5)).toBe(formacao);
  });
});
