/**
 * Tipos da disputa de pênaltis INTERATIVA (fiel ao Mini Cup do Google — só a
 * fase de BATER). O usuário bate arrastando a bola num gesto único (mira +
 * potência ao mesmo tempo); as cobranças da CPU são resolvidas por
 * probabilidade, sem input, exibidas apenas como resultado/animação.
 *
 * A engine que consome estes tipos é PURA e determinística
 * (`engine/competitions/knockout/penaltisInterativos.ts`): o estado abaixo é
 * transitório (vive no `usePenaltiStore`, NÃO é persistido no save).
 */

/**
 * Alvo do chute como COORDENADA CONTÍNUA dentro do gol (sem grade/zona fixa —
 * fidelidade ao gesto livre do doodle original):
 * - `x`: -1 (poste esquerdo) … 0 (meio) … +1 (poste direito).
 * - `y`:  0 (rente ao chão)  … 1 (junto ao travessão).
 */
export interface PosicaoChute {
  x: number;
  y: number;
}

/**
 * Desfecho de uma cobrança. Binário de propósito: o Mini Cup não tem "pra fora"
 * (força alta ≠ risco de errar o gol), então não modelamos esse desfecho.
 */
export type ResultadoCobranca = 'GOL' | 'DEFESA';

/** Quem bate a cobrança. */
export type Cobrador = 'USUARIO' | 'CPU';

/** Lado vencedor da disputa. */
export type VencedorDisputa = 'USUARIO' | 'CPU';

/**
 * O que a engine devolve ao resolver uma cobrança do usuário — o suficiente para
 * a UI animar (para onde o goleiro mergulhou e se o chute foi no ângulo).
 */
export interface DetalheResolucaoCobranca {
  resultado: ResultadoCobranca;
  /** Posição horizontal (-1..1) para onde o goleiro mergulhou. */
  goleiroX: number;
  /** Altura (0..1) que o goleiro cobriu. */
  goleiroY: number;
  /** Chute no ângulo perfeito (canto + alto): impossível de defender. */
  perfeito: boolean;
}

/** Uma cobrança já resolvida (compõe o histórico da disputa). */
export interface CobrancaPenalti {
  cobrador: Cobrador;
  /** Índice na sequência de cobranças DAQUELE lado (0-based). */
  indice: number;
  resultado: ResultadoCobranca;
  /** Só nas cobranças do usuário: onde ele mirou (replay/animação). */
  posicaoChute?: PosicaoChute;
  /** Posição horizontal (-1..1) do mergulho do goleiro (animação). */
  goleiroX?: number;
  /** Altura (0..1) coberta pelo goleiro (animação). */
  goleiroY?: number;
}

/** Fase da máquina de estados da disputa (o store dirige a UI por ela). */
export type FaseDisputa =
  | 'BATENDO_USUARIO' // aguardando o swipe do usuário
  | 'ANIMANDO' // chute do usuário resolvido, bola/goleiro em movimento
  | 'RESULTADO_CPU' // cobrança da CPU sendo exibida (sem input)
  | 'FIM'; // disputa decidida

/**
 * Estado completo da disputa (mantido no `usePenaltiStore`). Cobranças regulares
 * = 5 por lado; persistindo o empate, morte súbita (regra real de pênaltis).
 */
export interface EstadoDisputaPenaltis {
  fase: FaseDisputa;
  /** Dificuldade atual do goleiro — sobe a cada gol do usuário (Mini Cup). */
  nivelDificuldadeGoleiro: number;
  cobrancas: CobrancaPenalti[];
  marcadosUsuario: number;
  marcadosCpu: number;
  cobradasUsuario: number;
  cobradasCpu: number;
  vencedor: VencedorDisputa | null;
}
