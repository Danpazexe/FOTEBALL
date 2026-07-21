/**
 * Treino da semana — SIMPLES e RÁPIDO (estilo Brasfoot). Uma decisão principal:
 * o FOCO da semana (4 opções claras) + a intensidade (carga). O impacto é
 * mostrado de forma enxuta (condição, forma, risco) e confirma. Sem drilldown
 * por posição nem foco individual por jogador. Migrado ao Design System v2.
 */

import React, {useMemo, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  Pressable,
  Screen,
  Text,
  LIMIAR_CONDICAO_ALTA,
  LIMIAR_CONDICAO_MEDIA,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {useToast} from '../../components/feedback';
import {calcularEfeitoTreino} from '../../engine/progression/treinoAtributos';
import {
  PRESETS_TREINO,
  cargaDaSemana,
  definirDiaNoPlano,
  faixaRiscoLesao,
  planoDePreset,
  type NivelAlerta,
  type PresetTreinoId,
} from '../../engine/progression/planoTreinoEngine';
import type {SessaoPlanoTreino} from '../../types';
import {
  INTENSIDADES,
  INTENSIDADES_ORDEM,
  buscarTreino,
  type IntensidadeTreino,
} from '../../engine/progression/treinoTipos';
import {grupoDaPosicao} from '../../engine/tactics/posicoes';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';

/** Os 4 focos da semana — cada um mapeia para um treino real do catálogo. */
const FOCOS: Array<{
  id: string;
  nome: string;
  descricao: string;
  icone: IconeNome;
}> = [
  {id: 'hab_fisico', nome: 'Físico', descricao: 'Força e resistência', icone: 'tendencia'},
  {id: 'hab_defesa', nome: 'Defesa', descricao: 'Marcação e desarme', icone: 'clube'},
  {id: 'hab_passe', nome: 'Criação', descricao: 'Passe e visão de jogo', icone: 'tatica'},
  {id: 'hab_finalizacao', nome: 'Ataque', descricao: 'Finalização', icone: 'bola'},
];

/** Rótulos dos 7 dias do ciclo (0 = segunda … 6 = domingo). */
const DIAS_CICLO = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

/**
 * Tipos de DIA da agenda (Camada 2, estilo FM): o usuário monta a semana
 * escolhendo um por dia. Cada tipo mapeia para uma sessão real do catálogo
 * (treino + intensidade); Folga = sem sessão (só recuperação).
 */
const TIPOS_DIA: Array<{
  id: string;
  nome: string;
  descricao: string;
  icone: IconeNome;
  sessao: SessaoPlanoTreino | null;
}> = [
  {id: 'folga', nome: 'Folga', descricao: 'Sem treino — recuperação', icone: 'relogio', sessao: null},
  {
    id: 'recuperacao',
    nome: 'Recuperação',
    descricao: 'Carga mínima, recupera condição',
    icone: 'relogio',
    sessao: {treinoId: 'hab_fisico', intensidade: 'descanso'},
  },
  {
    id: 'fisico',
    nome: 'Físico',
    descricao: 'Força e resistência (intenso)',
    icone: 'tendencia',
    sessao: {treinoId: 'hab_fisico', intensidade: 'forte'},
  },
  {
    id: 'tecnico',
    nome: 'Técnico',
    descricao: 'Drible, passe e finalização',
    icone: 'estrela',
    sessao: {treinoId: 'hab_tecnica', intensidade: 'normal'},
  },
  {
    id: 'tatico',
    nome: 'Tático',
    descricao: 'Marcação e posicionamento',
    icone: 'tatica',
    sessao: {treinoId: 'hab_marcacao', intensidade: 'normal'},
  },
  {
    id: 'bola_parada',
    nome: 'Bola parada',
    descricao: 'Cruzamento e finalização',
    icone: 'bola',
    sessao: {treinoId: 'hab_bola_parada', intensidade: 'normal'},
  },
  {
    id: 'pre_jogo',
    nome: 'Pré-jogo',
    descricao: 'Ativação leve véspera de jogo',
    icone: 'jogar',
    sessao: {treinoId: 'hab_fisico', intensidade: 'leve'},
  },
];

/** Mapa nível de alerta da engine → token de cor do design system. */
const TOM_POR_NIVEL: Record<NivelAlerta, CorTexto> = {
  ok: 'success',
  atencao: 'warning',
  alerta: 'danger',
};

function media(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function corMoralTom(moral: number): CorTexto {
  return moral >= 75 ? 'success' : moral >= 50 ? 'warning' : 'danger';
}
// Gêmea em TOKEN da `corCondicao` do design system (success/warning/danger têm
// os mesmos hex de fitness.high/medium/low) — limiares vêm da fonte única.
function corCondicaoTom(valor: number): CorTexto {
  return valor >= LIMIAR_CONDICAO_ALTA
    ? 'success'
    : valor >= LIMIAR_CONDICAO_MEDIA
    ? 'warning'
    : 'danger';
}

function Semana(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const {cores} = useTheme();
  const elenco = useJogadoresUsuario();
  const clube = useGameStore(selecionarClubeUsuario);
  const aplicarTreino = useGameStore(state => state.aplicarTreino);
  const conversarComGrupo = useGameStore(state => state.conversarComGrupo);
  const jaConversou = useGameStore(state => state.conversouComGrupo);
  const descansarElencoUsuario = useGameStore(
    state => state.descansarElencoUsuario,
  );
  // Plano de treino recorrente (Onda 4/7).
  const planoTreino = useGameStore(state => state.planoTreino);
  const planoStatus = useGameStore(state => state.planoTreinoStatus);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const aceitarPlanoRecomendado = useGameStore(
    state => state.aceitarPlanoRecomendado,
  );
  const configurarPlanoTreino = useGameStore(
    state => state.configurarPlanoTreino,
  );
  const alternarPausaPlanoTreino = useGameStore(
    state => state.alternarPausaPlanoTreino,
  );
  const recomendarPlanoTreino = useGameStore(
    state => state.recomendarPlanoTreino,
  );

  const [focoId, setFocoId] = useState<string>(FOCOS[0].id);
  const [intensidade, setIntensidade] = useState<IntensidadeTreino>('normal');
  // Dia da agenda em edição (índice 0..6) — abre o seletor de tipo de dia.
  const [diaEditando, setDiaEditando] = useState<number | null>(null);
  const recomendacao = useMemo(
    () => recomendarPlanoTreino(),
    [recomendarPlanoTreino],
  );

  const treino = buscarTreino(focoId);
  const nivelInfra = clube?.estadio.nivelInfraestrutura ?? 3;
  const moralMedia = useMemo(() => media(elenco.map(j => j.moral)), [elenco]);

  // Prontidão do elenco (dado real): lesionados, cansados (condição baixa) e
  // disponíveis. Guia a decisão de carga da semana.
  const prontidao = useMemo(() => {
    let lesionados = 0;
    let cansados = 0;
    let disponiveis = 0;
    for (const j of elenco) {
      if (j.lesionado) {
        lesionados += 1;
      } else if (j.condicaoFisica < 65) {
        cansados += 1;
      } else {
        disponiveis += 1;
      }
    }
    return {lesionados, cansados, disponiveis};
  }, [elenco]);

  const preview = useMemo(() => {
    if (!treino) {
      return null;
    }
    const semLesao = () => 1;
    const efeitos = elenco.map(jogador =>
      calcularEfeitoTreino(
        jogador,
        treino,
        intensidade,
        {nivelInfra, jogosNaTemporada: jogador.estatisticasTemporada.jogos},
        semLesao,
      ),
    );
    const condAtual = media(elenco.map(j => j.condicaoFisica));
    const condNova = media(
      elenco.map((j, i) => j.condicaoFisica + efeitos[i].deltaCondicao),
    );
    const formaAtual = media(elenco.map(j => j.forma));
    const formaNova = media(
      elenco.map((j, i) => j.forma + efeitos[i].deltaForma),
    );
    const comAfinidade = elenco.filter(j =>
      treino.gruposIdeais.includes(grupoDaPosicao(j.posicaoPrincipal)),
    ).length;
    return {condAtual, condNova, formaAtual, formaNova, comAfinidade};
  }, [treino, elenco, intensidade, nivelInfra]);

  const risco = faixaRiscoLesao(INTENSIDADES[intensidade].riscoLesaoBase);

  // Cronograma da semana do plano ATIVO (7 dias do ciclo corrente) + resumo.
  const semanaPlano = useMemo(() => {
    if (!planoTreino || planoTreino.semanas.length === 0) {
      return null;
    }
    const semana =
      planoTreino.semanas[rodadaAtual % planoTreino.semanas.length];
    const dias = semana?.dias ?? [];
    const carga = cargaDaSemana(dias);
    const riscoBaseMax = dias
      .filter((d): d is SessaoPlanoTreino => d !== null)
      .reduce((m, d) => Math.max(m, INTENSIDADES[d.intensidade].riscoLesaoBase), 0);
    const prontidaoPct = Math.round(
      media(elenco.map(j => j.condicaoFisica)),
    );
    return {
      dias,
      carga,
      risco: faixaRiscoLesao(riscoBaseMax),
      prontidaoPct,
    };
  }, [planoTreino, rodadaAtual, elenco]);

  const aoConversar = () => {
    const ok = conversarComGrupo();
    toast(
      ok
        ? 'Discurso motivacional feito. Moral em alta!'
        : 'Grupo já reunido esta semana.',
      ok ? 'sucesso' : 'erro',
    );
  };

  const aoDescansar = () => {
    const n = descansarElencoUsuario();
    toast(
      n > 0
        ? `Descanso ativo: ${n} jogador${n > 1 ? 'es' : ''} recuperando carga.`
        : 'Elenco já está descansado.',
      n > 0 ? 'sucesso' : 'erro',
    );
  };

  const confirmar = () => {
    if (!treino) {
      return;
    }
    aplicarTreino(treino.id, intensidade);
    toast('Treino realizado.', 'sucesso');
    nav.goBack();
  };

  const rotuloStatusPlano =
    planoStatus === 'configurado_usuario'
      ? 'Seu plano'
      : planoStatus === 'padrao_assistente'
        ? 'Plano do auxiliar'
        : 'Não configurado';

  const aoAtivarPreset = (presetId: PresetTreinoId) => {
    if (!clube) {
      return;
    }
    configurarPlanoTreino(
      planoDePreset(presetId, clube.id, `${new Date().getFullYear()}`),
    );
    toast(`Plano "${PRESETS_TREINO[presetId].nome}" ativado.`, 'sucesso');
  };

  // Define o TIPO de um dia da agenda (Camada 2) e persiste o plano.
  const aoDefinirDia = (sessao: SessaoPlanoTreino | null) => {
    if (!clube || diaEditando === null) {
      return;
    }
    configurarPlanoTreino(
      definirDiaNoPlano(
        planoTreino,
        clube.id,
        `${new Date().getFullYear()}`,
        diaEditando,
        sessao,
      ),
    );
    setDiaEditando(null);
    toast('Dia atualizado.', 'sucesso');
  };

  return (
    <Screen
      scroll
      header={<AppHeader title="Treino" onBack={() => nav.goBack()} />}>
      {/* Plano de treino recorrente (Onda 7) */}
      <Card variante="outlined" style={styles.planoCard}>
        <View style={styles.planoTopo}>
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary">
              Plano atual
            </Text>
            <Text variant="titleM">{planoTreino?.nome ?? 'Nenhum'}</Text>
          </View>
          <Badge
            label={rotuloStatusPlano}
            tom={planoStatus === 'configurado_usuario' ? 'success' : 'neutral'}
          />
        </View>
        {planoTreino ? (
          <View style={styles.planoAcoes}>
            <Chip
              label={planoTreino.status === 'ativo' ? 'Recorrente: ativo' : 'Pausado'}
              tom={planoTreino.status === 'ativo' ? 'brand' : 'neutral'}
              icone="relogio"
              onPress={alternarPausaPlanoTreino}
            />
          </View>
        ) : null}
        {recomendacao ? (
          <Card variante="status" status="info" padding={3} style={styles.recomCard}>
            <Icon nome="estrela" size={18} color="info" />
            <View style={styles.flex}>
              <Text variant="labelL">Recomendação do staff</Text>
              <Text variant="caption" color="textSecondary">
                {recomendacao.motivos[0]}
              </Text>
            </View>
            <Button
              titulo="Usar"
              variante="secondary"
              tamanho="sm"
              onPress={() => {
                aceitarPlanoRecomendado();
                toast('Plano recomendado ativado.', 'sucesso');
              }}
            />
          </Card>
        ) : null}
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Trocar por um preset
        </Text>
        <View style={styles.presetLinha}>
          {(Object.keys(PRESETS_TREINO) as PresetTreinoId[]).map(presetId => (
            <Chip
              key={presetId}
              label={PRESETS_TREINO[presetId].nome}
              selected={planoTreino?.nome === PRESETS_TREINO[presetId].nome}
              onPress={() => aoAtivarPreset(presetId)}
            />
          ))}
        </View>
      </Card>

      {/* Cronograma da semana (plano ativo) — dia a dia do ciclo */}
      {semanaPlano ? (
        <View style={styles.section}>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Cronograma da semana
          </Text>
          <Card variante="outlined" padding={0}>
            {semanaPlano.dias.map((dia, i) => {
              const treinoDia = dia ? buscarTreino(dia.treinoId) : null;
              return (
                <View key={DIAS_CICLO[i]}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => setDiaEditando(i)}
                    accessibilityLabel={`Editar treino de ${DIAS_CICLO[i]}`}
                    style={styles.cronoLinha}>
                    <Text
                      variant="labelL"
                      color="textSecondary"
                      tabular
                      style={styles.cronoDia}>
                      {DIAS_CICLO[i]}
                    </Text>
                    <View style={styles.flex}>
                      <Text variant="titleM">
                        {dia ? treinoDia?.nome ?? 'Treino' : 'Folga'}
                      </Text>
                      <Text variant="caption" color="textSecondary">
                        {dia
                          ? INTENSIDADES[dia.intensidade].rotulo
                          : 'Recuperação ativa'}
                      </Text>
                    </View>
                    <Icon nome="avancar" size={18} color="textSecondary" />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      {/* Resumo da semana — carga agregada / prontidão / risco */}
      {semanaPlano ? (
        <Card variante="outlined" style={styles.resumoSemanaCard}>
          <Text variant="titleM">Resumo da semana</Text>
          <View style={styles.resumoGrid}>
            <ResumoStat
              rotulo="Carga"
              texto={semanaPlano.carga.texto}
              tom={TOM_POR_NIVEL[semanaPlano.carga.nivel]}
            />
            <ResumoStat
              rotulo="Prontidão"
              texto={`${semanaPlano.prontidaoPct}%`}
              tom={corCondicaoTom(semanaPlano.prontidaoPct)}
            />
            <ResumoStat
              rotulo="Risco de lesão"
              texto={semanaPlano.risco.texto}
              tom={TOM_POR_NIVEL[semanaPlano.risco.nivel]}
            />
          </View>
        </Card>
      ) : null}

      {/* Prontidão do elenco */}
      <Card variante="outlined" style={styles.prontidaoCard}>
        <ProntidaoStat
          valor={prontidao.disponiveis}
          rotulo="Disponíveis"
          tom="success"
        />
        <ProntidaoStat valor={prontidao.cansados} rotulo="Cansados" tom="warning" />
        <ProntidaoStat
          valor={prontidao.lesionados}
          rotulo="Lesionados"
          tom="danger"
        />
      </Card>
      {prontidao.cansados > 0 ? (
        <Card variante="status" status="warning" padding={3} style={styles.cargaCard}>
          <Icon nome="lesao" size={18} color="warning" />
          <Text variant="labelL" style={styles.flex}>
            {prontidao.cansados} jogador{prontidao.cansados > 1 ? 'es' : ''}{' '}
            cansado{prontidao.cansados > 1 ? 's' : ''} — prefira carga leve
          </Text>
        </Card>
      ) : null}
      {/* Descanso ativo: recupera carga/condição de quem está mais desgastado */}
      <Button
        titulo="Dar descanso ao elenco"
        variante="secondary"
        icone="relogio"
        onPress={aoDescansar}
        fullWidth
      />

      {/* Foco da semana — 4 opções claras */}
      <View style={styles.section}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Foco da semana
        </Text>
        <View style={styles.focoGrid}>
          {FOCOS.map(foco => {
            const ativo = foco.id === focoId;
            return (
              <Pressable
                key={foco.id}
                onPress={() => setFocoId(foco.id)}
                accessibilityState={{selected: ativo}}
                style={[
                  styles.focoCard,
                  {
                    backgroundColor: ativo ? cores.brandSoft : cores.surface,
                    borderColor: ativo ? cores.brand : cores.border,
                  },
                ]}>
                <Icon
                  nome={foco.icone}
                  size={22}
                  color={ativo ? 'brand' : 'textSecondary'}
                />
                <View style={styles.flex}>
                  <Text variant="labelL" color={ativo ? 'brand' : 'textPrimary'}>
                    {foco.nome}
                  </Text>
                  <Text variant="caption" color="textSecondary" numberOfLines={1}>
                    {foco.descricao}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Intensidade (carga) */}
      <View style={styles.section}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Intensidade
        </Text>
        <View style={styles.chipRow}>
          {INTENSIDADES_ORDEM.map(valor => (
            <Chip
              key={valor}
              label={INTENSIDADES[valor].rotulo}
              selected={intensidade === valor}
              onPress={() => setIntensidade(valor)}
            />
          ))}
        </View>
      </View>

      {/* Impacto da semana (enxuto) */}
      {treino && preview ? (
        <Card variante="outlined" style={styles.resumoCard}>
          <View style={styles.rowBetween}>
            <Text variant="titleM">Impacto da semana</Text>
            <Badge
              label={`${preview.comAfinidade}/${elenco.length} ideais`}
              tom="accent"
            />
          </View>
          <View style={styles.metricaLinha}>
            <Text variant="bodyM" color="textSecondary">
              Condição média
            </Text>
            <Text variant="labelL" tabular>
              {preview.condAtual.toFixed(0)}%{' '}
              <Text variant="labelL" color={corCondicaoTom(preview.condNova)}>
                → {preview.condNova.toFixed(0)}%
              </Text>
            </Text>
          </View>
          <View style={styles.metricaLinha}>
            <Text variant="bodyM" color="textSecondary">
              Forma média
            </Text>
            <Text variant="labelL" tabular>
              {preview.formaAtual.toFixed(1)}{' '}
              <Text variant="labelL" color="brand">
                → {preview.formaNova.toFixed(1)}
              </Text>
            </Text>
          </View>
          <View style={styles.metricaLinha}>
            <Text variant="bodyM" color="textSecondary">
              Risco de lesão
            </Text>
            <Text variant="labelL" color={TOM_POR_NIVEL[risco.nivel]}>
              {risco.texto}
            </Text>
          </View>
        </Card>
      ) : null}

      {/* Moral do elenco */}
      <Card variante="outlined" style={styles.moralCard}>
        <View style={styles.rowBetween}>
          <View style={styles.moralLabelWrap}>
            <Icon nome="conversa" size={18} color="textSecondary" />
            <Text variant="titleM">Moral do elenco</Text>
          </View>
          <Text variant="titleL" color={corMoralTom(moralMedia)} tabular>
            {moralMedia.toFixed(0)}
          </Text>
        </View>
        <Button
          titulo={jaConversou ? 'Grupo já reunido' : 'Conversar com o grupo'}
          variante="secondary"
          disabled={jaConversou}
          onPress={aoConversar}
          fullWidth
        />
      </Card>

      <Button
        titulo="Confirmar treino"
        variante="primary"
        onPress={confirmar}
        fullWidth
      />

      {/* Seletor de TIPO de dia (agenda dia-a-dia, Camada 2) */}
      <Modal
        visible={diaEditando !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDiaEditando(null)}>
        <Pressable
          onPress={() => setDiaEditando(null)}
          accessibilityLabel="Fechar"
          style={[styles.modalBackdrop, {backgroundColor: cores.overlay}]}>
          <View
            style={[
              styles.modalSheet,
              {backgroundColor: cores.surface, borderColor: cores.border},
            ]}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              {diaEditando !== null
                ? `Treino de ${DIAS_CICLO[diaEditando]}`
                : ''}
            </Text>
            {TIPOS_DIA.map(tipo => (
              <Pressable
                key={tipo.id}
                onPress={() => aoDefinirDia(tipo.sessao)}
                accessibilityLabel={tipo.nome}
                style={styles.tipoDiaLinha}>
                <Icon nome={tipo.icone} size={20} color="brand" />
                <View style={styles.flex}>
                  <Text variant="labelL">{tipo.nome}</Text>
                  <Text variant="caption" color="textSecondary">
                    {tipo.descricao}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/** Célula da prontidão do elenco (número colorido + rótulo). */
function ProntidaoStat({
  valor,
  rotulo,
  tom,
}: {
  valor: number;
  rotulo: string;
  tom: CorTexto;
}): React.JSX.Element {
  return (
    <View style={styles.prontidaoStat}>
      <Text variant="titleL" color={tom} tabular>
        {valor}
      </Text>
      <Text variant="caption" color="textSecondary">
        {rotulo}
      </Text>
    </View>
  );
}

/** Célula do "Resumo da semana": rótulo em cima, valor colorido embaixo. */
function ResumoStat({
  rotulo,
  texto,
  tom,
}: {
  rotulo: string;
  texto: string;
  tom: CorTexto;
}): React.JSX.Element {
  return (
    <View style={styles.resumoStat}>
      <Text variant="caption" color="textSecondary" align="center">
        {rotulo}
      </Text>
      <Text variant="titleM" color={tom} align="center">
        {texto}
      </Text>
    </View>
  );
}

export default Semana;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end'},
  modalSheet: {
    borderTopLeftRadius: raios.xl,
    borderTopRightRadius: raios.xl,
    borderWidth: 1,
    gap: espacamento[1],
    paddingBottom: espacamento[6],
    paddingHorizontal: espacamento[4],
    paddingTop: espacamento[3],
  },
  tipoDiaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[3],
    minHeight: 52,
  },
  cronoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    paddingHorizontal: espacamento[3],
    paddingVertical: espacamento[2],
  },
  cronoDia: {width: 40},
  resumoSemanaCard: {gap: espacamento[3]},
  resumoGrid: {flexDirection: 'row', alignItems: 'center'},
  resumoStat: {flex: 1, alignItems: 'center', gap: 2},
  planoCard: {gap: espacamento[3]},
  planoTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  planoAcoes: {flexDirection: 'row', gap: espacamento[2]},
  recomCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  presetLinha: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  prontidaoCard: {flexDirection: 'row', alignItems: 'center'},
  prontidaoStat: {flex: 1, alignItems: 'center', gap: 2},
  cargaCard: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  moralCard: {gap: espacamento[2]},
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moralLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[1],
  },
  section: {gap: espacamento[2]},
  focoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  focoCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    padding: espacamento[3],
    borderWidth: 1,
    borderRadius: raios.md,
  },
  flex: {flex: 1},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  resumoCard: {gap: espacamento[2]},
  metricaLinha: {flexDirection: 'row', justifyContent: 'space-between'},
});
