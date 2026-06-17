/**
 * Calendário da temporada (Módulo 12). Grade das 38 rodadas do clube do usuário:
 * verde (vitória), cinza (empate), vermelho (derrota), destaque na próxima
 * rodada e cinza-claro nas futuras. Tocar abre a súmula (jogada) ou o pré-jogo.
 */

import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, ScreenContainer} from '../../components/ui';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {siglaClube} from '../../utils/formatters';
import type {Partida} from '../../types';

const TOTAL_RODADAS = 38;

/** "2026-04-08" → "08/04" (compacto para a célula estreita). */
function diaMes(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

type ResultadoCelula = 'V' | 'E' | 'D';

function resultado(partida: Partida, usuarioId: string): ResultadoCelula {
  const ehCasa = partida.timeCasa === usuarioId;
  const pro = (ehCasa ? partida.placarCasa : partida.placarFora) ?? 0;
  const con = (ehCasa ? partida.placarFora : partida.placarCasa) ?? 0;
  if (pro > con) {
    return 'V';
  }
  if (pro < con) {
    return 'D';
  }
  return 'E';
}

function corResultado(r: ResultadoCelula): string {
  if (r === 'V') {
    return '#166534';
  }
  if (r === 'D') {
    return '#7F1D1D';
  }
  return '#374151';
}

function Calendario(): React.JSX.Element {
  const nav = useAppNavigation();
  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);

  const porRodada = useMemo(() => {
    const mapa = new Map<number, Partida>();
    if (!clubeUsuarioId) {
      return mapa;
    }
    for (const partida of partidas) {
      if (
        partida.timeCasa === clubeUsuarioId ||
        partida.timeFora === clubeUsuarioId
      ) {
        mapa.set(partida.rodada, partida);
      }
    }
    return mapa;
  }, [partidas, clubeUsuarioId]);

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Calendário"
        subtitulo="Temporada · 38 rodadas"
        onBack={() => nav.goBack()}
      />

      <View style={styles.grade}>
        {Array.from({length: TOTAL_RODADAS}, (_, i) => i + 1).map(rodada => {
          const partida = porRodada.get(rodada);
          const adversarioId =
            partida && clubeUsuarioId
              ? partida.timeCasa === clubeUsuarioId
                ? partida.timeFora
                : partida.timeCasa
              : undefined;
          const ehProxima = rodada === rodadaAtual;
          const jogada = partida?.jogada ?? false;
          const r = partida && jogada ? resultado(partida, clubeUsuarioId ?? '') : null;

          const aoTocar = () => {
            if (!partida) {
              return;
            }
            if (jogada) {
              nav.navigate('MatchResult', {partidaId: partida.id});
            } else if (ehProxima) {
              nav.navigate('PreJogo');
            }
          };

          return (
            <Pressable
              accessibilityRole="button"
              key={rodada}
              onPress={aoTocar}
              style={[
                styles.celula,
                r ? {backgroundColor: corResultado(r)} : null,
                ehProxima ? styles.celulaProxima : null,
              ]}>
              <Text style={styles.rodadaNum}>{rodada}</Text>
              {partida ? (
                <Text style={styles.data}>{diaMes(partida.data)}</Text>
              ) : null}
              <Text style={styles.adversario} numberOfLines={1}>
                {adversarioId ? siglaClube(clubes, adversarioId) : '—'}
              </Text>
              {r ? <Text style={styles.resultado}>{r}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legenda}>
        <Legenda cor="#166534" texto="Vitória" />
        <Legenda cor="#374151" texto="Empate" />
        <Legenda cor="#7F1D1D" texto="Derrota" />
        <Legenda cor={cores.primaria} texto="Próxima" />
      </View>
    </ScreenContainer>
  );
}

function Legenda({cor, texto}: {cor: string; texto: string}): React.JSX.Element {
  return (
    <View style={styles.legendaItem}>
      <View style={[styles.legendaPonto, {backgroundColor: cor}]} />
      <Text style={styles.legendaTexto}>{texto}</Text>
    </View>
  );
}

export default Calendario;

const styles = StyleSheet.create({
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  celula: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    gap: 1,
    justifyContent: 'center',
    paddingVertical: espaco.sm,
    width: '17.5%',
  },
  celulaProxima: {
    borderColor: cores.primaria,
    borderWidth: 2,
  },
  rodadaNum: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '900',
  },
  data: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
  },
  adversario: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
  },
  resultado: {
    color: cores.texto,
    fontSize: 11,
    fontWeight: '900',
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.md,
    marginTop: espaco.lg,
  },
  legendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  legendaPonto: {
    borderRadius: 4,
    height: 12,
    width: 12,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
});
