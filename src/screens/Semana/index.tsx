/**
 * Treino da Semana. O técnico escolhe O QUE treinar (por posição ou habilidade)
 * e COM QUE intensidade, vê o impacto e confirma. Migrado ao Design System v2.
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
  Screen,
  Text,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {calcularEfeitoTreino} from '../../engine/progression/treinoAtributos';
import {
  CATALOGO_TREINOS,
  INTENSIDADES,
  INTENSIDADES_ORDEM,
  TREINO_PADRAO_ID,
  buscarTreino,
  type CategoriaTreino,
  type IntensidadeTreino,
  type SecaoPosicao,
} from '../../engine/progression/treinoTipos';
import {grupoDaPosicao} from '../../engine/tactics/posicoes';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';

const SECOES_POSICAO: SecaoPosicao[] = [
  'Goleiros',
  'Zagueiros',
  'Laterais',
  'Meio-campistas',
  'Atacantes',
];

const SECAO_CURTA: Record<SecaoPosicao, string> = {
  Goleiros: 'GOL',
  Zagueiros: 'ZAG',
  Laterais: 'LAT',
  'Meio-campistas': 'MEI',
  Atacantes: 'ATA',
};

/** Tom (token) de risco de lesão a partir do risco-base da intensidade. */
function rotuloRisco(risco: number): {texto: string; tom: CorTexto} {
  if (risco <= 0.005) {
    return {texto: 'Muito baixo', tom: 'success'};
  }
  if (risco <= 0.015) {
    return {texto: 'Baixo', tom: 'success'};
  }
  if (risco <= 0.035) {
    return {texto: 'Médio', tom: 'accent'};
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
  return moral >= 75 ? 'success' : moral >= 50 ? 'accent' : 'danger';
}
function corCondicaoTom(valor: number): CorTexto {
  return valor >= 75 ? 'success' : valor >= 45 ? 'accent' : 'danger';
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

  const [categoria, setCategoria] = useState<CategoriaTreino>('posicao');
  const [secao, setSecao] = useState<SecaoPosicao>('Zagueiros');
  const [treinoId, setTreinoId] = useState<string>('zag_marcacao');
  const [intensidade, setIntensidade] = useState<IntensidadeTreino>('normal');

  const treino = buscarTreino(treinoId);
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

  const porPosicao = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'posicao'),
    [],
  );
  const porHabilidade = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'habilidade'),
    [],
  );

  const treinosVisiveis = useMemo(
    () =>
      categoria === 'posicao'
        ? porPosicao.filter(t => t.secao === secao)
        : porHabilidade,
    [categoria, secao, porPosicao, porHabilidade],
  );

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

  const trocarCategoria = (cat: CategoriaTreino) => {
    setCategoria(cat);
    if (cat === 'habilidade') {
      setTreinoId(porHabilidade[0]?.id ?? TREINO_PADRAO_ID);
    } else {
      setTreinoId(porPosicao.find(t => t.secao === secao)?.id ?? treinoId);
    }
  };

  const selecionarSecao = (nova: SecaoPosicao) => {
    setSecao(nova);
    const primeiro = porPosicao.find(t => t.secao === nova);
    if (primeiro) {
      setTreinoId(primeiro.id);
    }
  };

  const confirmar = () => {
    if (!treino) {
      return;
    }
    aplicarTreino(treino.id, intensidade);
    toast('Treino realizado.', 'sucesso');
    nav.goBack();
  };

  return (
    <Screen
      scroll
      header={<AppHeader title="Treino" onBack={() => nav.goBack()} />}>
      {/* Prontidão do elenco */}
      <Card variante="outlined" style={styles.prontidaoCard}>
        <ProntidaoStat
          valor={prontidao.disponiveis}
          rotulo="Disponíveis"
          tom="success"
        />
        <ProntidaoStat valor={prontidao.cansados} rotulo="Cansados" tom="accent" />
        <ProntidaoStat
          valor={prontidao.lesionados}
          rotulo="Lesionado"
          tom="danger"
        />
      </Card>
      {prontidao.cansados > 0 ? (
        <Card variante="status" status="warning" padding={3} style={styles.cargaCard}>
          <Icon nome="lesao" size={18} color="warning" />
          <Text variant="labelL">
            Carga alta para {prontidao.cansados} jogador
            {prontidao.cansados > 1 ? 'es' : ''}
          </Text>
        </Card>
      ) : null}

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

      <View style={styles.section}>
        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          O que treinar
        </Text>
        <View style={styles.segment}>
          {(['posicao', 'habilidade'] as CategoriaTreino[]).map(cat => (
            <Chip
              key={cat}
              label={cat === 'posicao' ? 'Por posição' : 'Por habilidade'}
              selected={categoria === cat}
              onPress={() => trocarCategoria(cat)}
              style={styles.flex}
            />
          ))}
        </View>
        {categoria === 'posicao' ? (
          <View style={styles.segment}>
            {SECOES_POSICAO.map(s => (
              <Chip
                key={s}
                label={SECAO_CURTA[s]}
                selected={s === secao}
                onPress={() => selecionarSecao(s)}
                style={styles.flex}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.chipRow}>
          {treinosVisiveis.map(t => (
            <Chip
              key={t.id}
              label={t.nome}
              selected={t.id === treinoId}
              onPress={() => setTreinoId(t.id)}
            />
          ))}
        </View>
      </View>

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

      {treino && preview ? (
        <Card variante="outlined" style={styles.resumoCard}>
          <View style={styles.rowBetween}>
            <Text variant="titleM" style={styles.flex}>
              Treino de {treino.nome}
            </Text>
            <Badge
              label={`${preview.comAfinidade}/${elenco.length} ideais`}
              tom="accent"
            />
          </View>

          <View style={styles.efeitos}>
            {treino.efeitos.map(efeito => (
              <View key={efeito} style={styles.efeitoLinha}>
                <Icon nome="seta-cima" size={14} color="brand" />
                <Text variant="bodyM">{efeito}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.divisor, {backgroundColor: cores.border}]} />

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

      <Button
        titulo="Confirmar semana"
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
  segment: {flexDirection: 'row', gap: espacamento[1]},
  flex: {flex: 1},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  resumoCard: {gap: espacamento[2]},
  efeitos: {gap: espacamento[1]},
  efeitoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
  },
  divisor: {height: StyleSheet.hairlineWidth},
  metricaLinha: {flexDirection: 'row', justifyContent: 'space-between'},
});
