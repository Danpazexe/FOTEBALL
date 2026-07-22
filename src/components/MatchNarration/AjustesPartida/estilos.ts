/**
 * Sheet ÚNICA do painel de ajustes, compartilhada por todos os módulos via
 * `useEstilosDS(criarEstilos)` — a memoização por função criadora garante uma
 * só instância por tema.
 */
import {StyleSheet} from 'react-native';

import {espacamento, raios, type TemaDS} from '../../../design-system';
import {
  ALTURA,
  CAL,
  CAL_FRACA,
  CAMPO_VERDE,
  DIAM,
  GHOST_H,
  GHOST_W,
  LARGURA,
  RAIO,
  SLOT_W,
} from './constantes';

export const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    overlay: {
      // Véu de modal do tema (token overlay): mantém o foco no painel
      // escurecendo o jogo atrás, em qualquer tema.
      backgroundColor: t.cores.overlay,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 50,
    },
    scroll: {
      flex: 1,
      width: '100%',
    },
    scrollConteudo: {
      alignItems: 'center',
      // flex-start (não center): com conteúdo mais alto que a tela, centralizar
      // cortava o banco na parte de baixo. Assim rola do topo naturalmente.
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingHorizontal: espacamento[3],
    },
    card: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderRadius: raios.lg,
      borderWidth: 1,
      gap: espacamento[4],
      maxWidth: '100%',
      padding: espacamento[4],
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[2],
      width: LARGURA,
    },
    flex1: {
      flex: 1,
    },
    titulo: {
      color: t.cores.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    subtitulo: {
      color: t.cores.textSecondary,
      fontSize: 12,
    },
    contador: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.sm,
      minWidth: 48,
      paddingHorizontal: espacamento[2],
      paddingVertical: espacamento[1],
    },
    contadorTexto: {
      color: t.cores.brand,
      fontSize: 19,
      fontWeight: '900',
    },
    contadorLegenda: {
      color: t.cores.textSecondary,
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tabBar: {
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.sm,
      flexDirection: 'row',
      padding: 3,
      width: LARGURA,
    },
    tab: {
      alignItems: 'center',
      borderRadius: raios.sm - 2,
      flex: 1,
      paddingVertical: espacamento[2],
    },
    tabAtiva: {
      backgroundColor: t.cores.brand,
    },
    tabTexto: {
      color: t.cores.textSecondary,
      fontSize: 13,
      fontWeight: '800',
    },
    tabTextoAtivo: {
      color: t.cores.onBrand,
    },
    bannerSel: {
      alignItems: 'center',
      backgroundColor: t.cores.brand,
      borderRadius: raios.sm,
      flexDirection: 'row',
      gap: espacamento[2],
      paddingHorizontal: espacamento[3],
      paddingVertical: espacamento[2],
      width: LARGURA,
    },
    bannerSelTexto: {
      color: t.cores.onBrand,
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
    },
    formacaoRow: {
      flexDirection: 'row',
      gap: 5,
      justifyContent: 'space-between',
      width: LARGURA,
    },
    formChip: {
      alignItems: 'center',
      borderColor: t.cores.border,
      borderRadius: raios.sm,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 6,
    },
    formChipAtivo: {
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.brand,
    },
    formChipTexto: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    formChipTextoAtivo: {
      color: t.cores.textPrimary,
    },
    disclosure: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: espacamento[3],
      paddingVertical: espacamento[2],
    },
    disclosureLabel: {
      color: t.cores.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    disclosureValor: {
      color: t.cores.textPrimary,
      fontWeight: '900',
    },
    pitch: {
      backgroundColor: CAMPO_VERDE,
      borderColor: CAL,
      borderRadius: raios.md,
      borderWidth: 2,
      overflow: 'hidden',
    },
    linhaCentral: {
      backgroundColor: CAL,
      height: 2,
      left: 0,
      position: 'absolute',
      right: 0,
      top: ALTURA / 2 - 1,
    },
    circuloCentral: {
      borderColor: CAL,
      borderRadius: LARGURA * 0.15,
      borderWidth: 2,
      height: LARGURA * 0.3,
      left: LARGURA / 2 - LARGURA * 0.15,
      position: 'absolute',
      top: ALTURA / 2 - LARGURA * 0.15,
      width: LARGURA * 0.3,
    },
    area: {
      borderColor: CAL,
      borderWidth: 2,
      height: ALTURA * 0.12,
      left: LARGURA * 0.22,
      position: 'absolute',
      width: LARGURA * 0.56,
    },
    areaTopo: {
      top: 0,
    },
    areaBase: {
      bottom: 0,
    },
    slotWrap: {
      alignItems: 'center',
      position: 'absolute',
      width: SLOT_W,
    },
    arrastandoEste: {
      opacity: 0.25,
    },
    slotPos: {
      color: CAL_FRACA,
      fontSize: 9,
      fontWeight: '800',
      marginTop: 2,
    },
    slotPct: {
      fontSize: 9,
      fontWeight: '900',
    },
    ficha: {
      alignItems: 'center',
      // Ficha em azul-marinho (token scoreboard): as cores de tier (corOverall)
      // são claras e só leem bem sobre fundo escuro — intencional nos dois temas.
      backgroundColor: t.cores.scoreboard,
      borderRadius: DIAM,
      borderWidth: 2,
      height: DIAM,
      justifyContent: 'center',
      width: DIAM,
    },
    fichaDestacada: {
      borderWidth: 3,
    },
    fichaHover: {
      backgroundColor: t.cores.brandStrong,
    },
    fichaOverall: {
      fontSize: RAIO * 0.9,
      fontWeight: '900',
    },
    slotNome: {
      color: CAL,
      fontSize: 10,
      fontWeight: '600',
      marginTop: 1,
      // Menor que o slot para os nomes das 4 linhas de trás não se tocarem.
      maxWidth: SLOT_W - 12,
      textAlign: 'center',
    },
    bancoTitulo: {
      alignSelf: 'flex-start',
      color: t.cores.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    banco: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacamento[2],
      justifyContent: 'center',
      width: LARGURA,
    },
    bancoVazio: {
      color: t.cores.textSecondary,
      fontSize: 13,
      paddingVertical: espacamento[2],
    },
    reservaWrap: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raios.sm,
      borderWidth: 1,
      paddingHorizontal: 4,
      paddingVertical: espacamento[1],
      width: 58,
    },
    reservaSel: {
      borderColor: t.cores.brand,
      borderWidth: 2,
    },
    reservaBloqueada: {
      opacity: 0.4,
    },
    fichaBanco: {
      alignItems: 'center',
      backgroundColor: t.cores.scoreboard,
      borderRadius: 32,
      borderWidth: 2,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    reservaNome: {
      color: t.cores.textPrimary,
      fontSize: 10,
      fontWeight: '700',
      marginTop: 2,
      maxWidth: 54,
      textAlign: 'center',
    },
    reservaLesionado: {
      color: t.cores.danger,
    },
    reservaPos: {
      color: t.cores.textSecondary,
      fontSize: 9,
      fontWeight: '700',
    },
    instrucoesConteudo: {
      gap: espacamento[3],
      paddingVertical: espacamento[1],
      width: LARGURA,
    },
    grupo: {
      gap: espacamento[1],
    },
    grupoTitulo: {
      color: t.cores.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    grupoDica: {
      color: t.cores.textSecondary,
      fontSize: 11,
    },
    grupoOpcoes: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: espacamento[2],
    },
    opcao: {
      borderColor: t.cores.border,
      borderRadius: raios.sm,
      borderWidth: 1,
      paddingHorizontal: espacamento[3],
      paddingVertical: espacamento[2],
    },
    opcaoAtiva: {
      backgroundColor: t.cores.brand,
      borderColor: t.cores.brand,
    },
    opcaoTexto: {
      color: t.cores.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    opcaoTextoAtivo: {
      color: t.cores.onBrand,
    },
    concluir: {
      alignItems: 'center',
      backgroundColor: t.cores.brand,
      borderRadius: raios.sm,
      marginTop: espacamento[1],
      paddingVertical: espacamento[3],
      width: LARGURA,
    },
    concluirTexto: {
      color: t.cores.onBrand,
      fontSize: 15,
      fontWeight: '800',
    },
    ghost: {
      alignItems: 'center',
      height: GHOST_H,
      left: 0,
      position: 'absolute',
      top: 0,
      width: GHOST_W,
      zIndex: 100,
    },
    ghostFicha: {
      alignItems: 'center',
      backgroundColor: t.cores.scoreboard,
      borderRadius: 48,
      borderWidth: 3,
      height: 48,
      justifyContent: 'center',
      width: 48,
    },
    ghostOverall: {
      fontSize: 19,
      fontWeight: '900',
    },
    ghostNome: {
      backgroundColor: t.cores.scoreboard,
      borderRadius: 6,
      color: t.cores.onScoreboard,
      fontSize: 11,
      fontWeight: '800',
      marginTop: 3,
      maxWidth: GHOST_W,
      overflow: 'hidden',
      paddingHorizontal: 4,
      paddingVertical: 1,
      textAlign: 'center',
    },

    // Painel "quem entra" (toque no titular) — modal sobre o modal de ajustes.
    trocaOverlay: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'flex-end',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 60,
    },
    trocaScrim: {
      backgroundColor: t.cores.overlay,
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    trocaCard: {
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderTopLeftRadius: raios.xl,
      borderTopRightRadius: raios.xl,
      borderWidth: 1,
      maxHeight: '72%',
      paddingBottom: espacamento[4],
      paddingHorizontal: espacamento[4],
      paddingTop: espacamento[3],
      width: '100%',
    },
    trocaHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[2],
      paddingBottom: espacamento[2],
    },
    trocaLabel: {
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    trocaSaindo: {
      color: t.cores.textPrimary,
      fontSize: 17,
      fontWeight: '900',
    },
    trocaPosChip: {
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.sm,
      paddingHorizontal: espacamento[2],
      paddingVertical: 3,
    },
    trocaPosChipTexto: {
      color: t.cores.textSecondary,
      fontSize: 12,
      fontWeight: '900',
    },
    trocaFechar: {
      padding: espacamento[1],
    },
    trocaSaiLinha: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingBottom: espacamento[2],
    },
    trocaSaiInfo: {
      color: t.cores.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    condDot: {
      borderRadius: 4,
      height: 8,
      width: 8,
    },
    trocaDivisor: {
      backgroundColor: t.cores.border,
      height: 1,
      marginBottom: espacamento[1],
    },
    trocaVazio: {
      color: t.cores.textSecondary,
      fontSize: 13,
      paddingVertical: espacamento[4],
      textAlign: 'center',
    },
    trocaLista: {
      flexGrow: 0,
    },
    trocaLinha: {
      alignItems: 'center',
      borderBottomColor: t.cores.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: espacamento[3],
      paddingVertical: espacamento[2],
    },
    trocaBadge: {
      alignItems: 'center',
      borderRadius: raios.sm,
      borderWidth: 2,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    trocaBadgeTexto: {
      fontSize: 17,
      fontWeight: '900',
    },
    trocaNome: {
      color: t.cores.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    trocaMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      marginTop: 2,
    },
    trocaMetaPos: {
      color: t.cores.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    trocaMetaCond: {
      color: t.cores.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    trocaFit: {
      borderRadius: raios.sm,
      borderWidth: 1,
      paddingHorizontal: espacamento[2],
      paddingVertical: 4,
    },
    trocaFitTexto: {
      fontSize: 11,
      fontWeight: '900',
    },
  });
