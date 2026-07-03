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

import React, {useMemo, useState} from 'react';
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
import DraggablePitch from '../../components/DraggablePitch';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import {useToast} from '../../components/feedback';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../api/database/seed/defaults';
import {detectarFormacao} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
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
  corDoTime,
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

  const formacao = clubeUsuario?.formacaoAtual ?? null;
  const taticaAtual = clubeUsuario?.taticaAtual ?? null;

  const validacao = useMemo(
    () => (formacao ? validarEscalacao(formacao, jogadoresUsuario) : null),
    [formacao, jogadoresUsuario],
  );
  const formacaoDetectada = useMemo(
    () => (formacao ? detectarFormacao(formacao.titulares) : '—'),
    [formacao],
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
              corCasa={corDoTime(confronto.casa.id)}
              corFora={corDoTime(confronto.fora.id)}
            />
          </View>
        </View>

        {/* ESCALAÇÃO */}
        <Section titulo="Escalação">
          <View style={styles.detectada}>
            <View style={styles.detectadaChip}>
              <Icone nome="tatica" tamanho={14} cor={cores.primaria} />
              <Text style={styles.detectadaTexto}>
                Formação:{' '}
                <Text style={styles.detectadaForte}>{formacaoDetectada}</Text>
              </Text>
            </View>
          </View>

          {validacao ? <BannerValidacao validacao={validacao} /> : null}

          <DraggablePitch
            formacao={formacao}
            jogadores={jogadoresUsuario}
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

function BannerValidacao({
  validacao,
}: {
  validacao: ReturnType<typeof validarEscalacao>;
}): React.JSX.Element {
  if (!validacao.valido) {
    return (
      <View style={[styles.banner, styles.bannerErro]}>
        <Icone nome="fechar" tamanho={15} cor={cores.perigo} />
        <View style={styles.bannerTextos}>
          <Text style={[styles.bannerTitulo, {color: cores.perigo}]}>
            Escalação inválida
          </Text>
          {validacao.erros.map(erro => (
            <Text key={erro} style={styles.bannerLinha}>
              • {erro}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  if (validacao.avisos.length > 0) {
    return (
      <View style={[styles.banner, styles.bannerAviso]}>
        <Icone nome="lesao" tamanho={15} cor={cores.secundaria} />
        <View style={styles.bannerTextos}>
          <Text style={[styles.bannerTitulo, {color: cores.secundariaEscura}]}>
            Atenção
          </Text>
          {validacao.avisos.map(aviso => (
            <Text key={aviso} style={styles.bannerLinha}>
              • {aviso}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, styles.bannerOk]}>
      <Icone nome="check" tamanho={15} cor={cores.primaria} />
      <Text style={[styles.bannerTitulo, {color: cores.primariaEscura}]}>
        Escalação válida
      </Text>
    </View>
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
  // ESCALAÇÃO
  detectada: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  detectadaChip: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.xs,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  detectadaTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  detectadaForte: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '900',
  },
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
  // VALIDAÇÃO
  banner: {
    alignItems: 'flex-start',
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.sm,
  },
  bannerErro: {
    backgroundColor: suaves.vermelho,
    borderColor: cores.perigo,
  },
  bannerAviso: {
    backgroundColor: suaves.amarelo,
    borderColor: cores.secundaria,
  },
  bannerOk: {
    alignItems: 'center',
    backgroundColor: suaves.verde,
    borderColor: cores.primaria,
  },
  bannerTextos: {
    flex: 1,
    gap: 2,
  },
  bannerTitulo: {
    fontSize: 13,
    fontWeight: '800',
  },
  bannerLinha: {
    color: cores.textoSecundario,
    fontSize: 12,
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
