import {criarPlayer} from '../../../testing/fixtures';
import type {Formacao, Player, Position, TitularFormacao} from '../../../types';

import {validarFormacao} from '../formationValidation';

const CLUBE = 'meu-clube';

// 4-3-3 canônico: 1 GOL, 4 defensores, 3 meias, 3 atacantes (estrutura válida).
const POSICOES: Position[] = [
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

/**
 * Elenco onde cada jogador é natural na sua posição de slot e está apto.
 * `overrides` mapeia índice do slot → campos a sobrescrever nesse jogador.
 */
function baseJogadores(
  overrides: Record<number, Partial<Player>> = {},
): Player[] {
  return POSICOES.map((posicao, i) =>
    criarPlayer({
      id: `j${i}`,
      nome: `Jogador ${i}`,
      posicaoPrincipal: posicao,
      clubeId: CLUBE,
      ...overrides[i],
    }),
  );
}

/** Titulares index-alinhados ao array POSICOES (11 slots). */
function baseTitulares(): TitularFormacao[] {
  return POSICOES.map((posicao, i) => ({posicao, jogadorId: `j${i}`}));
}

function form(
  titulares: TitularFormacao[],
  tipo: Formacao['tipo'] = '4-3-3',
): Formacao {
  return {tipo, titulares, reservas: []};
}

describe('validarFormacao', () => {
  it('aceita uma formação válida sem erros nem avisos', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('bloqueia escalação sem goleiro', () => {
    const titulares = baseTitulares();
    titulares[0] = {...titulares[0], posicao: 'ZAG'}; // GOL vira zagueiro
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('goleiro'))).toBe(true);
  });

  it('bloqueia escalação com dois goleiros', () => {
    const titulares = baseTitulares();
    titulares[1] = {...titulares[1], posicao: 'GOL'};
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('goleiro'))).toBe(true);
  });

  it('bloqueia jogador repetido', () => {
    const titulares = baseTitulares();
    titulares[10] = {...titulares[10], jogadorId: 'j9'}; // duplica j9
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.toLowerCase().includes('repetido'))).toBe(true);
  });

  it('avisa (não bloqueia) jogador lesionado como titular', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({5: {lesionado: true}}),
      clubeId: CLUBE,
    });
    // Disponibilidade é AVISO, não bloqueio (elenco curto + motor ignora indisp.).
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.includes('lesionado'))).toBe(true);
  });

  it('avisa (não bloqueia) jogador suspenso como titular', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({6: {suspenso: true}}),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(true);
    expect(r.warnings.some(w => w.includes('suspenso'))).toBe(true);
  });

  it('bloqueia jogador de outro clube', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({7: {clubeId: 'outro-clube'}}),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('não pertence'))).toBe(true);
  });

  it('bloqueia com menos de 11 titulares', () => {
    const titulares = baseTitulares().slice(0, 10);
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('11 titulares'))).toBe(true);
  });

  it('bloqueia com mais de 11 titulares', () => {
    const extraJogador = criarPlayer({
      id: 'j11',
      nome: 'Jogador 11',
      posicaoPrincipal: 'MC',
      clubeId: CLUBE,
    });
    const titulares: TitularFormacao[] = [
      ...baseTitulares(),
      {posicao: 'MC', jogadorId: 'j11'},
    ];
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: [...baseJogadores(), extraJogador],
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('11 titulares'))).toBe(true);
  });

  it('bloqueia formação sem atacantes', () => {
    // Troca os 3 slots de ataque (PD/CA/PE) por meio-campo.
    const titulares = baseTitulares();
    titulares[8] = {...titulares[8], posicao: 'MC'};
    titulares[9] = {...titulares[9], posicao: 'MC'};
    titulares[10] = {...titulares[10], posicao: 'MC'};
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('atacante'))).toBe(true);
  });

  it('bloqueia formação sem meio-campistas suficientes', () => {
    // Deixa só 1 meia (mínimo é 2): move VOL e MC para o ataque.
    const titulares = baseTitulares();
    titulares[5] = {...titulares[5], posicao: 'SA'};
    titulares[6] = {...titulares[6], posicao: 'SA'};
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('meio-campista'))).toBe(true);
  });

  it('bloqueia formação com defesa insuficiente', () => {
    // Deixa só 2 defensores (mínimo é 3): move 2 zagueiros para o meio.
    const titulares = baseTitulares();
    titulares[2] = {...titulares[2], posicao: 'MC'};
    titulares[3] = {...titulares[3], posicao: 'MC'};
    const r = validarFormacao({
      formacao: form(titulares),
      jogadores: baseJogadores(),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('defensor'))).toBe(true);
  });

  it('jogador improvisado gera aviso, não erro', () => {
    // j9 é um zagueiro escalado no ataque (CA) — terço oposto = improvisado.
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({9: {posicaoPrincipal: 'ZAG'}}),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some(w => w.includes('improvisado'))).toBe(true);
  });

  it('avisa quando um titular está com condição física baixa', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({5: {condicaoFisica: 25}}),
      clubeId: CLUBE,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings.some(w => w.includes('condição física'))).toBe(true);
  });

  it('separa propriedade (bloqueia) de indisponibilidade (avisa)', () => {
    const r = validarFormacao({
      formacao: form(baseTitulares()),
      jogadores: baseJogadores({
        5: {lesionado: true},
        6: {suspenso: true},
        7: {clubeId: 'outro-clube'},
      }),
      clubeId: CLUBE,
    });
    // Só o jogador de outro clube bloqueia; lesionado/suspenso são avisos.
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('não pertence'))).toBe(true);
    expect(r.warnings.some(w => w.includes('lesionado'))).toBe(true);
    expect(r.warnings.some(w => w.includes('suspenso'))).toBe(true);
  });
});
