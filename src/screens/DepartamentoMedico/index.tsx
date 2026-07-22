/**
 * Departamento Médico (aba Elenco) — central única do físico do elenco (a
 * antiga tela Performance foi fundida aqui). Lê o estado FÍSICO real da engine
 * pura (`fisicoEngine`): prontidão, fadiga e risco de lesão são DERIVAÇÕES,
 * nunca campos persistidos. Mostra a prontidão média dos aptos, lesionados
 * (previsão + gravidade), jogadores em recuperação/desgaste com medidores
 * compactos (FAD/RIT) e a recomendação do staff → Semana. Nada é inventado.
 * DS v2, cor por token.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  PositionBadge,
  ProgressBar,
  Screen,
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

type Aba = 'todos' | 'lesionados' | 'recuperacao';
type Estado = 'lesionado' | 'recuperacao' | 'disponivel';

// Limiares da classificação (herdados da antiga Performance).
const CONDICAO_RECUPERACAO = 65; // abaixo disso, recuperando frescor
const PRONTIDAO_MINIMA = 70; // abaixo disso, desgastado (fadiga/ritmo)
const RITMO_PADRAO = 50; // default quando o físico ainda não foi calculado

/** Bucket físico único — lesão primeiro; "recuperação" cobre tanto frescor
 * baixo quanto desgaste (prontidão da engine abaixo do mínimo). */
function estadoDoJogador(j: Player): Estado {
  if (j.lesionado) {
    return 'lesionado';
  }
  if (
    j.condicaoFisica < CONDICAO_RECUPERACAO ||
    prontidao(j) < PRONTIDAO_MINIMA
  ) {
    return 'recuperacao';
  }
  return 'disponivel';
}

// ─── Gravidade da lesão (pelos dias de retorno) ──────────────────────────────
type Gravidade = 'Leve' | 'Moderada' | 'Grave';

function gravidadeLesao(diasLesao: number): {rotulo: Gravidade; tom: CorTexto} {
  if (diasLesao <= 6) {
    return {rotulo: 'Leve', tom: 'accent'};
  }
  if (diasLesao <= 20) {
    return {rotulo: 'Moderada', tom: 'warning'};
  }
  return {rotulo: 'Grave', tom: 'danger'};
}

// ─── Risco de lesão (faixa REAL da engine física) ────────────────────────────
// Rótulo pt + tom. Badge não tem 'warning', então 'moderado' usa 'accent'
// (âmbar de atenção).
const RISCO_INFO: Record<
  NivelRisco,
  {rotulo: string; tom: 'success' | 'accent' | 'danger'}
> = {
  baixo: {rotulo: 'Baixo', tom: 'success'},
  moderado: {rotulo: 'Moderado', tom: 'accent'},
  elevado: {rotulo: 'Elevado', tom: 'danger'},
  muito_elevado: {rotulo: 'Muito elevado', tom: 'danger'},
};

function riscoElevado(j: Player): boolean {
  const risco = nivelRisco(j);
  return risco === 'elevado' || risco === 'muito_elevado';
}

function recomendacao(j: Player, estado: Estado): string {
  if (estado === 'lesionado') {
    return j.diasLesao > 20
      ? 'Tratamento intensivo'
      : j.diasLesao > 6
      ? 'Tratamento em curso'
      : 'Fisioterapia leve';
  }
  if (estado === 'recuperacao') {
    if (j.condicaoFisica < 55) {
      return 'Poupar — carga reduzida';
    }
    if (j.condicaoFisica < CONDICAO_RECUPERACAO) {
      return 'Retorno gradual';
    }
    return 'Gerir minutos — recuperar ritmo';
  }
  return 'Apto para jogar';
}

// Qualidade da prontidão média do elenco. tom (success/warning/danger) tem os
// mesmos hex de fitness.high/medium/low → barra e rótulo na mesma cor.
function faixaProntidao(pct: number): {rotulo: string; tom: CorTexto} {
  if (pct >= 80) {
    return {rotulo: 'Ótima', tom: 'success'};
  }
  if (pct >= 70) {
    return {rotulo: 'Boa', tom: 'success'};
  }
  if (pct >= 55) {
    return {rotulo: 'Atenção', tom: 'warning'};
  }
  return {rotulo: 'Crítica', tom: 'danger'};
}

/** Recomendação curta do staff (herdada da Performance) a partir do agregado —
 * alimenta o CTA único da tela (→ Semana). */
function recomendacaoStaff(agregado: {
  total: number;
  lesionados: number;
  emRecuperacao: number;
  riscoAlto: number;
}): {tom: CorTexto; texto: string} {
  const {total, lesionados, emRecuperacao, riscoAlto} = agregado;
  if (total === 0) {
    return {tom: 'info', texto: 'Sem jogadores no elenco.'};
  }
  if (riscoAlto > 0) {
    return {
      tom: 'warning',
      texto: `${riscoAlto} atleta${
        riscoAlto > 1 ? 's' : ''
      } com risco elevado de lesão. Reduza a carga e priorize recuperação nesta semana.`,
    };
  }
  if (lesionados > 0 || emRecuperacao >= 3) {
    return {
      tom: 'warning',
      texto:
        'Vários atletas pedindo cuidado. Reduza a carga e priorize recuperação nesta semana.',
    };
  }
  if (emRecuperacao > 0) {
    return {
      tom: 'accent',
      texto:
        'Alguns atletas precisam recuperar ritmo. Ajuste a carga de treino na semana.',
    };
  }
  return {
    tom: 'success',
    texto:
      'Elenco pronto para a rodada. Mantenha a carga e o descanso equilibrados.',
  };
}

function DepartamentoMedico(): React.JSX.Element {
  const nav = useElencoNavigation();
  const {esporte} = useTheme();
  const [aba, setAba] = useState<Aba>('todos');
  const elenco = useJogadoresUsuario();

  // Fadiga é ruim quando alta → inverte a leitura de cor do fitness.
  const corFadiga = (v: number): string =>
    v <= 40
      ? esporte.fitness.high
      : v <= 65
      ? esporte.fitness.medium
      : esporte.fitness.low;

  const {disponiveis, recuperacao, lesionados, riscoAlto, prontidaoElenco} =
    useMemo(() => {
      let d = 0;
      let r = 0;
      let l = 0;
      let risc = 0;
      let somaProntidao = 0;
      let aptos = 0;
      for (const j of elenco) {
        const e = estadoDoJogador(j);
        if (e === 'lesionado') {
          l += 1;
        } else if (e === 'recuperacao') {
          r += 1;
        } else {
          d += 1;
        }
        if (!j.lesionado) {
          somaProntidao += prontidao(j);
          aptos += 1;
          if (riscoElevado(j)) {
            risc += 1;
          }
        }
      }
      return {
        disponiveis: d,
        recuperacao: r,
        lesionados: l,
        riscoAlto: risc,
        prontidaoElenco: aptos > 0 ? Math.round(somaProntidao / aptos) : 0,
      };
    }, [elenco]);

  const lista = useMemo(() => {
    const comEstado = elenco
      .map(j => ({j, estado: estadoDoJogador(j)}))
      .filter(x => x.estado !== 'disponivel');
    const filtrada =
      aba === 'lesionados'
        ? comEstado.filter(x => x.estado === 'lesionado')
        : aba === 'recuperacao'
        ? comEstado.filter(x => x.estado === 'recuperacao')
        : comEstado;
    // Lesionados primeiro; depois os de pior prontidão (piores primeiro).
    return filtrada.sort(
      (a, b) =>
        Number(b.estado === 'lesionado') - Number(a.estado === 'lesionado') ||
        prontidao(a.j) - prontidao(b.j),
    );
  }, [elenco, aba]);

  const staff = useMemo(
    () =>
      recomendacaoStaff({
        total: elenco.length,
        lesionados,
        emRecuperacao: recuperacao,
        riscoAlto,
      }),
    [elenco.length, lesionados, recuperacao, riscoAlto],
  );

  const faixa = faixaProntidao(prontidaoElenco);
  const corProntidao =
    faixa.tom === 'success'
      ? esporte.fitness.high
      : faixa.tom === 'warning'
      ? esporte.fitness.medium
      : esporte.fitness.low;

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Departamento Médico"
          onBack={() => (nav.canGoBack() ? nav.goBack() : undefined)}
        />
      }>
      {/* Prontidão média do elenco (derivação real da engine física) */}
      <Card variante="outlined" style={styles.prontidaoCard}>
        <View style={styles.prontidaoTopo}>
          <View style={styles.flex}>
            <Text variant="labelM" color="textSecondary">
              Prontidão do elenco
            </Text>
            <View style={styles.prontidaoValor}>
              <Text variant="titleXL" color={faixa.tom} tabular>
                {prontidaoElenco}%
              </Text>
              <Text variant="labelM" color={faixa.tom}>
                {faixa.rotulo}
              </Text>
            </View>
            <Text variant="caption" color="textMuted">
              Média dos aptos — condição, ritmo e fadiga
            </Text>
          </View>
          <Icon nome="lesao" size={22} color={faixa.tom} />
        </View>
        <ProgressBar valor={prontidaoElenco} cor={corProntidao} altura={8} />
      </Card>

      {/* Contagem por estado */}
      <Card variante="outlined" style={styles.statsRow}>
        <CelulaStat valor={disponiveis} rotulo="Disponíveis" tom="success" />
        <Divider vertical />
        <CelulaStat valor={recuperacao} rotulo="Em recuperação" tom="warning" />
        <Divider vertical />
        <CelulaStat valor={lesionados} rotulo="Lesionados" tom="danger" />
      </Card>

      {/* Recomendação do staff — CTA único da tela (plano da semana) */}
      <Card variante="status" status={staff.tom} style={styles.staffCard}>
        <View style={styles.staffTopo}>
          <Icon nome="ficha" size={18} color={staff.tom} />
          <Text variant="labelL" style={styles.flex}>
            Recomendação do staff
          </Text>
        </View>
        <Text variant="bodyM" color="textSecondary">
          {staff.texto}
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
        abas={[
          {chave: 'todos', rotulo: 'Todos'},
          {chave: 'lesionados', rotulo: 'Lesionados'},
          {chave: 'recuperacao', rotulo: 'Recuperação'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as Aba)}
      />

      {lista.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="check"
            title="Elenco 100% saudável"
            description="Nenhum jogador lesionado, cansado ou em recuperação."
          />
        </View>
      ) : (
        <View style={styles.lista}>
          {lista.map(({j, estado}) => {
            const lesionado = estado === 'lesionado';
            const corCond = corCondicao(j.condicaoFisica, esporte);
            const progresso = lesionado
              ? Math.max(5, 100 - j.diasLesao * 6)
              : j.condicaoFisica;
            const grav = lesionado ? gravidadeLesao(j.diasLesao) : null;
            const risco = !lesionado ? RISCO_INFO[nivelRisco(j)] : null;
            const fad = fadiga(j);
            const ritmo = j.fisico?.ritmo ?? RITMO_PADRAO;
            return (
              <Card key={j.id} variante="outlined" style={styles.card}>
                <View style={styles.cardTopo}>
                  <PlayerAvatar id={j.id} tamanho={40} />
                  <View style={styles.flex}>
                    <View style={styles.nomeLinha}>
                      <PositionBadge posicao={j.posicaoPrincipal} tamanho="sm" />
                      <Text variant="labelL" numberOfLines={1} style={styles.flex}>
                        {j.apelido ?? j.nome}
                      </Text>
                      <Text variant="caption" color="textMuted" tabular>
                        {j.idade} anos
                      </Text>
                    </View>
                    <View style={styles.nomeLinha}>
                      <Text
                        variant="caption"
                        color={lesionado ? 'danger' : 'warning'}
                        style={styles.flex}>
                        {lesionado
                          ? `Lesionado · retorno em ${j.diasLesao} dia${j.diasLesao > 1 ? 's' : ''}`
                          : j.condicaoFisica < CONDICAO_RECUPERACAO
                          ? `Condição física ${j.condicaoFisica}%`
                          : `Prontidão ${prontidao(j)}%`}
                      </Text>
                      {grav ? (
                        <Text variant="caption" weight="800" color={grav.tom}>
                          {grav.rotulo}
                        </Text>
                      ) : risco ? (
                        <Badge
                          label={`Risco ${risco.rotulo.toLowerCase()}`}
                          tom={risco.tom}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
                <ProgressBar valor={progresso} cor={corCond} />
                {/* Medidores compactos da engine física (fadiga e ritmo) */}
                <View style={styles.medidores}>
                  <Medidor rotulo="FAD" valor={fad} cor={corFadiga(fad)} />
                  <Medidor
                    rotulo="RIT"
                    valor={ritmo}
                    cor={corCondicao(ritmo, esporte)}
                  />
                </View>
                <Text variant="caption" color="textSecondary">
                  {lesionado ? 'Recuperação' : 'Condição'} ·{' '}
                  {recomendacao(j, estado)}
                </Text>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

function CelulaStat({
  valor,
  rotulo,
  tom,
}: {
  valor: number;
  rotulo: string;
  tom: CorTexto;
}): React.JSX.Element {
  return (
    <View style={styles.celula}>
      <Text variant="titleL" color={tom} tabular>
        {valor}
      </Text>
      <Text variant="caption" color="textSecondary" align="center">
        {rotulo}
      </Text>
    </View>
  );
}

// ─── Medidor compacto (rótulo + valor + barra fina) ──────────────────────────
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

export default DepartamentoMedico;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[6]},
  prontidaoCard: {gap: espacamento[3]},
  prontidaoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  prontidaoValor: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espacamento[2],
  },
  statsRow: {flexDirection: 'row', alignItems: 'center'},
  celula: {flex: 1, alignItems: 'center', gap: 2},
  staffCard: {gap: espacamento[2]},
  staffTopo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  lista: {gap: espacamento[2]},
  card: {gap: espacamento[2]},
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
