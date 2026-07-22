/**
 * Sequenciamento do replay de gol — ordem e tempos dos passos do lance
 * (função pura) + condutor determinístico por timer JS.
 *
 * Por que timer JS, e não withSequence/withTiming: a progressão do replay
 * (passe → chute → gol) é INFORMAÇÃO — mostra como o gol aconteceu — e não
 * decoração. No Android, o Reanimated considera "redução de movimento do
 * sistema" quando a Escala de animação de transição está em 0 (opções do
 * desenvolvedor/economia de bateria — muito comum em aparelho real; ver
 * NativeProxy.getIsReducedMotion, que lê TRANSITION_ANIMATION_SCALE), e com
 * ReduceMotion.System (default) todo withTiming salta direto para o valor
 * final: o replay abria já no gol, sem progressão. Conduzindo o AVANÇO aqui,
 * em JS, a sequência acontece sempre; só a SUAVIZAÇÃO visual entre passos
 * fica no Reanimated e pode ser reduzida pelo sistema (vira um salto de um
 * passo ao próximo, mantendo o passo a passo).
 *
 * Sem React, sem Reanimated, sem sorteio: mesmos parâmetros ⇒ mesmo plano e
 * mesma ordem de chamadas.
 */

/** Duração de cada segmento do lance (um passo → o próximo), em ms. */
export const DURACAO_SEGMENTO_MS = 700;

export type EventoReplay =
  | {
      tipo: 'avanco';
      /** Índice-alvo da bola (1..totalSegmentos), na ordem do lance. */
      indice: number;
      /** Instante (ms desde o início) em que o avanço COMEÇA. */
      emMs: number;
    }
  | {
      tipo: 'conclusao';
      /** Instante em que a bola CHEGA ao último ponto (fim do replay). */
      emMs: number;
    };

/**
 * Plano do replay: um avanço por segmento, em ordem (1..N, o primeiro no
 * instante 0), e a conclusão ao fim do último segmento. Sem segmentos ou com
 * duração inválida, não há nada a percorrer.
 *
 * `duracaoSegmentoMs` aceita um número (todos os segmentos iguais — replay de
 * gol) ou um array com a duração de CADA segmento (radar: chute é mais rápido
 * que passe; cruzamento, mais lento). Array curto reutiliza a última duração;
 * qualquer duração ≤ 0 invalida o plano.
 */
export function planoReplay(
  totalSegmentos: number,
  duracaoSegmentoMs: number | readonly number[],
): EventoReplay[] {
  const duracaoDe = (segmento: number): number =>
    typeof duracaoSegmentoMs === 'number'
      ? duracaoSegmentoMs
      : duracaoSegmentoMs[
          Math.min(segmento, duracaoSegmentoMs.length - 1)
        ] ?? 0;
  if (totalSegmentos <= 0) {
    return [];
  }
  for (let i = 0; i < totalSegmentos; i += 1) {
    if (!(duracaoDe(i) > 0)) {
      return [];
    }
  }
  const eventos: EventoReplay[] = [];
  let instante = 0;
  for (let i = 1; i <= totalSegmentos; i += 1) {
    eventos.push({tipo: 'avanco', indice: i, emMs: instante});
    instante += duracaoDe(i - 1);
  }
  eventos.push({tipo: 'conclusao', emMs: instante});
  return eventos;
}

export type OpcoesSequenciadorReplay = {
  /** Nº de segmentos do lance (pontos − 1). */
  totalSegmentos: number;
  /** Duração de cada segmento, em ms (número único ou uma por segmento). */
  duracaoSegmentoMs: number | readonly number[];
  /** Chamado em ordem com o índice-alvo 1..totalSegmentos (o 1º imediatamente). */
  aoAvancar: (indice: number) => void;
  /** Chamado quando a bola chega ao último ponto (hora do pulso do "GOL"). */
  aoConcluir: () => void;
};

export type SequenciadorReplay = {
  /** (Re)começa do primeiro passo; cancela qualquer execução anterior. */
  iniciar: () => void;
  /** Cancela os avanços pendentes (desmontagem/replay reiniciado). */
  parar: () => void;
};

/** Executa o `planoReplay` com setTimeout encadeado (um timer pendente por vez). */
export function criarSequenciadorReplay(
  opcoes: OpcoesSequenciadorReplay,
): SequenciadorReplay {
  const eventos = planoReplay(opcoes.totalSegmentos, opcoes.duracaoSegmentoMs);
  let pendente: ReturnType<typeof setTimeout> | null = null;
  let proximo = 0;

  const parar = (): void => {
    if (pendente !== null) {
      clearTimeout(pendente);
      pendente = null;
    }
  };

  const disparar = (evento: EventoReplay): void => {
    if (evento.tipo === 'avanco') {
      opcoes.aoAvancar(evento.indice);
    } else {
      opcoes.aoConcluir();
    }
  };

  const agendar = (agoraMs: number): void => {
    const evento = eventos[proximo];
    if (evento === undefined) {
      return;
    }
    pendente = setTimeout(() => {
      pendente = null;
      proximo += 1;
      disparar(evento);
      agendar(evento.emMs);
    }, evento.emMs - agoraMs);
  };

  const iniciar = (): void => {
    parar();
    proximo = 0;
    // Eventos do instante 0 (o 1º avanço) disparam já — o replay começa a
    // andar imediatamente, como antes.
    for (;;) {
      const evento = eventos[proximo];
      if (evento === undefined || evento.emMs !== 0) {
        break;
      }
      proximo += 1;
      disparar(evento);
    }
    agendar(0);
  };

  return {iniciar, parar};
}
