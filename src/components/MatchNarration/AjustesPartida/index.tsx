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
 *
 * Este index só ORQUESTRA: as regras (validação de sub, troca de posição,
 * ranking de candidatos) vivem em `acoes.ts`, a geometria em `layoutCampo.ts`
 * e as peças visuais nos componentes irmãos — todos testáveis sem UI.
 */
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, useSharedValue} from 'react-native-reanimated';

import {trocarEsquema, trocarTitular} from '../../../api/database/seed/defaults';
// Funções de cor por VALOR (tier/encaixe/condição) — fonte única compartilhada
// com as demais telas de escalação; ainda vivem no módulo de tema antigo.
import {corOverall} from '../../../theme';
import {espacamento, useEstilosDS, useTheme} from '../../../design-system';
import type {Formacao, FormacaoPreset, Player, Tatica} from '../../../types';
import Icone from '../../Icone';
import {
  jogadorParaTrocaDePosicao,
  ordenarCandidatosTroca,
  podeSubstituir,
  resolverAcao,
} from './acoes';
import {
  ALTURA,
  FORMACOES,
  GHOST_H,
  GHOST_W,
  LARGURA,
  LIMIAR_DROP,
  OPCOES_ESTILO,
  OPCOES_LINHA,
  OPCOES_MARCACAO,
  OPCOES_RITMO,
  PAD_BASE,
  PAD_TOPO,
} from './constantes';
import {criarEstilos} from './estilos';
import GrupoInstrucao from './GrupoInstrucao';
import {posicoesDosSlots, slotMaisProximo, type MedidasCampo} from './layoutCampo';
import PainelTroca from './PainelTroca';
import PecaTitular from './PecaTitular';
import ReservaPeca from './ReservaPeca';
import type {Descritor} from './tipos';

const MEDIDAS_CAMPO: MedidasCampo = {
  largura: LARGURA,
  altura: ALTURA,
  padTopo: PAD_TOPO,
  padBase: PAD_BASE,
};

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
  const slots = useMemo(
    () => posicoesDosSlots(formacao, MEDIDAS_CAMPO),
    [formacao],
  );
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
    return ordenarCandidatosTroca(banco, posicaoTroca);
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

  const acharSlotProximo = useCallback(
    (ax: number, ay: number): number | null =>
      slotMaisProximo(slots, pitchOrigemRef.current, ax, ay, LIMIAR_DROP),
    [slots],
  );

  const executarSub = useCallback(
    (slotIndex: number, entranteId: string) => {
      if (!podeSubstituir(formacao, porId, semSubs, slotIndex, entranteId)) {
        return;
      }
      onSubstituir(slotIndex, entranteId);
    },
    [semSubs, formacao, porId, onSubstituir],
  );

  const trocarPosicoes = useCallback(
    (slotA: number, slotB: number) => {
      const jogadorB = jogadorParaTrocaDePosicao(formacao, porId, slotA, slotB);
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
      const acao = resolverAcao(origem, alvo);
      if (acao.tipo === 'substituicao') {
        executarSub(acao.slotIndex, acao.entranteId);
      } else if (acao.tipo === 'trocaPosicoes') {
        trocarPosicoes(acao.slotA, acao.slotB);
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
      const alvo = acharSlotProximo(ax, ay);
      if (alvo !== slotHoverRef.current) {
        slotHoverRef.current = alvo;
        setSlotHover(alvo);
      }
    },
    [acharSlotProximo],
  );

  const aoSoltar = useCallback(
    (ax: number, ay: number, tipo: string, valor: string) => {
      const alvoSlot = acharSlotProximo(ax, ay);
      if (alvoSlot !== null) {
        aplicarAcao(
          {tipo: tipo as Descritor['tipo'], valor},
          {tipo: 'titular', valor: String(alvoSlot)},
        );
      }
    },
    [acharSlotProximo, aplicarAcao],
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

export default AjustesPartida;
