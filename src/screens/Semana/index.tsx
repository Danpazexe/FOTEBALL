/**
 * Treino da semana — SIMPLES e RÁPIDO (estilo Brasfoot). Uma decisão principal:
 * o FOCO da semana (4 opções claras) + a intensidade (carga). O impacto é
 * mostrado de forma enxuta (condição, forma, risco) e confirma. Sem drilldown
 * por posição nem foco individual por jogador. Migrado ao Design System v2.
 */

import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Chip,
  Icon,
  Pressable,
  Screen,
  Text,
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
  planoDePreset,
  type PresetTreinoId,
} from '../../engine/progression/planoTreinoEngine';
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

/** Tom (token) de risco de lesão a partir do risco-base da intensidade. */
function rotuloRisco(risco: number): {texto: string; tom: CorTexto} {
  if (risco <= 0.005) {
    return {texto: 'Muito baixo', tom: 'success'};
  }
  if (risco <= 0.015) {
    return {texto: 'Baixo', tom: 'success'};
  }
  if (risco <= 0.035) {
    return {texto: 'Médio', tom: 'warning'};
  }
  return {texto: 'Alto', tom: 'danger'};
}

function media(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

function corMoralTom(moral: number): CorTexto {
  return moral >= 75 ? 'success' : moral >= 50 ? 'warning' : 'danger';
}
function corCondicaoTom(valor: number): CorTexto {
  return valor >= 75 ? 'success' : valor >= 45 ? 'warning' : 'danger';
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
  // Plano de treino recorrente (Onda 4/7).
  const planoTreino = useGameStore(state => state.planoTreino);
  const planoStatus = useGameStore(state => state.planoTreinoStatus);
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

  const risco = rotuloRisco(INTENSIDADES[intensidade].riscoLesaoBase);

  const aoConversar = () => {
    const ok = conversarComGrupo();
    toast(
      ok
        ? 'Discurso motivacional feito. Moral em alta!'
        : 'Grupo já reunido esta semana.',
      ok ? 'sucesso' : 'erro',
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
            <Text variant="labelL" color={risco.tom}>
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

export default Semana;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
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
