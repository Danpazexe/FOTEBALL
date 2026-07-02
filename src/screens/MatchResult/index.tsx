/**
 * Tela de súmula da partida — relatório pós-jogo no estilo do modelo enviado
 * pelo usuário (SofaScore claro): cards brancos sobre fundo cinza-claro,
 * badges de posição coloridos por setor, pill de nota, barras finas e abas
 * Casa | Resumo | Fora fazendo as vezes das três colunas do desktop.
 *
 * TODOS os números vêm da engine (acumulados durante a simulação) ou dos
 * eventos persistidos — nada é inventado aqui. Partidas de saves antigos, sem
 * `estatisticas`, degradam para as seções que os eventos permitem montar.
 */

import React, {useMemo, useState} from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {TextoVazio} from '../../components/ui';
import Icone, {type IconeNome} from '../../components/Icone';
import {
  calcularNotaPartida,
  type ResultadoJogador,
} from '../../engine/simulation/matchRating';
import {corDoTime, espaco, raio} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import type {
  Clube,
  EstatisticasTimePartida,
  EventoPartida,
  Partida,
  Player,
  Position,
} from '../../types';

const DURACAO = 90;

/** Paleta CLARA da súmula (modelo SofaScore) — local desta tela; o resto do
 * app segue o tema escuro premium de `src/theme`. */
const CLARO = {
  fundo: '#F1F3F7',
  card: '#FFFFFF',
  borda: '#E5E9F0',
  divisor: '#EFF2F6',
  texto: '#17233B',
  textoSec: '#7C8698',
  track: '#EDF0F4',
  verde: '#12B76A',
  verdeSuave: '#E4F7EE',
  amarelo: '#C99A06',
  amareloSuave: '#FFF4D6',
  vermelho: '#E5484D',
  vermelhoSuave: '#FFECEE',
  azul: '#1D6FE0',
  azulSuave: '#E7F0FE',
  laranja: '#D97A00',
  laranjaSuave: '#FFF1DE',
  rosa: '#D6336C',
  rosaSuave: '#FBE7F0',
} as const;

type LinhaJogador = {
  jogador: Player;
  minutos: number;
  entrou: boolean;
  saiu: boolean;
  gols: number;
  assistencias: number;
  nota: number | null;
};

type Aba = 'casa' | 'resumo' | 'fora';

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

/** Cores do badge de POSIÇÃO por setor (modelo: GOL amarelo, defesa azul,
 * meio laranja, pontas rosa, centroavante vermelho). */
function corPosicao(posicao: Position): {fundo: string; texto: string} {
  if (posicao === 'GOL') {
    return {fundo: CLARO.amareloSuave, texto: CLARO.amarelo};
  }
  if (['ZAG', 'LD', 'LE'].includes(posicao)) {
    return {fundo: CLARO.azulSuave, texto: CLARO.azul};
  }
  if (['VOL', 'MC', 'MEI'].includes(posicao)) {
    return {fundo: CLARO.laranjaSuave, texto: CLARO.laranja};
  }
  if (['PD', 'PE', 'SA'].includes(posicao)) {
    return {fundo: CLARO.rosaSuave, texto: CLARO.rosa};
  }
  return {fundo: CLARO.vermelhoSuave, texto: CLARO.vermelho};
}

/** Pill de nota (modelo): verde para boa, amarelo regular, vermelho ruim. */
function corNotaPill(nota: number): {fundo: string; texto: string} {
  if (nota >= 7.5) {
    return {fundo: CLARO.verdeSuave, texto: CLARO.verde};
  }
  if (nota >= 6) {
    return {fundo: CLARO.amareloSuave, texto: CLARO.amarelo};
  }
  return {fundo: CLARO.vermelhoSuave, texto: CLARO.vermelho};
}

function rotuloGramado(nivelInfraestrutura: number): string {
  if (nivelInfraestrutura >= 4) {
    return 'Ótimo';
  }
  if (nivelInfraestrutura === 3) {
    return 'Bom';
  }
  if (nivelInfraestrutura === 2) {
    return 'Regular';
  }
  return 'Ruim';
}

function iconeClima(clima: string): IconeNome {
  if (clima === 'Chuvoso') {
    return 'clima-chuva';
  }
  if (clima === 'Nublado') {
    return 'clima-nublado';
  }
  return 'clima-sol';
}

function iconeEvento(tipo: EventoPartida['tipo']): IconeNome {
  if (tipo === 'gol') {
    return 'bola';
  }
  if (tipo === 'cartao_amarelo' || tipo === 'cartao_vermelho') {
    return 'cartao';
  }
  if (tipo === 'substituicao') {
    return 'substituicao';
  }
  if (tipo === 'lesao') {
    return 'lesao';
  }
  if (tipo === 'penalti') {
    return 'penalti';
  }
  return 'chance';
}

function corEvento(tipo: EventoPartida['tipo']): string {
  if (tipo === 'gol') {
    return CLARO.verde;
  }
  if (tipo === 'cartao_amarelo') {
    return CLARO.amarelo;
  }
  if (tipo === 'cartao_vermelho' || tipo === 'lesao') {
    return CLARO.vermelho;
  }
  if (tipo === 'penalti') {
    return CLARO.laranja;
  }
  return CLARO.textoSec;
}

/**
 * Minutos jogados a partir dos eventos REAIS: titular joga 90' a menos que
 * saia (substituição/expulsão/lesão); quem entra joga do minuto da troca ao
 * fim (ou até ser expulso/lesionar).
 */
function calcularMinutos(
  eventos: EventoPartida[],
  titularesIds: Set<string>,
): Map<string, {minutos: number; entrou: boolean; saiu: boolean}> {
  const resultado = new Map<
    string,
    {minutos: number; entrou: boolean; saiu: boolean}
  >();
  const entradaDe = new Map<string, number>();
  const saidaDe = new Map<string, number>();

  for (const evento of eventos) {
    if (evento.tipo === 'substituicao') {
      saidaDe.set(evento.jogadorId, evento.minuto);
      if (evento.jogadorEntraId) {
        entradaDe.set(evento.jogadorEntraId, evento.minuto);
      }
    } else if (evento.tipo === 'cartao_vermelho' || evento.tipo === 'lesao') {
      if (!saidaDe.has(evento.jogadorId)) {
        saidaDe.set(evento.jogadorId, evento.minuto);
      }
    }
  }

  const participantes = new Set([...titularesIds, ...entradaDe.keys()]);
  for (const id of participantes) {
    const inicio = titularesIds.has(id) ? 0 : entradaDe.get(id) ?? 0;
    const fim = saidaDe.get(id) ?? DURACAO;
    resultado.set(id, {
      minutos: Math.max(1, Math.min(DURACAO, fim - inicio)),
      entrou: entradaDe.has(id),
      saiu: saidaDe.has(id),
    });
  }
  return resultado;
}

/** Monta as linhas da tabela de um time: titulares + quem entrou + banco. */
function linhasDoTime(
  clube: Clube | undefined,
  jogadores: Player[],
  partida: Partida,
  ehCasa: boolean,
): {emCampo: LinhaJogador[]; banco: LinhaJogador[]} {
  if (!clube?.formacaoAtual) {
    return {emCampo: [], banco: []};
  }
  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const resultado: ResultadoJogador =
    placarCasa === placarFora
      ? 'empate'
      : (placarCasa > placarFora) === ehCasa
        ? 'vitoria'
        : 'derrota';
  const cleanSheet = ehCasa ? placarFora === 0 : placarCasa === 0;
  const porId = new Map(jogadores.map(j => [j.id, j]));
  const doClube = jogadores.filter(j => j.clubeId === clube.id);

  const titularesIds = new Set(
    clube.formacaoAtual.titulares.map(t => t.jogadorId),
  );
  const minutosPorId = calcularMinutos(partida.eventos, titularesIds);

  const montarLinha = (jogador: Player): LinhaJogador => {
    const participacao = minutosPorId.get(jogador.id);
    const eventosDoJogador = partida.eventos.filter(
      e => e.jogadorId === jogador.id,
    );
    const gols = eventosDoJogador.filter(e => e.tipo === 'gol').length;
    const assistencias = partida.eventos.filter(
      e => e.tipo === 'gol' && e.jogadorAssistenciaId === jogador.id,
    ).length;
    return {
      jogador,
      minutos: participacao?.minutos ?? 0,
      entrou: participacao?.entrou ?? false,
      saiu: participacao?.saiu ?? false,
      gols,
      assistencias,
      nota: participacao
        ? calcularNotaPartida(jogador, eventosDoJogador, resultado, cleanSheet)
        : null,
    };
  };

  const emCampo = clube.formacaoAtual.titulares
    .map(t => porId.get(t.jogadorId))
    .filter((j): j is Player => j !== undefined)
    .map(montarLinha);

  const entraram = doClube
    .filter(j => !titularesIds.has(j.id) && minutosPorId.has(j.id))
    .map(montarLinha)
    .sort((a, b) => b.minutos - a.minutos);
  const naoJogaram = doClube
    .filter(j => !titularesIds.has(j.id) && !minutosPorId.has(j.id))
    .map(montarLinha);

  return {emCampo, banco: [...entraram, ...naoJogaram]};
}

/** Card branco padrão da súmula. */
function Card({
  titulo,
  children,
}: {
  titulo?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      {titulo ? <Text style={styles.cardTitulo}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

/** Linha de estatística do modelo: valores nas pontas, rótulo no centro,
 * duas meias-barras que crescem a partir do centro. */
function LinhaEstatistica({
  rotulo,
  casa,
  fora,
  corCasa,
  corFora,
  formato,
}: {
  rotulo: string;
  casa: number;
  fora: number;
  corCasa: string;
  corFora: string;
  formato?: (valor: number) => string;
}): React.JSX.Element {
  const total = casa + fora;
  const fracaoCasa = total > 0 ? casa / total : 0.5;
  const mostrar = formato ?? ((v: number) => `${v}`);
  return (
    <View style={styles.estatLinha}>
      <View style={styles.estatCabecalho}>
        <Text style={styles.estatValor}>{mostrar(casa)}</Text>
        <Text style={styles.estatRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
        <Text style={[styles.estatValor, styles.estatValorDireita]}>
          {mostrar(fora)}
        </Text>
      </View>
      <View style={styles.estatBarras}>
        <View style={styles.estatTrack}>
          <View style={styles.estatEspaco} />
          <View
            style={[
              styles.estatBarra,
              {flex: Math.max(0.02, fracaoCasa), backgroundColor: corCasa},
            ]}
          />
        </View>
        <View style={styles.estatTrack}>
          <View
            style={[
              styles.estatBarra,
              {flex: Math.max(0.02, 1 - fracaoCasa), backgroundColor: corFora},
            ]}
          />
          <View style={styles.estatEspaco} />
        </View>
      </View>
    </View>
  );
}

/** Gráfico de momentum: barras por minuto — casa para cima, fora para baixo. */
function GraficoMomentum({
  serie,
  corCasa,
  corFora,
}: {
  serie: number[];
  corCasa: string;
  corFora: string;
}): React.JSX.Element {
  return (
    <View>
      <View style={styles.momentumChart}>
        {serie.map((valor, indice) => (
          <View key={`m_${indice}`} style={styles.momentumColuna}>
            <View style={styles.momentumMetade}>
              {valor > 0 ? (
                <View
                  style={[
                    styles.momentumBarra,
                    {height: `${valor * 100}%`, backgroundColor: corCasa},
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.momentumMetade}>
              {valor < 0 ? (
                <View
                  style={[
                    styles.momentumBarra,
                    {height: `${-valor * 100}%`, backgroundColor: corFora},
                  ]}
                />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.momentumEixo}>
        {["15'", "30'", "45'", "60'", "75'", "90'"].map(rotulo => (
          <Text key={rotulo} style={styles.momentumEixoTexto}>
            {rotulo}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Mini-campo 3×3 de posse por zona (ataque para cima), fundo claro. */
function MapaPosseZonas({
  zonas,
  cor,
  titulo,
}: {
  zonas: number[][];
  cor: string;
  titulo: string;
}): React.JSX.Element {
  const maximo = Math.max(0.01, ...zonas.flat());
  const linhasDesenho = [2, 1, 0] as const;
  return (
    <View style={styles.mapaColuna}>
      <Text style={styles.mapaTitulo} numberOfLines={1}>
        {titulo}
      </Text>
      <View style={styles.mapaCampo}>
        {linhasDesenho.map(linha => (
          <View key={`linha_${linha}`} style={styles.mapaLinha}>
            {[0, 1, 2].map(coluna => (
              <View
                key={`zona_${linha}_${coluna}`}
                style={[
                  styles.mapaZona,
                  {
                    backgroundColor: cor,
                    opacity:
                      0.08 + 0.82 * ((zonas[linha]?.[coluna] ?? 0) / maximo),
                  },
                ]}
              />
            ))}
          </View>
        ))}
        <View style={styles.mapaMeioCampo} />
      </View>
      <Icone nome="seta-cima" tamanho={14} cor={CLARO.textoSec} />
    </View>
  );
}

/** Mini-campo de perigo ofensivo por corredor, fundo claro. */
function MapaPerigoSetores({
  setores,
  cor,
  titulo,
}: {
  setores: number[];
  cor: string;
  titulo: string;
}): React.JSX.Element {
  const maximo = Math.max(0.01, ...setores);
  return (
    <View style={styles.mapaColuna}>
      <Text style={styles.mapaTitulo} numberOfLines={1}>
        {titulo}
      </Text>
      <View style={[styles.mapaCampo, styles.mapaCampoSetores]}>
        {[0, 1, 2].map(setor => (
          <View
            key={`setor_${setor}`}
            style={[
              styles.mapaZona,
              {
                backgroundColor: cor,
                opacity: 0.08 + 0.82 * ((setores[setor] ?? 0) / maximo),
              },
            ]}
          />
        ))}
      </View>
      <Icone nome="seta-cima" tamanho={14} cor={CLARO.textoSec} />
    </View>
  );
}

/** Tabela de jogadores no estilo do modelo (POS colorido, nota em pill). */
function TabelaJogadores({
  linhas,
  banco,
  estatisticas,
  melhorId,
}: {
  linhas: LinhaJogador[];
  banco: LinhaJogador[];
  estatisticas: EstatisticasTimePartida | undefined;
  melhorId?: string;
}): React.JSX.Element {
  const renderLinha = (linha: LinhaJogador) => {
    const {jogador} = linha;
    const fin = estatisticas?.finalizacoesPorJogador[jogador.id];
    const passes = estatisticas?.passesPorJogador[jogador.id];
    const jogou = linha.nota !== null;
    const pos = corPosicao(jogador.posicaoPrincipal);
    const destaque = jogador.id === melhorId;
    return (
      <View
        key={jogador.id}
        style={[styles.jogadorLinha, destaque && styles.jogadorLinhaDestaque]}>
        <View style={[styles.posBadge, {backgroundColor: pos.fundo}]}>
          <Text style={[styles.posBadgeTexto, {color: pos.texto}]}>
            {jogador.posicaoPrincipal}
          </Text>
        </View>
        <View style={styles.jogadorNomeWrap}>
          <Text style={styles.jogadorNome} numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          {destaque ? (
            <Icone nome="trofeu" tamanho={11} cor={CLARO.amarelo} />
          ) : null}
          {linha.entrou ? (
            <Icone nome="seta-cima" tamanho={11} cor={CLARO.verde} />
          ) : null}
          {linha.saiu ? (
            <Icone nome="seta-baixo" tamanho={11} cor={CLARO.vermelho} />
          ) : null}
        </View>
        {jogou && linha.nota !== null ? (
          <View
            style={[
              styles.notaPill,
              {backgroundColor: corNotaPill(linha.nota).fundo},
            ]}>
            <Text
              style={[
                styles.notaPillTexto,
                {color: corNotaPill(linha.nota).texto},
              ]}>
              {linha.nota.toFixed(1)}
            </Text>
          </View>
        ) : (
          <Text style={styles.jogadorTraco}>—</Text>
        )}
        <Text style={styles.jogadorCelula}>{jogou ? linha.minutos : '—'}</Text>
        <Text style={styles.jogadorCelula}>{jogou ? linha.gols : '—'}</Text>
        <Text style={styles.jogadorCelula}>
          {jogou ? linha.assistencias : '—'}
        </Text>
        <Text style={styles.jogadorCelulaLarga}>
          {jogou && fin ? `${fin.noAlvo}/${fin.total}` : '—'}
        </Text>
        <Text style={styles.jogadorCelulaLarga}>
          {jogou && passes ? `${passes.certos}/${passes.tentados}` : '—'}
        </Text>
      </View>
    );
  };

  return (
    <View>
      <View style={styles.jogadorLinha}>
        <Text style={[styles.posHeader, styles.tabelaHeaderTexto]}>POS</Text>
        <Text style={[styles.jogadorNomeWrapHeader, styles.tabelaHeaderTexto]}>
          NOME
        </Text>
        <Text style={[styles.tabelaHeaderNota, styles.tabelaHeaderTexto]}>
          NOTA
        </Text>
        <Text style={[styles.jogadorCelula, styles.tabelaHeaderTexto]}>MIN</Text>
        <Text style={[styles.jogadorCelula, styles.tabelaHeaderTexto]}>G</Text>
        <Text style={[styles.jogadorCelula, styles.tabelaHeaderTexto]}>A</Text>
        <Text style={[styles.jogadorCelulaLarga, styles.tabelaHeaderTexto]}>
          FIN
        </Text>
        <Text style={[styles.jogadorCelulaLarga, styles.tabelaHeaderTexto]}>
          PS
        </Text>
      </View>
      <View style={styles.divisor} />
      {linhas.map(renderLinha)}
      {banco.length > 0 ? (
        <>
          <Text style={styles.bancoTitulo}>BANCO</Text>
          {banco.map(renderLinha)}
        </>
      ) : null}
    </View>
  );
}

function MatchResult(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'MatchResult'>>();
  const {partidaId} = route.params;
  const [aba, setAba] = useState<Aba>('resumo');

  const partida = useGameStore(state =>
    state.partidas.find(item => item.id === partidaId),
  );
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);

  const dados = useMemo(() => {
    if (!partida) {
      return null;
    }
    const clubeCasa = clubes.find(c => c.id === partida.timeCasa);
    const clubeFora = clubes.find(c => c.id === partida.timeFora);
    const casa = linhasDoTime(clubeCasa, jogadores, partida, true);
    const fora = linhasDoTime(clubeFora, jogadores, partida, false);
    const todas = [
      ...casa.emCampo,
      ...casa.banco,
      ...fora.emCampo,
      ...fora.banco,
    ].filter(l => l.nota !== null);
    const melhor =
      todas.length > 0
        ? todas.reduce((m, l) => ((l.nota ?? 0) > (m.nota ?? 0) ? l : m))
        : null;
    return {clubeCasa, clubeFora, casa, fora, melhor};
  }, [partida, clubes, jogadores]);

  if (!partida || !dados) {
    return (
      <View style={styles.tela}>
        <SafeAreaView style={styles.telaSafe}>
          <Pressable style={styles.voltar} onPress={() => nav.goBack()}>
            <Icone nome="voltar" tamanho={18} cor={CLARO.texto} />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </Pressable>
          <TextoVazio>Partida não encontrada.</TextoVazio>
        </SafeAreaView>
      </View>
    );
  }

  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const corCasa = corDoTime(partida.timeCasa);
  const corFora = corDoTime(partida.timeFora);
  const siglaCasa = siglaClube(clubes, partida.timeCasa);
  const siglaFora = siglaClube(clubes, partida.timeFora);
  const eventosOrdenados = [...partida.eventos].sort(
    (a, b) => a.minuto - b.minuto,
  );
  const est = partida.estatisticas;
  const estadio = dados.clubeCasa?.estadio;
  const melhorJogador = dados.melhor;
  const melhorEstat = melhorJogador
    ? (melhorJogador.jogador.clubeId === partida.timeCasa
        ? est?.casa
        : est?.fora
      )?.finalizacoesPorJogador[melhorJogador.jogador.id]
    : undefined;
  const posseCasa = partida.posseCasa ?? 50;
  const posseFora = partida.posseFora ?? 100 - posseCasa;

  const pct = (certos: number, tentados: number): number =>
    tentados > 0 ? Math.round((certos / tentados) * 100) : 0;

  const abas: Array<{chave: Aba; rotulo: string}> = [
    {chave: 'casa', rotulo: siglaCasa},
    {chave: 'resumo', rotulo: 'Resumo'},
    {chave: 'fora', rotulo: siglaFora},
  ];

  const renderResumo = () => (
    <>
      {melhorJogador && melhorJogador.nota !== null ? (
        <Card titulo="Craque do jogo">
          <View style={styles.craque}>
            <View
              style={[
                styles.craqueFaixa,
                {
                  backgroundColor: corDoTime(
                    melhorJogador.jogador.clubeId ?? '',
                  ),
                },
              ]}
            />
            <View style={styles.craqueInfo}>
              <Text style={styles.craqueNome} numberOfLines={1}>
                {nomeCurto(melhorJogador.jogador)}
              </Text>
              <View style={styles.craqueSubRow}>
                <View
                  style={[
                    styles.posBadge,
                    {
                      backgroundColor: corPosicao(
                        melhorJogador.jogador.posicaoPrincipal,
                      ).fundo,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.posBadgeTexto,
                      {
                        color: corPosicao(
                          melhorJogador.jogador.posicaoPrincipal,
                        ).texto,
                      },
                    ]}>
                    {melhorJogador.jogador.posicaoPrincipal}
                  </Text>
                </View>
                <Text style={styles.craqueDetalhe}>
                  {siglaClube(clubes, melhorJogador.jogador.clubeId ?? '')}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.craqueChips}>
            <View style={[styles.craqueChip, styles.craqueChipNota]}>
              <Text style={styles.craqueChipValorNota}>
                {melhorJogador.nota.toFixed(1)}
              </Text>
              <Text style={styles.craqueChipRotuloNota}>Nota</Text>
            </View>
            <View style={styles.craqueChip}>
              <Text style={styles.craqueChipValor}>{melhorJogador.gols}</Text>
              <Text style={styles.craqueChipRotulo}>Gols</Text>
            </View>
            <View style={styles.craqueChip}>
              <Text style={styles.craqueChipValor}>
                {melhorJogador.assistencias}
              </Text>
              <Text style={styles.craqueChipRotulo}>Assistências</Text>
            </View>
            {melhorEstat ? (
              <View style={styles.craqueChip}>
                <Text style={styles.craqueChipValor}>
                  {melhorEstat.noAlvo}/{melhorEstat.total}
                </Text>
                <Text style={styles.craqueChipRotulo}>Finalizações</Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}

      <Card titulo="Estatísticas">
        <View style={styles.posseCabecalho}>
          <View style={[styles.possePill, {borderColor: corCasa}]}>
            <Text style={[styles.possePillTexto, {color: corCasa}]}>
              {posseCasa}%
            </Text>
          </View>
          <Text style={styles.estatRotulo}>Posse de bola</Text>
          <View style={[styles.possePill, {borderColor: corFora}]}>
            <Text style={[styles.possePillTexto, {color: corFora}]}>
              {posseFora}%
            </Text>
          </View>
        </View>
        <View style={styles.posseTrack}>
          <View
            style={[
              styles.posseFill,
              {flex: posseCasa, backgroundColor: corCasa},
            ]}
          />
          <View
            style={[
              styles.posseFill,
              {flex: posseFora, backgroundColor: corFora},
            ]}
          />
        </View>
        {est ? (
          <View style={styles.estatLista}>
            <LinhaEstatistica
              rotulo="Gols esperados (xG)"
              casa={est.casa.golsEsperados}
              fora={est.fora.golsEsperados}
              corCasa={corCasa}
              corFora={corFora}
              formato={v => v.toFixed(2)}
            />
            <LinhaEstatistica
              rotulo="Assistências esperadas (xA)"
              casa={est.casa.assistenciasEsperadas}
              fora={est.fora.assistenciasEsperadas}
              corCasa={corCasa}
              corFora={corFora}
              formato={v => v.toFixed(2)}
            />
            <LinhaEstatistica
              rotulo="Finalizações"
              casa={est.casa.finalizacoes}
              fora={est.fora.finalizacoes}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Finalizações no alvo"
              casa={est.casa.finalizacoesNoAlvo}
              fora={est.fora.finalizacoesNoAlvo}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Finalizações na área"
              casa={est.casa.finalizacoesNaArea}
              fora={est.fora.finalizacoesNaArea}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Finalizações de fora"
              casa={est.casa.finalizacoesDeFora}
              fora={est.fora.finalizacoesDeFora}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Grandes chances"
              casa={est.casa.grandesChances}
              fora={est.fora.grandesChances}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Passes certos"
              casa={est.casa.passesCertos}
              fora={est.fora.passesCertos}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Passes tentados"
              casa={est.casa.passesTentados}
              fora={est.fora.passesTentados}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Acerto de passes"
              casa={pct(est.casa.passesCertos, est.casa.passesTentados)}
              fora={pct(est.fora.passesCertos, est.fora.passesTentados)}
              corCasa={corCasa}
              corFora={corFora}
              formato={v => `${v}%`}
            />
            <LinhaEstatistica
              rotulo="Dribles"
              casa={est.casa.dribles}
              fora={est.fora.dribles}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Desarmes"
              casa={est.casa.desarmes}
              fora={est.fora.desarmes}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Interceptações"
              casa={est.casa.interceptacoes}
              fora={est.fora.interceptacoes}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Cruzamentos"
              casa={est.casa.cruzamentos}
              fora={est.fora.cruzamentos}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Escanteios"
              casa={est.casa.escanteios}
              fora={est.fora.escanteios}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Faltas"
              casa={est.casa.faltas}
              fora={est.fora.faltas}
              corCasa={corCasa}
              corFora={corFora}
            />
            <LinhaEstatistica
              rotulo="Impedimentos"
              casa={est.casa.impedimentos}
              fora={est.fora.impedimentos}
              corCasa={corCasa}
              corFora={corFora}
            />
          </View>
        ) : (
          <TextoVazio>
            Estatísticas indisponíveis para partidas antigas.
          </TextoVazio>
        )}
      </Card>

      {est && est.momentumPorMinuto.length > 0 ? (
        <Card titulo="Momentum da partida">
          <GraficoMomentum
            serie={est.momentumPorMinuto}
            corCasa={corCasa}
            corFora={corFora}
          />
          <View style={styles.momentumLegenda}>
            <View style={[styles.legendaDot, {backgroundColor: corCasa}]} />
            <Text style={styles.legendaTexto}>{siglaCasa}</Text>
            <View style={[styles.legendaDot, {backgroundColor: corFora}]} />
            <Text style={styles.legendaTexto}>{siglaFora}</Text>
          </View>
        </Card>
      ) : null}

      <Card titulo="Linha do tempo">
        {eventosOrdenados.length === 0 ? (
          <TextoVazio>Nenhum lance registrado nesta partida.</TextoVazio>
        ) : (
          <View style={styles.timeline}>
            {eventosOrdenados.map((evento, indice) => {
              const ehCasa = evento.timeId === partida.timeCasa;
              return (
                <View
                  key={`${evento.minuto}-${evento.tipo}-${indice}`}
                  style={styles.timelineLinha}>
                  <Text style={styles.timelineMinuto}>{evento.minuto}'</Text>
                  <View
                    style={[
                      styles.timelineFaixa,
                      {backgroundColor: ehCasa ? corCasa : corFora},
                    ]}
                  />
                  <Icone
                    nome={iconeEvento(evento.tipo)}
                    tamanho={14}
                    cor={corEvento(evento.tipo)}
                  />
                  <Text style={styles.timelineTexto} numberOfLines={2}>
                    {evento.descricao}
                  </Text>
                  <Text style={styles.timelineSigla}>
                    {ehCasa ? siglaCasa : siglaFora}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </>
  );

  const renderTime = (lado: 'casa' | 'fora') => {
    const time = lado === 'casa' ? dados.casa : dados.fora;
    const estTime = lado === 'casa' ? est?.casa : est?.fora;
    const cor = lado === 'casa' ? corCasa : corFora;
    const sigla = lado === 'casa' ? siglaCasa : siglaFora;
    return (
      <>
        <Card titulo={nomeClube(clubes, lado === 'casa' ? partida.timeCasa : partida.timeFora)}>
          <TabelaJogadores
            linhas={time.emCampo}
            banco={time.banco}
            estatisticas={estTime}
            melhorId={melhorJogador?.jogador.id}
          />
        </Card>
        {estTime ? (
          <Card>
            <View style={styles.mapasRow}>
              <MapaPosseZonas
                zonas={estTime.posseZonas}
                cor={cor}
                titulo="Posse por zona"
              />
              <MapaPerigoSetores
                setores={estTime.perigoSetores}
                cor={cor}
                titulo="Perigo por setor"
              />
            </View>
            <Text style={styles.mapaLegenda}>{sigla} ataca para cima</Text>
          </Card>
        ) : null}
      </>
    );
  };

  return (
    <View style={styles.tela}>
      <SafeAreaView style={styles.telaSafe}>
        <ScrollView
          contentContainerStyle={styles.conteudo}
          showsVerticalScrollIndicator={false}>
          <Pressable style={styles.voltar} onPress={() => nav.goBack()}>
            <Icone nome="voltar" tamanho={18} cor={CLARO.texto} />
            <Text style={styles.voltarTexto}>Voltar</Text>
          </Pressable>

          <View style={styles.placarCard}>
            <View style={styles.placarLinha}>
              <View style={styles.placarTimeWrap}>
                <View style={[styles.placarFaixa, {backgroundColor: corCasa}]} />
                <Text style={styles.placarTime} numberOfLines={1}>
                  {nomeClube(clubes, partida.timeCasa)}
                </Text>
              </View>
              <Text style={styles.placarNumeros}>
                {placarCasa} - {placarFora}
              </Text>
              <View style={styles.placarTimeWrap}>
                <Text
                  style={[styles.placarTime, styles.placarTimeDireita]}
                  numberOfLines={1}>
                  {nomeClube(clubes, partida.timeFora)}
                </Text>
                <View style={[styles.placarFaixa, {backgroundColor: corFora}]} />
              </View>
            </View>
            <Text style={styles.placarMeta}>
              Rodada {partida.rodada} · {partida.data}
            </Text>
            <View style={styles.metaChips}>
              {estadio ? (
                <View style={styles.metaChip}>
                  <Icone nome="estadio" tamanho={13} cor={CLARO.textoSec} />
                  <Text style={styles.metaChipTexto} numberOfLines={1}>
                    {estadio.nome}
                  </Text>
                </View>
              ) : null}
              {est?.publico !== undefined ? (
                <View style={styles.metaChip}>
                  <Icone nome="publico" tamanho={13} cor={CLARO.textoSec} />
                  <Text style={styles.metaChipTexto}>
                    {est.publico.toLocaleString('pt-BR')}
                  </Text>
                </View>
              ) : null}
              {est ? (
                <View style={styles.metaChip}>
                  <Icone
                    nome={iconeClima(est.clima)}
                    tamanho={13}
                    cor={CLARO.textoSec}
                  />
                  <Text style={styles.metaChipTexto}>
                    {est.clima} · {est.temperatura}°C
                  </Text>
                </View>
              ) : null}
              {estadio ? (
                <View style={styles.metaChip}>
                  <Icone nome="gramado" tamanho={13} cor={CLARO.textoSec} />
                  <Text style={styles.metaChipTexto}>
                    {rotuloGramado(estadio.nivelInfraestrutura)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.abas}>
            {abas.map(item => (
              <Pressable
                key={item.chave}
                style={[
                  styles.aba,
                  aba === item.chave && styles.abaAtiva,
                ]}
                onPress={() => setAba(item.chave)}>
                <Text
                  style={[
                    styles.abaTexto,
                    aba === item.chave && styles.abaTextoAtiva,
                  ]}>
                  {item.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>

          {aba === 'resumo'
            ? renderResumo()
            : aba === 'casa'
              ? renderTime('casa')
              : renderTime('fora')}

          <Pressable
            style={styles.botaoContinuar}
            onPress={() => nav.navigate('MainTabs')}>
            <Text style={styles.botaoContinuarTexto}>Continuar</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    backgroundColor: CLARO.fundo,
    flex: 1,
  },
  telaSafe: {
    flex: 1,
  },
  conteudo: {
    gap: espaco.md,
    padding: espaco.lg,
    paddingBottom: espaco.xxl,
  },
  voltar: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 4,
  },
  voltarTexto: {
    color: CLARO.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  placarCard: {
    backgroundColor: CLARO.card,
    borderColor: CLARO.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
  },
  placarLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  placarTimeWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: espaco.xs,
  },
  placarFaixa: {
    borderRadius: 2,
    height: 24,
    width: 4,
  },
  placarTime: {
    color: CLARO.texto,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  placarTimeDireita: {
    textAlign: 'right',
  },
  placarNumeros: {
    color: CLARO.texto,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  placarMeta: {
    color: CLARO.textoSec,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    justifyContent: 'center',
  },
  metaChip: {
    alignItems: 'center',
    backgroundColor: CLARO.fundo,
    borderRadius: raio.pill,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 200,
    paddingHorizontal: espaco.sm,
    paddingVertical: 4,
  },
  metaChipTexto: {
    color: CLARO.textoSec,
    fontSize: 11,
    fontWeight: '700',
  },
  abas: {
    backgroundColor: CLARO.track,
    borderRadius: raio.pill,
    flexDirection: 'row',
    padding: 3,
  },
  aba: {
    alignItems: 'center',
    borderRadius: raio.pill,
    flex: 1,
    paddingVertical: 8,
  },
  abaAtiva: {
    backgroundColor: CLARO.card,
    shadowColor: '#0F1E3D',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  abaTexto: {
    color: CLARO.textoSec,
    fontSize: 13,
    fontWeight: '700',
  },
  abaTextoAtiva: {
    color: CLARO.texto,
  },
  card: {
    backgroundColor: CLARO.card,
    borderColor: CLARO.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
  },
  cardTitulo: {
    color: CLARO.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  craque: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  craqueFaixa: {
    borderRadius: 3,
    height: 36,
    width: 5,
  },
  craqueInfo: {
    flex: 1,
    gap: 3,
  },
  craqueNome: {
    color: CLARO.texto,
    fontSize: 16,
    fontWeight: '900',
  },
  craqueSubRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  craqueDetalhe: {
    color: CLARO.textoSec,
    fontSize: 12,
    fontWeight: '600',
  },
  craqueChips: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  craqueChip: {
    alignItems: 'flex-start',
    backgroundColor: CLARO.card,
    borderColor: CLARO.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flex: 1,
    gap: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 6,
  },
  craqueChipNota: {
    backgroundColor: CLARO.verdeSuave,
    borderColor: CLARO.verdeSuave,
  },
  craqueChipValor: {
    color: CLARO.texto,
    fontSize: 15,
    fontWeight: '900',
  },
  craqueChipValorNota: {
    color: CLARO.verde,
    fontSize: 15,
    fontWeight: '900',
  },
  craqueChipRotulo: {
    color: CLARO.textoSec,
    fontSize: 9,
    fontWeight: '700',
  },
  craqueChipRotuloNota: {
    color: CLARO.verde,
    fontSize: 9,
    fontWeight: '700',
  },
  posseCabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  possePill: {
    borderRadius: raio.pill,
    borderWidth: 1.5,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  possePillTexto: {
    fontSize: 13,
    fontWeight: '900',
  },
  posseTrack: {
    borderRadius: raio.pill,
    flexDirection: 'row',
    height: 12,
    overflow: 'hidden',
  },
  posseFill: {
    height: '100%',
  },
  estatLista: {
    gap: espaco.md,
    marginTop: espaco.sm,
  },
  estatLinha: {
    gap: 4,
  },
  estatCabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estatValor: {
    color: CLARO.texto,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 48,
  },
  estatValorDireita: {
    textAlign: 'right',
  },
  estatRotulo: {
    color: CLARO.textoSec,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  estatBarras: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  estatTrack: {
    backgroundColor: CLARO.track,
    borderRadius: raio.pill,
    flex: 1,
    flexDirection: 'row',
    height: 7,
    overflow: 'hidden',
  },
  estatBarra: {
    borderRadius: raio.pill,
    height: '100%',
  },
  estatEspaco: {
    flex: 0.0001,
  },
  momentumChart: {
    backgroundColor: CLARO.fundo,
    borderRadius: raio.md,
    flexDirection: 'row',
    height: 96,
    overflow: 'hidden',
  },
  momentumColuna: {
    flex: 1,
  },
  momentumMetade: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  momentumBarra: {
    width: '100%',
  },
  momentumEixo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: espaco.sm,
  },
  momentumEixoTexto: {
    color: CLARO.textoSec,
    fontSize: 10,
  },
  momentumLegenda: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
  },
  legendaDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendaTexto: {
    color: CLARO.textoSec,
    fontSize: 11,
    fontWeight: '700',
    marginRight: espaco.sm,
  },
  timeline: {
    gap: 2,
  },
  timelineLinha: {
    alignItems: 'center',
    borderBottomColor: CLARO.divisor,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: 7,
  },
  timelineMinuto: {
    color: CLARO.texto,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 28,
  },
  timelineFaixa: {
    borderRadius: 2,
    height: 18,
    width: 3,
  },
  timelineTexto: {
    color: CLARO.texto,
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  timelineSigla: {
    color: CLARO.textoSec,
    fontSize: 10,
    fontWeight: '800',
  },
  divisor: {
    backgroundColor: CLARO.divisor,
    height: 1,
  },
  jogadorLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 4,
  },
  jogadorLinhaDestaque: {
    backgroundColor: CLARO.amareloSuave,
    borderRadius: raio.sm,
  },
  posBadge: {
    alignItems: 'center',
    borderRadius: 6,
    minWidth: 34,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  posBadgeTexto: {
    fontSize: 9,
    fontWeight: '900',
  },
  posHeader: {
    minWidth: 34,
  },
  jogadorNomeWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  jogadorNomeWrapHeader: {
    flex: 1,
  },
  jogadorNome: {
    color: CLARO.texto,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  jogadorTraco: {
    color: CLARO.textoSec,
    fontSize: 11,
    minWidth: 34,
    textAlign: 'center',
  },
  notaPill: {
    alignItems: 'center',
    borderRadius: 6,
    minWidth: 34,
    paddingHorizontal: 3,
    paddingVertical: 3,
  },
  notaPillTexto: {
    fontSize: 11,
    fontWeight: '900',
  },
  jogadorCelula: {
    color: CLARO.texto,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  jogadorCelulaLarga: {
    color: CLARO.texto,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'center',
  },
  tabelaHeaderTexto: {
    color: CLARO.textoSec,
    fontSize: 9,
    fontWeight: '800',
  },
  tabelaHeaderNota: {
    minWidth: 34,
    textAlign: 'center',
  },
  bancoTitulo: {
    color: CLARO.textoSec,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
    marginTop: espaco.sm,
  },
  mapasRow: {
    flexDirection: 'row',
    gap: espaco.md,
  },
  mapaColuna: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.xs,
  },
  mapaTitulo: {
    color: CLARO.textoSec,
    fontSize: 11,
    fontWeight: '800',
  },
  mapaCampo: {
    aspectRatio: 0.72,
    backgroundColor: CLARO.fundo,
    borderColor: CLARO.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  mapaCampoSetores: {
    flexDirection: 'row',
  },
  mapaLinha: {
    flex: 1,
    flexDirection: 'row',
  },
  mapaZona: {
    borderColor: CLARO.card,
    borderWidth: 0.5,
    flex: 1,
  },
  mapaMeioCampo: {
    backgroundColor: CLARO.borda,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  mapaLegenda: {
    color: CLARO.textoSec,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  botaoContinuar: {
    alignItems: 'center',
    backgroundColor: CLARO.azul,
    borderRadius: raio.md,
    paddingVertical: 14,
  },
  botaoContinuarTexto: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});

export default MatchResult;
