/**
 * Banco de perguntas da Coletiva de Imprensa (Módulo 5).
 *
 * A coletiva tem 3 perguntas, uma de cada categoria (escalação, jogador,
 * adversário). Cada resposta tem um efeito de moral no elenco que NÃO é exibido
 * ao usuário — só o retorno qualitativo (`reacao`). Textos podem conter os
 * placeholders `{jogador}` (destaque do elenco) e `{adversario}`.
 */

export type CategoriaImprensa = 'escalacao' | 'jogador' | 'adversario';

export interface OpcaoImprensa {
  texto: string;
  /** Efeito de moral no elenco — interno, nunca mostrado na UI. */
  delta: number;
  /** Retorno qualitativo após a escolha (sem números). */
  reacao: string;
}

export interface PerguntaImprensa {
  id: string;
  categoria: CategoriaImprensa;
  pergunta: string;
  opcoes: OpcaoImprensa[];
}

export interface ContextoImprensa {
  /** Nome do destaque do elenco (maior overall). */
  jogador: string;
  /** Nome do próximo adversário. */
  adversario: string;
}

export const ROTULO_CATEGORIA: Record<CategoriaImprensa, string> = {
  escalacao: 'Escalação',
  jogador: 'Jogador',
  adversario: 'Adversário',
};

const ESCALACAO: PerguntaImprensa[] = [
  {
    id: 'escalacao_mudancas',
    categoria: 'escalacao',
    pergunta: 'Vai mexer na escalação para este jogo?',
    opcoes: [
      {
        texto: 'Mantenho a base que vem respondendo',
        delta: 3,
        reacao: 'Os titulares gostaram do voto de confiança.',
      },
      {
        texto: 'Vou rodar o elenco e dar minutos a todos',
        delta: 2,
        reacao: 'Os reservas se animaram com a chance.',
      },
      {
        texto: 'Decido a escalação na hora do jogo',
        delta: 0,
        reacao: 'A imprensa ficou sem uma resposta clara.',
      },
    ],
  },
  {
    id: 'escalacao_postura',
    categoria: 'escalacao',
    pergunta: 'O time entra com postura ofensiva ou cautelosa?',
    opcoes: [
      {
        texto: 'Vamos para cima desde o apito inicial',
        delta: 2,
        reacao: 'A torcida vibrou com a promessa de ataque.',
      },
      {
        texto: 'Equilíbrio primeiro, sem pressa',
        delta: 1,
        reacao: 'Discurso maduro, avaliaram os analistas.',
      },
    ],
  },
  {
    id: 'escalacao_capitao',
    categoria: 'escalacao',
    pergunta: 'Como define quem usa a braçadeira de capitão?',
    opcoes: [
      {
        texto: 'Quem veste a camisa há mais tempo',
        delta: 3,
        reacao: 'Os veteranos do grupo aprovaram.',
      },
      {
        texto: 'A liderança se conquista dentro de campo',
        delta: 1,
        reacao: 'Mensagem de meritocracia ao elenco.',
      },
    ],
  },
];

const JOGADOR: PerguntaImprensa[] = [
  {
    id: 'jogador_destaque',
    categoria: 'jogador',
    pergunta: '{jogador} vive grande fase. A que você atribui isso?',
    opcoes: [
      {
        texto: 'Trabalho diário; o mérito é todo dele',
        delta: 4,
        reacao: '{jogador} retribuiu o elogio publicamente.',
      },
      {
        texto: 'É fruto do coletivo, não de um nome só',
        delta: 2,
        reacao: 'O grupo curtiu o foco no time.',
      },
    ],
  },
  {
    id: 'jogador_sondagem',
    categoria: 'jogador',
    pergunta: 'Há sondagens por {jogador}. Ele permanece no clube?',
    opcoes: [
      {
        texto: 'Conto com ele até o fim da temporada',
        delta: 3,
        reacao: '{jogador} demonstrou tranquilidade.',
      },
      {
        texto: 'No futebol, nunca se sabe o que vem',
        delta: -2,
        reacao: '{jogador} não gostou da resposta evasiva.',
      },
    ],
  },
  {
    id: 'jogador_cobranca',
    categoria: 'jogador',
    pergunta: '{jogador} foi mal no último jogo. Segue contando com ele?',
    opcoes: [
      {
        texto: 'Banco totalmente, é jogador da casa',
        delta: 3,
        reacao: '{jogador} se sentiu prestigiado.',
      },
      {
        texto: 'Todos no elenco precisam dar resposta',
        delta: -1,
        reacao: 'O recado de cobrança gerou tensão no vestiário.',
      },
    ],
  },
];

const ADVERSARIO: PerguntaImprensa[] = [
  {
    id: 'adversario_avaliacao',
    categoria: 'adversario',
    pergunta: 'Como você avalia o {adversario}?',
    opcoes: [
      {
        texto: 'Um adversário forte, que respeitamos muito',
        delta: 2,
        reacao: 'Discurso de respeito foi bem recebido.',
      },
      {
        texto: 'Com todo respeito, o favoritismo é nosso',
        delta: -1,
        reacao: 'A declaração ousada repercutiu lá fora.',
      },
    ],
  },
  {
    id: 'adversario_pressao',
    categoria: 'adversario',
    pergunta: 'O {adversario} chega pressionado. Isso pesa no jogo?',
    opcoes: [
      {
        texto: 'A pressão é deles; cuidamos do nosso jogo',
        delta: 1,
        reacao: 'O foco no próprio time agradou o elenco.',
      },
      {
        texto: 'Vamos explorar o nervosismo deles',
        delta: 2,
        reacao: 'O grupo comprou a ideia de cima para baixo.',
      },
    ],
  },
  {
    id: 'adversario_retrospecto',
    categoria: 'adversario',
    pergunta: 'O retrospecto recente contra o {adversario} preocupa?',
    opcoes: [
      {
        texto: 'Cada jogo é uma história nova',
        delta: 1,
        reacao: 'Mentalidade de virar a chave passou bem.',
      },
      {
        texto: 'Estamos muito melhores do que naqueles jogos',
        delta: 2,
        reacao: 'Confiança transmitida diretamente ao grupo.',
      },
    ],
  },
];

/**
 * Monta a coletiva da rodada: 3 perguntas, uma de cada categoria, escolhidas de
 * forma determinística pela rodada (estável ao revisitar a tela).
 */
export function selecionarColetiva(rodada: number): PerguntaImprensa[] {
  const pick = (banco: PerguntaImprensa[]) =>
    banco[((rodada % banco.length) + banco.length) % banco.length];
  return [pick(ESCALACAO), pick(JOGADOR), pick(ADVERSARIO)];
}

/** Substitui os placeholders `{jogador}` / `{adversario}` pelo contexto real. */
export function formatarImprensa(
  texto: string,
  contexto: ContextoImprensa,
): string {
  return texto
    .replace(/\{jogador\}/g, contexto.jogador)
    .replace(/\{adversario\}/g, contexto.adversario);
}

/** Veredito qualitativo da coletiva a partir do efeito total (sem números). */
export function veredictoColetiva(deltaTotal: number): string {
  if (deltaTotal >= 7) {
    return 'A coletiva foi um sucesso. Elenco e torcida saíram fortalecidos.';
  }
  if (deltaTotal >= 3) {
    return 'Coletiva equilibrada. O grupo recebeu bem suas palavras.';
  }
  if (deltaTotal >= 0) {
    return 'Coletiva morna, sem grande impacto no vestiário.';
  }
  return 'Declarações arriscadas. Parte do elenco ficou incomodada.';
}
