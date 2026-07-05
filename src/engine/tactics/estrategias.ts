/**
 * Estratégias-preset (estilo "Estratégia" do Soccer Manager): pacotes prontos
 * que setam a tática inteira de uma vez, do mais defensivo ao mais ofensivo.
 * Dão profundidade sem obrigar o técnico a mexer em 6 botões — e cada uma tem
 * uma MENTALIDADE (Defesa ↔ Ataque) derivada, usada na barra visual do campo.
 *
 * Módulo puro (sem React). A tática resultante alimenta a simulação normal.
 */

import type {Tatica} from '../../types';

export type Estrategia = {
  nome: string;
  descricao: string;
  tatica: Tatica;
};

export const ESTRATEGIAS: Estrategia[] = [
  {
    nome: 'Retranca',
    descricao: 'Estaciona o ônibus: recua, compacta e segura o resultado.',
    tatica: {
      estiloOfensivo: 'Contra-ataque',
      marcacao: 'Individual',
      linhaDefensiva: 'Recuada',
      ritmo: 'Lento',
      ladoAtaque: 'Ambos',
      amplidao: 'Estreito',
    },
  },
  {
    nome: 'Contra-ataque',
    descricao: 'Aguenta a pressão e sai rápido no espaço.',
    tatica: {
      estiloOfensivo: 'Contra-ataque',
      marcacao: 'Zona',
      linhaDefensiva: 'Recuada',
      ritmo: 'Normal',
      ladoAtaque: 'Ambos',
      amplidao: 'Amplo',
    },
  },
  {
    nome: 'Posse',
    descricao: 'Segura a bola com passes curtos e paciência.',
    tatica: {
      estiloOfensivo: 'Posse de bola',
      marcacao: 'Zona',
      linhaDefensiva: 'Normal',
      ritmo: 'Lento',
      ladoAtaque: 'Centro',
      amplidao: 'Estreito',
    },
  },
  {
    nome: 'Equilibrado',
    descricao: 'Base neutra, sem riscos nem bônus.',
    tatica: {
      estiloOfensivo: 'Equilibrado',
      marcacao: 'Zona',
      linhaDefensiva: 'Normal',
      ritmo: 'Normal',
      ladoAtaque: 'Ambos',
      amplidao: 'Normal',
    },
  },
  {
    nome: 'Alta pressão',
    descricao: 'Sufoca a saída de bola do adversário no campo dele.',
    tatica: {
      estiloOfensivo: 'Posse de bola',
      marcacao: 'Pressão alta',
      linhaDefensiva: 'Adiantada',
      ritmo: 'Intenso',
      ladoAtaque: 'Centro',
      amplidao: 'Normal',
    },
  },
  {
    nome: 'Ataque total',
    descricao: 'Tudo pra frente: linha alta, ritmo intenso, jogo aberto.',
    tatica: {
      estiloOfensivo: 'Ataque direto',
      marcacao: 'Pressão alta',
      linhaDefensiva: 'Adiantada',
      ritmo: 'Intenso',
      ladoAtaque: 'Ambos',
      amplidao: 'Amplo',
    },
  },
];

/**
 * Mentalidade Defesa(0) ↔ Ataque(100) derivada de QUALQUER tática (não só dos
 * presets), para a barra visual. Some/subtrai por escolha ofensiva/defensiva.
 */
export function mentalidadeDaTatica(tatica: Tatica): number {
  let m = 50;
  if (tatica.estiloOfensivo === 'Ataque direto') {
    m += 18;
  } else if (tatica.estiloOfensivo === 'Contra-ataque') {
    m -= 12;
  } else if (tatica.estiloOfensivo === 'Posse de bola') {
    m += 4;
  }
  if (tatica.linhaDefensiva === 'Adiantada') {
    m += 18;
  } else if (tatica.linhaDefensiva === 'Recuada') {
    m -= 18;
  }
  if (tatica.ritmo === 'Intenso') {
    m += 10;
  } else if (tatica.ritmo === 'Lento') {
    m -= 10;
  }
  if (tatica.marcacao === 'Pressão alta') {
    m += 6;
  }
  if (tatica.amplidao === 'Amplo') {
    m += 4;
  } else if (tatica.amplidao === 'Estreito') {
    m -= 2;
  }
  return Math.max(0, Math.min(100, m));
}

/** Duas táticas têm os mesmos 6 campos? */
export function mesmaTatica(a: Tatica, b: Tatica): boolean {
  return (
    a.estiloOfensivo === b.estiloOfensivo &&
    a.marcacao === b.marcacao &&
    a.linhaDefensiva === b.linhaDefensiva &&
    a.ritmo === b.ritmo &&
    a.ladoAtaque === b.ladoAtaque &&
    a.amplidao === b.amplidao
  );
}

/** Nome do preset cuja tática bate EXATAMENTE com a atual (ou null se custom). */
export function estrategiaAtiva(tatica: Tatica): string | null {
  return (
    ESTRATEGIAS.find(estrategia => mesmaTatica(estrategia.tatica, tatica))
      ?.nome ?? null
  );
}
