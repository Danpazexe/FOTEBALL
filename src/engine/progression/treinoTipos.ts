import type {AtributoChave} from '../../types';
import type {GrupoPosicao} from '../tactics/posicoes';

/**
 * Catálogo de treinos e níveis de intensidade (dados puros). O motor que aplica
 * o efeito está em `treinoAtributos`; aqui ficam só as definições reutilizáveis.
 *
 * Dois tipos de treino, como pedido na spec:
 *  - `posicao`:    rotinas por função (goleiro, zagueiro, lateral, meio, ataque);
 *  - `habilidade`: foco num atributo específico (finalização, passe, ...).
 *
 * Cada treino concentra o ganho em poucos atributos (pesos relativos — o motor
 * normaliza). `bonusMoral` representa a "confiança" que certas rotinas dão.
 */

export type IntensidadeTreino = 'leve' | 'normal' | 'forte' | 'muito_forte';

export interface ConfigIntensidade {
  rotulo: string;
  /** Multiplica o ganho de progresso nos atributos. */
  multiplicadorGanho: number;
  /** Variação aplicada à condição física (leve recupera; forte cansa). */
  deltaCondicao: number;
  /** Variação na forma (ritmo de jogo). */
  deltaForma: number;
  /** Variação na moral (treino pesado pode desgastar o grupo). */
  deltaMoral: number;
  /** Probabilidade-base de lesão por sessão (modulada por condição/idade). */
  riscoLesaoBase: number;
  /** Custo da sessão em BRL, debitado do clube (BRASFOOT_MASTER §10). */
  custo: number;
}

/** Ordem de exibição das intensidades (leve → muito forte). */
export const INTENSIDADES_ORDEM: IntensidadeTreino[] = [
  'leve',
  'normal',
  'forte',
  'muito_forte',
];

export const INTENSIDADES: Record<IntensidadeTreino, ConfigIntensidade> = {
  leve: {
    rotulo: 'Leve',
    multiplicadorGanho: 0.6,
    deltaCondicao: 8,
    deltaForma: -0.4,
    deltaMoral: 0.5,
    riscoLesaoBase: 0.004,
    custo: 5_000,
  },
  normal: {
    rotulo: 'Normal',
    multiplicadorGanho: 1,
    deltaCondicao: 2,
    deltaForma: 0.4,
    deltaMoral: 0,
    riscoLesaoBase: 0.012,
    custo: 15_000,
  },
  forte: {
    rotulo: 'Forte',
    multiplicadorGanho: 1.55,
    deltaCondicao: -4,
    deltaForma: 1,
    deltaMoral: -0.4,
    riscoLesaoBase: 0.032,
    custo: 35_000,
  },
  muito_forte: {
    rotulo: 'Muito forte',
    multiplicadorGanho: 2.1,
    deltaCondicao: -9,
    deltaForma: 1.6,
    deltaMoral: -0.9,
    riscoLesaoBase: 0.06,
    custo: 50_000,
  },
};

/**
 * Limites de clamp (compartilhados com o motor de treino e o desgaste pós-jogo).
 * Piso baixo (10) para que a tabela de preparo escalonada (ver `fatorPreparo`)
 * realmente puna o jogador esgotado e force a rotação de elenco — antes o piso
 * de 55 mascarava o desgaste.
 */
export const CONDICAO_MIN = 10;
export const CONDICAO_MAX = 100;
export const FORMA_MIN = -3;
export const FORMA_MAX = 5;

export type CategoriaTreino = 'posicao' | 'habilidade';

/** Seções de treino por posição (para agrupar na UI). */
export type SecaoPosicao =
  | 'Goleiros'
  | 'Zagueiros'
  | 'Laterais'
  | 'Meio-campistas'
  | 'Atacantes';

export interface TreinoTipo {
  id: string;
  nome: string;
  categoria: CategoriaTreino;
  /** Seção (apenas para treinos por posição). */
  secao?: SecaoPosicao;
  /** Grupos de posição que mais se beneficiam (recomendação + bônus de afinidade). */
  gruposIdeais: GrupoPosicao[];
  /** Pesos relativos por atributo (o motor normaliza para somar 1). */
  atributos: Partial<Record<AtributoChave, number>>;
  /** Efeitos legíveis para a UI (inclui ganhos "soft" como confiança). */
  efeitos: string[];
  /** Ganho de moral (confiança) por sessão, se houver. */
  bonusMoral?: number;
}

const TREINOS_POSICAO: TreinoTipo[] = [
  // --- Goleiros ---
  {
    id: 'gol_reflexo',
    nome: 'Reflexo',
    categoria: 'posicao',
    secao: 'Goleiros',
    gruposIdeais: ['GOL'],
    atributos: {reflexos: 0.8, posicionamento: 0.2},
    efeitos: ['Aumenta Reflexos', 'Aumenta Posicionamento'],
  },
  {
    id: 'gol_posicionamento',
    nome: 'Posicionamento',
    categoria: 'posicao',
    secao: 'Goleiros',
    gruposIdeais: ['GOL'],
    atributos: {posicionamento: 0.7, reflexos: 0.3},
    efeitos: ['Aumenta Posicionamento', 'Aumenta Reflexos'],
  },
  {
    id: 'gol_saida',
    nome: 'Saída do gol',
    categoria: 'posicao',
    secao: 'Goleiros',
    gruposIdeais: ['GOL'],
    atributos: {posicionamento: 0.5, velocidade: 0.3, forca: 0.2},
    efeitos: ['Aumenta Posicionamento', 'Aumenta Velocidade'],
  },
  {
    id: 'gol_penaltis',
    nome: 'Defesa de pênaltis',
    categoria: 'posicao',
    secao: 'Goleiros',
    gruposIdeais: ['GOL'],
    atributos: {reflexos: 0.6, posicionamento: 0.4},
    efeitos: ['Aumenta Reflexos', 'Aumenta Posicionamento', 'Confiança sob pressão'],
    bonusMoral: 0.5,
  },
  {
    id: 'gol_pes',
    nome: 'Jogo com os pés',
    categoria: 'posicao',
    secao: 'Goleiros',
    gruposIdeais: ['GOL'],
    atributos: {passe: 0.7, reflexos: 0.3},
    efeitos: ['Aumenta Passe', 'Aumenta Reflexos'],
  },
  // --- Zagueiros ---
  {
    id: 'zag_desarme',
    nome: 'Desarme',
    categoria: 'posicao',
    secao: 'Zagueiros',
    gruposIdeais: ['ZAGUEIRO'],
    atributos: {desarme: 0.6, marcacao: 0.4},
    efeitos: ['Aumenta Desarme', 'Aumenta Marcação'],
  },
  {
    id: 'zag_marcacao',
    nome: 'Marcação',
    categoria: 'posicao',
    secao: 'Zagueiros',
    gruposIdeais: ['ZAGUEIRO', 'VOLANTE'],
    atributos: {marcacao: 0.5, posicionamento: 0.3, desarme: 0.2},
    efeitos: ['Aumenta Marcação', 'Aumenta Posicionamento defensivo'],
  },
  {
    id: 'zag_forca',
    nome: 'Força física',
    categoria: 'posicao',
    secao: 'Zagueiros',
    gruposIdeais: ['ZAGUEIRO', 'ATACANTE'],
    atributos: {forca: 0.7, resistencia: 0.3},
    efeitos: ['Aumenta Força', 'Aumenta Resistência'],
  },
  {
    id: 'zag_cabeceio',
    nome: 'Cabeceio',
    categoria: 'posicao',
    secao: 'Zagueiros',
    gruposIdeais: ['ZAGUEIRO', 'ATACANTE'],
    atributos: {cabeceio: 0.7, forca: 0.3},
    efeitos: ['Aumenta Cabeceio', 'Aumenta Força'],
  },
  {
    id: 'zag_posicionamento',
    nome: 'Posicionamento defensivo',
    categoria: 'posicao',
    secao: 'Zagueiros',
    gruposIdeais: ['ZAGUEIRO'],
    atributos: {posicionamento: 0.6, marcacao: 0.4},
    efeitos: ['Aumenta Posicionamento defensivo', 'Aumenta Marcação'],
  },
  // --- Laterais ---
  {
    id: 'lat_velocidade',
    nome: 'Velocidade',
    categoria: 'posicao',
    secao: 'Laterais',
    gruposIdeais: ['LATERAL', 'PONTA'],
    atributos: {velocidade: 0.8, resistencia: 0.2},
    efeitos: ['Aumenta Velocidade', 'Aumenta Resistência'],
  },
  {
    id: 'lat_cruzamento',
    nome: 'Cruzamento',
    categoria: 'posicao',
    secao: 'Laterais',
    gruposIdeais: ['LATERAL', 'PONTA'],
    atributos: {cruzamento: 0.7, passe: 0.3},
    efeitos: ['Aumenta Cruzamento', 'Aumenta Passe'],
  },
  {
    id: 'lat_marcacao',
    nome: 'Marcação',
    categoria: 'posicao',
    secao: 'Laterais',
    gruposIdeais: ['LATERAL'],
    atributos: {marcacao: 0.5, desarme: 0.3, posicionamento: 0.2},
    efeitos: ['Aumenta Marcação', 'Aumenta Desarme'],
  },
  {
    id: 'lat_folego',
    nome: 'Fôlego',
    categoria: 'posicao',
    secao: 'Laterais',
    gruposIdeais: ['LATERAL', 'MEIA_CENTRAL'],
    atributos: {resistencia: 0.8, velocidade: 0.2},
    efeitos: ['Aumenta Resistência', 'Aumenta Velocidade'],
  },
  {
    id: 'lat_apoio',
    nome: 'Apoio ofensivo',
    categoria: 'posicao',
    secao: 'Laterais',
    gruposIdeais: ['LATERAL', 'PONTA'],
    atributos: {cruzamento: 0.4, velocidade: 0.3, passe: 0.3},
    efeitos: ['Aumenta Cruzamento', 'Aumenta Apoio ofensivo', 'Confiança ofensiva'],
    bonusMoral: 0.4,
  },
  // --- Meio-campistas ---
  {
    id: 'mei_passe',
    nome: 'Passe',
    categoria: 'posicao',
    secao: 'Meio-campistas',
    gruposIdeais: ['MEIA_CENTRAL', 'MEIA_OFENSIVO'],
    atributos: {passe: 0.6, posicionamento: 0.4},
    efeitos: ['Aumenta Passe', 'Aumenta Visão de jogo'],
  },
  {
    id: 'mei_visao',
    nome: 'Visão de jogo',
    categoria: 'posicao',
    secao: 'Meio-campistas',
    gruposIdeais: ['MEIA_CENTRAL', 'MEIA_OFENSIVO'],
    atributos: {posicionamento: 0.5, passe: 0.5},
    efeitos: ['Aumenta Visão de jogo', 'Aumenta Passe'],
  },
  {
    id: 'mei_controle',
    nome: 'Controle de bola',
    categoria: 'posicao',
    secao: 'Meio-campistas',
    gruposIdeais: ['MEIA_CENTRAL', 'MEIA_OFENSIVO'],
    atributos: {drible: 0.6, passe: 0.4},
    efeitos: ['Aumenta Controle de bola', 'Aumenta Passe'],
  },
  {
    id: 'mei_resistencia',
    nome: 'Resistência',
    categoria: 'posicao',
    secao: 'Meio-campistas',
    gruposIdeais: ['MEIA_CENTRAL', 'VOLANTE'],
    atributos: {resistencia: 0.8, forca: 0.2},
    efeitos: ['Aumenta Resistência', 'Aumenta Força'],
  },
  {
    id: 'mei_marcacao',
    nome: 'Marcação',
    categoria: 'posicao',
    secao: 'Meio-campistas',
    gruposIdeais: ['VOLANTE', 'MEIA_CENTRAL'],
    atributos: {marcacao: 0.5, desarme: 0.3, posicionamento: 0.2},
    efeitos: ['Aumenta Marcação', 'Aumenta Desarme'],
  },
  // --- Atacantes ---
  {
    id: 'ata_finalizacao',
    nome: 'Finalização',
    categoria: 'posicao',
    secao: 'Atacantes',
    gruposIdeais: ['ATACANTE', 'PONTA'],
    atributos: {finalizacao: 0.6, posicionamento: 0.4},
    efeitos: ['Aumenta Finalização', 'Aumenta Posicionamento ofensivo', 'Confiança ofensiva'],
    bonusMoral: 0.5,
  },
  {
    id: 'ata_drible',
    nome: 'Drible',
    categoria: 'posicao',
    secao: 'Atacantes',
    gruposIdeais: ['ATACANTE', 'PONTA'],
    atributos: {drible: 0.7, velocidade: 0.3},
    efeitos: ['Aumenta Drible', 'Aumenta Velocidade'],
  },
  {
    id: 'ata_velocidade',
    nome: 'Velocidade',
    categoria: 'posicao',
    secao: 'Atacantes',
    gruposIdeais: ['ATACANTE', 'PONTA'],
    atributos: {velocidade: 0.8, drible: 0.2},
    efeitos: ['Aumenta Velocidade', 'Aumenta Drible'],
  },
  {
    id: 'ata_posicionamento',
    nome: 'Posicionamento ofensivo',
    categoria: 'posicao',
    secao: 'Atacantes',
    gruposIdeais: ['ATACANTE'],
    atributos: {posicionamento: 0.6, finalizacao: 0.4},
    efeitos: ['Aumenta Posicionamento ofensivo', 'Aumenta Finalização'],
  },
  {
    id: 'ata_cabeceio',
    nome: 'Cabeceio',
    categoria: 'posicao',
    secao: 'Atacantes',
    gruposIdeais: ['ATACANTE', 'ZAGUEIRO'],
    atributos: {cabeceio: 0.7, forca: 0.3},
    efeitos: ['Aumenta Cabeceio', 'Aumenta Força'],
  },
];

const TREINOS_HABILIDADE: TreinoTipo[] = [
  {
    id: 'hab_finalizacao',
    nome: 'Finalização',
    categoria: 'habilidade',
    gruposIdeais: ['ATACANTE', 'PONTA'],
    atributos: {finalizacao: 0.7, posicionamento: 0.3},
    efeitos: ['Aumenta Finalização', 'Aumenta Posicionamento ofensivo', 'Confiança ofensiva'],
    bonusMoral: 0.4,
  },
  {
    id: 'hab_passe',
    nome: 'Passe',
    categoria: 'habilidade',
    gruposIdeais: ['MEIA_CENTRAL', 'MEIA_OFENSIVO'],
    atributos: {passe: 0.6, posicionamento: 0.2, drible: 0.2},
    efeitos: ['Aumenta Passe', 'Aumenta Visão de jogo', 'Aumenta Controle de bola'],
  },
  {
    id: 'hab_drible',
    nome: 'Drible',
    categoria: 'habilidade',
    gruposIdeais: ['PONTA', 'MEIA_OFENSIVO'],
    atributos: {drible: 0.7, velocidade: 0.3},
    efeitos: ['Aumenta Drible', 'Aumenta Velocidade'],
  },
  {
    id: 'hab_velocidade',
    nome: 'Velocidade',
    categoria: 'habilidade',
    gruposIdeais: ['PONTA', 'LATERAL', 'ATACANTE'],
    atributos: {velocidade: 0.8, resistencia: 0.2},
    efeitos: ['Aumenta Velocidade', 'Aumenta Resistência'],
  },
  {
    id: 'hab_defesa',
    nome: 'Defesa',
    categoria: 'habilidade',
    gruposIdeais: ['ZAGUEIRO', 'VOLANTE'],
    atributos: {marcacao: 0.4, desarme: 0.4, posicionamento: 0.2},
    efeitos: ['Aumenta Marcação', 'Aumenta Desarme', 'Aumenta Posicionamento defensivo'],
  },
  {
    id: 'hab_fisico',
    nome: 'Físico',
    categoria: 'habilidade',
    gruposIdeais: ['ZAGUEIRO', 'ATACANTE'],
    atributos: {forca: 0.7, resistencia: 0.3},
    efeitos: ['Aumenta Força', 'Aumenta Resistência'],
  },
  {
    id: 'hab_resistencia',
    nome: 'Resistência',
    categoria: 'habilidade',
    gruposIdeais: ['MEIA_CENTRAL', 'LATERAL'],
    atributos: {resistencia: 0.9, forca: 0.1},
    efeitos: ['Aumenta Resistência'],
  },
  {
    id: 'hab_tecnica',
    nome: 'Técnica',
    categoria: 'habilidade',
    gruposIdeais: ['MEIA_OFENSIVO', 'PONTA'],
    atributos: {drible: 0.4, passe: 0.3, finalizacao: 0.3},
    efeitos: ['Aumenta Técnica (drible/passe/finalização)'],
  },
  {
    id: 'hab_bola_parada',
    nome: 'Bola parada',
    categoria: 'habilidade',
    gruposIdeais: ['MEIA_OFENSIVO', 'LATERAL'],
    atributos: {cruzamento: 0.5, finalizacao: 0.3, passe: 0.2},
    efeitos: ['Aumenta Cruzamento', 'Aumenta Finalização de bola parada'],
  },
  {
    id: 'hab_cabeceio',
    nome: 'Cabeceio',
    categoria: 'habilidade',
    gruposIdeais: ['ATACANTE', 'ZAGUEIRO'],
    atributos: {cabeceio: 0.8, forca: 0.2},
    efeitos: ['Aumenta Cabeceio', 'Aumenta Força'],
  },
  {
    id: 'hab_marcacao',
    nome: 'Marcação',
    categoria: 'habilidade',
    gruposIdeais: ['VOLANTE', 'ZAGUEIRO', 'LATERAL'],
    atributos: {marcacao: 0.6, posicionamento: 0.2, desarme: 0.2},
    efeitos: ['Aumenta Marcação', 'Aumenta Posicionamento defensivo'],
  },
  {
    id: 'hab_controle',
    nome: 'Controle de bola',
    categoria: 'habilidade',
    gruposIdeais: ['MEIA_OFENSIVO', 'MEIA_CENTRAL'],
    atributos: {drible: 0.6, passe: 0.4},
    efeitos: ['Aumenta Controle de bola', 'Aumenta Passe'],
  },
];

export const CATALOGO_TREINOS: TreinoTipo[] = [
  ...TREINOS_POSICAO,
  ...TREINOS_HABILIDADE,
];

const TREINOS_POR_ID = new Map(CATALOGO_TREINOS.map(t => [t.id, t]));

export function buscarTreino(id: string): TreinoTipo | undefined {
  return TREINOS_POR_ID.get(id);
}

/** Treino padrão quando nenhum foi escolhido (físico geral, equilibrado). */
export const TREINO_PADRAO_ID = 'hab_fisico';
