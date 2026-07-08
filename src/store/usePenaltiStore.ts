/**
 * Store da disputa de pênaltis INTERATIVA — máquina de estados efêmera (NÃO
 * persistida no save) que orquestra a UI sobre a engine pura
 * (`engine/competitions/knockout/penaltisInterativos`).
 *
 * Fluxo de uma rodada: o usuário bate (`baterUsuario`) → anima → a CPU responde
 * (`resolverCpu`) → anima → próxima cobrança (`proximaCobranca`), até a disputa
 * ser decidida (`fase === 'FIM'`). O usuário SEMPRE bate primeiro na rodada.
 *
 * Determinismo: um único RNG semeado (a partir de `contexto.seed`) é threadado
 * por todas as cobranças; o gesto do usuário decide direção/potência e o RNG
 * entra só como ruído/execução — mesmo gesto + mesma seed ⇒ mesmo desfecho.
 */
import {create} from 'zustand';

import {
  avancarDificuldadeGoleiro,
  disputaDecidida,
  probabilidadeCobranca,
  resolverCobrancaCpu,
  resolverCobrancaUsuario,
} from '../engine/competitions/knockout/penaltisInterativos';
import {criarRNGComSeed, type RandomGenerator} from '../engine/simulation/rng';
import type {
  CobrancaPenalti,
  DetalheResolucaoCobranca,
  EstadoDisputaPenaltis,
  PlayerAttributes,
  PosicaoChute,
  ResultadoCobranca,
} from '../types';

/** Contexto do confronto necessário para conduzir a disputa. */
export interface PenaltiContexto {
  /** Força (0-100) do adversário — pondera a probabilidade das cobranças da CPU. */
  forcaAdversario: number;
  /** Atributos dos batedores do usuário, na ordem de cobrança (ciclados). */
  atributosBatedores: PlayerAttributes[];
  /** Seed da disputa (determinismo/replay). */
  seed: number;
}

interface PenaltiStore extends EstadoDisputaPenaltis {
  /** Disputa em andamento (a tela montou e chamou `iniciar`). */
  ativo: boolean;
  contexto: PenaltiContexto | null;
  /** Prepara uma nova disputa e coloca o usuário para bater. */
  iniciar: (contexto: PenaltiContexto) => void;
  /** Resolve a cobrança do usuário a partir do gesto. Devolve o detalhe p/ animar. */
  baterUsuario: (
    posicaoChute: PosicaoChute,
    potencia: number,
  ) => DetalheResolucaoCobranca | null;
  /** Resolve a próxima cobrança da CPU (probabilidade). Devolve o desfecho. */
  resolverCpu: () => ResultadoCobranca | null;
  /** Volta o turno para o usuário (após animar a cobrança da CPU). */
  proximaCobranca: () => void;
  /** Encerra e limpa a disputa (ao sair da tela). */
  encerrar: () => void;
}

const ESTADO_INICIAL: EstadoDisputaPenaltis & {
  ativo: boolean;
  contexto: PenaltiContexto | null;
} = {
  fase: 'BATENDO_USUARIO',
  nivelDificuldadeGoleiro: 0,
  cobrancas: [],
  marcadosUsuario: 0,
  marcadosCpu: 0,
  cobradasUsuario: 0,
  cobradasCpu: 0,
  vencedor: null,
  ativo: false,
  contexto: null,
};

/** RNG da disputa em andamento — recriado a cada `iniciar` (não persistido). */
let rngDisputa: RandomGenerator = criarRNGComSeed(0);

export const usePenaltiStore = create<PenaltiStore>((set, get) => ({
  ...ESTADO_INICIAL,

  iniciar: contexto => {
    rngDisputa = criarRNGComSeed(contexto.seed);
    set({...ESTADO_INICIAL, ativo: true, contexto, fase: 'BATENDO_USUARIO'});
  },

  baterUsuario: (posicaoChute, potencia) => {
    const s = get();
    if (!s.ativo || s.fase !== 'BATENDO_USUARIO' || !s.contexto) {
      return null;
    }
    const indice = s.cobradasUsuario;
    const batedores = s.contexto.atributosBatedores;
    const atributosBatedor =
      batedores.length > 0 ? batedores[indice % batedores.length] : null;

    const detalhe = resolverCobrancaUsuario({
      posicaoChute,
      potencia,
      nivelDificuldadeGoleiro: s.nivelDificuldadeGoleiro,
      atributosBatedor,
      rng: rngDisputa,
    });

    const marcou = detalhe.resultado === 'GOL';
    const marcadosUsuario = s.marcadosUsuario + (marcou ? 1 : 0);
    const cobradasUsuario = indice + 1;
    // Goleiro fica mais difícil a cada gol do usuário (escalada do Mini Cup).
    const nivelDificuldadeGoleiro = marcou
      ? avancarDificuldadeGoleiro(s.nivelDificuldadeGoleiro)
      : s.nivelDificuldadeGoleiro;

    const cobranca: CobrancaPenalti = {
      cobrador: 'USUARIO',
      indice,
      resultado: detalhe.resultado,
      posicaoChute,
      goleiroX: detalhe.goleiroX,
      goleiroY: detalhe.goleiroY,
    };
    const decisao = disputaDecidida(
      marcadosUsuario,
      s.marcadosCpu,
      cobradasUsuario,
      s.cobradasCpu,
    );

    set({
      cobrancas: [...s.cobrancas, cobranca],
      marcadosUsuario,
      cobradasUsuario,
      nivelDificuldadeGoleiro,
      fase: decisao.decidido ? 'FIM' : 'ANIMANDO',
      vencedor: decisao.decidido ? decisao.vencedor ?? null : null,
    });
    return detalhe;
  },

  resolverCpu: () => {
    const s = get();
    if (!s.ativo || s.fase !== 'ANIMANDO' || !s.contexto) {
      return null;
    }
    const prob = probabilidadeCobranca(s.contexto.forcaAdversario);
    const resultado = resolverCobrancaCpu(prob, rngDisputa);

    const marcou = resultado === 'GOL';
    const marcadosCpu = s.marcadosCpu + (marcou ? 1 : 0);
    const cobradasCpu = s.cobradasCpu + 1;

    const cobranca: CobrancaPenalti = {
      cobrador: 'CPU',
      indice: s.cobradasCpu,
      resultado,
    };
    const decisao = disputaDecidida(
      s.marcadosUsuario,
      marcadosCpu,
      s.cobradasUsuario,
      cobradasCpu,
    );

    set({
      cobrancas: [...s.cobrancas, cobranca],
      marcadosCpu,
      cobradasCpu,
      fase: decisao.decidido ? 'FIM' : 'RESULTADO_CPU',
      vencedor: decisao.decidido ? decisao.vencedor ?? null : null,
    });
    return resultado;
  },

  proximaCobranca: () => {
    const s = get();
    if (!s.ativo || s.fase !== 'RESULTADO_CPU') {
      return;
    }
    set({fase: 'BATENDO_USUARIO'});
  },

  encerrar: () => {
    set({...ESTADO_INICIAL});
  },
}));
