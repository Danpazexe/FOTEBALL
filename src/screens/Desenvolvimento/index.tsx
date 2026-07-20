/**
 * Desenvolvimento (aba Elenco). Leitura da evolução do elenco: jovens com maior
 * margem de potencial, jogadores em regressão e os atributos que mais subiram no
 * ledger. Cards derivados do ELENCO (jovens/estagnados) aparecem mesmo sem
 * histórico; cards do LEDGER só quando há registros. Nada é inventado. DS v2.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Box,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  Screen,
  SectionHeader,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {nomeCurto} from '../../utils/formatters';
import GraficoEvolucao from '../../components/GraficoEvolucao';
import {useElencoNavigation} from '../../navigation/types';
import {useGameStore, useJogadoresUsuario} from '../../store/useGameStore';
import type {AtributoChave, Player, RegistroDesenvolvimento} from '../../types';

// ─── Traduções (a engine só emite códigos; a UI traduz) ──────────────────────
const MOTIVOS_PT: Record<string, string> = {
  AGE_CURVE_GROWTH: 'Evolução por idade',
  AGE_CURVE_DECLINE: 'Declínio por idade',
  GOOD_RECENT_FORM: 'Boa fase',
  LOW_MATCH_MINUTES: 'Poucos minutos',
  HIGH_TRAINING_PERFORMANCE: 'Ótimo treino',
  SERIOUS_INJURY_REGRESSION: 'Lesão grave',
  LOW_MORALE: 'Moral baixa',
  TRAINING_FOCUS: 'Foco de treino',
  LOAN_DEVELOPMENT: 'Desenvolvimento em empréstimo',
};

// Fallback: mostra o próprio código quando não houver tradução.
const traduzirMotivo = (codigo: string): string => MOTIVOS_PT[codigo] ?? codigo;

const ATRIBUTOS_PT: Record<AtributoChave, string> = {
  finalizacao: 'Finalização',
  passe: 'Passe',
  marcacao: 'Marcação',
  desarme: 'Desarme',
  velocidade: 'Velocidade',
  resistencia: 'Resistência',
  forca: 'Força',
  reflexos: 'Reflexos',
  posicionamento: 'Posicionamento',
  drible: 'Drible',
  cabeceio: 'Cabeceio',
  cruzamento: 'Cruzamento',
};

// ─── Linha de jogador (do elenco) ────────────────────────────────────────────
function LinhaJogador({
  jogador,
  trailing,
  onPress,
}: {
  jogador: Player;
  trailing: React.ReactNode;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Card variante="interactive" onPress={onPress} padding={3}>
      <Box direction="row" align="center" gap={3}>
        <PlayerAvatar id={jogador.id} tamanho={40} />
        <Box flex={1} gap={1}>
          <Text variant="bodyL" numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {jogador.posicaoPrincipal} · {jogador.idade} anos · GER {jogador.overall}
          </Text>
        </Box>
        {trailing}
      </Box>
    </Card>
  );
}

// ─── Linha de registro do ledger (delta de overall + motivos) ────────────────
function LinhaRegistro({
  registro,
  jogador,
  onPress,
}: {
  registro: RegistroDesenvolvimento;
  jogador?: Player;
  onPress: () => void;
}): React.JSX.Element {
  const delta = registro.overallDepois - registro.overallAntes;
  const positivo = delta >= 0;
  const cor = positivo ? 'success' : 'danger';
  const legenda =
    registro.motivos.length > 0
      ? registro.motivos.map(traduzirMotivo).join(' · ')
      : '—';

  return (
    <Card variante="interactive" onPress={onPress} padding={3}>
      <Box direction="row" align="center" gap={3}>
        <PlayerAvatar id={registro.playerId} tamanho={40} />
        <Box flex={1} gap={1}>
          <Text variant="bodyL" numberOfLines={1}>
            {jogador ? nomeCurto(jogador) : 'Jogador'}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {legenda}
          </Text>
        </Box>
        <View style={styles.trailing}>
          <Box direction="row" align="center" gap={1}>
            <Icon nome="tendencia" size="sm" color={cor} />
            <Text variant="numeric" color={cor} tabular>
              {positivo ? '+' : ''}
              {delta}
            </Text>
          </Box>
        </View>
      </Box>
    </Card>
  );
}

export default function Desenvolvimento(): React.JSX.Element {
  const {cores} = useTheme();
  const nav = useElencoNavigation();
  const elenco = useJogadoresUsuario();
  const ledger = useGameStore(s => s.ledgerDesenvolvimento);
  const historico = useGameStore(s => s.historicoDesenvolvimento);

  // Jovens (≤21) com maior margem de potencial ainda por explorar.
  const jovens = useMemo(
    () =>
      elenco
        .filter(j => j.idade <= 21)
        .map(j => ({jogador: j, margem: j.potencial - j.overall}))
        .filter(x => x.margem >= 1)
        .sort((a, b) => b.margem - a.margem)
        .slice(0, 5),
    [elenco],
  );

  // Estagnados (≤23) que já quase alcançaram o teto (margem ≤1).
  const estagnados = useMemo(
    () => elenco.filter(j => j.idade <= 23 && j.potencial - j.overall <= 1).slice(0, 6),
    [elenco],
  );

  // Registros de queda de overall (mais recentes primeiro).
  const regressoes = useMemo(
    () =>
      ledger
        .filter(r => r.overallDepois < r.overallAntes)
        .slice()
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 6),
    [ledger],
  );

  // Todos os registros recentes (subidas e quedas) para a lista opcional.
  const registrosRecentes = useMemo(
    () => ledger.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10),
    [ledger],
  );

  // Média de variação por atributo no ledger → atributos que mais subiram.
  const principaisMudancas = useMemo(() => {
    const soma: Partial<Record<AtributoChave, number>> = {};
    const cont: Partial<Record<AtributoChave, number>> = {};
    for (const r of ledger) {
      for (const chave of Object.keys(r.atributosDelta) as AtributoChave[]) {
        const delta = r.atributosDelta[chave];
        if (delta === undefined) {
          continue;
        }
        soma[chave] = (soma[chave] ?? 0) + delta;
        cont[chave] = (cont[chave] ?? 0) + 1;
      }
    }
    const medias = (Object.keys(soma) as AtributoChave[])
      .map(chave => ({chave, media: (soma[chave] ?? 0) / (cont[chave] ?? 1)}))
      .filter(x => x.media > 0)
      .sort((a, b) => b.media - a.media)
      .slice(0, 4);
    const max = medias.length > 0 ? medias[0].media : 1;
    return {medias, max};
  }, [ledger]);

  const temLedger = ledger.length > 0;
  const acharJogador = (id: string): Player | undefined =>
    elenco.find(j => j.id === id);
  const abrirJogador = (id: string): void =>
    nav.navigate('PlayerDetail', {jogadorId: id});

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Desenvolvimento"
          showBackButton
          onBack={() => nav.goBack()}
        />
      }>
      {/* Carreira nova: ledger vazio. Explica, mas mantém os cards do elenco. */}
      {!temLedger ? (
        <EmptyState
          icone="tendencia"
          title="Sem histórico de evolução"
          description="A evolução aparece ao virar a temporada. Por enquanto, veja o potencial do elenco atual."
        />
      ) : null}

      {/* Evolução média dos atributos — gráfico com dado real (≥2 viradas) */}
      {historico.length >= 2 ? (
        <View style={styles.secao}>
          <SectionHeader titulo="Evolução média dos atributos" />
          <Card variante="outlined">
            <GraficoEvolucao dados={historico} />
          </Card>
        </View>
      ) : null}

      {/* Em regressão (depende do ledger) */}
      {temLedger && regressoes.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeader titulo="Em regressão" />
          <Box gap={2}>
            {regressoes.map(r => (
              <LinhaRegistro
                key={r.id}
                registro={r}
                jogador={acharJogador(r.playerId)}
                onPress={() => abrirJogador(r.playerId)}
              />
            ))}
          </Box>
        </View>
      ) : null}

      {/* Principais mudanças — média (depende do ledger) */}
      {temLedger && principaisMudancas.medias.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeader titulo="Principais mudanças (média)" />
          <Card variante="outlined">
            <Box gap={3}>
              {principaisMudancas.medias.map(m => (
                <Box key={m.chave} gap={1}>
                  <Box direction="row" align="center" justify="space-between">
                    <Text variant="bodyM">{ATRIBUTOS_PT[m.chave]}</Text>
                    <Text variant="numeric" color="success" tabular>
                      +{m.media.toFixed(1)}
                    </Text>
                  </Box>
                  <ProgressBar
                    valor={(m.media / principaisMudancas.max) * 100}
                    cor={cores.success}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        </View>
      ) : null}

      {/* Jovens em destaque (derivado do elenco) */}
      <View style={styles.secao}>
        <SectionHeader titulo="Jovens em destaque" />
        {jovens.length > 0 ? (
          <Box gap={2}>
            {jovens.map(({jogador, margem}) => (
              <LinhaJogador
                key={jogador.id}
                jogador={jogador}
                onPress={() => abrirJogador(jogador.id)}
                trailing={
                  <View style={styles.trailing}>
                    <Text variant="numeric" color="success" tabular>
                      +{margem}
                    </Text>
                    <Text variant="caption" color="textMuted">
                      POT {jogador.potencial}
                    </Text>
                  </View>
                }
              />
            ))}
          </Box>
        ) : (
          <Card variante="outlined">
            <Text variant="bodyM" color="textSecondary">
              Nenhum jovem com margem de evolução no elenco.
            </Text>
          </Card>
        )}
      </View>

      {/* Estagnados (derivado do elenco) */}
      <View style={styles.secao}>
        <SectionHeader titulo="Estagnados" />
        {estagnados.length > 0 ? (
          <Box gap={2}>
            {estagnados.map(j => (
              <LinhaJogador
                key={j.id}
                jogador={j}
                onPress={() => abrirJogador(j.id)}
                trailing={<Badge tom="neutral" label="No teto" />}
              />
            ))}
          </Box>
        ) : (
          <Card variante="outlined">
            <Text variant="bodyM" color="textSecondary">
              Sem jogadores estagnados. Elenco jovem com margem de crescer.
            </Text>
          </Card>
        )}
      </View>

      {/* Lista opcional: registros recentes do ledger */}
      {temLedger && registrosRecentes.length > 0 ? (
        <View style={styles.secao}>
          <SectionHeader titulo="Registros recentes" />
          <Box gap={2}>
            {registrosRecentes.map(r => (
              <LinhaRegistro
                key={r.id}
                registro={r}
                jogador={acharJogador(r.playerId)}
                onPress={() => abrirJogador(r.playerId)}
              />
            ))}
          </Box>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  secao: {gap: espacamento[2]},
  trailing: {alignItems: 'flex-end', gap: espacamento[1], minWidth: 64},
});
