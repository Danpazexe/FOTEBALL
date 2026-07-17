/**
 * ENGINE FÍSICA (épico Overall Dinâmico, Onda 5).
 *
 * Dá corpo aos conceitos que a auditoria (H5/H8b) apontou como inexistentes,
 * SEM mexer na `condicaoFisica` já calibrada (a integração na força de partida
 * é da Onda 6). São grandezas separadas e com significados distintos:
 *
 *   condicaoFisica — frescor imediato (já existe; 10–100);
 *   cargaAguda     — esforço recente acumulado (0–100);
 *   cargaCronica   — preparação de base construída ao longo do tempo (0–100);
 *   ritmo          — prontidão competitiva (0–100) — descansado ≠ em ritmo.
 *
 * Prontidão, fadiga e risco de lesão são DERIVAÇÕES (funções puras), nunca
 * campos persistidos. Tudo determinístico (sem RNG/relógio aqui).
 */
import type {EstadoFisicoJogador, Player} from '../../types';
import type {ParticipacaoPartida} from '../progression/condicao';

const MIN = 0;
const MAX = 100;

function clamp(valor: number): number {
  return Math.min(MAX, Math.max(MIN, valor));
}

/** Carga aguda somada por 90' de titular (reserva/fora escalam abaixo). */
const CARGA_TITULAR = 34;
const CARGA_RESERVA = 12;
/** Ganho de ritmo por jogo (titular); reserva ganha menos. */
const RITMO_GANHO_TITULAR = 10;
const RITMO_GANHO_RESERVA = 4;
/** Ritmo perdido por dia sem jogar (destreina devagar). */
const RITMO_DECAIMENTO_DIA = 0.8;
/** Fração da carga aguda dissipada por dia de recuperação. */
const RECUPERACAO_AGUDA_DIA = 0.18;
/** Velocidade com que a carga crônica persegue a aguda (adaptação). */
const ADAPTACAO_CRONICA_DIA = 0.08;

/**
 * Estado físico inicial coerente com o jogador (default seguro do load):
 * um atleta em atividade tem base crônica sólida e ritmo conforme os jogos
 * disputados na temporada; carga aguda começa baixa (descansado).
 */
export function estadoFisicoInicial(jogador: Player): EstadoFisicoJogador {
  const jogos = jogador.estatisticasTemporada.jogos;
  const ritmo = clamp(35 + Math.min(jogos, 12) * 5); // 0 jogos≈35, 12+≈95
  return {
    cargaAguda: clamp(100 - jogador.condicaoFisica),
    cargaCronica: clamp(55 + Math.min(jogos, 20) * 1.5),
    ritmo,
  };
}

/** Garante o estado físico presente (idempotente) — migração no load. */
export function comEstadoFisico(jogador: Player): Player {
  return jogador.fisico ? jogador : {...jogador, fisico: estadoFisicoInicial(jogador)};
}

function fisicoDe(jogador: Player): EstadoFisicoJogador {
  return jogador.fisico ?? estadoFisicoInicial(jogador);
}

/** Atualiza carga/ritmo após uma partida, conforme a participação. */
export function aplicarCargaPosPartida(
  jogador: Player,
  part: ParticipacaoPartida,
): EstadoFisicoJogador {
  const fisico = fisicoDe(jogador);
  if (!part.participou) {
    // Sem jogo: perde ritmo de leve (o resto do declínio é dia-a-dia).
    return {...fisico, ritmo: clamp(fisico.ritmo - RITMO_DECAIMENTO_DIA)};
  }
  const carga = part.ehTitular ? CARGA_TITULAR : CARGA_RESERVA;
  const ganhoRitmo = part.ehTitular ? RITMO_GANHO_TITULAR : RITMO_GANHO_RESERVA;
  return {
    cargaAguda: clamp(fisico.cargaAguda + carga),
    cargaCronica: clamp(fisico.cargaCronica + carga * ADAPTACAO_CRONICA_DIA),
    ritmo: clamp(fisico.ritmo + ganhoRitmo),
  };
}

/** Recuperação de UM dia de calendário (chamado pelo pipeline diário). */
export function recuperarDiaFisico(fisico: EstadoFisicoJogador): EstadoFisicoJogador {
  const cargaAguda = clamp(fisico.cargaAguda * (1 - RECUPERACAO_AGUDA_DIA));
  return {
    cargaAguda,
    // A base crônica converge devagar para a carga recente (efeito de treino).
    cargaCronica: clamp(
      fisico.cargaCronica +
        (cargaAguda - fisico.cargaCronica) * ADAPTACAO_CRONICA_DIA,
    ),
    // Sem jogo, o ritmo cai um pouco a cada dia.
    ritmo: clamp(fisico.ritmo - RITMO_DECAIMENTO_DIA),
  };
}

/**
 * FADIGA derivada (0–100): a carga aguda pesa mais quando a base crônica é
 * baixa (o ACWR do briefing — pico de esforço sobre pouca preparação machuca).
 */
export function fadiga(jogador: Player): number {
  const fisico = fisicoDe(jogador);
  const razao = fisico.cargaAguda / Math.max(30, fisico.cargaCronica);
  return clamp(fisico.cargaAguda * 0.6 + razao * 25);
}

/**
 * PRONTIDÃO para 90 minutos (0–100): combina frescor (condição), ritmo
 * competitivo e o desconto da fadiga. Descansado sem ritmo NÃO é 100%.
 */
export function prontidao(jogador: Player): number {
  const fisico = fisicoDe(jogador);
  return Math.round(
    clamp(
      jogador.condicaoFisica * 0.45 +
        fisico.ritmo * 0.35 +
        (100 - fadiga(jogador)) * 0.2,
    ),
  );
}

export type NivelRisco = 'baixo' | 'moderado' | 'elevado' | 'muito_elevado';

/** Probabilidade interna de lesão (0–1) — usada pela simulação. */
export function probabilidadeLesao(jogador: Player): number {
  const f = fadiga(jogador);
  let risco = 0.02 + f * 0.0016; // base + fadiga
  if (jogador.condicaoFisica < 55) {
    risco += 0.03;
  } else if (jogador.condicaoFisica < 70) {
    risco += 0.015;
  }
  if (jogador.idade >= 33) {
    risco += 0.02;
  } else if (jogador.idade >= 30) {
    risco += 0.01;
  }
  // Recém-recuperado (ritmo baixo + carga residual) é mais frágil.
  if (fisicoDe(jogador).ritmo < 40) {
    risco += 0.02;
  }
  return Math.min(0.4, risco);
}

/** Faixa de risco para a UI (não expõe falsa precisão numérica). */
export function nivelRisco(jogador: Player): NivelRisco {
  const p = probabilidadeLesao(jogador);
  if (p >= 0.14) {
    return 'muito_elevado';
  }
  if (p >= 0.09) {
    return 'elevado';
  }
  if (p >= 0.05) {
    return 'moderado';
  }
  return 'baixo';
}

/**
 * Peso relativo de lesão (para a escolha ponderada do lesionado na partida) —
 * substitui a heurística `110 - condição` por fadiga+carga+idade reais.
 */
export function pesoLesaoPartida(jogador: Player): number {
  return 1 + probabilidadeLesao(jogador) * 300;
}

/**
 * RETORNO PROGRESSIVO: ao fim da lesão o jogador NÃO volta a 100%. Volta com
 * condição parcial, ritmo baixo e carga aguda residual — "disponível com
 * restrição". Recomendação de minutos vem de `minutosRecomendados`.
 */
export function aoRetornarDeLesao(jogador: Player): Player {
  const fisico = fisicoDe(jogador);
  return {
    ...jogador,
    lesionado: false,
    diasLesao: 0,
    condicaoFisica: Math.min(jogador.condicaoFisica, 60),
    fisico: {
      cargaAguda: Math.max(fisico.cargaAguda, 45),
      cargaCronica: clamp(fisico.cargaCronica * 0.8),
      ritmo: Math.min(fisico.ritmo, 30),
    },
  };
}

/** Minutos recomendados no retorno, conforme a prontidão reconquistada. */
export function minutosRecomendados(jogador: Player): number {
  const p = prontidao(jogador);
  if (p >= 80) {
    return 90;
  }
  if (p >= 65) {
    return 60;
  }
  if (p >= 50) {
    return 30;
  }
  return 15;
}

/**
 * DESCANSO explícito de um jogador (recuperação ativa): dissipa carga aguda e
 * recupera condição, ao custo de um pouco de ritmo. O "poupar" que não existia.
 */
export function descansarJogador(jogador: Player): Player {
  const fisico = fisicoDe(jogador);
  return {
    ...jogador,
    condicaoFisica: Math.min(MAX, jogador.condicaoFisica + 18),
    fisico: {
      cargaAguda: clamp(fisico.cargaAguda * 0.5),
      cargaCronica: fisico.cargaCronica,
      ritmo: clamp(fisico.ritmo - 3),
    },
  };
}
