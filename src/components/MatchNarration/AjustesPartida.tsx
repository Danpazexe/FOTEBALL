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
import {cores, corOverall, espaco, raio} from '../../theme';
import type {Formacao, FormacaoPreset, Player, Position, Tatica} from '../../types';
import Icone from '../Icone';

const {width: LARGURA_TELA, height: ALTURA_TELA} = Dimensions.get('window');
const LARGURA = Math.min(LARGURA_TELA - 28, 400);
// Limita a altura do campo pela tela para o painel caber também em telas baixas.
const ALTURA = Math.round(Math.min(LARGURA * 0.92, ALTURA_TELA * 0.42));
const RAIO = Math.round(LARGURA * 0.056);
const DIAM = RAIO * 2;
const LIMIAR_DROP = RAIO + 30;
const SLOT_W = 74;
const GHOST_W = 78;
const GHOST_H = 90;

const FORMACOES: FormacaoPreset[] = [
  '4-4-2',
  '4-3-3',
  '4-2-3-1',
  '3-5-2',
  '5-3-2',
  '4-1-4-1',
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

/** Linha vertical do campo por posição (0 = gol embaixo, 4 = ataque em cima). */
function linhaDaPosicao(posicao: Position): number {
  if (posicao === 'GOL') {
    return 0;
  }
  if (posicao === 'ZAG' || posicao === 'LD' || posicao === 'LE') {
    return 1;
  }
  if (posicao === 'VOL' || posicao === 'MC') {
    return 2;
  }
  if (posicao === 'MEI' || posicao === 'PD' || posicao === 'PE') {
    return 3;
  }
  return 4;
}

const Y_LINHA = [0.88, 0.7, 0.52, 0.34, 0.16];

type SlotPos = {slotIndex: number; x: number; y: number; posicao: Position};

function posicoesDosSlots(formacao: Formacao): SlotPos[] {
  const porLinha = new Map<number, number[]>();
  formacao.titulares.forEach((titular, index) => {
    const linha = linhaDaPosicao(titular.posicao);
    const lista = porLinha.get(linha) ?? [];
    lista.push(index);
    porLinha.set(linha, lista);
  });

  const resultado: SlotPos[] = [];
  for (const [linha, indices] of porLinha) {
    const y = Y_LINHA[linha] * ALTURA;
    indices.forEach((slotIndex, k) => {
      const x = ((k + 1) / (indices.length + 1)) * LARGURA;
      resultado.push({
        slotIndex,
        x,
        y,
        posicao: formacao.titulares[slotIndex].posicao,
      });
    });
  }
  return resultado;
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
  const banco = useMemo(
    () =>
      elenco
        .filter(j => !titularIds.has(j.id) && !jaSairamIds.has(j.id))
        .sort((a, b) => b.overall - a.overall),
    [elenco, titularIds, jaSairamIds],
  );

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
      if (!selecao) {
        setSelecao(alvo);
        return;
      }
      // aplicarAcao já limpa a seleção (e executa a troca/substituição).
      aplicarAcao(selecao, alvo);
    },
    [selecao, aplicarAcao],
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
            paddingTop: insets.top + espaco.md,
            paddingBottom: insets.bottom + espaco.md,
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
                ? 'Toque ou arraste para substituir'
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
            <Icone
              nome="substituicao"
              tamanho={14}
              cor={cores.contrastePrimaria}
            />
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
                cor={cores.textoSecundario}
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
                cor={cores.textoSecundario}
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
  const cor = jogador ? corOverall(jogador.overall) : cores.textoSecundario;
  const corBorda = hover
    ? cores.secundaria
    : selecionado
    ? cores.primaria
    : cor;
  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          styles.slotWrap,
          {left: slot.x - SLOT_W / 2, top: slot.y - DIAM / 2 - 13},
          arrastandoEste ? styles.arrastandoEste : null,
        ]}>
        <Text style={styles.slotPos}>{slot.posicao}</Text>
        <View
          style={[
            styles.ficha,
            {borderColor: corBorda, borderWidth: hover || selecionado ? 3 : 2},
            hover ? styles.fichaHover : null,
          ]}>
          <Text style={[styles.fichaOverall, {color: cor}]}>
            {jogador ? jogador.overall : '--'}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.slotNome}>
          {nome}
        </Text>
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

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(5,8,14,0.92)',
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: espaco.md,
  },
  card: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    maxWidth: '100%',
    padding: espaco.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    width: LARGURA,
  },
  flex1: {
    flex: 1,
  },
  titulo: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitulo: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  contador: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    minWidth: 48,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  contadorTexto: {
    color: cores.primaria,
    fontSize: 19,
    fontWeight: '900',
  },
  contadorLegenda: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fechar: {
    padding: espaco.xs,
  },
  tabBar: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    padding: 3,
    width: LARGURA,
  },
  tab: {
    alignItems: 'center',
    borderRadius: raio.sm - 2,
    flex: 1,
    paddingVertical: espaco.sm,
  },
  tabAtiva: {
    backgroundColor: cores.primaria,
  },
  tabTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  bannerSel: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    width: LARGURA,
  },
  bannerSelTexto: {
    color: cores.contrastePrimaria,
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
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 6,
  },
  formChipAtivo: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.primaria,
  },
  formChipTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
  },
  formChipTextoAtivo: {
    color: cores.texto,
  },
  disclosure: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  disclosureLabel: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '700',
  },
  disclosureValor: {
    color: cores.texto,
    fontWeight: '900',
  },
  pitch: {
    backgroundColor: '#123524',
    borderColor: 'rgba(240,244,255,0.25)',
    borderRadius: raio.md,
    borderWidth: 2,
    overflow: 'hidden',
  },
  linhaCentral: {
    backgroundColor: 'rgba(240,244,255,0.4)',
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: ALTURA / 2 - 1,
  },
  circuloCentral: {
    borderColor: 'rgba(240,244,255,0.4)',
    borderRadius: LARGURA * 0.15,
    borderWidth: 2,
    height: LARGURA * 0.3,
    left: LARGURA / 2 - LARGURA * 0.15,
    position: 'absolute',
    top: ALTURA / 2 - LARGURA * 0.15,
    width: LARGURA * 0.3,
  },
  area: {
    borderColor: 'rgba(240,244,255,0.35)',
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
    color: 'rgba(240,244,255,0.65)',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 1,
  },
  ficha: {
    alignItems: 'center',
    backgroundColor: '#0A0E1A',
    borderRadius: DIAM,
    height: DIAM,
    justifyContent: 'center',
    width: DIAM,
  },
  fichaHover: {
    backgroundColor: '#0F2A1C',
  },
  fichaOverall: {
    fontSize: RAIO * 0.9,
    fontWeight: '900',
  },
  slotNome: {
    color: cores.texto,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    maxWidth: SLOT_W,
    textAlign: 'center',
  },
  bancoTitulo: {
    alignSelf: 'flex-start',
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  banco: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    justifyContent: 'center',
    width: LARGURA,
  },
  bancoVazio: {
    color: cores.textoSecundario,
    fontSize: 13,
    paddingVertical: espaco.sm,
  },
  reservaWrap: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: espaco.xs,
    width: 58,
  },
  reservaSel: {
    borderColor: cores.primaria,
    borderWidth: 2,
  },
  reservaBloqueada: {
    opacity: 0.4,
  },
  fichaBanco: {
    alignItems: 'center',
    backgroundColor: '#0A0E1A',
    borderRadius: 32,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  reservaNome: {
    color: cores.texto,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 54,
    textAlign: 'center',
  },
  reservaLesionado: {
    color: cores.perigo,
  },
  reservaPos: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
  },
  instrucoesConteudo: {
    gap: espaco.md,
    paddingVertical: espaco.xs,
    width: LARGURA,
  },
  grupo: {
    gap: espaco.xs,
  },
  grupoTitulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  grupoDica: {
    color: cores.textoSecundario,
    fontSize: 11,
  },
  grupoOpcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  opcao: {
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  opcaoAtiva: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  opcaoTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  opcaoTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  concluir: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.sm,
    marginTop: espaco.xs,
    paddingVertical: espaco.md,
    width: LARGURA,
  },
  concluirTexto: {
    color: cores.contrastePrimaria,
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
    backgroundColor: '#0A0E1A',
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
    backgroundColor: 'rgba(10,14,26,0.85)',
    borderRadius: 6,
    color: cores.texto,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    maxWidth: GHOST_W,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 1,
    textAlign: 'center',
  },
});
