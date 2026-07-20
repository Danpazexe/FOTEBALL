/**
 * Central do Olheiro (scouting). Sem engine/store novos: tudo é DERIVAÇÃO PURA e
 * determinística sobre dado real do store. Abas Relatórios / Observados / Missões.
 * O "conhecimento" de cada alvo sai da reputação do clube dele + overall (sinal
 * real), e atributos ocultos são respeitados: potencial EXATO só aparece quando o
 * relatório está Completo; Parcial revela uma faixa ampla; Inicial esconde ("?").
 * Missões vêm das carências reais do elenco (posições com menos jogadores) e o
 * progresso é a contagem real de candidatos jovens no mercado. Nada é inventado.
 */
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  EmptyState,
  PositionBadge,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedTabs,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import PlayerAvatar from '../../components/PlayerAvatar';
import {nomeCurto} from '../../utils/formatters';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import type {Clube, Player, Position} from '../../types';

type Aba = 'relatorios' | 'observados' | 'missoes';
type Conhecimento = 'Completo' | 'Parcial' | 'Inicial';
type TomBadge = 'neutral' | 'accent' | 'success';

/** Idade-teto para "jovem" — usada nas joias observadas e nas missões. */
const IDADE_JOVEM = 23;
/** Quantos alvos, no máximo, o olheiro traz por vez. */
const LIMITE_ALVOS = 12;
/** Candidatos jovens no mercado que "completam" uma missão de reforço. */
const META_MISSAO = 3;

const ABAS: Array<{chave: Aba; rotulo: string}> = [
  {chave: 'relatorios', rotulo: 'Relatórios'},
  {chave: 'observados', rotulo: 'Observados'},
  {chave: 'missoes', rotulo: 'Missões'},
];

/** Rótulo de exibição de cada posição (apresentação de um enum já existente). */
const ROTULO_POSICAO: Record<Position, string> = {
  GOL: 'Goleiro',
  ZAG: 'Zagueiro',
  LD: 'Lateral-direito',
  LE: 'Lateral-esquerdo',
  VOL: 'Volante',
  MC: 'Meio-campo',
  MEI: 'Meia',
  PD: 'Ponta-direita',
  PE: 'Ponta-esquerda',
  SA: 'Segundo atacante',
  CA: 'Centroavante',
};

/** Ordem determinística para desempate (menos jogadores no elenco → prioridade). */
const ORDEM_POSICOES: Position[] = [
  'GOL', 'ZAG', 'LD', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'SA', 'CA',
];

const TOM_CONHECIMENTO: Record<Conhecimento, TomBadge> = {
  Completo: 'success',
  Parcial: 'accent',
  Inicial: 'neutral',
};

/**
 * Conhecimento derivado de sinal REAL: reputação do clube do alvo (0–100) pesa
 * mais e o overall completa. Clubes de renome e craques são "mais conhecidos".
 */
function derivarConhecimento(
  reputacaoClube: number,
  overall: number,
): Conhecimento {
  const pontos = reputacaoClube * 0.6 + overall * 0.4;
  if (pontos >= 66) {
    return 'Completo';
  }
  if (pontos >= 50) {
    return 'Parcial';
  }
  return 'Inicial';
}

/**
 * Texto do potencial respeitando atributos ocultos:
 * - Completo: número exato (ou "No teto" quando não há margem);
 * - Parcial: faixa ampla de 5 pontos;
 * - Inicial: escondido ("?").
 */
function textoPotencial(jogador: Player, conhecimento: Conhecimento): string {
  if (conhecimento === 'Inicial') {
    return 'Pot ?';
  }
  if (conhecimento === 'Parcial') {
    const base = Math.floor(jogador.potencial / 5) * 5;
    return `Pot ${base}–${base + 5}`;
  }
  if (jogador.potencial > jogador.overall) {
    return `Pot ${jogador.potencial}`;
  }
  return 'No teto';
}

interface AlvoOlheiro {
  jogador: Player;
  clube: Clube | null;
  conhecimento: Conhecimento;
  margem: number;
}

interface Missao {
  posicao: Position;
  titulo: string;
  noElenco: number;
  candidatos: number;
  progresso: number;
}

function CentralOlheiro(): React.JSX.Element {
  const nav = useAppNavigation();
  const {cores} = useTheme();

  const jogadores = useGameStore(state => state.jogadores);
  const clubes = useGameStore(state => state.clubes);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);

  const [aba, setAba] = React.useState<Aba>('relatorios');

  /** Reputação por clube (liga ativa; cai para todosClubes se faltar). */
  const mapaClubes = useMemo(() => {
    const mapa = new Map<string, Clube>();
    for (const clube of todosClubes) {
      mapa.set(clube.id, clube);
    }
    for (const clube of clubes) {
      mapa.set(clube.id, clube);
    }
    return mapa;
  }, [clubes, todosClubes]);

  /** Mercado real: todo jogador contratado por um clube que não é o do usuário. */
  const mercado = useMemo(
    () =>
      jogadores.filter(
        j => j.clubeId !== null && j.clubeId !== clubeUsuarioId,
      ),
    [jogadores, clubeUsuarioId],
  );

  /** Alvos priorizados por potencial (limitados) com conhecimento derivado. */
  const alvos = useMemo<AlvoOlheiro[]>(
    () =>
      [...mercado]
        .sort((a, b) => b.potencial - a.potencial)
        .slice(0, LIMITE_ALVOS)
        .map(jogador => {
          const clube = jogador.clubeId
            ? mapaClubes.get(jogador.clubeId) ?? null
            : null;
          return {
            jogador,
            clube,
            conhecimento: derivarConhecimento(
              clube?.reputacao ?? 0,
              jogador.overall,
            ),
            margem: jogador.potencial - jogador.overall,
          };
        }),
    [mercado, mapaClubes],
  );

  /** Observados: joias jovens com margem de evolução (maior upside primeiro). */
  const observados = useMemo<AlvoOlheiro[]>(
    () =>
      alvos
        .filter(a => a.jogador.idade <= IDADE_JOVEM && a.margem >= 5)
        .sort((a, b) => b.margem - a.margem),
    [alvos],
  );

  /** Missões: posições mais escassas no elenco viram alvo de garimpo jovem. */
  const missoes = useMemo<Missao[]>(() => {
    if (!clubeUsuarioId) {
      return [];
    }
    const elenco = jogadores.filter(j => j.clubeId === clubeUsuarioId);
    if (elenco.length === 0) {
      return [];
    }
    const contagem = new Map<Position, number>();
    for (const pos of ORDEM_POSICOES) {
      contagem.set(pos, 0);
    }
    for (const j of elenco) {
      contagem.set(
        j.posicaoPrincipal,
        (contagem.get(j.posicaoPrincipal) ?? 0) + 1,
      );
    }
    return ORDEM_POSICOES.slice()
      .sort((a, b) => {
        const diff = (contagem.get(a) ?? 0) - (contagem.get(b) ?? 0);
        if (diff !== 0) {
          return diff;
        }
        return ORDEM_POSICOES.indexOf(a) - ORDEM_POSICOES.indexOf(b);
      })
      .slice(0, 3)
      .map(posicao => {
        const candidatos = mercado.filter(
          j =>
            j.posicaoPrincipal === posicao && j.idade <= IDADE_JOVEM,
        ).length;
        return {
          posicao,
          titulo: `Buscar ${ROTULO_POSICAO[posicao]} até ${IDADE_JOVEM} anos`,
          noElenco: contagem.get(posicao) ?? 0,
          candidatos,
          progresso: Math.min(100, (candidatos / META_MISSAO) * 100),
        };
      });
  }, [jogadores, mercado, clubeUsuarioId]);

  const abrirJogador = (id: string) =>
    nav.navigate('PlayerDetail', {jogadorId: id});

  const semClube = clubeUsuarioId === null;

  return (
    <Screen
      scroll
      header={
        <AppHeader
          title="Central do Olheiro"
          onBack={() => nav.goBack()}
        />
      }>
      {semClube ? (
        <EmptyState
          icone="olho"
          title="Sem clube ativo"
          description="Assuma um clube para acionar a rede de olheiros."
        />
      ) : (
        <>
          <SegmentedTabs
            abas={ABAS}
            ativa={aba}
            onSelect={c => setAba(c as Aba)}
          />

          {aba === 'relatorios' ? (
            <>
              <SectionHeader titulo="Relatórios de scouting" />
              {alvos.length === 0 ? (
                <EmptyState
                  icone="olho"
                  title="Nenhum alvo mapeado"
                  description="Os olheiros ainda não trouxeram relatórios do mercado."
                />
              ) : (
                <View style={estilos.lista}>
                  {alvos.map(alvo => (
                    <LinhaAlvo
                      key={alvo.jogador.id}
                      alvo={alvo}
                      onVer={() => abrirJogador(alvo.jogador.id)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : null}

          {aba === 'observados' ? (
            <>
              <SectionHeader titulo="Joias na mira" />
              {observados.length === 0 ? (
                <EmptyState
                  icone="estrela"
                  title="Nenhum observado"
                  description="Sem jovens com margem de evolução entre os alvos atuais."
                />
              ) : (
                <View style={estilos.lista}>
                  {observados.map(alvo => (
                    <LinhaAlvo
                      key={alvo.jogador.id}
                      alvo={alvo}
                      onVer={() => abrirJogador(alvo.jogador.id)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : null}

          {aba === 'missoes' ? (
            <>
              <SectionHeader titulo="Missões do olheiro" />
              {missoes.length === 0 ? (
                <EmptyState
                  icone="busca"
                  title="Sem missões"
                  description="Seu elenco está equilibrado por posição no momento."
                />
              ) : (
                <View style={estilos.lista}>
                  {missoes.map((missao, i) => (
                    <CartaoMissao
                      key={missao.posicao}
                      missao={missao}
                      cor={
                        missao.candidatos > 0 ? cores.success : cores.textMuted
                      }
                      primeira={i === 0}
                    />
                  ))}
                </View>
              )}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

/** Linha de alvo: avatar · posição/idade/conhecimento · overall(+potencial) · CTA. */
function LinhaAlvo({
  alvo,
  onVer,
}: {
  alvo: AlvoOlheiro;
  onVer: () => void;
}): React.JSX.Element {
  const {jogador, clube, conhecimento} = alvo;
  return (
    <Card variante="outlined" style={estilos.cartao}>
      <View style={estilos.cabecalho}>
        <PlayerAvatar id={jogador.id} tamanho={44} />
        <View style={estilos.info}>
          <Text variant="labelL" numberOfLines={1}>
            {nomeCurto(jogador)}
          </Text>
          <View style={estilos.meta}>
            <PositionBadge posicao={jogador.posicaoPrincipal} tamanho="sm" />
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {jogador.idade} anos{clube ? ` · ${clube.sigla}` : ''}
            </Text>
          </View>
        </View>
        <View style={estilos.numeros}>
          <Text variant="titleM" tabular>
            {jogador.overall}
          </Text>
          <Text variant="caption" color="textSecondary" tabular>
            {textoPotencial(jogador, conhecimento)}
          </Text>
        </View>
      </View>
      <View style={estilos.rodape}>
        <Badge label={conhecimento} tom={TOM_CONHECIMENTO[conhecimento]} />
        <Button
          titulo="Ver jogador"
          variante="secondary"
          tamanho="sm"
          icone="olho"
          onPress={onVer}
        />
      </View>
    </Card>
  );
}

/** Cartão de missão: carência do elenco + progresso pela oferta real do mercado. */
function CartaoMissao({
  missao,
  cor,
  primeira,
}: {
  missao: Missao;
  cor: string;
  primeira: boolean;
}): React.JSX.Element {
  return (
    <Card variante={primeira ? 'status' : 'outlined'} style={estilos.missao}>
      <View style={estilos.missaoTopo}>
        <View style={estilos.flex}>
          <Text variant="labelL" numberOfLines={2}>
            {missao.titulo}
          </Text>
          <Text variant="caption" color="textSecondary">
            {missao.noElenco === 0
              ? 'Nenhum no elenco nessa posição'
              : `${missao.noElenco} no elenco nessa posição`}
          </Text>
        </View>
        <Badge
          label={`${missao.candidatos}`}
          tom={missao.candidatos > 0 ? 'success' : 'neutral'}
          solido
        />
      </View>
      <ProgressBar valor={missao.progresso} cor={cor} />
      <Text variant="caption" color="textMuted">
        {missao.candidatos === 0
          ? 'Nenhum candidato jovem no mercado'
          : `${missao.candidatos} candidato${
              missao.candidatos > 1 ? 's' : ''
            } jovem${missao.candidatos > 1 ? 's' : ''} no mercado`}
      </Text>
    </Card>
  );
}

export default CentralOlheiro;

const estilos = StyleSheet.create({
  flex: {flex: 1},
  lista: {gap: espacamento[2]},
  cartao: {gap: espacamento[3]},
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
  },
  info: {flex: 1, gap: 3},
  meta: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  numeros: {alignItems: 'flex-end', gap: 2},
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[2],
  },
  missao: {gap: espacamento[2]},
  missaoTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacamento[3],
  },
});
