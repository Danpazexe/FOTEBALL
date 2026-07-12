/**
 * Papéis tipográficos do DS (briefing §6.2). Barlow/Barlow Condensed serão
 * empacotadas numa sub-fase dedicada (gated); ATÉ LÁ os papéis usam `fontWeight`
 * do sistema — quando as fontes entrarem, adiciona-se `fontFamily` por peso aqui,
 * num só lugar. PURO (import de TIPO apenas).
 *
 * "O número é sagrado": use `tabular` em placar, minuto, dinheiro, posição,
 * pontos, saldo, overall, rating e estatísticas em coluna.
 */
import type {TextStyle} from 'react-native';

type Papel = Pick<
  TextStyle,
  'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'
>;

export const tipografia = {
  /** Marca, placar excepcional. */
  display: {fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -0.5},
  /** Placar e overall principal. */
  scoreXL: {fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -0.5},
  /** Cabeçalho de tela. */
  titleXL: {fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.2},
  /** Bloco principal. */
  titleL: {fontSize: 22, lineHeight: 28, fontWeight: '700'},
  /** Card e seção. */
  titleM: {fontSize: 18, lineHeight: 24, fontWeight: '600'},
  /** Texto de leitura. */
  bodyL: {fontSize: 16, lineHeight: 23, fontWeight: '400'},
  /** Padrão. */
  bodyM: {fontSize: 14, lineHeight: 20, fontWeight: '400'},
  /** Botão/chip. */
  labelL: {fontSize: 14, lineHeight: 18, fontWeight: '600'},
  /** Metadado forte. */
  labelM: {fontSize: 12, lineHeight: 16, fontWeight: '600'},
  /** Metadado compacto. */
  caption: {fontSize: 11, lineHeight: 14, fontWeight: '500'},
  /** Números esportivos. */
  numeric: {fontSize: 16, lineHeight: 20, fontWeight: '700'},
} satisfies Record<string, Papel>;

export type PapelTipografico = keyof typeof tipografia;

/** Ativa dígitos de largura fixa (colunas que casam). */
export const tabular: TextStyle = {fontVariant: ['tabular-nums']};
