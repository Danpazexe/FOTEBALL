/**
 * Calendário da temporada (Módulo 12) — grade MENSAL de verdade: cada mês com
 * seus dias (alinhados ao dia da semana), e os jogos do clube do usuário
 * (Liga + Copa do Brasil) posicionados na data certa, coloridos por resultado.
 * Tocar abre a súmula (liga jogada), o pré-jogo (próxima da liga) ou a chave
 * (Copa). A Copa é marcada com borda dourada no topo da célula.
 */

import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, ScreenContainer, Section} from '../../components/ui';
import Icone from '../../components/Icone';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
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

const COR_ESTADO: Record<EstadoJogo, string> = {
  vitoria: '#166534',
  empate: '#374151',
  derrota: '#7F1D1D',
  proxima: cores.primaria,
  futura: cores.superficieAlt,
};

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
  const partidas = useGameStore(state => state.partidas);
  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const copa = useGameStore(state => state.copa);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const temporadaAtual = useGameStore(state => state.temporadaAtual);

  // Todos os jogos do usuário (liga + copa), com seu estado e data.
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
          confronto.timeA === clubeUsuarioId
            ? confronto.timeB
            : confronto.timeA;
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

  // Agrupa por mês ("2026-04" → mapa dia→jogo), ordenado cronologicamente.
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
    <ScreenContainer scroll>
      <AppHeader
        titulo="Calendário"
        subtitulo={`Liga + Copa · ${temporadaAtual}`}
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
          <Section key={chave} titulo={`${nomeMes(mes)} ${ano}`}>
            <View style={styles.semanaHeader}>
              {CABECALHO_SEMANA.map((dia, i) => (
                <Text key={`h${i}`} style={styles.diaSemana}>
                  {dia}
                </Text>
              ))}
            </View>
            <View style={styles.grade}>
              {celulas.map((dia, i) => {
                if (dia === null) {
                  return <View key={`v${i}`} style={styles.celula} />;
                }
                const jogo = jogosPorDia.get(dia);
                if (!jogo) {
                  return (
                    <View key={dia} style={styles.celula}>
                      <Text style={styles.diaNum}>{dia}</Text>
                    </View>
                  );
                }
                const corTexto =
                  jogo.estado === 'proxima'
                    ? cores.contrastePrimaria
                    : jogo.estado === 'futura'
                      ? cores.texto
                      : '#FFFFFF';
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={dia}
                    onPress={() => aoTocar(jogo)}
                    style={[
                      styles.celula,
                      styles.celulaJogo,
                      {backgroundColor: COR_ESTADO[jogo.estado]},
                      jogo.tipo === 'copa' ? styles.celulaCopa : null,
                    ]}>
                    {jogo.tipo === 'copa' ? (
                      <View style={styles.copaMarca}>
                        <Icone nome="trofeu" tamanho={9} cor={cores.secundaria} />
                      </View>
                    ) : null}
                    <Text style={[styles.diaNumJogo, {color: corTexto}]}>
                      {dia}
                    </Text>
                    <Text
                      style={[styles.celulaSigla, {color: corTexto}]}
                      numberOfLines={1}>
                      {jogo.sigla}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>
        );
      })}

      <View style={styles.legenda}>
        <Legenda cor="#166534" texto="Vitória" />
        <Legenda cor="#374151" texto="Empate" />
        <Legenda cor="#7F1D1D" texto="Derrota" />
        <Legenda cor={cores.primaria} texto="Próxima" />
        <View style={styles.legendaItem}>
          <Icone nome="trofeu" tamanho={13} cor={cores.secundaria} />
          <Text style={styles.legendaTexto}>Copa do Brasil</Text>
        </View>
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

const LARGURA_CELULA = '14.2857%';

const styles = StyleSheet.create({
  semanaHeader: {
    flexDirection: 'row',
  },
  diaSemana: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    width: LARGURA_CELULA,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celula: {
    alignItems: 'center',
    aspectRatio: 1,
    borderColor: cores.borda,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 1,
    justifyContent: 'center',
    width: LARGURA_CELULA,
  },
  celulaJogo: {
    borderColor: cores.borda,
    borderRadius: raio.sm,
  },
  celulaCopa: {
    borderColor: cores.secundaria,
    borderTopColor: cores.secundaria,
    borderTopWidth: 3,
  },
  copaMarca: {
    position: 'absolute',
    right: 2,
    top: 1,
  },
  diaNum: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  diaNumJogo: {
    fontSize: 12,
    fontWeight: '800',
  },
  celulaSigla: {
    fontSize: 9,
    fontWeight: '800',
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
