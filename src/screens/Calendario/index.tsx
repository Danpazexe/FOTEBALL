/**
 * Calendário da temporada — grade mensal com os jogos do clube (Liga + Copa)
 * coloridos por resultado. Tocar abre súmula/pré-jogo/chave. Migrado ao DS v2.
 */

import React, {useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {
  AppBar,
  Icon,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
  type CoresSemanticas,
} from '../../design-system';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {siglaClube} from '../../utils/formatters';
import {diasNoMes, indiceDiaSemana, nomeMes} from '../../utils/datas';
import type {Partida} from '../../types';

type EstadoJogo = 'vitoria' | 'empate' | 'derrota' | 'proxima' | 'futura';

interface JogoCalendario {
  data: string;
  sigla: string;
  tipo: 'liga' | 'copa';
  estado: EstadoJogo;
  partidaId?: string;
}

/** Fundo (token) + cor de texto (token) da célula por estado. */
function corEstado(
  estado: EstadoJogo,
  cores: CoresSemanticas,
): {bg: string; texto: CorTexto} {
  switch (estado) {
    case 'vitoria':
      return {bg: cores.brandSoft, texto: 'success'};
    case 'derrota':
      return {bg: cores.dangerSoft, texto: 'danger'};
    case 'proxima':
      return {bg: cores.brand, texto: 'onBrand'};
    case 'empate':
      return {bg: cores.surfaceSubtle, texto: 'textPrimary'};
    case 'futura':
      return {bg: cores.surface, texto: 'textPrimary'};
  }
}

const CABECALHO_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function estadoDoResultado(partida: Partida, usuarioId: string): EstadoJogo {
  const ehCasa = partida.timeCasa === usuarioId;
  const pro = (ehCasa ? partida.placarCasa : partida.placarFora) ?? 0;
  const con = (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
  if (pro > con) {
    return 'vitoria';
  }
  if (pro < con) {
    return 'derrota';
  }
  return 'empate';
}

function Calendario(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();
  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const copa = useGameStore(state => state.copa);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  const jogos = useMemo<JogoCalendario[]>(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const lista: JogoCalendario[] = [];
    for (const partida of partidas) {
      if (
        partida.timeCasa !== clubeUsuarioId &&
        partida.timeFora !== clubeUsuarioId
      ) {
        continue;
      }
      const adversarioId =
        partida.timeCasa === clubeUsuarioId ? partida.timeFora : partida.timeCasa;
      const estado: EstadoJogo = partida.jogada
        ? estadoDoResultado(partida, clubeUsuarioId)
        : partida.rodada === rodadaAtual
          ? 'proxima'
          : 'futura';
      lista.push({
        data: partida.data,
        sigla: siglaClube(clubes, adversarioId),
        tipo: 'liga',
        estado,
        partidaId: partida.id,
      });
    }
    if (copa) {
      copa.fases.forEach((fase, indice) => {
        const confronto = fase.confrontos.find(
          c => c.timeA === clubeUsuarioId || c.timeB === clubeUsuarioId,
        );
        if (!confronto || !fase.data) {
          return;
        }
        const adversarioId =
          confronto.timeA === clubeUsuarioId ? confronto.timeB : confronto.timeA;
        const estado: EstadoJogo = confronto.vencedor
          ? confronto.vencedor === clubeUsuarioId
            ? 'vitoria'
            : 'derrota'
          : indice === copa.faseAtual
            ? 'proxima'
            : 'futura';
        lista.push({
          data: fase.data,
          sigla: siglaClube(todosClubes, adversarioId),
          tipo: 'copa',
          estado,
        });
      });
    }
    return lista;
  }, [partidas, clubes, todosClubes, copa, clubeUsuarioId, rodadaAtual]);

  const meses = useMemo(() => {
    const mapa = new Map<string, Map<number, JogoCalendario>>();
    for (const jogo of jogos) {
      const chave = jogo.data.slice(0, 7);
      const dia = Number(jogo.data.slice(8, 10));
      const doMes = mapa.get(chave) ?? new Map<number, JogoCalendario>();
      doMes.set(dia, jogo);
      mapa.set(chave, doMes);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [jogos]);

  const aoTocar = (jogo: JogoCalendario) => {
    if (jogo.tipo === 'copa') {
      nav.navigate('Copa');
      return;
    }
    if (jogo.partidaId && jogo.estado !== 'proxima' && jogo.estado !== 'futura') {
      nav.navigate('MatchResult', {partidaId: jogo.partidaId});
    } else if (jogo.estado === 'proxima') {
      nav.navigate('PreJogo');
    }
  };

  return (
    <Screen scroll>
      <AppBar
        title="Calendário"
        subtitle={`Liga + Copa · ${temporadaAtual}`}
        onBack={() => nav.goBack()}
      />

      {meses.map(([chave, jogosPorDia]) => {
        const [ano, mes] = chave.split('-').map(Number);
        const total = diasNoMes(ano, mes);
        const offset = indiceDiaSemana(`${chave}-01`);
        const celulas: Array<number | null> = [
          ...Array.from({length: offset}, () => null),
          ...Array.from({length: total}, (_, i) => i + 1),
        ];
        return (
          <View key={chave} style={styles.section}>
            <Text variant="labelM" color="textSecondary" style={styles.caps}>
              {nomeMes(mes)} {ano}
            </Text>
            <View style={styles.semanaHeader}>
              {CABECALHO_SEMANA.map((dia, i) => (
                <Text
                  key={`h${i}`}
                  variant="labelM"
                  color="textSecondary"
                  style={styles.diaSemana}>
                  {dia}
                </Text>
              ))}
            </View>
            <View style={styles.grade}>
              {celulas.map((dia, i) => {
                if (dia === null) {
                  return (
                    <View
                      key={`v${i}`}
                      style={[styles.celula, {borderColor: cores.border}]}
                    />
                  );
                }
                const jogo = jogosPorDia.get(dia);
                if (!jogo) {
                  return (
                    <View
                      key={dia}
                      style={[styles.celula, {borderColor: cores.border}]}>
                      <Text variant="caption" color="textSecondary">
                        {dia}
                      </Text>
                    </View>
                  );
                }
                const {bg, texto} = corEstado(jogo.estado, cores);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={dia}
                    onPress={() => aoTocar(jogo)}
                    style={[
                      styles.celula,
                      styles.celulaJogo,
                      {backgroundColor: bg, borderColor: cores.border},
                      jogo.tipo === 'copa'
                        ? [styles.celulaCopa, {borderTopColor: cores.accent}]
                        : null,
                    ]}>
                    {jogo.tipo === 'copa' ? (
                      <View style={styles.copaMarca}>
                        <Icon nome="trofeu" size={9} color="accent" />
                      </View>
                    ) : null}
                    <Text variant="labelM" color={texto}>
                      {dia}
                    </Text>
                    <Text
                      variant="caption"
                      color={texto}
                      numberOfLines={1}
                      style={styles.celulaSigla}>
                      {jogo.sigla}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={styles.legenda}>
        <Legenda cor={cores.success} texto="Vitória" />
        <Legenda cor={cores.textSecondary} texto="Empate" />
        <Legenda cor={cores.danger} texto="Derrota" />
        <Legenda cor={cores.brand} texto="Próxima" />
        <View style={styles.legendaItem}>
          <Icon nome="trofeu" size={13} color="accent" />
          <Text variant="caption" color="textSecondary">
            Copa do Brasil
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function Legenda({cor, texto}: {cor: string; texto: string}): React.JSX.Element {
  return (
    <View style={styles.legendaItem}>
      <View style={[styles.legendaPonto, {backgroundColor: cor}]} />
      <Text variant="caption" color="textSecondary">
        {texto}
      </Text>
    </View>
  );
}

export default Calendario;

const LARGURA_CELULA = '14.2857%';

const styles = StyleSheet.create({
  section: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  semanaHeader: {flexDirection: 'row'},
  diaSemana: {width: LARGURA_CELULA, textAlign: 'center'},
  grade: {flexDirection: 'row', flexWrap: 'wrap'},
  celula: {
    width: LARGURA_CELULA,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
  celulaJogo: {borderRadius: raios.lg, borderWidth: 1},
  celulaCopa: {borderTopWidth: 3},
  copaMarca: {position: 'absolute', right: 2, top: 1},
  celulaSigla: {fontSize: 9, fontWeight: '800'},
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[3],
    marginTop: espacamento[4],
  },
  legendaItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  legendaPonto: {width: 12, height: 12, borderRadius: 4},
});
