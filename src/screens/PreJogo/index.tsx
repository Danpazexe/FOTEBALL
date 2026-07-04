/**
 * Central de PRÉ-JOGO. Reúne tudo que o técnico faz antes do apito:
 *  - ver o adversário (forças, favoritismo, comparativo);
 *  - ajustar a escalação / trocar formação / escolher titulares e reservas
 *    (via DraggablePitch — arrastar);
 *  - conferir condição física e moral do time titular;
 *  - ajustar a tática (estilo, marcação, linha, ritmo);
 *  - confirmar o início: Simular ou Jogar ao vivo.
 *
 * A escalação e a tática são persistidas na hora (mesmas actions da tela de
 * Tática); o MatchSimulation tira um retrato antes do jogo, então mexer aqui
 * não vaza para a escalação oficial se a partida for abandonada.
 *
 * O scroll trava enquanto há um arraste no campo (o gesto não disputa com a
 * rolagem), como na tela de Tática.
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {AppHeader, Botao, OptionGroup, Section} from '../../components/ui';
import BarrasForca from '../../components/BarrasForca';
import CampoFUT from '../../components/CampoFUT';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import {useToast} from '../../components/feedback';
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
  corCondicao,
  corDoClube,
  espaco,
  raio,
  sombra,
  suaves,
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
  ataque: 'o ataque',
  meio: 'o meio-campo',
  defesa: 'a defesa',
};

function nivelCor(n: NivelConfronto): string {
  if (n === 'favoravel') {
    return cores.primariaEscura;
  }
  if (n === 'arriscado') {
    return cores.perigo;
  }
  return cores.secundariaEscura;
}

function nivelFundo(n: NivelConfronto): string {
  if (n === 'favoravel') {
    return suaves.verde;
  }
  if (n === 'arriscado') {
    return suaves.vermelho;
  }
  return suaves.amarelo;
}

function PreJogo(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();

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

  // Fixa a tática do adversário no estado, pra a simulação (Simular e ao vivo)
  // usar a MESMA que o preview mostra — leitura honesta.
  useEffect(() => {
    if (advInfo) {
      definirTaticaAdversario(advInfo.id, advInfo.tatica);
    }
  }, [advInfo, definirTaticaAdversario]);

  // Scout do adversário — força por setor + craque + ponto fraco do elenco dele.
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
  const advTatica = advInfo?.tatica ?? null;
  const leitura = advTatica ? avaliarConfronto(taticaAtual, advTatica) : null;
  const diff = forcaMinha.overall + (mandoCasa ? 3 : 0) - forcaDele.overall;
  const favoritismo =
    Math.abs(diff) < 2
      ? 'Confronto equilibrado'
      : `${diff > 0 ? 'Favorito' : 'Azarão'}${
          Math.abs(diff) >= 6 ? '' : ' leve'
        }`;

  const podeJogar = validacao?.valido ?? false;

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

        {/* ADVERSÁRIO */}
        <View style={styles.versusCard}>
          <View style={styles.confronto}>
            <View style={styles.time}>
              <Escudo
                clubeId={confronto.casa.id}
                sigla={confronto.casa.sigla}
                tamanho={50}
              />
              <Text style={styles.timeNome} numberOfLines={1}>
                {confronto.casa.nome}
              </Text>
              <Text style={styles.forca}>
                {Math.round(confronto.forcaCasa.overall)}
              </Text>
              <Text style={styles.mando}>Casa</Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={styles.time}>
              <Escudo
                clubeId={confronto.fora.id}
                sigla={confronto.fora.sigla}
                tamanho={50}
              />
              <Text style={styles.timeNome} numberOfLines={1}>
                {confronto.fora.nome}
              </Text>
              <Text style={styles.forca}>
                {Math.round(confronto.forcaFora.overall)}
              </Text>
              <Text style={styles.mando}>Fora</Text>
            </View>
          </View>
          <View style={styles.favoritismoChip}>
            <Text style={styles.favoritismoTexto}>{favoritismo}</Text>
          </View>
          <View style={styles.barras}>
            <BarrasForca
              casa={confronto.forcaCasa}
              fora={confronto.forcaFora}
              corCasa={corDoClube(confronto.casa.id)}
              corFora={corDoClube(confronto.fora.id)}
            />
          </View>
        </View>

        {/* LEITURA DO ADVERSÁRIO (preview tático) */}
        {advTatica && leitura ? (
          <View style={styles.leituraCard}>
            <View style={styles.leituraHeader}>
              <Icone nome="tatica" tamanho={15} cor={cores.primaria} />
              <Text style={styles.leituraTitulo}>Leitura do adversário</Text>
            </View>
            <Text style={styles.leituraSub}>Provável postura dele:</Text>
            <View style={styles.leituraChips}>
              <View style={styles.leituraChip}>
                <Text style={styles.leituraChipTxt}>
                  {advTatica.estiloOfensivo}
                </Text>
              </View>
              <View style={styles.leituraChip}>
                <Text style={styles.leituraChipTxt}>
                  Linha {advTatica.linhaDefensiva.toLowerCase()}
                </Text>
              </View>
              <View style={styles.leituraChip}>
                <Text style={styles.leituraChipTxt}>{advTatica.marcacao}</Text>
              </View>
            </View>
            <View
              style={[
                styles.nivelBadge,
                {
                  backgroundColor: nivelFundo(leitura.nivel),
                  borderColor: nivelCor(leitura.nivel),
                },
              ]}>
              <Text style={[styles.nivelTxt, {color: nivelCor(leitura.nivel)}]}>
                {NIVEL_TEXTO[leitura.nivel]}
              </Text>
            </View>
            {leitura.riscos.slice(0, 2).map(risco => (
              <Text key={risco} style={[styles.linhaLeitura, styles.risco]}>
                Risco: {risco}
              </Text>
            ))}
            {leitura.vantagens.slice(0, 1).map(vantagem => (
              <Text key={vantagem} style={[styles.linhaLeitura, styles.vantagem]}>
                Vantagem: {vantagem}
              </Text>
            ))}
            {leitura.sugestao ? (
              <Text style={[styles.linhaLeitura, styles.sugestaoTxt]}>
                Sugestão: {leitura.sugestao}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* SCOUT DO ADVERSÁRIO (força por setor + craque + ponto fraco) */}
        {scout ? (
          <View style={styles.leituraCard}>
            <View style={styles.leituraHeader}>
              <Icone nome="olho" tamanho={15} cor={cores.primaria} />
              <Text style={styles.leituraTitulo}>Scout do adversário</Text>
            </View>
            <View style={styles.scoutSetores}>
              <View style={styles.scoutSetor}>
                <Text style={styles.scoutSetorRotulo}>ATA</Text>
                <Text style={styles.scoutSetorForca}>{scout.forcaAtaque}</Text>
              </View>
              <View style={styles.scoutSetor}>
                <Text style={styles.scoutSetorRotulo}>MEI</Text>
                <Text style={styles.scoutSetorForca}>{scout.forcaMeio}</Text>
              </View>
              <View style={styles.scoutSetor}>
                <Text style={styles.scoutSetorRotulo}>DEF</Text>
                <Text style={styles.scoutSetorForca}>{scout.forcaDefesa}</Text>
              </View>
            </View>
            {scout.melhorJogador ? (
              <Text style={styles.linhaLeitura}>
                Craque: {scout.melhorJogador.nome} (
                {scout.melhorJogador.posicao} · {scout.melhorJogador.overall})
              </Text>
            ) : null}
            <Text style={[styles.linhaLeitura, styles.vantagem]}>
              Ponto fraco: {SETOR_LABEL[scout.setorFraco]}
            </Text>
          </View>
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
              <Pressable
                accessibilityRole="button"
                key={tipo}
                onPress={() =>
                  atualizarFormacaoUsuario(montarFormacao(jogadoresUsuario, tipo))
                }
                style={[
                  styles.chip,
                  formacao.tipo === tipo && styles.chipAtivo,
                ]}>
                <Text
                  style={[
                    styles.chipTexto,
                    formacao.tipo === tipo && styles.chipTextoAtivo,
                  ]}>
                  {tipo}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* CONDIÇÃO & MORAL */}
        <Section titulo="Condição & moral do time">
          <View style={styles.card}>
            {titulares.map(jogador => (
              <View key={jogador.id} style={styles.jogadorLinha}>
                <Text style={styles.jogadorPos}>
                  {jogador.posicaoPrincipal}
                </Text>
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
                <Text style={styles.condNum}>{jogador.condicaoFisica}</Text>
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
              <View style={[styles.moralPonto, {backgroundColor: acentos.verde}]} />
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
        {!podeJogar ? (
          <Text style={styles.avisoJogar}>
            Ajuste a escalação para liberar o início da partida.
          </Text>
        ) : null}
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
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    padding: espaco.md,
    ...sombra.suave,
  },
  // ADVERSÁRIO
  versusCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.md,
    marginBottom: espaco.md,
    padding: espaco.lg,
    ...sombra.suave,
  },
  confronto: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    alignItems: 'center',
    flex: 1,
    gap: espaco.xs,
  },
  timeNome: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  forca: {
    color: cores.primaria,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  mando: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  vs: {
    color: cores.textoSecundario,
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: espaco.sm,
    paddingTop: espaco.xl,
  },
  favoritismoChip: {
    alignSelf: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.pill,
    paddingHorizontal: espaco.md,
    paddingVertical: 5,
  },
  favoritismoTexto: {
    color: cores.secundariaEscura,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  barras: {
    alignItems: 'center',
  },
  // LEITURA DO ADVERSÁRIO
  leituraCard: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    marginBottom: espaco.md,
    padding: espaco.lg,
    ...sombra.suave,
  },
  scoutSetores: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginVertical: espaco.xs,
  },
  scoutSetor: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    flex: 1,
    gap: 2,
    paddingVertical: espaco.sm,
  },
  scoutSetorRotulo: {
    color: cores.textoMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoutSetorForca: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '900',
  },
  leituraHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  leituraTitulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '900',
  },
  leituraSub: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  leituraChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
  },
  leituraChip: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  leituraChipTxt: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  nivelBadge: {
    alignSelf: 'flex-start',
    borderRadius: raio.sm,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  nivelTxt: {
    fontSize: 12,
    fontWeight: '800',
  },
  linhaLeitura: {
    fontSize: 12,
    fontWeight: '600',
  },
  risco: {
    color: cores.perigo,
  },
  vantagem: {
    color: cores.primariaEscura,
  },
  sugestaoTxt: {
    color: cores.secundariaEscura,
    fontWeight: '800',
  },
  // ESCALAÇÃO
  subTitulo: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
    marginTop: espaco.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  chip: {
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: espaco.md,
  },
  chipAtivo: {
    backgroundColor: suaves.verde,
    borderColor: cores.primaria,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextoAtivo: {
    color: cores.primariaEscura,
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
  avisoJogar: {
    color: cores.secundariaEscura,
    fontSize: 12,
    fontWeight: '700',
    marginTop: espaco.md,
    textAlign: 'center',
  },
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
