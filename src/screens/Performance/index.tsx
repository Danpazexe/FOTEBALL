/**
 * Departamento de Performance (aba Elenco). Lê o estado FÍSICO real da engine
 * pura (`fisicoEngine`): prontidão, fadiga e risco de lesão são derivações, não
 * campos persistidos. Resume o elenco em Disponíveis / Cansados / Em transição,
 * traz a recomendação do staff (→ Semana) e lista a condição jogador a jogador
 * com medidores compactos (CON/FAD/RIT) e o risco de lesão. DS v2, cor por token.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  PositionBadge,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedTabs,
  Text,
  corCondicao,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {
  fadiga,
  nivelRisco,
  prontidao,
  type NivelRisco,
} from '../../engine/physical/fisicoEngine';
import {useElencoNavigation} from '../../navigation/types';
import {useJogadoresUsuario} from '../../store/useGameStore';
import type {Player} from '../../types';

type Aba = 'geral' | 'recuperacao' | 'lesoes';
type Estado = 'disponivel' | 'cansado' | 'voltando' | 'lesionado';

// Limiares da classificação (simples e coerente entre topo e listas).
const CONDICAO_TRANSICAO = 65; // abaixo disso o jogador está "voltando"
const PRONTIDAO_MINIMA = 70; // abaixo disso, "cansado"
const RITMO_PADRAO = 50; // default quando o físico ainda não foi calculado

/** Bucket físico único por jogador — mutuamente exclusivo, injuria primeiro. */
function estadoDoJogador(j: Player): Estado {
  if (j.lesionado) {
    return 'lesionado';
  }
  if (j.condicaoFisica < CONDICAO_TRANSICAO) {
    return 'voltando';
  }
  if (prontidao(j) < PRONTIDAO_MINIMA) {
    return 'cansado';
  }
  return 'disponivel';
}

// Risco → rótulo pt + tom. Badge não tem 'warning', então 'moderado' usa
// 'accent' (âmbar de atenção); Text/Icon poderiam usar 'warning' direto.
const RISCO_INFO: Record<
  NivelRisco,
  {rotulo: string; tom: 'success' | 'accent' | 'danger'}
> = {
  baixo: {rotulo: 'Baixo', tom: 'success'},
  moderado: {rotulo: 'Moderado', tom: 'accent'},
  elevado: {rotulo: 'Elevado', tom: 'danger'},
  muito_elevado: {rotulo: 'Muito elevado', tom: 'danger'},
};

const ABAS = [
  {chave: 'geral', rotulo: 'Visão geral'},
  {chave: 'recuperacao', rotulo: 'Recuperação'},
  {chave: 'lesoes', rotulo: 'Lesões'},
];

function Performance(): React.JSX.Element {
  const nav = useElencoNavigation();
  const {esporte} = useTheme();
  const [aba, setAba] = useState<Aba>('geral');
  const elenco = useJogadoresUsuario();

  // Cor do medidor pela FAIXA (verde/âmbar/vermelho de fitness do tema).
  const corFaixa = (v: number): string => corCondicao(v, esporte);
  // Fadiga é ruim quando alta → inverte a leitura de cor.
  const corFadiga = (v: number): string =>
    v <= 40
      ? esporte.fitness.high
      : v <= 65
      ? esporte.fitness.medium
      : esporte.fitness.low;

  const {disponiveis, cansados, transicao} = useMemo(() => {
    let d = 0;
    let c = 0;
    let t = 0;
    for (const j of elenco) {
      const e = estadoDoJogador(j);
      if (e === 'disponivel') {
        d += 1;
      } else if (e === 'cansado') {
        c += 1;
      } else {
        // 'voltando' e 'lesionado' compõem "Em transição".
        t += 1;
      }
    }
    return {disponiveis: d, cansados: c, transicao: t};
  }, [elenco]);

  const lista = useMemo(() => {
    const comEstado = elenco.map(j => ({j, estado: estadoDoJogador(j)}));
    if (aba === 'recuperacao') {
      return comEstado
        .filter(x => x.estado === 'cansado' || x.estado === 'voltando')
        .sort((a, b) => prontidao(a.j) - prontidao(b.j)); // piores primeiro
    }
    if (aba === 'lesoes') {
      return comEstado
        .filter(x => x.estado === 'lesionado')
        .sort((a, b) => b.j.diasLesao - a.j.diasLesao); // mais graves primeiro
    }
    return comEstado; // Visão geral: elenco inteiro (já ordenado por overall)
  }, [elenco, aba]);

  // Recomendação curta do staff a partir do estado agregado.
  const {staffTom, staffTexto} = useMemo((): {
    staffTom: CorTexto;
    staffTexto: string;
  } => {
    const lesionados = elenco.filter(j => j.lesionado).length;
    if (elenco.length === 0) {
      return {staffTom: 'info', staffTexto: 'Sem jogadores no elenco.'};
    }
    if (lesionados > 0 || cansados >= 3) {
      return {
        staffTom: 'warning',
        staffTexto:
          'Vários atletas pedindo cuidado. Reduza a carga e priorize recuperação nesta semana.',
      };
    }
    if (cansados + transicao > 0) {
      return {
        staffTom: 'accent',
        staffTexto:
          'Alguns atletas precisam recuperar ritmo. Ajuste a carga de treino na semana.',
      };
    }
    return {
      staffTom: 'success',
      staffTexto:
        'Elenco pronto para a rodada. Mantenha a carga e o descanso equilibrados.',
    };
  }, [elenco, cansados, transicao]);

  const tituloSecao =
    aba === 'recuperacao'
      ? 'Em recuperação'
      : aba === 'lesoes'
      ? 'Lesionados'
      : 'Condição do elenco';

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Performance"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      {/* Resumo do elenco por estado físico */}
      <View style={styles.resumoRow}>
        <ResumoCard
          icone="check"
          valor={disponiveis}
          rotulo="Disponíveis"
          tom="success"
        />
        <ResumoCard
          icone="humor-cansado"
          valor={cansados}
          rotulo="Cansados"
          tom="warning"
        />
        <ResumoCard
          icone="lesao"
          valor={transicao}
          rotulo="Em transição"
          tom="info"
        />
      </View>

      {/* Recomendação do staff */}
      <Card variante="status" status={staffTom} style={styles.staffCard}>
        <View style={styles.staffTopo}>
          <Icon nome="ficha" size={18} color={staffTom} />
          <Text variant="labelL" style={styles.flex}>
            Recomendação do staff
          </Text>
        </View>
        <Text variant="bodyM" color="textSecondary">
          {staffTexto}
        </Text>
        <Button
          variante="secondary"
          titulo="Ver plano sugerido"
          icone="calendario"
          onPress={() => nav.navigate('Semana')}
          fullWidth
        />
      </Card>

      <SegmentedTabs
        abas={ABAS}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      <SectionHeader titulo={tituloSecao} />

      {lista.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="check"
            title={
              aba === 'lesoes' ? 'Sem lesões' : 'Elenco recuperado'
            }
            description={
              aba === 'lesoes'
                ? 'Nenhum jogador no departamento médico.'
                : 'Ninguém cansado ou em transição no momento.'
            }
          />
        </View>
      ) : (
        <View style={styles.lista}>
          {lista.map(({j}) => (
            <LinhaJogador
              key={j.id}
              j={j}
              corFaixa={corFaixa}
              corFadiga={corFadiga}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

// ─── Card de resumo (contagem por estado) ────────────────────────────────────
function ResumoCard({
  icone,
  valor,
  rotulo,
  tom,
}: {
  icone: React.ComponentProps<typeof Icon>['nome'];
  valor: number;
  rotulo: string;
  tom: CorTexto;
}): React.JSX.Element {
  return (
    <Card variante="outlined" padding={3} style={styles.resumoCard}>
      <View style={styles.resumoTopo}>
        <Icon nome={icone} size={16} color={tom} />
        <Text variant="titleL" color={tom} tabular>
          {valor}
        </Text>
      </View>
      <Text variant="caption" color="textSecondary" numberOfLines={1}>
        {rotulo}
      </Text>
    </Card>
  );
}

// ─── Linha de condição de um jogador ─────────────────────────────────────────
function LinhaJogador({
  j,
  corFaixa,
  corFadiga,
}: {
  j: Player;
  corFaixa: (v: number) => string;
  corFadiga: (v: number) => string;
}): React.JSX.Element {
  const condicao = j.condicaoFisica;
  const fad = fadiga(j);
  const ritmo = j.fisico?.ritmo ?? RITMO_PADRAO;
  const risco = RISCO_INFO[nivelRisco(j)];

  return (
    <Card variante="outlined" style={styles.card}>
      <View style={styles.cardTopo}>
        <PlayerAvatar id={j.id} tamanho={40} />
        <View style={styles.flex}>
          <View style={styles.nomeLinha}>
            <PositionBadge posicao={j.posicaoPrincipal} tamanho="sm" />
            <Text variant="labelL" numberOfLines={1} style={styles.flex}>
              {j.apelido ?? j.nome}
            </Text>
            <Badge label={risco.rotulo} tom={risco.tom} />
          </View>
          {j.lesionado ? (
            <Text variant="caption" color="danger">
              Lesionado · retorno em {j.diasLesao} dia
              {j.diasLesao > 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Medidores compactos: condição, fadiga, ritmo */}
      <View style={styles.medidores}>
        <Medidor rotulo="CON" valor={condicao} cor={corFaixa(condicao)} />
        <Medidor rotulo="FAD" valor={fad} cor={corFadiga(fad)} />
        <Medidor rotulo="RIT" valor={ritmo} cor={corFaixa(ritmo)} />
      </View>
    </Card>
  );
}

function Medidor({
  rotulo,
  valor,
  cor,
}: {
  rotulo: string;
  valor: number;
  cor: string;
}): React.JSX.Element {
  return (
    <View style={styles.medidor}>
      <View style={styles.medidorTopo}>
        <Text variant="caption" color="textMuted">
          {rotulo}
        </Text>
        <Text variant="caption" color="textSecondary" tabular>
          {Math.round(valor)}
        </Text>
      </View>
      <ProgressBar valor={valor} cor={cor} altura={4} />
    </View>
  );
}

export default Performance;

const styles = StyleSheet.create({
  flex: {flex: 1},
  resumoRow: {flexDirection: 'row', gap: espacamento[2]},
  resumoCard: {flex: 1, gap: espacamento[1]},
  resumoTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  staffCard: {gap: espacamento[2]},
  staffTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[6]},
  lista: {gap: espacamento[2]},
  card: {gap: espacamento[3]},
  cardTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  nomeLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  medidores: {flexDirection: 'row', gap: espacamento[3]},
  medidor: {flex: 1, gap: espacamento[1]},
  medidorTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
