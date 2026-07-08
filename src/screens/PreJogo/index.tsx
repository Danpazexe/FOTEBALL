/**
 * Central de PRÉ-JOGO (redesenho). Uma tela de decisão: primeiro o CONFRONTO,
 * depois a SUA PRONTIDÃO (o que libera/bloqueia entrar em campo — validação,
 * fadiga, desfalques), o DOSSIÊ do adversário (intel acionável, não números
 * soltos), a escalação no campo, condição/moral do time, o ajuste de tática e,
 * por fim, o gate Simular / Jogar ao vivo.
 *
 * A escalação e a tática são persistidas na hora (mesmas actions da tela de
 * Tática); o MatchSimulation tira um retrato antes do jogo, então mexer aqui
 * não vaza para a escalação oficial se a partida for abandonada.
 *
 * O scroll trava enquanto há um arraste no campo (o gesto não disputa com a
 * rolagem), como na tela de Tática.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Dimensions, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppHeader, Botao, OptionGroup, Section} from '../../components/ui';
import BarrasForca from '../../components/BarrasForca';
import CampoFUT from '../../components/CampoFUT';
import Chip from '../../components/Chip';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import StatCard from '../../components/StatCard';
import {useConfirm, useToast} from '../../components/feedback';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../api/database/seed/defaults';
import {
  avaliarConfronto,
  taticaProvavelIA,
  type NivelConfronto,
} from '../../engine/tactics/preview';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {analisarAdversario, type Setor} from '../../engine/simulation/scout';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {
  acentos,
  cores,
  comAlfa,
  corCondicao,
  corDoClube,
  espaco,
  raio,
  sombra,
  suaves,
  tabular,
  tipografia,
} from '../../theme';
import {forcaDoClube} from '../../utils/forca';
import type {Player, Tatica} from '../../types';

const OPCOES_ESTILO: Tatica['estiloOfensivo'][] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Ataque direto',
];
const OPCOES_MARCACAO: Tatica['marcacao'][] = [
  'Zona',
  'Individual',
  'Pressão alta',
];
const OPCOES_LINHA: Tatica['linhaDefensiva'][] = [
  'Recuada',
  'Normal',
  'Adiantada',
];
const OPCOES_RITMO: Tatica['ritmo'][] = ['Lento', 'Normal', 'Intenso'];

/** Cor da moral (verde alta · amarelo média · vermelho baixa). */
function corMoral(valor: number): string {
  if (valor >= 70) {
    return acentos.verde;
  }
  if (valor >= 45) {
    return acentos.amarelo;
  }
  return acentos.vermelho;
}

function nomeCurto(jogador: Player): string {
  return jogador.apelido ?? jogador.nome;
}

const NIVEL_TEXTO: Record<NivelConfronto, string> = {
  favoravel: 'Confronto favorável a você',
  neutro: 'Confronto equilibrado',
  arriscado: 'Confronto arriscado',
};

const SETOR_LABEL: Record<Setor, string> = {
  ataque: 'o ataque deles',
  meio: 'o meio-campo deles',
  defesa: 'a defesa deles',
};

function nivelCor(n: NivelConfronto): string {
  if (n === 'favoravel') {
    return cores.sucesso;
  }
  if (n === 'arriscado') {
    return cores.perigo;
  }
  return cores.aviso;
}

function PreJogo(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const confirm = useConfirm();

  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const jogadoresUsuario = useJogadoresUsuario();
  const proximo = useGameStore(selecionarProximoJogo);
  const avancarRodada = useGameStore(state => state.avancarRodada);
  const atualizarFormacaoUsuario = useGameStore(
    state => state.atualizarFormacaoUsuario,
  );
  const atualizarTaticaUsuario = useGameStore(
    state => state.atualizarTaticaUsuario,
  );
  const definirTaticaAdversario = useGameStore(
    state => state.definirTaticaAdversario,
  );
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);

  const [arrastando, setArrastando] = useState(false);

  const largura = Math.min(Dimensions.get('window').width - espaco.lg * 2, 360);

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

  // Fixa a tática do adversário no estado UMA vez por confronto. Cuidado: definir
  // a tática muda a FORÇA do clube (calcularForcaTime usa a tática), o que
  // recalcularia `confronto`→`advInfo` e re-dispararia este efeito com uma nova
  // recomendação — um loop de feedback ("Maximum update depth exceeded"). O guard
  // por id do adversário corta o loop (a tela remonta a cada nova partida).
  const advFixadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (advInfo && advFixadoRef.current !== advInfo.id) {
      advFixadoRef.current = advInfo.id;
      definirTaticaAdversario(advInfo.id, advInfo.tatica);
    }
  }, [advInfo, definirTaticaAdversario]);

  // Scout do adversário — craque + ponto fraco do elenco dele.
  const scout = useMemo(() => {
    if (!advInfo) {
      return null;
    }
    const elenco = jogadores.filter(j => j.clubeId === advInfo.id);
    return elenco.length > 0 ? analisarAdversario(elenco) : null;
  }, [advInfo, jogadores]);

  const formacao = clubeUsuario?.formacaoAtual ?? null;
  const taticaAtual = clubeUsuario?.taticaAtual ?? null;

  const validacao = useMemo(
    () => (formacao ? validarEscalacao(formacao, jogadoresUsuario) : null),
    [formacao, jogadoresUsuario],
  );
  // Titulares (na ordem da formação) com o Player resolvido — condição/moral.
  const titulares = useMemo(() => {
    if (!formacao) {
      return [] as Player[];
    }
    const porId = new Map(jogadoresUsuario.map(j => [j.id, j]));
    return formacao.titulares
      .map(t => porId.get(t.jogadorId))
      .filter((j): j is Player => j !== undefined);
  }, [formacao, jogadoresUsuario]);

  // Prontidão do time: titulares em risco de fadiga e indisponíveis (lesão/susp.).
  const emFadiga = useMemo(
    () => titulares.filter(j => j.condicaoFisica < 70),
    [titulares],
  );
  const indisponiveis = useMemo(
    () => titulares.filter(j => j.lesionado || j.suspenso),
    [titulares],
  );

  if (!proximo || !confronto || !clubeUsuario || !formacao || !taticaAtual) {
    return (
      <SafeAreaView style={styles.screen}>
        <AppHeader titulo="Pré-jogo" onBack={() => nav.goBack()} />
        <Text style={styles.vazio}>Nenhum jogo agendado.</Text>
      </SafeAreaView>
    );
  }

  const mandoCasa = proximo.timeCasa === clubeUsuario.id;
  const forcaMinha = mandoCasa ? confronto.forcaCasa : confronto.forcaFora;
  const forcaDele = mandoCasa ? confronto.forcaFora : confronto.forcaCasa;
  const adversario = mandoCasa ? confronto.fora : confronto.casa;
  const advTatica = advInfo?.tatica ?? null;
  const leitura = advTatica ? avaliarConfronto(taticaAtual, advTatica) : null;
  const diff = forcaMinha.overall + (mandoCasa ? 3 : 0) - forcaDele.overall;
  const favoritismo =
    Math.abs(diff) < 2
      ? 'Equilíbrio'
      : `${diff > 0 ? 'Favorito' : 'Azarão'}${
          Math.abs(diff) >= 6 ? '' : ' leve'
        }`;
  const corFavoritismo =
    diff >= 2 ? cores.sucesso : diff <= -2 ? cores.perigo : cores.textoSecundario;

  const podeJogar = validacao?.valido ?? false;
  const erros = validacao?.erros ?? [];
  const formacaoTipo = formacao.tipo;

  // Trocar de esquema remonta a escalação (desfaz o arraste manual) — confirma.
  async function trocarFormacao(
    tipo: (typeof FORMACOES_DISPONIVEIS)[number],
  ): Promise<void> {
    if (tipo === formacaoTipo) {
      return;
    }
    const ok = await confirm({
      titulo: `Trocar para ${tipo}?`,
      mensagem:
        'Remonta a escalação a partir do novo esquema, desfazendo ajustes manuais de posição.',
      confirmarLabel: 'Trocar',
    });
    if (!ok) {
      return;
    }
    atualizarFormacaoUsuario(montarFormacao(jogadoresUsuario, tipo));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        scrollEnabled={!arrastando}
        showsVerticalScrollIndicator={false}>
        <AppHeader
          titulo={`Rodada ${proximo.rodada}`}
          subtitulo={`Brasileirão ${clubeUsuario.divisao ?? 'Série A'}`}
          onBack={() => nav.goBack()}
        />

        {/* CONFRONTO — hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroConfronto}>
            <View style={styles.heroTime}>
              <Escudo
                clubeId={confronto.casa.id}
                sigla={confronto.casa.sigla}
                tamanho={54}
              />
              <Text style={styles.heroNome} numberOfLines={1}>
                {confronto.casa.nome}
              </Text>
              <Text style={[styles.heroOverall, tabular]}>
                {Math.round(confronto.forcaCasa.overall)}
              </Text>
              <Text style={[styles.heroMando, mandoCasa && styles.heroVoce]}>
                {mandoCasa ? 'VOCÊ · CASA' : 'CASA'}
              </Text>
            </View>

            <View style={styles.heroCentro}>
              <Text style={styles.heroVs}>VS</Text>
              <Chip label={favoritismo} tom="suave" cor={corFavoritismo} pequeno />
            </View>

            <View style={styles.heroTime}>
              <Escudo
                clubeId={confronto.fora.id}
                sigla={confronto.fora.sigla}
                tamanho={54}
              />
              <Text style={styles.heroNome} numberOfLines={1}>
                {confronto.fora.nome}
              </Text>
              <Text style={[styles.heroOverall, tabular]}>
                {Math.round(confronto.forcaFora.overall)}
              </Text>
              <Text style={[styles.heroMando, !mandoCasa && styles.heroVoce]}>
                {!mandoCasa ? 'VOCÊ · FORA' : 'FORA'}
              </Text>
            </View>
          </View>
          <BarrasForca
            casa={confronto.forcaCasa}
            fora={confronto.forcaFora}
            corCasa={corDoClube(confronto.casa.id)}
            corFora={corDoClube(confronto.fora.id)}
          />
        </View>

        {/* SUA PRONTIDÃO — o que libera/bloqueia entrar em campo */}
        <Section titulo="Sua prontidão">
          <View style={styles.prontidaoRow}>
            <StatCard
              label="Escalação"
              valor={podeJogar ? 'OK' : String(erros.length)}
              sub={podeJogar ? '11 em campo' : erros.length === 1 ? 'erro' : 'erros'}
              corValor={podeJogar ? cores.sucesso : cores.perigo}
            />
            <StatCard
              label="Fadiga"
              valor={String(emFadiga.length)}
              sub={emFadiga.length > 0 ? 'em risco' : 'inteiro'}
              corValor={emFadiga.length > 0 ? cores.aviso : cores.texto}
            />
            <StatCard
              label="Desfalques"
              valor={String(indisponiveis.length)}
              sub={indisponiveis.length > 0 ? 'lesão/susp.' : 'nenhum'}
              corValor={indisponiveis.length > 0 ? cores.perigo : cores.texto}
            />
          </View>
          {!podeJogar ? (
            <View style={styles.errosCard}>
              <View style={styles.errosHeader}>
                <Icone nome="apito" tamanho={14} cor={cores.perigo} />
                <Text style={styles.errosTitulo}>Escalação bloqueada</Text>
              </View>
              {erros.map(erro => (
                <Text key={erro} style={styles.erroTexto}>
                  • {erro}
                </Text>
              ))}
            </View>
          ) : null}
        </Section>

        {/* DOSSIÊ DO ADVERSÁRIO — intel acionável (sem caixa de números soltos) */}
        {advTatica || scout ? (
          <Section titulo={`Dossiê · ${adversario.nome}`}>
            <View style={styles.dossieCard}>
              {advTatica ? (
                <View style={styles.dossieLinha}>
                  <Text style={styles.dossieRotulo}>Como jogam</Text>
                  <View style={styles.dossieChips}>
                    <Chip label={advTatica.estiloOfensivo} pequeno />
                    <Chip
                      label={`Linha ${advTatica.linhaDefensiva.toLowerCase()}`}
                      pequeno
                    />
                    <Chip label={advTatica.marcacao} pequeno />
                  </View>
                </View>
              ) : null}

              {scout?.melhorJogador ? (
                <View style={styles.dossieLinha}>
                  <Text style={styles.dossieRotulo}>Vigie</Text>
                  <Text style={styles.dossieValor} numberOfLines={1}>
                    <Text style={styles.craque}>★ {scout.melhorJogador.nome}</Text>
                    <Text style={styles.dossieDetalhe}>
                      {'  '}
                      {scout.melhorJogador.posicao} ·{' '}
                    </Text>
                    <Text style={[styles.craque, tabular]}>
                      {scout.melhorJogador.overall}
                    </Text>
                  </Text>
                </View>
              ) : null}

              {scout ? (
                <View style={styles.dossieLinha}>
                  <Text style={styles.dossieRotulo}>Ataque por</Text>
                  <Text style={[styles.dossieValor, styles.pontoFraco]}>
                    {SETOR_LABEL[scout.setorFraco]}
                  </Text>
                </View>
              ) : null}

              {leitura ? (
                <View style={styles.leituraBox}>
                  <View
                    style={[
                      styles.nivelBadge,
                      {
                        backgroundColor: comAlfa(nivelCor(leitura.nivel), 0.14),
                        borderColor: comAlfa(nivelCor(leitura.nivel), 0.4),
                      },
                    ]}>
                    <Text
                      style={[styles.nivelTxt, {color: nivelCor(leitura.nivel)}]}>
                      {NIVEL_TEXTO[leitura.nivel]}
                    </Text>
                  </View>
                  {leitura.sugestao ? (
                    <Text style={styles.sugestao}>{leitura.sugestao}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          </Section>
        ) : null}

        {/* ESCALAÇÃO */}
        <Section titulo="Escalação">
          <CampoFUT
            clube={clubeUsuario}
            formacao={formacao}
            jogadores={jogadoresUsuario}
            tatica={taticaAtual}
            forca={forcaMinha}
            reputacaoTecnico={reputacaoTecnico}
            largura={largura}
            onAtualizarFormacao={atualizarFormacaoUsuario}
            onArrastandoChange={setArrastando}
            onAbrirJogador={jogadorId =>
              nav.navigate('PlayerDetail', {jogadorId})
            }
          />

          <Text style={styles.subTitulo}>Trocar formação</Text>
          <View style={styles.chipRow}>
            {FORMACOES_DISPONIVEIS.map(tipo => (
              <Chip
                key={tipo}
                label={tipo}
                ativo={formacaoTipo === tipo}
                onPress={() => trocarFormacao(tipo)}
              />
            ))}
          </View>
        </Section>

        {/* CONDIÇÃO & MORAL */}
        <Section titulo="Condição & moral do time">
          <View style={styles.card}>
            {titulares.map(jogador => (
              <View key={jogador.id} style={styles.jogadorLinha}>
                <Text style={styles.jogadorPos}>{jogador.posicaoPrincipal}</Text>
                <Text style={styles.jogadorNome} numberOfLines={1}>
                  {nomeCurto(jogador)}
                </Text>
                <View style={styles.condTrack}>
                  <View
                    style={[
                      styles.condFill,
                      {
                        width: `${jogador.condicaoFisica}%`,
                        backgroundColor: corCondicao(jogador.condicaoFisica),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.condNum, tabular]}>
                  {jogador.condicaoFisica}
                </Text>
                <View
                  style={[
                    styles.moralPonto,
                    {backgroundColor: corMoral(jogador.moral)},
                  ]}
                />
              </View>
            ))}
            <View style={styles.legenda}>
              <Icone nome="relogio" tamanho={12} cor={cores.textoSecundario} />
              <Text style={styles.legendaTexto}>condição física</Text>
              <View
                style={[styles.moralPonto, {backgroundColor: acentos.verde}]}
              />
              <Text style={styles.legendaTexto}>moral</Text>
            </View>
          </View>
        </Section>

        {/* TÁTICA */}
        <Section titulo="Tática">
          <OptionGroup
            titulo="Estilo ofensivo"
            valor={taticaAtual.estiloOfensivo}
            opcoes={OPCOES_ESTILO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                estiloOfensivo: valor as Tatica['estiloOfensivo'],
              })
            }
          />
          <OptionGroup
            titulo="Marcação"
            valor={taticaAtual.marcacao}
            opcoes={OPCOES_MARCACAO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                marcacao: valor as Tatica['marcacao'],
              })
            }
          />
          <OptionGroup
            titulo="Linha defensiva"
            valor={taticaAtual.linhaDefensiva}
            opcoes={OPCOES_LINHA}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                linhaDefensiva: valor as Tatica['linhaDefensiva'],
              })
            }
          />
          <OptionGroup
            titulo="Ritmo"
            valor={taticaAtual.ritmo}
            opcoes={OPCOES_RITMO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                ritmo: valor as Tatica['ritmo'],
              })
            }
          />
        </Section>

        {/* CONFIRMAR INÍCIO */}
        <View style={styles.acoes}>
          <View style={styles.acaoSimular}>
            <Botao
              variante="secundaria"
              icone="simular"
              titulo="Simular"
              disabled={!podeJogar}
              style={styles.botaoAltura}
              onPress={() => {
                avancarRodada();
                toast('Rodada simulada.', 'sucesso');
                nav.navigate('MainTabs');
              }}
            />
          </View>
          <View style={styles.acaoJogar}>
            <Botao
              variante="ouro"
              icone="jogar"
              titulo="Jogar ao vivo"
              disabled={!podeJogar}
              style={styles.botaoAltura}
              onPress={() => nav.navigate('MatchSimulation')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PreJogo;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: cores.fundo,
    flex: 1,
  },
  conteudo: {
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
  vazio: {
    color: cores.textoSecundario,
    fontSize: 14,
    padding: espaco.lg,
    textAlign: 'center',
  },
  // CONFRONTO — hero
  heroCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.lg,
    marginBottom: espaco.md,
    padding: espaco.lg,
    ...sombra.card,
  },
  heroConfronto: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTime: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.xs,
  },
  heroNome: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroOverall: {
    color: cores.primaria,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroMando: {
    color: cores.textoMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroVoce: {
    color: cores.secundaria,
  },
  heroCentro: {
    alignItems: 'center',
    gap: espaco.sm,
    paddingTop: espaco.xl,
  },
  heroVs: {
    color: cores.textoSecundario,
    fontSize: 16,
    fontWeight: '900',
  },
  // PRONTIDÃO
  prontidaoRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  errosCard: {
    backgroundColor: suaves.vermelho,
    borderColor: cores.perigo,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    marginTop: espaco.sm,
    padding: espaco.md,
  },
  errosHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  errosTitulo: {
    color: cores.perigo,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  erroTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  // DOSSIÊ
  dossieCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.lg,
    ...sombra.suave,
  },
  dossieLinha: {
    gap: espaco.xs,
  },
  dossieRotulo: {
    color: cores.textoMuted,
    ...tipografia.secao,
  },
  dossieValor: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  dossieDetalhe: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  dossieChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
  },
  craque: {
    color: cores.secundaria,
    fontWeight: '900',
  },
  pontoFraco: {
    color: cores.sucesso,
  },
  leituraBox: {
    borderTopColor: cores.borda,
    borderTopWidth: 1,
    gap: espaco.xs,
    marginTop: espaco.xs,
    paddingTop: espaco.sm,
  },
  nivelBadge: {
    alignSelf: 'flex-start',
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  nivelTxt: {
    fontSize: 12,
    fontWeight: '800',
  },
  sugestao: {
    color: cores.textoSecundario,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  // ESCALAÇÃO
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    padding: espaco.md,
    ...sombra.suave,
  },
  subTitulo: {
    color: cores.textoSecundario,
    ...tipografia.secao,
    marginTop: espaco.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  // CONDIÇÃO & MORAL
  jogadorLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: 5,
  },
  jogadorPos: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '800',
    minWidth: 26,
  },
  jogadorNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  condTrack: {
    backgroundColor: cores.fundoBase,
    borderRadius: raio.pill,
    height: 6,
    overflow: 'hidden',
    width: 70,
  },
  condFill: {
    borderRadius: raio.pill,
    height: '100%',
  },
  condNum: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'right',
  },
  moralPonto: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  legenda: {
    alignItems: 'center',
    borderTopColor: cores.borda,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: espaco.xs,
    marginTop: espaco.sm,
    paddingTop: espaco.sm,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
    marginRight: espaco.sm,
  },
  // CONFIRMAR
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.md,
  },
  acaoSimular: {
    flex: 1,
  },
  acaoJogar: {
    flex: 2,
  },
  botaoAltura: {
    minHeight: 54,
  },
});
