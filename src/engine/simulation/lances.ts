/**
 * TAXONOMIA COMPLETA DE LANCES (micro-eventos) de uma partida de futebol.
 *
 * Dois níveis de evento convivem no FOTEBALL:
 *
 *  • MACRO (`EventoPartidaTipo`, em types/match.ts): o que a engine SIMULA e
 *    PERSISTE no save — gol, cartão, pênalti, substituição… É a fonte da
 *    verdade e NÃO muda aqui (compatibilidade de save).
 *
 *  • MICRO (`TipoLance`, abaixo): o vocabulário completo lance-a-lance — passes,
 *    desarmes, conduções, dribles… — usado por reconstruções DERIVADAS (replay
 *    de gol, narrativas, futuros heatmaps). Micro-lances NÃO são persistidos:
 *    são derivados sob demanda, de forma pura e determinística, dos macro
 *    eventos + estatísticas que todo save já tem (mesmo saves antigos).
 *
 * Mapeamento macro → micro (o que ancora cada reconstrução):
 *    gol            → …construção → [assistencia] → finalizacao → gol
 *    gol_contra     → …construção → cruzamento/finalizacao → gol_contra
 *    penalti        → penalti_ganho → penalti_convertido | penalti_perdido
 *    falta_cobranca → falta_sofrida → falta_cobranca (chute direto)
 *    bola_trave     → …construção → finalizacao → trave
 *    chance_perdida → …construção → finalizacao → defesa | fora
 *    cartao_*       → falta_cometida → cartao_*
 */
import type {Position} from '../../types';

/** Vocabulário COMPLETO de lances de uma partida (nível micro). */
export type TipoLance =
  // ── Fluxo da partida ───────────────────────────────────────────────────────
  | 'saida_de_bola' // kick-off (início de tempo ou reinício após gol)
  | 'intervalo'
  | 'acrescimos'
  | 'fim_de_jogo'
  // ── Posse e construção ─────────────────────────────────────────────────────
  | 'recepcao' // domínio/controle da bola recebida
  | 'passe' // passe curto/médio
  | 'passe_chave' // passe que gera finalização (não necessariamente gol)
  | 'lancamento' // bola longa / inversão
  | 'cruzamento'
  | 'conducao' // carregar a bola em progressão
  | 'drible'
  | 'assistencia' // último passe antes do gol
  // ── Recuperação e defesa ───────────────────────────────────────────────────
  | 'recuperacao' // bola solta recuperada (segunda bola)
  | 'desarme' // tackle
  | 'interceptacao' // leitura de passe
  | 'corte' // afastamento de perigo (clearance)
  | 'bloqueio' // chute bloqueado por defensor
  | 'defesa' // defesa do goleiro
  | 'defesa_dificil' // defesaça (big save)
  | 'rebote' // bola viva após defesa/bloqueio
  // ── Finalização ────────────────────────────────────────────────────────────
  | 'finalizacao' // o chute em si (resultado vem no passo seguinte)
  | 'gol'
  | 'gol_contra'
  | 'trave'
  // ── Bolas paradas ──────────────────────────────────────────────────────────
  | 'escanteio'
  | 'tiro_de_meta'
  | 'lateral'
  | 'falta_cobranca' // tiro livre (direto ou alçado)
  | 'penalti_ganho'
  | 'penalti_convertido'
  | 'penalti_perdido'
  | 'impedimento'
  // ── Disciplina ─────────────────────────────────────────────────────────────
  | 'falta_cometida'
  | 'falta_sofrida'
  | 'cartao_amarelo'
  | 'segundo_amarelo'
  | 'cartao_vermelho'
  // ── Administração / interrupções ───────────────────────────────────────────
  | 'substituicao'
  | 'lesao'
  | 'var_gol_anulado'
  | 'penaltis_decisao'; // disputa de pênaltis do mata-mata

/** Subconjunto de `TipoLance` que aparece como PASSO do replay de gol. */
export type TipoPassoLance =
  | 'recuperacao'
  | 'desarme'
  | 'interceptacao'
  | 'escanteio'
  | 'falta_sofrida'
  | 'penalti_ganho'
  | 'recepcao'
  | 'passe'
  | 'lancamento'
  | 'cruzamento'
  | 'conducao'
  | 'drible'
  | 'assistencia'
  | 'falta_cobranca'
  | 'finalizacao'
  | 'gol'
  | 'gol_contra';

/** Rótulo curto (pt-BR) de cada passo — alimenta o rodapé do replay. */
export const ROTULO_PASSO: Record<TipoPassoLance, string> = {
  recuperacao: 'Recuperação',
  desarme: 'Desarme',
  interceptacao: 'Interceptação',
  escanteio: 'Escanteio',
  falta_sofrida: 'Falta sofrida',
  penalti_ganho: 'Pênalti',
  recepcao: 'Domínio',
  passe: 'Passe',
  lancamento: 'Lançamento',
  cruzamento: 'Cruzamento',
  conducao: 'Condução',
  drible: 'Drible',
  assistencia: 'Assistência',
  falta_cobranca: 'Cobrança',
  finalizacao: 'Finalização',
  gol: 'Gol',
  gol_contra: 'Gol contra',
};

/**
 * Um passo do replay. Coordenadas no CAMPO INTEIRO, ataque SEMPRE para cima:
 *  x: 0 = esquerda … 1 = direita (mesma convenção de `Finalizacao.x`);
 *  y: 0 = linha do gol ADVERSÁRIO … 1 = linha do próprio gol.
 * (Conversão do mapa de chutes: `Finalizacao.y` cobre só o terço ofensivo,
 *  então yCampo = finalizacao.y * 0.33.)
 * A seta/trajetória do lance liga o passo i ao passo i+1.
 */
export interface PassoLance {
  tipo: TipoPassoLance;
  /** Quem protagoniza o passo (no gol contra, o defensor ADVERSÁRIO). */
  jogadorId: string;
  x: number;
  y: number;
}

/** Origem tática do gol — muda a construção do replay e o subtítulo. */
export type OrigemGol =
  | 'jogo_aberto'
  | 'contra_ataque'
  | 'escanteio'
  | 'falta'
  | 'penalti'
  | 'gol_contra';

/**
 * Replay completo de um gol: sequência de passos reconstruída de forma PURA e
 * DETERMINÍSTICA a partir do evento real (autor, assistente, minuto, pênalti) —
 * mesma partida ⇒ mesmo replay. A posição do chute é a MESMA do mapa de
 * finalizações (`extrairFinalizacoes`), então as duas visualizações concordam.
 */
export interface LanceGol {
  /** Chave estável p/ lista (partidaId + índice do evento). */
  id: string;
  minuto: number;
  /** Time que MARCOU (no gol contra, o beneficiado). */
  timeId: string;
  autorId: string;
  assistenteId?: string;
  origem: OrigemGol;
  passos: PassoLance[];
  /** Posição da bola na BOCA DO GOL (0..1 esq→dir) — fim da animação. */
  golX: number;
  /** Qualidade da chance (0..1) — mesma do dot no mapa de chutes. */
  xG: number;
}

/** Mapa jogadorId → posição natural (mesmo formato de `extrairFinalizacoes`). */
export type PosicoesElenco = Record<string, Position>;
