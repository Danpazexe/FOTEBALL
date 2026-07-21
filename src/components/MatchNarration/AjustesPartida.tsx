/**
 * Painel de ajustes DURANTE a partida (intervalo ou pausa). Dois modos:
 *
 *  • Escalação — campo tático com os 11 titulares e o banco. O usuário ARRASTA
 *    um jogador (um "fantasma" visível segue o dedo): reserva → titular faz a
 *    SUBSTITUIÇÃO (limite oficial de 5); titular → titular TROCA as posições
 *    (não gasta substituição). Também dá para trocar o esquema (4-4-2 etc.)
 *    mantendo os mesmos 11. Toque-e-toque funciona como alternativa ao arraste.
 *
 *  • Instruções — estilo ofensivo, marcação, linha defensiva e ritmo. Como a
 *    força/probabilidades são recalculadas a cada minuto, o ajuste vale para o
 *    restante do jogo.
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {trocarEsquema, trocarTitular} from '../../api/database/seed/defaults';
// Funções de cor por VALOR (tier/encaixe/condição) — fonte única compartilhada
// com as demais telas de escalação; ainda vivem no módulo de tema antigo.
import {corAdaptacao, corCondicao, corOverall} from '../../theme';
import {
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type TemaDS,
} from '../../design-system';
import {
  nivelAdaptacao,
  type NivelAdaptacao,
  type ResultadoAdaptacao,
} from '../../engine/tactics/adaptacao';
import {coordenadaDoTitular} from '../../engine/tactics/geometria';
import type {Formacao, FormacaoPreset, Player, Position, Tatica} from '../../types';
import Icone from '../Icone';

const {width: LARGURA_TELA, height: ALTURA_TELA} = Dimensions.get('window');
// Largura útil do conteúdo = tela − padding do scroll (md×2) − padding do card
// (lg×2). Sem descontar os dois, as seções ficavam mais largas que a área
// interna do card e encostavam nas bordas (padding lateral inconsistente).
const PAD_SCROLL = 12; // espacamento[3]
const PAD_CARD = 16; // espacamento[4]
const LARGURA = Math.min(LARGURA_TELA - (PAD_SCROLL + PAD_CARD) * 2, 400);
// Limita a altura do campo pela tela para o painel caber também em telas baixas.
const ALTURA = Math.round(Math.min(LARGURA * 0.92, ALTURA_TELA * 0.42));
const RAIO = Math.round(LARGURA * 0.056);
const DIAM = RAIO * 2;
const LIMIAR_DROP = RAIO + 30;
const SLOT_W = 74;
// Margem vertical dentro do campo: deixa espaço para a ficha (topo) e para os
// rótulos posição+nome (embaixo de cada peça), senão o GOL/atacantes cortam.
const PAD_TOPO = RAIO + 6;
const PAD_BASE = RAIO + 32;
const GHOST_W = 78;
const GHOST_H = 90;

// Gramado — mesmo verde da Tática nova (CampoFUT/MapaFinalizacoes). Objeto de
// campo FIXO nos dois temas: verde base + linhas/rótulos em cal branca.
const CAMPO_VERDE = '#2E9E58';
const CAL = 'rgba(255, 255, 255, 0.85)';
const CAL_FRACA = 'rgba(255, 255, 255, 0.5)';

const FORMACOES: FormacaoPreset[] = [
  '4-4-2',
  '4-3-3',
  '4-2-3-1',
  '3-5-2',
  '5-3-2',
  '4-5-1',
];

const OPCOES_ESTILO: Tatica['estiloOfensivo'][] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Ataque direto',
];
const OPCOES_MARCACAO: Tatica['marcacao'][] = ['Zona', 'Individual', 'Pressão alta'];
const OPCOES_LINHA: Tatica['linhaDefensiva'][] = ['Recuada', 'Normal', 'Adiantada'];
const OPCOES_RITMO: Tatica['ritmo'][] = ['Lento', 'Normal', 'Intenso'];

type Descritor = {tipo: 'reserva' | 'titular'; valor: string};

// Ordena os candidatos à substituição pelo ENCAIXE na posição do slot (natural
// primeiro) e, dentro do mesmo nível, pelo overall — quem melhor cobre a vaga
// aparece no topo da lista.
const RANK_ADAPTACAO: Record<NivelAdaptacao, number> = {
  natural: 0,
  similar: 1,
  adaptado: 2,
  improvisado: 3,
};

/** Rótulo curto do encaixe (o `rotulo` do engine é longo demais para o chip). */
const ROTULO_FIT: Record<NivelAdaptacao, string> = {
  natural: 'Natural',
  similar: 'Similar',
  adaptado: 'Adaptado',
  improvisado: 'Improviso',
};

type SlotPos = {slotIndex: number; x: number; y: number; posicao: Position};

/**
 * Posição de tela de cada titular. Usa a MESMA fonte do DraggablePitch
 * (`coordenadaDoTitular` → x/y explícitos ou coordenada padrão da posição), de
 * modo que a escalação apareça IDÊNTICA aqui e na tela de tática/pré-jogo.
 * Convenção: y 0..1 (defesa→ataque); na tela o ataque fica em cima, por isso
 * `(1 - y)`.
 */
function posicoesDosSlots(formacao: Formacao): SlotPos[] {
  const banda = ALTURA - PAD_TOPO - PAD_BASE;
  return formacao.titulares.map((titular, slotIndex) => {
    const {x, y} = coordenadaDoTitular(titular);
    return {
      slotIndex,
      x: x * LARGURA,
      // y invertido (ataque em cima) e comprimido na banda com margens, para
      // os rótulos caberem dentro do gramado.
      y: PAD_TOPO + (1 - y) * banda,
      posicao: titular.posicao,
    };
  });
}

type SharedNum = SharedValue<number>;

/** Gesto reaproveitável: arraste (fantasma segue o dedo) + toque alternativo. */
function useGestoPeca(
  tipo: Descritor['tipo'],
  valor: string,
  habilitado: boolean,
  ghostX: SharedNum,
  ghostY: SharedNum,
  ghostAtivo: SharedNum,
  aoIniciar: (tipo: string, valor: string) => void,
  aoArrastar: (ax: number, ay: number) => void,
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void,
  aoTocar: (tipo: string, valor: string) => void,
  aoFinalizar: () => void,
) {
  return useMemo(() => {
    const toque = Gesture.Tap()
      .enabled(habilitado)
      .onStart(() => {
        runOnJS(aoTocar)(tipo, valor);
      });
    const arraste = Gesture.Pan()
      .enabled(habilitado)
      .onStart(evento => {
        ghostAtivo.value = 1;
        ghostX.value = evento.absoluteX;
        ghostY.value = evento.absoluteY;
        runOnJS(aoIniciar)(tipo, valor);
      })
      .onUpdate(evento => {
        ghostX.value = evento.absoluteX;
        ghostY.value = evento.absoluteY;
        runOnJS(aoArrastar)(evento.absoluteX, evento.absoluteY);
      })
      .onEnd(evento => {
        ghostAtivo.value = 0;
        runOnJS(aoSoltar)(evento.absoluteX, evento.absoluteY, tipo, valor);
        runOnJS(aoFinalizar)();
      });
    return Gesture.Race(arraste, toque);
  }, [
    tipo,
    valor,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  ]);
}

type AjustesPartidaProps = {
  formacao: Formacao;
  tatica: Tatica;
  elenco: Player[];
  nomes: Record<string, string>;
  subsRestantes: number;
  jaSairamIds: Set<string>;
  onSubstituir: (slotIndex: number, entranteId: string) => void;
  onAtualizarFormacao: (formacao: Formacao) => void;
  onAtualizarTatica: (tatica: Tatica) => void;
  onFechar: () => void;
};

function AjustesPartida({
  formacao,
  tatica,
  elenco,
  nomes,
  subsRestantes,
  jaSairamIds,
  onSubstituir,
  onAtualizarFormacao,
  onAtualizarTatica,
  onFechar,
}: AjustesPartidaProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const insets = useSafeAreaInsets();
  const overlayRef = useRef<View>(null);
  const pitchRef = useRef<View>(null);
  const pitchOrigemRef = useRef({x: 0, y: 0});
  const slotHoverRef = useRef<number | null>(null);
  const arrastandoRef = useRef<Descritor | null>(null);

  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostAtivo = useSharedValue(0);
  const overlayOX = useSharedValue(0);
  const overlayOY = useSharedValue(0);

  const [aba, setAba] = useState<'escalacao' | 'instrucoes'>('escalacao');
  const [selecao, setSelecao] = useState<Descritor | null>(null);
  const [slotHover, setSlotHover] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<Descritor | null>(null);
  // Disclosure progressivo: trocar esquema e ajustes táticos finos ficam ocultos
  // por padrão (a substituição é a ação principal da tela).
  const [mostrarFormacoes, setMostrarFormacoes] = useState(false);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  // Painel "quem entra": slot do titular tocado, para escolher o substituto numa
  // lista já filtrada/ordenada por encaixe — sem caçar no banco.
  const [slotTroca, setSlotTroca] = useState<number | null>(null);

  const semSubs = subsRestantes <= 0;

  const porId = useMemo(
    () => new Map(elenco.map(jogador => [jogador.id, jogador])),
    [elenco],
  );
  const slots = useMemo(() => posicoesDosSlots(formacao), [formacao]);
  const titularIds = useMemo(
    () => new Set(formacao.titulares.map(t => t.jogadorId)),
    [formacao],
  );
  // Só os RESERVAS ESCALADOS (banco definido) podem entrar — não o elenco todo.
  const reservasEscalados = useMemo(
    () => new Set(formacao.reservas),
    [formacao.reservas],
  );
  const banco = useMemo(
    () =>
      elenco
        .filter(
          j =>
            reservasEscalados.has(j.id) &&
            !titularIds.has(j.id) &&
            !jaSairamIds.has(j.id),
        )
        .sort((a, b) => b.overall - a.overall),
    [elenco, reservasEscalados, titularIds, jaSairamIds],
  );

  // Contexto do painel "quem entra": posição da vaga, jogador que sai e a lista
  // de reservas APTOS (sem lesão/suspensão) ordenados por encaixe → overall.
  const posicaoTroca =
    slotTroca !== null
      ? formacao.titulares[slotTroca]?.posicao ?? null
      : null;
  const saindoTroca =
    slotTroca !== null
      ? porId.get(formacao.titulares[slotTroca]?.jogadorId)
      : undefined;
  const candidatosTroca = useMemo(() => {
    if (slotTroca === null || !posicaoTroca) {
      return [];
    }
    return banco
      .filter(j => !j.lesionado && !j.suspenso)
      .map(j => ({jogador: j, adaptacao: nivelAdaptacao(j, posicaoTroca)}))
      .sort((a, b) => {
        const r =
          RANK_ADAPTACAO[a.adaptacao.nivel] - RANK_ADAPTACAO[b.adaptacao.nivel];
        return r !== 0 ? r : b.jogador.overall - a.jogador.overall;
      });
  }, [slotTroca, posicaoTroca, banco]);

  const nomeDe = useCallback(
    (id: string) => nomes[id] ?? porId.get(id)?.nome ?? 'Jogador',
    [nomes, porId],
  );
  const jogadorDoDescritor = useCallback(
    (d: Descritor): Player | undefined =>
      d.tipo === 'reserva'
        ? porId.get(d.valor)
        : porId.get(formacao.titulares[Number(d.valor)]?.jogadorId),
    [porId, formacao],
  );

  const medirOverlay = useCallback(() => {
    overlayRef.current?.measureInWindow((x, y) => {
      overlayOX.value = x;
      overlayOY.value = y;
    });
  }, [overlayOX, overlayOY]);
  const medirPitch = useCallback(() => {
    pitchRef.current?.measureInWindow((x, y) => {
      pitchOrigemRef.current = {x, y};
    });
  }, []);

  const slotMaisProximo = useCallback(
    (ax: number, ay: number): number | null => {
      const origem = pitchOrigemRef.current;
      // (0,0) = ainda não medido: não tenta soltar (evita comparar com o canto da tela).
      if (origem.x === 0 && origem.y === 0) {
        return null;
      }
      let melhor: number | null = null;
      let melhorDist = LIMIAR_DROP;
      for (const slot of slots) {
        const cx = origem.x + slot.x;
        const cy = origem.y + slot.y;
        const dist = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2);
        if (dist < melhorDist) {
          melhorDist = dist;
          melhor = slot.slotIndex;
        }
      }
      return melhor;
    },
    [slots],
  );

  const executarSub = useCallback(
    (slotIndex: number, entranteId: string) => {
      if (semSubs) {
        return;
      }
      const saiId = formacao.titulares[slotIndex]?.jogadorId;
      if (!saiId || saiId === entranteId) {
        return;
      }
      // Não deixa entrar quem está lesionado/suspenso (gastaria a sub à toa).
      const entrante = porId.get(entranteId);
      if (!entrante || entrante.lesionado || entrante.suspenso) {
        return;
      }
      onSubstituir(slotIndex, entranteId);
    },
    [semSubs, formacao, porId, onSubstituir],
  );

  const trocarPosicoes = useCallback(
    (slotA: number, slotB: number) => {
      if (slotA === slotB) {
        return;
      }
      const titulares = formacao.titulares;
      // Protege o gol: só permite mexer no slot GOL entre dois goleiros.
      const envolveGol =
        titulares[slotA]?.posicao === 'GOL' || titulares[slotB]?.posicao === 'GOL';
      if (envolveGol) {
        const a = porId.get(titulares[slotA]?.jogadorId);
        const b = porId.get(titulares[slotB]?.jogadorId);
        if (a?.posicaoPrincipal !== 'GOL' || b?.posicaoPrincipal !== 'GOL') {
          return;
        }
      }
      const jogadorB = titulares[slotB]?.jogadorId;
      if (!jogadorB) {
        return;
      }
      onAtualizarFormacao(trocarTitular(formacao, slotA, jogadorB));
    },
    [formacao, porId, onAtualizarFormacao],
  );

  // Resolve uma ação entre dois alvos (origem → destino), seja por toque ou arraste.
  const aplicarAcao = useCallback(
    (origem: Descritor, alvo: Descritor) => {
      setSelecao(null);
      if (origem.tipo === alvo.tipo && origem.valor === alvo.valor) {
        return;
      }
      if (origem.tipo === 'reserva' && alvo.tipo === 'titular') {
        executarSub(Number(alvo.valor), origem.valor);
        return;
      }
      if (origem.tipo === 'titular' && alvo.tipo === 'reserva') {
        executarSub(Number(origem.valor), alvo.valor);
        return;
      }
      if (origem.tipo === 'titular' && alvo.tipo === 'titular') {
        trocarPosicoes(Number(origem.valor), Number(alvo.valor));
      }
    },
    [executarSub, trocarPosicoes],
  );

  const aoTocar = useCallback(
    (tipo: string, valor: string) => {
      const alvo: Descritor = {tipo: tipo as Descritor['tipo'], valor};
      // Seleção pendente (fluxo reserva-primeiro): completa a ação. aplicarAcao
      // já limpa a seleção e executa a troca/substituição.
      if (selecao) {
        aplicarAcao(selecao, alvo);
        return;
      }
      // Toque num TITULAR abre o painel "quem entra" (lista pronta, sem caçar no
      // banco). Sem substituições restantes, cai no modo seleção para ainda
      // permitir a troca de posição por toque (titular↔titular não gasta sub).
      if (tipo === 'titular') {
        if (semSubs) {
          setSelecao(alvo);
          return;
        }
        setSlotTroca(Number(valor));
        return;
      }
      // Toque num reserva inicia o fluxo reserva-primeiro (alternativa ao painel).
      setSelecao(alvo);
    },
    [selecao, aplicarAcao, semSubs],
  );

  const escolherEntrante = useCallback(
    (entranteId: string) => {
      if (slotTroca === null) {
        return;
      }
      executarSub(slotTroca, entranteId);
      setSlotTroca(null);
    },
    [slotTroca, executarSub],
  );

  const aoIniciar = useCallback(
    (tipo: string, valor: string) => {
      // Re-mede no início do arraste: o card pode ter recentralizado após uma
      // substituição (banco encolheu), deixando pitchOrigemRef obsoleto.
      medirPitch();
      medirOverlay();
      const descritor: Descritor = {tipo: tipo as Descritor['tipo'], valor};
      arrastandoRef.current = descritor;
      setSelecao(null);
      setArrastando(descritor);
    },
    [medirPitch, medirOverlay],
  );

  const aoArrastar = useCallback(
    (ax: number, ay: number) => {
      const alvo = slotMaisProximo(ax, ay);
      if (alvo !== slotHoverRef.current) {
        slotHoverRef.current = alvo;
        setSlotHover(alvo);
      }
    },
    [slotMaisProximo],
  );

  const aoSoltar = useCallback(
    (ax: number, ay: number, tipo: string, valor: string) => {
      const alvoSlot = slotMaisProximo(ax, ay);
      if (alvoSlot !== null) {
        aplicarAcao(
          {tipo: tipo as Descritor['tipo'], valor},
          {tipo: 'titular', valor: String(alvoSlot)},
        );
      }
    },
    [slotMaisProximo, aplicarAcao],
  );

  const aoFinalizar = useCallback(() => {
    arrastandoRef.current = null;
    setArrastando(null);
    slotHoverRef.current = null;
    setSlotHover(null);
  }, []);

  const trocarTipoFormacao = useCallback(
    (tipo: FormacaoPreset) => {
      // Não troca o esquema com um arraste em andamento (evita layout mudar sob o dedo).
      if (arrastandoRef.current || tipo === formacao.tipo) {
        return;
      }
      onAtualizarFormacao(trocarEsquema(formacao, elenco, tipo));
    },
    [formacao, elenco, onAtualizarFormacao],
  );

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: ghostAtivo.value,
    transform: [
      {translateX: ghostX.value - overlayOX.value - GHOST_W / 2},
      {translateY: ghostY.value - overlayOY.value - GHOST_H / 2},
    ],
  }));

  const jogadorArrastado = arrastando ? jogadorDoDescritor(arrastando) : undefined;
  const jogadorSelecionado = selecao ? jogadorDoDescritor(selecao) : undefined;
  // Banner-guia do toque-e-toque: deixa claro qual é o próximo passo da troca.
  const textoBannerSel = !selecao
    ? ''
    : selecao.tipo === 'reserva'
    ? `Entra ${jogadorSelecionado ? nomeDe(jogadorSelecionado.id) : 'reserva'} — toque no titular que sai`
    : `${jogadorSelecionado ? nomeDe(jogadorSelecionado.id) : 'titular'} — toque no reserva (entra) ou em outro titular (troca de posição)`;
  const ehSelecionado = (d: Descritor) =>
    selecao?.tipo === d.tipo && selecao?.valor === d.valor;

  return (
    <View ref={overlayRef} onLayout={medirOverlay} style={styles.overlay}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollConteudo,
          {
            paddingTop: insets.top + espacamento[3],
            paddingBottom: insets.bottom + espacamento[3],
          },
        ]}
        scrollEnabled={!arrastando}
        showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.titulo}>Ajustes</Text>
            <Text style={styles.subtitulo}>
              {aba === 'escalacao'
                ? 'Toque no titular para ver quem pode entrar'
                : 'Vale para o restante da partida'}
            </Text>
          </View>
          {aba === 'escalacao' ? (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{subsRestantes}</Text>
              <Text style={styles.contadorLegenda}>subs</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tabBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAba('escalacao')}
            style={[styles.tab, aba === 'escalacao' ? styles.tabAtiva : null]}>
            <Text
              style={[
                styles.tabTexto,
                aba === 'escalacao' ? styles.tabTextoAtivo : null,
              ]}>
              Escalação
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setAba('instrucoes')}
            style={[styles.tab, aba === 'instrucoes' ? styles.tabAtiva : null]}>
            <Text
              style={[
                styles.tabTexto,
                aba === 'instrucoes' ? styles.tabTextoAtivo : null,
              ]}>
              Instruções
            </Text>
          </Pressable>
        </View>

        {aba === 'escalacao' && selecao ? (
          <View style={styles.bannerSel}>
            <Icone nome="substituicao" tamanho={14} cor={cores.onBrand} />
            <Text style={styles.bannerSelTexto} numberOfLines={2}>
              {textoBannerSel}
            </Text>
          </View>
        ) : null}

        {aba === 'escalacao' ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMostrarFormacoes(v => !v)}
              style={styles.disclosure}>
              <Text style={styles.disclosureLabel}>
                Esquema · <Text style={styles.disclosureValor}>{formacao.tipo}</Text>
              </Text>
              <Icone
                nome={mostrarFormacoes ? 'seta-cima' : 'seta-baixo'}
                tamanho={16}
                cor={cores.textSecondary}
              />
            </Pressable>
            {mostrarFormacoes ? (
              <View style={styles.formacaoRow}>
                {FORMACOES.map(tipo => {
                  const ativo = formacao.tipo === tipo;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={tipo}
                      onPress={() => trocarTipoFormacao(tipo)}
                      style={[styles.formChip, ativo ? styles.formChipAtivo : null]}>
                      <Text
                        style={[
                          styles.formChipTexto,
                          ativo ? styles.formChipTextoAtivo : null,
                        ]}>
                        {tipo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View
              ref={pitchRef}
              onLayout={medirPitch}
              style={[styles.pitch, {width: LARGURA, height: ALTURA}]}>
              <View style={styles.linhaCentral} />
              <View style={styles.circuloCentral} />
              <View style={[styles.area, styles.areaTopo]} />
              <View style={[styles.area, styles.areaBase]} />

              {slots.map(slot => {
                const descritor: Descritor = {
                  tipo: 'titular',
                  valor: String(slot.slotIndex),
                };
                const jogador = porId.get(
                  formacao.titulares[slot.slotIndex].jogadorId,
                );
                return (
                  <PecaTitular
                    key={`slot_${slot.slotIndex}`}
                    slot={slot}
                    jogador={jogador}
                    nome={jogador ? nomeDe(jogador.id) : slot.posicao}
                    selecionado={ehSelecionado(descritor)}
                    hover={slotHover === slot.slotIndex}
                    arrastandoEste={
                      arrastando?.tipo === 'titular' &&
                      Number(arrastando.valor) === slot.slotIndex
                    }
                    ghostX={ghostX}
                    ghostY={ghostY}
                    ghostAtivo={ghostAtivo}
                    aoIniciar={aoIniciar}
                    aoArrastar={aoArrastar}
                    aoSoltar={aoSoltar}
                    aoTocar={aoTocar}
                    aoFinalizar={aoFinalizar}
                  />
                );
              })}
            </View>

            <Text style={styles.bancoTitulo}>
              Banco{semSubs ? ' · sem substituições' : ''}
            </Text>
            <View style={styles.banco}>
              {banco.length === 0 ? (
                <Text style={styles.bancoVazio}>Sem reservas disponíveis.</Text>
              ) : (
                banco.map(jogador => {
                  const descritor: Descritor = {tipo: 'reserva', valor: jogador.id};
                  return (
                    <ReservaPeca
                      key={jogador.id}
                      jogador={jogador}
                      nome={nomeDe(jogador.id)}
                      selecionado={ehSelecionado(descritor)}
                      arrastandoEste={
                        arrastando?.tipo === 'reserva' &&
                        arrastando.valor === jogador.id
                      }
                      habilitado={
                        !semSubs && !jogador.lesionado && !jogador.suspenso
                      }
                      ghostX={ghostX}
                      ghostY={ghostY}
                      ghostAtivo={ghostAtivo}
                      aoIniciar={aoIniciar}
                      aoArrastar={aoArrastar}
                      aoSoltar={aoSoltar}
                      aoTocar={aoTocar}
                      aoFinalizar={aoFinalizar}
                    />
                  );
                })
              )}
            </View>
          </>
        ) : (
          <View style={styles.instrucoesConteudo}>
            <GrupoInstrucao
              titulo="Estilo ofensivo"
              valor={tatica.estiloOfensivo}
              opcoes={OPCOES_ESTILO}
              onSelect={v =>
                onAtualizarTatica({...tatica, estiloOfensivo: v as Tatica['estiloOfensivo']})
              }
            />
            <GrupoInstrucao
              titulo="Ritmo"
              dica="Intenso cansa mais e aumenta lesões."
              valor={tatica.ritmo}
              opcoes={OPCOES_RITMO}
              onSelect={v =>
                onAtualizarTatica({...tatica, ritmo: v as Tatica['ritmo']})
              }
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => setMostrarAvancado(v => !v)}
              style={styles.disclosure}>
              <Text style={styles.disclosureLabel}>Ajustes avançados</Text>
              <Icone
                nome={mostrarAvancado ? 'seta-cima' : 'seta-baixo'}
                tamanho={16}
                cor={cores.textSecondary}
              />
            </Pressable>
            {mostrarAvancado ? (
              <>
                <GrupoInstrucao
                  titulo="Marcação"
                  dica="Pesada gera mais cartões e pênaltis."
                  valor={tatica.marcacao}
                  opcoes={OPCOES_MARCACAO}
                  onSelect={v =>
                    onAtualizarTatica({...tatica, marcacao: v as Tatica['marcacao']})
                  }
                />
                <GrupoInstrucao
                  titulo="Linha defensiva"
                  valor={tatica.linhaDefensiva}
                  opcoes={OPCOES_LINHA}
                  onSelect={v =>
                    onAtualizarTatica({...tatica, linhaDefensiva: v as Tatica['linhaDefensiva']})
                  }
                />
              </>
            ) : null}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={onFechar}
          style={styles.concluir}>
          <Text style={styles.concluirTexto}>Concluir</Text>
        </Pressable>
        </View>
      </ScrollView>

      {/* Fantasma do jogador arrastado — segue o dedo, não bloqueia toques. */}
      <Animated.View pointerEvents="none" style={[styles.ghost, ghostStyle]}>
        {jogadorArrastado ? (
          <>
            <View
              style={[
                styles.ghostFicha,
                {borderColor: corOverall(jogadorArrastado.overall)},
              ]}>
              <Text
                style={[
                  styles.ghostOverall,
                  {color: corOverall(jogadorArrastado.overall)},
                ]}>
                {jogadorArrastado.overall}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.ghostNome}>
              {nomeDe(jogadorArrastado.id)}
            </Text>
          </>
        ) : null}
      </Animated.View>

      {slotTroca !== null && posicaoTroca ? (
        <PainelTroca
          posicao={posicaoTroca}
          saindo={saindoTroca}
          nomeSaindo={saindoTroca ? nomeDe(saindoTroca.id) : posicaoTroca}
          candidatos={candidatosTroca}
          nomeDe={nomeDe}
          onEscolher={escolherEntrante}
          onFechar={() => setSlotTroca(null)}
        />
      ) : null}
    </View>
  );
}

type CandidatoTroca = {jogador: Player; adaptacao: ResultadoAdaptacao};

type PainelTrocaProps = {
  posicao: Position;
  saindo: Player | undefined;
  nomeSaindo: string;
  candidatos: CandidatoTroca[];
  nomeDe: (id: string) => string;
  onEscolher: (id: string) => void;
  onFechar: () => void;
};

/**
 * Painel "quem entra": ao tocar num titular, mostra os reservas APTOS numa lista
 * já ordenada por encaixe na vaga (natural → improviso) e overall, com condição
 * física visível. Um toque na linha confirma a substituição — sem arraste, sem
 * procurar o jogador certo no banco.
 */
function PainelTroca({
  posicao,
  saindo,
  nomeSaindo,
  candidatos,
  nomeDe,
  onEscolher,
  onFechar,
}: PainelTrocaProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  return (
    <View style={styles.trocaOverlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={styles.trocaScrim}
        onPress={onFechar}
      />
      <View style={styles.trocaCard}>
        <View style={styles.trocaHeader}>
          <View style={styles.flex1}>
            <Text style={styles.trocaLabel}>Entra no lugar de</Text>
            <Text style={styles.trocaSaindo} numberOfLines={1}>
              {nomeSaindo}
            </Text>
          </View>
          <View style={styles.trocaPosChip}>
            <Text style={styles.trocaPosChipTexto}>{posicao}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onFechar}
            style={styles.trocaFechar}>
            <Icone nome="fechar" tamanho={18} cor={cores.textSecondary} />
          </Pressable>
        </View>

        {saindo ? (
          <View style={styles.trocaSaiLinha}>
            <View
              style={[
                styles.condDot,
                {backgroundColor: corCondicao(saindo.condicaoFisica)},
              ]}
            />
            <Text style={styles.trocaSaiInfo}>
              Sai com {Math.round(saindo.condicaoFisica)}% de condição
            </Text>
          </View>
        ) : null}

        <View style={styles.trocaDivisor} />

        {candidatos.length === 0 ? (
          <Text style={styles.trocaVazio}>
            Nenhum reserva disponível para entrar.
          </Text>
        ) : (
          <ScrollView
            style={styles.trocaLista}
            showsVerticalScrollIndicator={false}>
            {candidatos.map(({jogador, adaptacao}) => {
              const cor = corOverall(jogador.overall);
              const corFit = corAdaptacao(adaptacao.nivel);
              const rotulo =
                adaptacao.nivel === 'natural'
                  ? ROTULO_FIT.natural
                  : `${ROTULO_FIT[adaptacao.nivel]} ${Math.round(
                      adaptacao.fator * 100,
                    )}%`;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={jogador.id}
                  onPress={() => onEscolher(jogador.id)}
                  style={styles.trocaLinha}>
                  <View style={[styles.trocaBadge, {borderColor: cor}]}>
                    <Text style={[styles.trocaBadgeTexto, {color: cor}]}>
                      {jogador.overall}
                    </Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.trocaNome} numberOfLines={1}>
                      {nomeDe(jogador.id)}
                    </Text>
                    <View style={styles.trocaMeta}>
                      <Text style={styles.trocaMetaPos}>
                        {jogador.posicaoPrincipal}
                      </Text>
                      <View
                        style={[
                          styles.condDot,
                          {
                            backgroundColor: corCondicao(jogador.condicaoFisica),
                          },
                        ]}
                      />
                      <Text style={styles.trocaMetaCond}>
                        {Math.round(jogador.condicaoFisica)}%
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.trocaFit,
                      {borderColor: corFit, backgroundColor: `${corFit}1A`},
                    ]}>
                    <Text style={[styles.trocaFitTexto, {color: corFit}]}>
                      {rotulo}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

type PecaCompartilhada = {
  ghostX: SharedNum;
  ghostY: SharedNum;
  ghostAtivo: SharedNum;
  aoIniciar: (tipo: string, valor: string) => void;
  aoArrastar: (ax: number, ay: number) => void;
  aoSoltar: (ax: number, ay: number, tipo: string, valor: string) => void;
  aoTocar: (tipo: string, valor: string) => void;
  aoFinalizar: () => void;
};

type PecaTitularProps = PecaCompartilhada & {
  slot: SlotPos;
  jogador: Player | undefined;
  nome: string;
  selecionado: boolean;
  hover: boolean;
  arrastandoEste: boolean;
};

function PecaTitular({
  slot,
  jogador,
  nome,
  selecionado,
  hover,
  arrastandoEste,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: PecaTitularProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const gesto = useGestoPeca(
    'titular',
    String(slot.slotIndex),
    true,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );
  // Anel por ENCAIXE de posição (verde natural → vermelho improviso), a mesma
  // semântica/cor do DraggablePitch — as telas de escalação seguem um padrão só.
  const adaptacao = jogador ? nivelAdaptacao(jogador, slot.posicao) : null;
  const corEncaixe = adaptacao
    ? corAdaptacao(adaptacao.nivel)
    : cores.textSecondary;
  const corBorda = hover
    ? cores.accent
    : selecionado
      ? cores.brand
      : corEncaixe;
  const pct = adaptacao ? Math.round(adaptacao.fator * 100) : 100;
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.slotWrap,
          {left: slot.x - SLOT_W / 2, top: slot.y - DIAM / 2 - 6},
          arrastandoEste ? styles.arrastandoEste : null,
        ]}>
        <View
          style={[
            styles.ficha,
            {borderColor: corBorda},
            hover || selecionado ? styles.fichaDestacada : null,
            hover ? styles.fichaHover : null,
          ]}>
          <Text style={[styles.fichaOverall, {color: corBorda}]}>
            {jogador ? jogador.overall : '--'}
          </Text>
        </View>
        <Text style={styles.slotPos}>{slot.posicao}</Text>
        <Text numberOfLines={1} style={styles.slotNome}>
          {nome}
        </Text>
        {adaptacao && adaptacao.nivel !== 'natural' ? (
          <Text style={[styles.slotPct, {color: corBorda}]}>{pct}%</Text>
        ) : null}
      </View>
    </GestureDetector>
  );
}

type ReservaPecaProps = PecaCompartilhada & {
  jogador: Player;
  nome: string;
  selecionado: boolean;
  arrastandoEste: boolean;
  habilitado: boolean;
};

function ReservaPeca({
  jogador,
  nome,
  selecionado,
  arrastandoEste,
  habilitado,
  ghostX,
  ghostY,
  ghostAtivo,
  aoIniciar,
  aoArrastar,
  aoSoltar,
  aoTocar,
  aoFinalizar,
}: ReservaPecaProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const gesto = useGestoPeca(
    'reserva',
    jogador.id,
    habilitado,
    ghostX,
    ghostY,
    ghostAtivo,
    aoIniciar,
    aoArrastar,
    aoSoltar,
    aoTocar,
    aoFinalizar,
  );
  const cor = corOverall(jogador.overall);
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.reservaWrap,
          selecionado ? styles.reservaSel : null,
          !habilitado ? styles.reservaBloqueada : null,
          arrastandoEste ? styles.arrastandoEste : null,
        ]}>
        <View style={[styles.fichaBanco, {borderColor: cor}]}>
          <Text style={[styles.fichaOverall, {color: cor}]}>
            {jogador.overall}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.reservaNome,
            jogador.lesionado || jogador.suspenso ? styles.reservaLesionado : null,
          ]}>
          {nome}
        </Text>
        <Text style={styles.reservaPos}>
          {jogador.posicaoPrincipal}
          {jogador.lesionado ? ' · LES' : jogador.suspenso ? ' · SUS' : ''}
        </Text>
      </View>
    </GestureDetector>
  );
}

type GrupoInstrucaoProps = {
  titulo: string;
  valor: string;
  opcoes: readonly string[];
  dica?: string;
  onSelect: (valor: string) => void;
};

function GrupoInstrucao({
  titulo,
  valor,
  opcoes,
  dica,
  onSelect,
}: GrupoInstrucaoProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  return (
    <View style={styles.grupo}>
      <Text style={styles.grupoTitulo}>{titulo}</Text>
      {dica ? <Text style={styles.grupoDica}>{dica}</Text> : null}
      <View style={styles.grupoOpcoes}>
        {opcoes.map(opcao => {
          const ativo = valor === opcao;
          return (
            <Pressable
              accessibilityRole="button"
              key={opcao}
              onPress={() => onSelect(opcao)}
              style={[styles.opcao, ativo ? styles.opcaoAtiva : null]}>
              <Text
                style={[
                  styles.opcaoTexto,
                  ativo ? styles.opcaoTextoAtivo : null,
                ]}>
                {opcao}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default AjustesPartida;

const criarEstilos = (t: TemaDS) =>
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
    fechar: {
      padding: espacamento[1],
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
