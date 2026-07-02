/**
 * Tela de súmula da partida — relatório pós-jogo completo (modelo SofaScore):
 *
 * placar + condições do jogo (estádio, público REAL da bilheteria, clima,
 * gramado) → craque do jogo → estatísticas avançadas com barras → momentum
 * minuto a minuto → linha do tempo → tabela de jogadores por time (nota,
 * minutos, gols, assistências, finalizações e passes) → posse por zona e
 * perigo ofensivo por setor.
 *
 * TODOS os números vêm da engine (acumulados durante a simulação) ou dos
 * eventos persistidos — nada é inventado aqui. Partidas de saves antigos, sem
 * `estatisticas`, degradam para as seções que os eventos permitem montar.
 */

import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {
  AppHeader,
  Botao,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import {EventItem} from '../../components/MatchNarration/EventItem';
import {ScoreHeader} from '../../components/MatchNarration/ScoreHeader';
import Icone, {type IconeNome} from '../../components/Icone';
import {
  calcularNotaPartida,
  type ResultadoJogador,
} from '../../engine/simulation/matchRating';
import {cores, corDoTime, espaco, raio, sombra} from '../../theme';
import {nomeClube, siglaClube} from '../../utils/formatters';
import {useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import type {
  Clube,
  EstatisticasTimePartida,
  EventoPartida,
  Partida,
  Player,
} from '../../types';

const DURACAO = 90;

type LinhaJogador = {
  jogador: Player;
  minutos: number;
  entrou: boolean;
  saiu: boolean;
  gols: number;
  assistencias: number;
  nota: number | null;
};

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

/** Verde (ótima) → amarelo (regular) → vermelho (ruim). */
function corNota(nota: number): string {
  if (nota >= 7.5) {
    return cores.primaria;
  }
  if (nota >= 6) {
    return cores.secundaria;
  }
  return cores.perigo;
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

/** Uma linha da lista de estatísticas com barras proporcionais dos dois lados. */
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
        <Text style={styles.estatValor}>{mostrar(fora)}</Text>
      </View>
      <View style={styles.estatBarras}>
        <View style={styles.estatBarraTrack}>
          <View style={styles.estatBarraEspaco} />
          <View
            style={[
              styles.estatBarra,
              {flex: Math.max(0.02, fracaoCasa), backgroundColor: corCasa},
            ]}
          />
        </View>
        <View style={styles.estatBarraTrack}>
          <View
            style={[
              styles.estatBarra,
              {flex: Math.max(0.02, 1 - fracaoCasa), backgroundColor: corFora},
            ]}
          />
          <View style={styles.estatBarraEspaco} />
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
                    styles.momentumBarraCima,
                    {height: `${valor * 100}%`, backgroundColor: corCasa},
                  ]}
                />
              ) : null}
            </View>
            <View style={styles.momentumMetade}>
              {valor < 0 ? (
                <View
                  style={[
                    styles.momentumBarraBaixo,
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

/** Mini-campo 3×3 de posse por zona (ataque para cima). */
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
  // Linha [2] = terço ofensivo, desenhada no topo (ataca para cima).
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
                    opacity: 0.12 + 0.78 * ((zonas[linha]?.[coluna] ?? 0) / maximo),
                  },
                ]}
              />
            ))}
          </View>
        ))}
        <View style={styles.mapaMeioCampo} />
      </View>
      <Icone nome="seta-cima" tamanho={14} cor={cores.textoSecundario} />
    </View>
  );
}

/** Mini-campo de perigo ofensivo por corredor (esquerda/centro/direita). */
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
              styles.mapaSetor,
              {
                backgroundColor: cor,
                opacity: 0.12 + 0.78 * ((setores[setor] ?? 0) / maximo),
              },
            ]}
          />
        ))}
      </View>
      <Icone nome="seta-cima" tamanho={14} cor={cores.textoSecundario} />
    </View>
  );
}

/** Tabela de jogadores de um time (nota/min/G/A/finalizações/passes). */
function TabelaJogadores({
  titulo,
  linhas,
  banco,
  estatisticas,
  melhorId,
}: {
  titulo: string;
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
    return (
      <View key={jogador.id} style={styles.jogadorLinha}>
        <Text style={styles.jogadorPos}>{jogador.posicaoPrincipal}</Text>
        <View style={styles.jogadorNomeWrap}>
          <Text style={styles.jogadorNome} numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          {jogador.id === melhorId ? (
            <Icone nome="trofeu" tamanho={11} cor={cores.secundaria} />
          ) : null}
          {linha.entrou ? (
            <Icone nome="seta-cima" tamanho={11} cor={cores.primaria} />
          ) : null}
          {linha.saiu ? (
            <Icone nome="seta-baixo" tamanho={11} cor={cores.perigo} />
          ) : null}
        </View>
        {jogou && linha.nota !== null ? (
          <View style={[styles.notaBadge, {borderColor: corNota(linha.nota)}]}>
            <Text style={[styles.notaValor, {color: corNota(linha.nota)}]}>
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
    <View style={styles.tabelaTime}>
      <Text style={styles.tabelaTitulo}>{titulo}</Text>
      <View style={styles.jogadorLinha}>
        <Text style={[styles.jogadorPos, styles.tabelaHeaderTexto]}>POS</Text>
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
    const todas = [...casa.emCampo, ...casa.banco, ...fora.emCampo, ...fora.banco]
      .filter(l => l.nota !== null);
    const melhor =
      todas.length > 0
        ? todas.reduce((m, l) => ((l.nota ?? 0) > (m.nota ?? 0) ? l : m))
        : null;
    return {clubeCasa, clubeFora, casa, fora, melhor};
  }, [partida, clubes, jogadores]);

  if (!partida || !dados) {
    return (
      <ScreenContainer scroll>
        <AppHeader titulo="Súmula" onBack={() => nav.goBack()} />
        <TextoVazio>Partida não encontrada.</TextoVazio>
      </ScreenContainer>
    );
  }

  const placarCasa = partida.placarCasa ?? 0;
  const placarFora = partida.placarFora ?? 0;
  const corCasa = corDoTime(partida.timeCasa);
  const corFora = corDoTime(partida.timeFora);
  const siglaCasa = siglaClube(clubes, partida.timeCasa);
  const siglaFora = siglaClube(clubes, partida.timeFora);
  const eventosOrdenados = [...partida.eventos].sort((a, b) => a.minuto - b.minuto);
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

  return (
    <ScreenContainer scroll>
      <AppHeader titulo="Súmula" onBack={() => nav.goBack()} />

      <View style={styles.placar}>
        <ScoreHeader
          nomeCasa={nomeClube(clubes, partida.timeCasa)}
          nomeFora={nomeClube(clubes, partida.timeFora)}
          placarCasa={placarCasa}
          placarFora={placarFora}
          rotulo="FINAL"
          clubeIdCasa={partida.timeCasa}
          clubeIdFora={partida.timeFora}
          siglaCasa={siglaCasa}
          siglaFora={siglaFora}
          corCasa={corCasa}
          corFora={corFora}
        />
        <View style={styles.metaChips}>
          {estadio ? (
            <View style={styles.metaChip}>
              <Icone nome="estadio" tamanho={13} cor={cores.textoSecundario} />
              <Text style={styles.metaChipTexto} numberOfLines={1}>
                {estadio.nome}
              </Text>
            </View>
          ) : null}
          {est?.publico !== undefined ? (
            <View style={styles.metaChip}>
              <Icone nome="publico" tamanho={13} cor={cores.textoSecundario} />
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
                cor={cores.textoSecundario}
              />
              <Text style={styles.metaChipTexto}>
                {est.clima} · {est.temperatura}°C
              </Text>
            </View>
          ) : null}
          {estadio ? (
            <View style={styles.metaChip}>
              <Icone nome="gramado" tamanho={13} cor={cores.textoSecundario} />
              <Text style={styles.metaChipTexto}>
                {rotuloGramado(estadio.nivelInfraestrutura)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {melhorJogador && melhorJogador.nota !== null ? (
        <Section titulo="Craque do jogo">
          <View style={styles.craque}>
            <View
              style={[
                styles.craqueFaixa,
                {backgroundColor: corDoTime(melhorJogador.jogador.clubeId ?? '')},
              ]}
            />
            <View style={styles.craqueInfo}>
              <Text style={styles.craqueNome} numberOfLines={1}>
                {nomeCurto(melhorJogador.jogador)}
              </Text>
              <Text style={styles.craqueDetalhe}>
                {melhorJogador.jogador.posicaoPrincipal} ·{' '}
                {siglaClube(clubes, melhorJogador.jogador.clubeId ?? '')}
              </Text>
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
                <Text style={styles.craqueChipRotulo}>Assist.</Text>
              </View>
              {melhorEstat ? (
                <View style={styles.craqueChip}>
                  <Text style={styles.craqueChipValor}>
                    {melhorEstat.noAlvo}/{melhorEstat.total}
                  </Text>
                  <Text style={styles.craqueChipRotulo}>Final.</Text>
                </View>
              ) : null}
            </View>
          </View>
        </Section>
      ) : null}

      <Section titulo="Estatísticas">
        <View style={styles.posseRow}>
          <Text style={[styles.posseValor, {color: corCasa}]}>{posseCasa}%</Text>
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
          <Text style={[styles.posseValor, {color: corFora}]}>{posseFora}%</Text>
        </View>
        <Text style={styles.posseLegenda}>Posse de bola</Text>
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
      </Section>

      {est && est.momentumPorMinuto.length > 0 ? (
        <Section titulo="Momentum da partida">
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
        </Section>
      ) : null}

      <Section titulo="Linha do tempo">
        {eventosOrdenados.length === 0 ? (
          <TextoVazio>Nenhum lance registrado nesta partida.</TextoVazio>
        ) : (
          <View style={styles.eventos}>
            {eventosOrdenados.map((evento, indice) => {
              const ehCasa = evento.timeId === partida.timeCasa;
              return (
                <EventItem
                  key={`${evento.minuto}-${evento.tipo}-${indice}`}
                  minuto={evento.minuto}
                  tipo={evento.tipo}
                  descricao={evento.descricao}
                  lado={ehCasa ? 'casa' : 'fora'}
                  sigla={ehCasa ? siglaCasa : siglaFora}
                  corTime={ehCasa ? corCasa : corFora}
                  clubeId={evento.timeId}
                />
              );
            })}
          </View>
        )}
      </Section>

      <Section titulo="Jogadores">
        <TabelaJogadores
          titulo={nomeClube(clubes, partida.timeCasa)}
          linhas={dados.casa.emCampo}
          banco={dados.casa.banco}
          estatisticas={est?.casa}
          melhorId={melhorJogador?.jogador.id}
        />
        <TabelaJogadores
          titulo={nomeClube(clubes, partida.timeFora)}
          linhas={dados.fora.emCampo}
          banco={dados.fora.banco}
          estatisticas={est?.fora}
          melhorId={melhorJogador?.jogador.id}
        />
      </Section>

      {est ? (
        <>
          <Section titulo="Posse por zona">
            <View style={styles.mapasRow}>
              <MapaPosseZonas
                zonas={est.casa.posseZonas}
                cor={corCasa}
                titulo={siglaCasa}
              />
              <MapaPosseZonas
                zonas={est.fora.posseZonas}
                cor={corFora}
                titulo={siglaFora}
              />
            </View>
          </Section>
          <Section titulo="Perigo ofensivo por setor">
            <View style={styles.mapasRow}>
              <MapaPerigoSetores
                setores={est.casa.perigoSetores}
                cor={corCasa}
                titulo={siglaCasa}
              />
              <MapaPerigoSetores
                setores={est.fora.perigoSetores}
                cor={corFora}
                titulo={siglaFora}
              />
            </View>
          </Section>
        </>
      ) : null}

      <Botao titulo="Continuar" onPress={() => nav.navigate('MainTabs')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  placar: {
    gap: espaco.sm,
    marginVertical: espaco.lg,
  },
  metaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    justifyContent: 'center',
  },
  metaChip: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 200,
    paddingHorizontal: espaco.sm,
    paddingVertical: 4,
  },
  metaChipTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  craque: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
    ...sombra.suave,
  },
  craqueFaixa: {
    borderRadius: 3,
    height: 40,
    width: 5,
  },
  craqueInfo: {
    flex: 1,
  },
  craqueNome: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '900',
  },
  craqueDetalhe: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  craqueChips: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  craqueChip: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.bordaTransl,
    borderRadius: raio.md,
    borderWidth: 1,
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  craqueChipNota: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  craqueChipValor: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '900',
  },
  craqueChipValorNota: {
    color: cores.contrastePrimaria,
    fontSize: 14,
    fontWeight: '900',
  },
  craqueChipRotulo: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
  },
  craqueChipRotuloNota: {
    color: cores.contrastePrimaria,
    fontSize: 9,
    fontWeight: '700',
  },
  posseRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  posseTrack: {
    borderRadius: raio.sm,
    flex: 1,
    flexDirection: 'row',
    height: 10,
    overflow: 'hidden',
  },
  posseFill: {
    height: '100%',
  },
  posseValor: {
    fontSize: 13,
    fontWeight: '900',
    minWidth: 38,
    textAlign: 'center',
  },
  posseLegenda: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  estatLista: {
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  estatLinha: {
    gap: 3,
  },
  estatCabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  estatValor: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '900',
    minWidth: 48,
  },
  estatRotulo: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  estatBarras: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  estatBarraTrack: {
    backgroundColor: cores.superficieElevada,
    borderRadius: raio.sm,
    flex: 1,
    flexDirection: 'row',
    height: 6,
    overflow: 'hidden',
  },
  estatBarra: {
    borderRadius: raio.sm,
    height: '100%',
  },
  estatBarraEspaco: {
    flex: 0.0001,
  },
  momentumChart: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.md,
    borderWidth: 1,
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
  momentumBarraCima: {
    width: '100%',
  },
  momentumBarraBaixo: {
    alignSelf: 'stretch',
    width: '100%',
  },
  momentumEixo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: espaco.sm,
  },
  momentumEixoTexto: {
    color: cores.textoSecundario,
    fontSize: 10,
  },
  momentumLegenda: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
    marginTop: espaco.sm,
  },
  legendaDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    marginRight: espaco.sm,
  },
  eventos: {
    gap: espaco.sm,
  },
  tabelaTime: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    marginBottom: espaco.sm,
    padding: espaco.sm,
    ...sombra.suave,
  },
  tabelaTitulo: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: espaco.xs,
  },
  tabelaHeaderTexto: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
  },
  tabelaHeaderNota: {
    minWidth: 34,
    textAlign: 'center',
  },
  jogadorLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 3,
  },
  jogadorPos: {
    color: cores.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
    minWidth: 26,
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
    color: cores.texto,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  jogadorTraco: {
    color: cores.textoSecundario,
    fontSize: 11,
    minWidth: 34,
    textAlign: 'center',
  },
  notaBadge: {
    borderRadius: raio.sm,
    borderWidth: 1.5,
    minWidth: 34,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  notaValor: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  jogadorCelula: {
    color: cores.texto,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 22,
    textAlign: 'center',
  },
  jogadorCelulaLarga: {
    color: cores.texto,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  bancoTitulo: {
    color: cores.textoSecundario,
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
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
  },
  mapaCampo: {
    aspectRatio: 0.72,
    borderColor: cores.bordaTransl,
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
    borderColor: cores.superficie,
    borderWidth: 0.5,
    flex: 1,
  },
  mapaSetor: {
    borderColor: cores.superficie,
    borderWidth: 0.5,
    flex: 1,
  },
  mapaMeioCampo: {
    backgroundColor: cores.bordaTransl,
    height: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
});

export default MatchResult;
