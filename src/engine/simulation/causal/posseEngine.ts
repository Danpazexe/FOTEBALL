/**
 * ENGINE DE POSSE (Etapa 2 da cadeia causal).
 *
 * A fração de posse de um minuto é decidida ANTES de qualquer lance, a partir
 * do estado real: domínio de meio-campo, domínio ofensivo/territorial,
 * intenção tática e urgência pelo placar. Ela então ALIMENTA a criação de
 * chances (quem tem a bola cria mais) — nunca é ajustada retroativamente por
 * evento (PI-04 eliminado: posse é causa, não maquiagem).
 */
import type {Tatica} from '../../../types';

import {limitar, type RandomGenerator} from '../rng';
import type {ForcaTime} from '../teamStrength';
import {POSSE_CAUSAL} from './matchModelConfig';

/**
 * Quanto a tática MANDA ter a bola: posse de bola retém; contra-ataque e bola
 * longa abrem mão dela por escolha; pressão alta recupera no campo do rival;
 * ritmo lento cadencia. Ajuste aditivo à fração de posse do time.
 */
export function intencaoPosse(tatica: Tatica | null | undefined): number {
  if (!tatica) {
    return 0;
  }
  let intencao = 0;
  if (tatica.estiloOfensivo === 'Posse de bola') {
    intencao += 0.05;
  } else if (tatica.estiloOfensivo === 'Contra-ataque') {
    intencao -= 0.05;
  } else if (tatica.estiloOfensivo === 'Ataque direto') {
    intencao -= 0.03;
  }
  if (tatica.marcacao === 'Pressão alta') {
    intencao += 0.02;
  }
  if (tatica.ritmo === 'Lento') {
    intencao += 0.02;
  }
  return intencao;
}

export interface EntradaPosseMinuto {
  forcaCasa: ForcaTime;
  forcaFora: ForcaTime;
  taticaCasa: Tatica | null | undefined;
  taticaFora: Tatica | null | undefined;
  /** placarCasa − placarFora ANTES do minuto (urgência é causa, não efeito). */
  diferencaPlacar: number;
  minuto: number;
  rngPosse: RandomGenerator;
}

/**
 * Fração de posse da CASA neste minuto (0.18–0.82). Determinística por seed:
 * exatamente 1 consumo do rngPosse por minuto.
 */
export function disputarPosseMinutoCausal(entrada: EntradaPosseMinuto): number {
  const meioCasa = Math.max(1, entrada.forcaCasa.meio);
  const meioFora = Math.max(1, entrada.forcaFora.meio);
  let fracaoCasa =
    0.5 +
    (meioCasa / (meioCasa + meioFora) - 0.5) * POSSE_CAUSAL.pesoMeio;

  // Domínio ofensivo/territorial: quem ameaça mais empurra o jogo para o campo
  // adversário e retém a bola lá.
  const domOfensivoCasa =
    entrada.forcaCasa.ataque /
    (entrada.forcaCasa.ataque + entrada.forcaFora.defesa);
  const domOfensivoFora =
    entrada.forcaFora.ataque /
    (entrada.forcaFora.ataque + entrada.forcaCasa.defesa);
  fracaoCasa +=
    (domOfensivoCasa - domOfensivoFora) * POSSE_CAUSAL.pesoDominioOfensivo;

  fracaoCasa +=
    intencaoPosse(entrada.taticaCasa) - intencaoPosse(entrada.taticaFora);

  // Urgência pelo placar (causa → efeito): quem perde toma a iniciativa e vai
  // atrás da BOLA na reta final. Entra ANTES dos lances do minuto.
  const diff = entrada.diferencaPlacar;
  if (diff !== 0 && entrada.minuto >= POSSE_CAUSAL.minutoInicioUrgencia) {
    const progresso =
      (entrada.minuto - POSSE_CAUSAL.minutoInicioUrgencia) / 30;
    const pressao =
      Math.min(2, Math.abs(diff)) * POSSE_CAUSAL.urgenciaPorGol * progresso;
    fracaoCasa += diff < 0 ? pressao : -pressao;
  }

  // Disputa do minuto: bola dividida, erro de passe, bola parada.
  fracaoCasa += (entrada.rngPosse() - 0.5) * POSSE_CAUSAL.ruidoMinuto;

  return limitar(fracaoCasa, POSSE_CAUSAL.pisoFracao, POSSE_CAUSAL.tetoFracao);
}
