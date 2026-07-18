/**
 * PRÉ-JOGO — a "prancheta" do técnico antes da partida. Uma tela de LEITURA que
 * prepara a decisão: onde/quando é o jogo, o confronto, a forma recente dos dois
 * times, uma comparação enxuta (força, gols/jogo, momento), o jogador-chave do
 * adversário e os avisos da escalação. A ação principal é uma só — "Ir para
 * escalação" — que leva ao editor de time/tática (tela Tactics).
 *
 * Só mostra dado real: forma recente, gols/jogo e momento são DERIVADOS das
 * partidas já jogadas; a força vem do cálculo da engine; nada é inventado. Ainda
 * FIXA a tática provável do adversário uma vez por confronto (era o único ponto
 * do app que fazia isso), para a simulação seguinte ficar coerente. DS v2.
 */

import React, {useEffect, useMemo, useRef} from 'react';
import {StyleSheet, View} from 'react-native';

import PlayerAvatar from '../../components/PlayerAvatar';
import type {IconeNome} from '../../components/Icone';
import {
  AppHeader,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  OverallRing,
  PositionBadge,
  Screen,
  TeamCrest,
  Text,
  espacamento,
  type CorTexto,
} from '../../design-system';
import {taticaProvavelIA} from '../../engine/tactics/preview';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {forcaDoClube} from '../../utils/forca';
import type {Partida, Player} from '../../types';

// ─── Derivações puras (só partidas/elenco, nunca inventadas) ─────────────────

type Resultado = 'V' | 'E' | 'D';

/** Cor da pílula por resultado; letra sempre por token, cor nunca é único sinal. */
const CORES_FORMA: Record<
  Resultado,
  {bg: 'success' | 'border' | 'danger'; texto: CorTexto}
> = {
  V: {bg: 'success', texto: 'onBrand'},
  E: {bg: 'border', texto: 'textPrimary'},
  D: {bg: 'danger', texto: 'onBrand'},
};

/** Últimos até 5 resultados do clube (ordem cronológica), das partidas jogadas. */
function formaRecente(clubeId: string, partidas: Partida[]): Resultado[] {
  const jogos = partidas
    .filter(
      p =>
        p.jogada &&
        (p.timeCasa === clubeId || p.timeFora === clubeId) &&
        p.placarCasa !== undefined &&
        p.placarFora !== undefined,
    )
    .sort((a, b) =>
      a.data < b.data ? -1 : a.data > b.data ? 1 : a.rodada - b.rodada,
    );

  const out: Resultado[] = [];
  for (const p of jogos.slice(-5)) {
    const pc = p.placarCasa;
    const pf = p.placarFora;
    if (pc === undefined || pf === undefined) {
      continue;
    }
    const emCasa = p.timeCasa === clubeId;
    const pro = emCasa ? pc : pf;
    const contra = emCasa ? pf : pc;
    if (pro > contra) {
      out.push('V');
    } else if (pro < contra) {
      out.push('D');
    } else if (p.vencedorPenaltis) {
      out.push(p.vencedorPenaltis === clubeId ? 'V' : 'D');
    } else {
      out.push('E');
    }
  }
  return out;
}

/** Pontos (V=3, E=1) da forma recente — o "momento" numérico. */
function pontosForma(resultados: Resultado[]): number {
  return resultados.reduce(
    (soma, r) => soma + (r === 'V' ? 3 : r === 'E' ? 1 : 0),
    0,
  );
}

/** Média de gols marcados por jogo, das partidas jogadas. */
function golsPorJogo(clubeId: string, partidas: Partida[]): number {
  let marcados = 0;
  let jogos = 0;
  for (const p of partidas) {
    if (!p.jogada) {
      continue;
    }
    const emCasa = p.timeCasa === clubeId;
    const emFora = p.timeFora === clubeId;
    if (!emCasa && !emFora) {
      continue;
    }
    const pc = p.placarCasa;
    const pf = p.placarFora;
    if (pc === undefined || pf === undefined) {
      continue;
    }
    jogos += 1;
    marcados += emCasa ? pc : pf;
  }
  return jogos > 0 ? marcados / jogos : 0;
}

/** O maior overall DISPONÍVEL do elenco (cai para o maior geral se todos fora). */
function jogadorChave(clubeId: string, jogadores: Player[]): Player | null {
  const doClube = jogadores.filter(j => j.clubeId === clubeId);
  if (doClube.length === 0) {
    return null;
  }
  const disponiveis = doClube.filter(j => !j.lesionado && !j.suspenso);
  const pool = disponiveis.length > 0 ? disponiveis : doClube;
  const ordenados = [...pool].sort((a, b) => b.overall - a.overall);
  return ordenados[0] ?? null;
}

/** Data legível (Sáb, 12 abr) — sem hora, que o domínio não fornece. */
function rotuloData(iso: string): string {
  if (iso.length < 10) {
    return iso;
  }
  const ano = Number(iso.slice(0, 4));
  const mes = Number(iso.slice(5, 7));
  const dia = Number(iso.slice(8, 10));
  if (!ano || !mes || !dia) {
    return iso;
  }
  const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const meses = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];
  const diaSemana = semana[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()];
  return `${diaSemana}, ${dia} ${meses[mes - 1]}`;
}

/** Par de cores para uma comparação: quem tem o valor maior recebe destaque. */
function coresComparacao(casa: number, fora: number): [CorTexto, CorTexto] {
  if (casa > fora) {
    return ['brand', 'textSecondary'];
  }
  if (fora > casa) {
    return ['textSecondary', 'brand'];
  }
  return ['textPrimary', 'textPrimary'];
}

// ─── Blocos de UI ────────────────────────────────────────────────────────────

/** Cinco pílulas V/E/D coloridas (verde/cinza/vermelho). */
function Forma({resultados}: {resultados: Resultado[]}): React.JSX.Element {
  if (resultados.length === 0) {
    return (
      <Text variant="caption" color="textMuted">
        Sem jogos
      </Text>
    );
  }
  return (
    <View style={styles.pillRow}>
      {resultados.map((r, i) => (
        <Box
          key={`${i}-${r}`}
          bg={CORES_FORMA[r].bg}
          radius="sm"
          align="center"
          justify="center"
          style={styles.pill}>
          <Text variant="caption" weight="800" color={CORES_FORMA[r].texto}>
            {r}
          </Text>
        </Box>
      ))}
    </View>
  );
}

/** Linha da comparação: valor casa · rótulo · valor fora. */
function LinhaComparacao({
  rotulo,
  casa,
  fora,
  cores: coresLinha,
}: {
  rotulo: string;
  casa: string;
  fora: string;
  cores: [CorTexto, CorTexto];
}): React.JSX.Element {
  return (
    <View style={styles.compRow}>
      <Text
        style={styles.compVal}
        variant="numeric"
        tabular
        weight="800"
        align="left"
        color={coresLinha[0]}>
        {casa}
      </Text>
      <Text
        style={styles.compRotulo}
        variant="caption"
        color="textSecondary"
        align="center">
        {rotulo}
      </Text>
      <Text
        style={styles.compVal}
        variant="numeric"
        tabular
        weight="800"
        align="right"
        color={coresLinha[1]}>
        {fora}
      </Text>
    </View>
  );
}

/** Rótulo de seção em caixa-alta. */
function TituloBloco({texto}: {texto: string}): React.JSX.Element {
  return (
    <Text variant="labelM" color="textSecondary" style={styles.caps}>
      {texto}
    </Text>
  );
}

type Aviso = {icone: IconeNome; cor: CorTexto; texto: string};

function PreJogo(): React.JSX.Element {
  const nav = useAppNavigation();

  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const partidas = useGameStore(state => state.partidas);
  const jogadoresUsuario = useJogadoresUsuario();
  const proximo = useGameStore(selecionarProximoJogo);
  const definirTaticaAdversario = useGameStore(
    state => state.definirTaticaAdversario,
  );
  const avancarRodada = useGameStore(state => state.avancarRodada);
  const toast = useToast();

  const confronto = useMemo(() => {
    if (!proximo) {
      return null;
    }
    const casa = clubes.find(c => c.id === proximo.timeCasa);
    const fora = clubes.find(c => c.id === proximo.timeFora);
    if (!casa || !fora) {
      return null;
    }
    return {
      casa,
      fora,
      forcaCasa: forcaDoClube(casa, jogadores),
      forcaFora: forcaDoClube(fora, jogadores),
    };
  }, [proximo, clubes, jogadores]);

  // Tática PROVÁVEL do adversário (IA), pela força relativa + mando.
  const advInfo = useMemo(() => {
    if (!confronto || !clubeUsuario || !proximo) {
      return null;
    }
    const mando = proximo.timeCasa === clubeUsuario.id;
    const eu = mando ? confronto.forcaCasa : confronto.forcaFora;
    const ele = mando ? confronto.forcaFora : confronto.forcaCasa;
    const adversario = mando ? confronto.fora : confronto.casa;
    return {
      id: adversario.id,
      tatica: taticaProvavelIA({
        overallAdversario: ele.overall,
        overallUsuario: eu.overall,
        adversarioMandante: !mando,
      }),
    };
  }, [confronto, clubeUsuario, proximo]);

  // Fixa a tática do adversário no estado UMA vez por confronto. Definir a tática
  // muda a FORÇA do clube (calcularForcaTime usa a tática), o que recalcularia
  // `confronto`→`advInfo` e re-dispararia este efeito com nova recomendação — um
  // loop de feedback. O guard por id do adversário corta o loop (a tela remonta a
  // cada nova partida).
  const advFixadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (advInfo && advFixadoRef.current !== advInfo.id) {
      advFixadoRef.current = advInfo.id;
      definirTaticaAdversario(advInfo.id, advInfo.tatica);
    }
  }, [advInfo, definirTaticaAdversario]);

  const formacao = clubeUsuario?.formacaoAtual ?? null;

  // Avisos da escalação (mesma validação da tela de Tática) — não bloqueiam aqui,
  // só apontam o que corrigir antes do jogo.
  const avisos = useMemo<Aviso[]>(() => {
    if (!formacao) {
      return [
        {
          icone: 'tatica',
          cor: 'warning',
          texto: 'Monte sua escalação antes do jogo.',
        },
      ];
    }
    const validacao = validarEscalacao(formacao, jogadoresUsuario);
    const lista: Aviso[] = [];
    for (const erro of validacao.erros) {
      lista.push({icone: 'fechar', cor: 'danger', texto: erro});
    }
    for (const aviso of validacao.avisos) {
      lista.push({icone: 'lesao', cor: 'warning', texto: aviso});
    }
    return lista;
  }, [formacao, jogadoresUsuario]);

  if (!proximo || !confronto || !clubeUsuario) {
    return (
      <Screen header={<AppHeader title="Pré-jogo" onBack={() => nav.goBack()} />}>
        <EmptyState
          title="Nenhum jogo agendado"
          description="Não há próxima partida na temporada."
          icone="calendario"
        />
      </Screen>
    );
  }

  const mandoCasa = proximo.timeCasa === clubeUsuario.id;
  const adversario = mandoCasa ? confronto.fora : confronto.casa;
  const chave = jogadorChave(adversario.id, jogadores);

  // Favoritismo pela força + bônus de mando, na perspectiva do usuário.
  const forcaMinha = mandoCasa
    ? confronto.forcaCasa.overall
    : confronto.forcaFora.overall;
  const forcaDele = mandoCasa
    ? confronto.forcaFora.overall
    : confronto.forcaCasa.overall;
  const diff = forcaMinha + (mandoCasa ? 3 : 0) - forcaDele;
  const favoritismo =
    Math.abs(diff) < 2
      ? 'Equilíbrio'
      : `${diff > 0 ? 'Favorito' : 'Azarão'}${Math.abs(diff) >= 6 ? '' : ' leve'}`;
  const favTom = diff >= 2 ? 'success' : diff <= -2 ? 'danger' : 'neutral';

  const formaCasa = formaRecente(confronto.casa.id, partidas);
  const formaFora = formaRecente(confronto.fora.id, partidas);
  const forcaCasaN = Math.round(confronto.forcaCasa.overall);
  const forcaForaN = Math.round(confronto.forcaFora.overall);
  const gpjCasa = golsPorJogo(confronto.casa.id, partidas);
  const gpjFora = golsPorJogo(confronto.fora.id, partidas);
  const momCasa = pontosForma(formaCasa);
  const momFora = pontosForma(formaFora);

  return (
    <Screen
      scroll
      header={<AppHeader title="Pré-jogo" onBack={() => nav.goBack()} />}>
      {/* CONTEXTO — competição · rodada / estádio · data */}
      <View style={styles.meta}>
        <Text
          variant="labelM"
          color="textSecondary"
          align="center"
          style={styles.caps}>
          Brasileirão {clubeUsuario.divisao ?? 'Série A'} · Rodada{' '}
          {proximo.rodada}
        </Text>
        <View style={styles.metaLinha}>
          <Icon nome="estadio" size="sm" color="textMuted" />
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {confronto.casa.estadio.nome}
          </Text>
          <Text variant="caption" color="textMuted">
            ·
          </Text>
          <Icon nome="calendario" size="sm" color="textMuted" />
          <Text variant="caption" color="textMuted">
            {rotuloData(proximo.data)}
          </Text>
        </View>
      </View>

      {/* CONFRONTO — placar escuro */}
      <Box bg="scoreboard" radius="lg" padding={4}>
        <View style={styles.placar}>
          <View style={styles.placarTime}>
            <TeamCrest
              clubeId={confronto.casa.id}
              sigla={confronto.casa.sigla}
              nome={confronto.casa.nome}
              size={56}
            />
            <Text variant="titleM" weight="800" color="onScoreboard">
              {confronto.casa.sigla}
            </Text>
            <Text
              variant="caption"
              color="onScoreboard"
              align="center"
              numberOfLines={1}>
              {confronto.casa.nome}
            </Text>
            <Text variant="caption" color="onScoreboard" style={styles.caps}>
              {mandoCasa ? 'Você · Casa' : 'Casa'}
            </Text>
          </View>

          <View style={styles.placarCentro}>
            <Text variant="titleL" weight="900" color="onScoreboard">
              VS
            </Text>
            <Badge label={favoritismo} tom={favTom} solido />
          </View>

          <View style={styles.placarTime}>
            <TeamCrest
              clubeId={confronto.fora.id}
              sigla={confronto.fora.sigla}
              nome={confronto.fora.nome}
              size={56}
            />
            <Text variant="titleM" weight="800" color="onScoreboard">
              {confronto.fora.sigla}
            </Text>
            <Text
              variant="caption"
              color="onScoreboard"
              align="center"
              numberOfLines={1}>
              {confronto.fora.nome}
            </Text>
            <Text variant="caption" color="onScoreboard" style={styles.caps}>
              {!mandoCasa ? 'Você · Fora' : 'Fora'}
            </Text>
          </View>
        </View>
      </Box>

      {/* FORMA RECENTE */}
      <View style={styles.bloco}>
        <TituloBloco texto="Forma recente" />
        <Card variante="outlined" padding={3}>
          <View style={styles.formaRow}>
            <View style={styles.formaLado}>
              <Forma resultados={formaCasa} />
            </View>
            <Text variant="caption" color="textMuted" align="center">
              Últimos 5
            </Text>
            <View style={[styles.formaLado, styles.formaDir]}>
              <Forma resultados={formaFora} />
            </View>
          </View>
        </Card>
      </View>

      {/* COMPARAÇÃO */}
      <View style={styles.bloco}>
        <TituloBloco texto="Comparação" />
        <Card variante="outlined" padding={3}>
          <LinhaComparacao
            rotulo="Força"
            casa={String(forcaCasaN)}
            fora={String(forcaForaN)}
            cores={coresComparacao(forcaCasaN, forcaForaN)}
          />
          <Divider />
          <LinhaComparacao
            rotulo="Gols/jogo"
            casa={gpjCasa.toFixed(1)}
            fora={gpjFora.toFixed(1)}
            cores={coresComparacao(gpjCasa, gpjFora)}
          />
          <Divider />
          <LinhaComparacao
            rotulo="Momento"
            casa={String(momCasa)}
            fora={String(momFora)}
            cores={coresComparacao(momCasa, momFora)}
          />
        </Card>
      </View>

      {/* JOGADOR-CHAVE DO ADVERSÁRIO */}
      {chave ? (
        <View style={styles.bloco}>
          <TituloBloco texto="Jogador-chave do adversário" />
          <Card
            variante="interactive"
            padding={3}
            onPress={() => nav.navigate('PlayerDetail', {jogadorId: chave.id})}>
            <View style={styles.chaveRow}>
              <PlayerAvatar id={chave.id} tamanho={48} />
              <View style={styles.chaveInfo}>
                <Text variant="bodyL" weight="700" numberOfLines={1}>
                  {chave.apelido ?? chave.nome}
                </Text>
                <View style={styles.chaveMeta}>
                  <PositionBadge
                    posicao={chave.posicaoPrincipal}
                    tamanho="sm"
                  />
                  <Text variant="caption" color="textSecondary">
                    {chave.idade} anos · {adversario.sigla}
                  </Text>
                </View>
              </View>
              <OverallRing valor={chave.overall} tamanho={46} />
            </View>
          </Card>
        </View>
      ) : null}

      {/* AVISOS da escalação — o que corrigir antes do jogo (erros em vermelho
          desabilitam Simular/Jogar; avisos em amarelo são só alerta) */}
      {avisos.length > 0 ? (
        <Card variante="outlined">
          {avisos.map((aviso, i) => (
            <View key={`${aviso.texto}-${i}`} style={styles.avisoRow}>
              <Icon nome={aviso.icone} size="sm" color={aviso.cor} />
              <Text variant="bodyM" color={aviso.cor} style={styles.avisoTexto}>
                {aviso.texto}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {/* AÇÕES — iniciar a partida (simular ou ao vivo) + ajustar escalação */}
      {(() => {
        const podeJogar = !avisos.some(a => a.cor === 'danger');
        return (
          <View style={styles.acoesLinha}>
            <View style={styles.acaoSimular}>
              <Button
                titulo=""
                icone="simular"
                iconeSize={26}
                variante="secondary"
                tamanho="lg"
                disabled={!podeJogar}
                fullWidth
                onPress={() => {
                  avancarRodada();
                  toast('Rodada simulada.', 'sucesso');
                  nav.navigate('MainTabs');
                }}
              />
            </View>
            <View style={styles.acaoEscalar}>
              <Button
                titulo=""
                icone="tatica"
                iconeSize={26}
                variante="secondary"
                tamanho="lg"
                fullWidth
                onPress={() => nav.navigate('Tactics')}
              />
            </View>
            <View style={styles.acaoJogar}>
              <Button
                titulo="Jogar ao vivo"
                variante="primary"
                tamanho="lg"
                icone="jogar"
                iconeSize={22}
                disabled={!podeJogar}
                fullWidth
                onPress={() => nav.navigate('MatchSimulation')}
              />
            </View>
          </View>
        );
      })()}
    </Screen>
  );
}

export default PreJogo;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  flex: {flex: 1},
  acoesLinha: {flexDirection: 'row', gap: espacamento[2]},
  acaoSimular: {flex: 20},
  acaoEscalar: {flex: 25},
  acaoJogar: {flex: 55},
  meta: {gap: espacamento[1]},
  metaLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[1],
    justifyContent: 'center',
  },
  // CONFRONTO
  placar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  placarTime: {
    alignItems: 'center',
    flex: 1,
    gap: espacamento[1],
  },
  placarCentro: {
    alignItems: 'center',
    gap: espacamento[2],
    paddingTop: espacamento[4],
  },
  // BLOCOS
  bloco: {gap: espacamento[2]},
  // FORMA
  formaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
    justifyContent: 'space-between',
  },
  formaLado: {flex: 1},
  formaDir: {alignItems: 'flex-end'},
  pillRow: {flexDirection: 'row', gap: espacamento[1]},
  pill: {height: 22, width: 22},
  // COMPARAÇÃO
  compRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: espacamento[2],
  },
  compVal: {flex: 1},
  compRotulo: {flex: 1.4},
  // JOGADOR-CHAVE
  chaveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[3],
  },
  chaveInfo: {flex: 1, gap: espacamento[1]},
  chaveMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
  },
  // AVISOS
  avisoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espacamento[2],
    paddingVertical: espacamento[2],
  },
  avisoTexto: {flex: 1},
});
