/**
 * Treino individual — foco de desenvolvimento por jogador. Puro e determinístico:
 * um jogador pode ter um atributo em FOCO; ao treinar, esse atributo tende a subir
 * 1 ponto (com RNG estável), respeitando o teto do atributo e a margem de potencial
 * (o foco NUNCA leva o overall além do potencial). É ADITIVO ao treino de elenco
 * existente (não altera calcularEfeitoTreino) — sem risco ao
 * balanceamento de progressão.
 */

import type {AtributoChave, Player} from '../../types';
import type {GrupoPosicao} from '../tactics/posicoes';
import {calcularOverall} from './overall';

export type AtributoFoco = AtributoChave;

/**
 * PLANO DE DESENVOLVIMENTO por FUNÇÃO (Camada 3): em vez de um único atributo em
 * foco, o jogador segue um papel (ex.: Lateral "Ala", Centroavante "Falso 9") que
 * acelera um CONJUNTO de atributos. Puro/dados — a mecânica de ganho é a mesma do
 * foco (1 ponto por vez, respeitando teto/potencial), mas roda sobre o conjunto.
 */
export interface PlanoFuncao {
  id: string;
  nome: string;
  grupos: GrupoPosicao[];
  atributos: AtributoChave[];
  descricao: string;
}

export const PLANOS_FUNCAO: ReadonlyArray<PlanoFuncao> = [
  // Goleiros
  {id: 'gol_reativo', nome: 'Reativo', grupos: ['GOL'], atributos: ['reflexos', 'posicionamento'], descricao: 'Reflexo e colocação'},
  {id: 'gol_libero', nome: 'Líbero', grupos: ['GOL'], atributos: ['passe', 'posicionamento'], descricao: 'Jogo com os pés'},
  // Zagueiros
  {id: 'zag_marcador', nome: 'Marcador', grupos: ['ZAGUEIRO'], atributos: ['marcacao', 'desarme', 'forca'], descricao: 'Duelo e desarme'},
  {id: 'zag_construtor', nome: 'Construtor', grupos: ['ZAGUEIRO'], atributos: ['passe', 'posicionamento', 'cabeceio'], descricao: 'Saída de bola e leitura'},
  // Laterais
  {id: 'lat_defensivo', nome: 'Defensivo', grupos: ['LATERAL'], atributos: ['marcacao', 'desarme', 'posicionamento'], descricao: 'Prioriza a defesa'},
  {id: 'lat_apoio', nome: 'Apoio', grupos: ['LATERAL'], atributos: ['cruzamento', 'passe', 'velocidade'], descricao: 'Chega à linha de fundo'},
  {id: 'lat_ala', nome: 'Ala', grupos: ['LATERAL'], atributos: ['velocidade', 'resistencia', 'cruzamento'], descricao: 'Sobe e desce o corredor'},
  {id: 'lat_completo', nome: 'Completo', grupos: ['LATERAL'], atributos: ['velocidade', 'cruzamento', 'marcacao', 'resistencia'], descricao: 'Equilíbrio dos dois lados'},
  // Volantes
  {id: 'vol_cao', nome: 'Cão de guarda', grupos: ['VOLANTE'], atributos: ['marcacao', 'desarme', 'resistencia'], descricao: 'Recuperação de bola'},
  {id: 'vol_construtor', nome: 'Construtor', grupos: ['VOLANTE'], atributos: ['passe', 'posicionamento', 'drible'], descricao: 'Primeira saída'},
  // Meias centrais
  {id: 'mc_box', nome: 'Box-to-box', grupos: ['MEIA_CENTRAL'], atributos: ['resistencia', 'passe', 'marcacao'], descricao: 'Ataca e defende'},
  {id: 'mc_maestro', nome: 'Maestro', grupos: ['MEIA_CENTRAL', 'MEIA_OFENSIVO'], atributos: ['passe', 'posicionamento', 'drible'], descricao: 'Organiza o jogo'},
  // Meias ofensivos
  {id: 'mo_camisa10', nome: 'Camisa 10', grupos: ['MEIA_OFENSIVO'], atributos: ['passe', 'drible', 'finalizacao'], descricao: 'Último passe e chute'},
  {id: 'mo_infiltrador', nome: 'Infiltrador', grupos: ['MEIA_OFENSIVO'], atributos: ['posicionamento', 'finalizacao', 'velocidade'], descricao: 'Chega na área'},
  // Pontas
  {id: 'pon_driblador', nome: 'Driblador', grupos: ['PONTA'], atributos: ['drible', 'velocidade'], descricao: '1x1 e velocidade'},
  {id: 'pon_cruzador', nome: 'Cruzador', grupos: ['PONTA'], atributos: ['cruzamento', 'velocidade', 'passe'], descricao: 'Abre e cruza'},
  {id: 'pon_finalizador', nome: 'Finalizador', grupos: ['PONTA', 'ATACANTE'], atributos: ['finalizacao', 'posicionamento', 'drible'], descricao: 'Corta pra dentro e chuta'},
  // Centroavantes
  {id: 'ata_finalizador', nome: 'Finalizador', grupos: ['ATACANTE'], atributos: ['finalizacao', 'posicionamento'], descricao: 'Faro de gol'},
  {id: 'ata_homem_alvo', nome: 'Homem-alvo', grupos: ['ATACANTE'], atributos: ['cabeceio', 'forca', 'finalizacao'], descricao: 'Referência de área'},
  {id: 'ata_falso9', nome: 'Falso 9', grupos: ['ATACANTE'], atributos: ['passe', 'drible', 'finalizacao'], descricao: 'Recua e cria'},
  {id: 'ata_pressionante', nome: 'Pressionante', grupos: ['ATACANTE'], atributos: ['velocidade', 'resistencia', 'marcacao'], descricao: 'Pressão na saída adversária'},
];

/** Planos disponíveis para um grupo de posição (para a UI oferecer por jogador). */
export function planosParaGrupo(grupo: GrupoPosicao): PlanoFuncao[] {
  return PLANOS_FUNCAO.filter(p => p.grupos.includes(grupo));
}

export function planoFuncaoPorId(id: string): PlanoFuncao | undefined {
  return PLANOS_FUNCAO.find(p => p.id === id);
}

/** Atributos treináveis + rótulo pt-BR para a UI. */
export const ATRIBUTOS_FOCO: ReadonlyArray<{chave: AtributoFoco; rotulo: string}> =
  [
    {chave: 'finalizacao', rotulo: 'Finalização'},
    {chave: 'passe', rotulo: 'Passe'},
    {chave: 'marcacao', rotulo: 'Marcação'},
    {chave: 'desarme', rotulo: 'Desarme'},
    {chave: 'velocidade', rotulo: 'Velocidade'},
    {chave: 'resistencia', rotulo: 'Resistência'},
    {chave: 'forca', rotulo: 'Força'},
    {chave: 'reflexos', rotulo: 'Reflexos'},
    {chave: 'posicionamento', rotulo: 'Posicionamento'},
    {chave: 'drible', rotulo: 'Drible'},
    {chave: 'cabeceio', rotulo: 'Cabeceio'},
    {chave: 'cruzamento', rotulo: 'Cruzamento'},
  ];

const ATRIBUTO_MAX = 99;
/** Chance de o foco render 1 ponto num treino (quando há margem de potencial). */
const CHANCE_EVOLUIR_FOCO = 0.6;

/**
 * Atributos que o jogador está desenvolvendo: se tem um PLANO por função, é o
 * conjunto do plano; senão, o foco único (compat). Vazio = nada em treino.
 */
function atributosEmTreino(jogador: Player): AtributoChave[] {
  if (jogador.planoDesenvolvimento) {
    const plano = planoFuncaoPorId(jogador.planoDesenvolvimento);
    if (plano) {
      return plano.atributos;
    }
  }
  return jogador.focoTreino ? [jogador.focoTreino] : [];
}

/**
 * Aplica um passo de treino individual. Desenvolve o CONJUNTO do plano de função
 * (ou o foco único): a cada passo sobe 1 ponto no atributo com MAIS margem entre
 * os do plano, respeitando teto e potencial (nunca ultrapassa o potencial).
 * Sem plano/foco, ou sem margem, o jogador volta inalterado. Determinístico.
 */
export function desenvolverFoco(jogador: Player, rng: () => number): Player {
  // Só os atributos do plano que ainda têm margem (abaixo do teto).
  const alvos = atributosEmTreino(jogador).filter(
    a => jogador.atributos[a] < ATRIBUTO_MAX,
  );
  if (alvos.length === 0 || jogador.overall >= jogador.potencial) {
    return jogador;
  }
  if (rng() >= CHANCE_EVOLUIR_FOCO) {
    return jogador;
  }
  // Prioriza o atributo mais BAIXO do conjunto (desenvolve o papel por igual).
  const alvo = alvos.reduce((menor, a) =>
    jogador.atributos[a] < jogador.atributos[menor] ? a : menor,
  );
  const atributos = {...jogador.atributos, [alvo]: jogador.atributos[alvo] + 1};
  const overallCalculado = calcularOverall(atributos, jogador.posicaoPrincipal);
  // Nunca leva o overall além do potencial.
  if (overallCalculado > jogador.potencial) {
    return jogador;
  }
  // Subir um atributo nunca REDUZ o overall (protege overall declarado stale).
  return {
    ...jogador,
    atributos,
    overall: Math.max(jogador.overall, overallCalculado),
  };
}
