import type {AtributoChave, PlayerAttributes, Position} from '../../types';
import {grupoDaPosicao, type GrupoPosicao} from '../tactics/posicoes';

/**
 * Cálculo de overall a partir dos atributos, ponderado pela POSIÇÃO. Cada grupo
 * valoriza atributos diferentes (um zagueiro pesa marcação/desarme; um atacante,
 * finalização/posicionamento), de modo que o overall reflita o que importa para
 * a função do jogador.
 *
 * Uso principal: depois que um treino sobe atributos, recalculamos o overall e o
 * jogador "ganha" overall só quando os atributos RELEVANTES crescem — ver
 * `treinoAtributos`. Os pesos foram calibrados contra os dados de seed para que
 * o overall derivado fique próximo do overall original (evita saltos ao migrar).
 */

type Pesos = Partial<Record<AtributoChave, number>>;

const PERFIS: Record<GrupoPosicao, Pesos> = {
  GOL: {reflexos: 0.42, posicionamento: 0.3, forca: 0.12, resistencia: 0.08, velocidade: 0.08},
  ZAGUEIRO: {
    marcacao: 0.24,
    desarme: 0.22,
    forca: 0.16,
    cabeceio: 0.14,
    posicionamento: 0.14,
    velocidade: 0.1,
  },
  LATERAL: {
    velocidade: 0.2,
    marcacao: 0.18,
    desarme: 0.16,
    cruzamento: 0.16,
    resistencia: 0.16,
    passe: 0.14,
  },
  VOLANTE: {
    desarme: 0.22,
    marcacao: 0.2,
    passe: 0.18,
    posicionamento: 0.16,
    resistencia: 0.14,
    forca: 0.1,
  },
  MEIA_CENTRAL: {
    passe: 0.24,
    posicionamento: 0.18,
    drible: 0.16,
    resistencia: 0.16,
    velocidade: 0.14,
    finalizacao: 0.12,
  },
  MEIA_OFENSIVO: {
    passe: 0.22,
    drible: 0.18,
    posicionamento: 0.18,
    finalizacao: 0.15,
    cruzamento: 0.15,
    velocidade: 0.12,
  },
  PONTA: {
    velocidade: 0.22,
    drible: 0.2,
    cruzamento: 0.18,
    finalizacao: 0.16,
    passe: 0.14,
    cabeceio: 0.1,
  },
  ATACANTE: {
    finalizacao: 0.28,
    posicionamento: 0.2,
    cabeceio: 0.16,
    velocidade: 0.16,
    forca: 0.12,
    drible: 0.08,
  },
};

/** Overall ponderado pela posição (1–99). */
export function calcularOverall(
  atributos: PlayerAttributes,
  posicao: Position,
): number {
  const pesos = PERFIS[grupoDaPosicao(posicao)];
  let soma = 0;
  let total = 0;
  for (const [chave, peso] of Object.entries(pesos) as [AtributoChave, number][]) {
    soma += atributos[chave] * peso;
    total += peso;
  }
  if (total === 0) {
    return 0;
  }
  return Math.round(Math.min(99, Math.max(1, soma / total)));
}
