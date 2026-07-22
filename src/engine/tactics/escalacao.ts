/**
 * Escalação — regra de domínio da montagem e edição de formação: templates de
 * esquema, tática padrão, escolha automática dos 11 (compatibilidade de
 * posição domina overall), banco e operações puras sobre `Formacao`
 * (trocar titular, trocar esquema, mover no campo).
 *
 * Movida VERBATIM de `api/database/seed/defaults.ts` (M7 do refactor SOLID):
 * o seed é só um consumidor — a regra vale para o editor de tática, o campo e
 * os ajustes durante a partida. Determinística: sem RNG, sem relógio.
 */
import type {
  Formacao,
  FormacaoPreset,
  Position,
  Tatica,
  TitularFormacao,
  Player,
} from '../../types';

import {posicaoPorCoordenada, preencherCoordenadas} from './geometria';
import {TAMANHO_BANCO} from './formacaoOps';

export const TEMPLATES_FORMACAO: Record<FormacaoPreset, Position[]> = {
  '4-4-2': ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MC', 'MEI', 'CA', 'SA'],
  '4-3-3': ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE'],
  '3-5-2': ['GOL', 'ZAG', 'ZAG', 'ZAG', 'VOL', 'MC', 'MC', 'MEI', 'MEI', 'CA', 'SA'],
  '4-2-3-1': ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'VOL', 'MEI', 'PD', 'PE', 'CA'],
  '5-3-2': ['GOL', 'LD', 'ZAG', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'CA', 'SA'],
  // 4-5-1: 4 zagueiros, meio-campo de 5 (1 volante + 4 meias) e 1 centroavante.
  // Num campo de 3 linhas é a forma real do "4-1-4-1" (o volante e os 4 meias
  // ocupam a mesma faixa de meio). Só 1 atacante — por isso NÃO usa PD/PE (pontas).
  '4-5-1': ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MEI', 'MC', 'MC', 'MEI', 'CA'],
};

export const FORMACOES_DISPONIVEIS = Object.keys(
  TEMPLATES_FORMACAO,
) as FormacaoPreset[];

const formacao433: Position[] = TEMPLATES_FORMACAO['4-3-3'];

export const taticaDefault: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
  ladoAtaque: 'Ambos',
  amplidao: 'Normal',
};

// Compatibilidade de posição DOMINA a escolha automática: um jogador na posição
// certa (principal ou secundária) sempre ganha de um improvisado, mesmo com
// overall bem menor. Só quando NÃO há ninguém apto para a posição é que entra
// alguém de fora dela. Overall/condição/moral desempatam DENTRO do mesmo nível.
const COMPAT_PRINCIPAL = 3000;
const COMPAT_SECUNDARIA = 1500;
// Indisponível (lesão/suspensão) cai para o fim absoluto da fila: só é escalado
// quando não há NENHUMA alternativa apta para fechar os 11.
const PENALIDADE_INDISPONIVEL = 100000;

function jogadorCompatibilidade(jogador: Player, posicao: Position): number {
  if (jogador.posicaoPrincipal === posicao) {
    return COMPAT_PRINCIPAL;
  }
  if (jogador.posicoesSecundarias.includes(posicao)) {
    return COMPAT_SECUNDARIA;
  }
  return 0;
}

// Qualidade para DESEMPATE dentro do mesmo nível de compatibilidade: overall
// modulado por condição física (cansaço derruba) e moral (motivação soma/tira).
function qualidadeEscalacao(jogador: Player): number {
  const condicao = jogador.condicaoFisica ?? 100;
  const moral = jogador.moral ?? 70;
  return jogador.overall + (condicao - 100) * 0.15 + (moral - 70) * 0.08;
}

function scoreEscalacao(jogador: Player, posicao: Position): number {
  const base =
    jogadorCompatibilidade(jogador, posicao) + qualidadeEscalacao(jogador);
  return jogador.lesionado || jogador.suspenso
    ? base - PENALIDADE_INDISPONIVEL
    : base;
}

function escolherTitulares(
  jogadores: Player[],
  template: Position[] = formacao433,
): TitularFormacao[] {
  const disponiveis = [...jogadores];

  return template.map(posicao => {
    disponiveis.sort(
      (a, b) => scoreEscalacao(b, posicao) - scoreEscalacao(a, posicao),
    );

    const escolhido = disponiveis.shift();

    if (!escolhido) {
      throw new Error(`Elenco insuficiente para preencher a posição ${posicao}`);
    }

    return {
      posicao,
      jogadorId: escolhido.id,
    };
  });
}

// Banco padrão: melhores NÃO-titulares APTOS — lesionado/suspenso NÃO ocupa vaga
// no banco (vai para "fora do jogo"). Ordena por qualidade (overall + condição +
// moral) e corta no teto do banco.
function montarReservas(
  jogadores: Player[],
  titularIds: Set<string>,
): string[] {
  return jogadores
    .filter(
      jogador =>
        !titularIds.has(jogador.id) &&
        !jogador.lesionado &&
        !jogador.suspenso,
    )
    .sort((a, b) => qualidadeEscalacao(b) - qualidadeEscalacao(a))
    .slice(0, TAMANHO_BANCO)
    .map(jogador => jogador.id);
}

export function criarFormacaoDefault(jogadores: Player[]): Formacao {
  const titulares = preencherCoordenadas(escolherTitulares(jogadores));
  const titularIds = new Set(titulares.map(titular => titular.jogadorId));

  return {
    tipo: '4-3-3',
    titulares,
    reservas: montarReservas(jogadores, titularIds),
  };
}

/**
 * Monta uma formação para um dado tipo, escolhendo automaticamente os 11
 * melhores jogadores por compatibilidade de posição. Usada ao trocar o
 * esquema tático no editor de escalação.
 */
export function montarFormacao(
  jogadores: Player[],
  tipo: FormacaoPreset,
): Formacao {
  const titulares = preencherCoordenadas(
    escolherTitulares(jogadores, TEMPLATES_FORMACAO[tipo]),
  );
  const titularIds = new Set(titulares.map(titular => titular.jogadorId));

  return {
    tipo,
    titulares,
    reservas: montarReservas(jogadores, titularIds),
  };
}

/**
 * Coloca `novoJogadorId` no slot `slotIndex` da escalação. Se o jogador já é
 * titular em outro slot, troca os dois; caso contrário, o antigo titular vai
 * para o banco. Função pura — devolve uma nova `Formacao`.
 */
export function trocarTitular(
  formacao: Formacao,
  slotIndex: number,
  novoJogadorId: string,
): Formacao {
  const titulares = formacao.titulares.map(titular => ({...titular}));
  const slot = titulares[slotIndex];

  if (!slot || slot.jogadorId === novoJogadorId) {
    return formacao;
  }

  const antigoId = slot.jogadorId;
  const outroSlot = titulares.find(titular => titular.jogadorId === novoJogadorId);

  if (outroSlot) {
    // Jogador já titular: troca os dois mantendo as posições dos slots.
    outroSlot.jogadorId = antigoId;
    slot.jogadorId = novoJogadorId;
    return {...formacao, titulares};
  }

  // Jogador do banco: entra no slot e o antigo titular vai para as reservas.
  slot.jogadorId = novoJogadorId;
  const reservas = formacao.reservas.filter(id => id !== novoJogadorId);
  reservas.unshift(antigoId);

  return {...formacao, titulares, reservas};
}

/**
 * Troca o ESQUEMA tático (ex.: 4-4-2 → 4-3-3) mantendo exatamente os 11
 * jogadores que já estão em campo — apenas redistribui as posições entre eles
 * por compatibilidade. Diferente de `montarFormacao`, que reescolhe os titulares
 * do elenco inteiro. Usada durante a partida (não conta como substituição).
 * Função pura.
 */
export function trocarEsquema(
  formacao: Formacao,
  jogadores: Player[],
  tipo: FormacaoPreset,
): Formacao {
  if (tipo === formacao.tipo) {
    return formacao;
  }

  const porId = new Map(jogadores.map(jogador => [jogador.id, jogador]));
  const titularesAtuais = formacao.titulares
    .map(titular => porId.get(titular.jogadorId))
    .filter((jogador): jogador is Player => jogador !== undefined);

  // Sem os 11 em mãos não dá para redistribuir com segurança: mantém como está.
  if (titularesAtuais.length !== formacao.titulares.length) {
    return formacao;
  }

  const disponiveis = [...titularesAtuais];
  const novosTitulares: TitularFormacao[] = TEMPLATES_FORMACAO[tipo].map(
    posicao => {
      disponiveis.sort(
        (a, b) =>
          b.overall +
          jogadorCompatibilidade(b, posicao) -
          (a.overall + jogadorCompatibilidade(a, posicao)),
      );
      const escolhido = disponiveis.shift();
      return {
        posicao,
        jogadorId: escolhido ? escolhido.id : '',
      };
    },
  );

  return {
    tipo,
    titulares: preencherCoordenadas(novosTitulares),
    reservas: formacao.reservas,
  };
}

/**
 * Move um titular para uma coordenada livre (x/y normalizados) no campo,
 * recalculando sua posição discreta a partir do ponto solto (ver
 * `posicaoPorCoordenada`). A formação passa a ser 'Personalizada' — nasceu do
 * posicionamento do técnico, não de um esquema pronto. Função pura.
 */
export function moverTitular(
  formacao: Formacao,
  slotIndex: number,
  x: number,
  y: number,
): Formacao {
  const slot = formacao.titulares[slotIndex];
  if (!slot) {
    return formacao;
  }

  const titulares = formacao.titulares.map((titular, indice) =>
    indice === slotIndex
      ? {...titular, x, y, posicao: posicaoPorCoordenada(x, y)}
      : titular,
  );

  return {...formacao, tipo: 'Personalizada', titulares};
}
