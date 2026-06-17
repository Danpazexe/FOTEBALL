/**
 * Tela Tática. Escalação LIVRE: o técnico arrasta cada jogador para onde quiser
 * no campo (DraggablePitch) e o sistema detecta a formação resultante e valida as
 * regras mínimas. Também traz "preencher rápido" por esquema-base (atalho, não
 * obrigatório) e as instruções táticas (estilo, marcação, linha, ritmo).
 *
 * Mantém o scroll travado enquanto há um arraste em curso, para o gesto de
 * reposicionar não disputar com a rolagem da tela.
 */

import React, {useMemo, useState} from 'react';
import {Dimensions, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import DraggablePitch from '../../components/DraggablePitch';
import {
  AppHeader,
  Metric,
  MetricsRow,
  OptionGroup,
  Section,
} from '../../components/ui';
import Icone from '../../components/Icone';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../api/database/seed/defaults';
import {detectarFormacao} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useForcaUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import type {Tatica} from '../../types';

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

function Tactics(): React.JSX.Element {
  const nav = useAppNavigation();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const jogadores = useJogadoresUsuario();
  const forca = useForcaUsuario();
  const atualizarTaticaUsuario = useGameStore(
    state => state.atualizarTaticaUsuario,
  );
  const atualizarFormacaoUsuario = useGameStore(
    state => state.atualizarFormacaoUsuario,
  );

  const [arrastando, setArrastando] = useState(false);

  const formacao = clubeUsuario?.formacaoAtual ?? null;
  const taticaAtual = clubeUsuario?.taticaAtual ?? null;

  const largura = Math.min(Dimensions.get('window').width - espaco.lg * 2, 360);

  const validacao = useMemo(
    () => (formacao ? validarEscalacao(formacao, jogadores) : null),
    [formacao, jogadores],
  );
  const formacaoDetectada = useMemo(
    () => (formacao ? detectarFormacao(formacao.titulares) : '—'),
    [formacao],
  );

  if (!clubeUsuario || !taticaAtual || !formacao) {
    return <SafeAreaView style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        scrollEnabled={!arrastando}
        showsVerticalScrollIndicator={false}>
        <AppHeader titulo="Tática" subtitulo={clubeUsuario.nome} />

        <MetricsRow>
          <Metric label="Ataque" valor={(forca?.ataque ?? 0).toFixed(0)} />
          <Metric label="Meio" valor={(forca?.meio ?? 0).toFixed(0)} />
          <Metric label="Defesa" valor={(forca?.defesa ?? 0).toFixed(0)} />
        </MetricsRow>

        <Section titulo="Escalação">
          {/* Formação detectada + status de validação */}
          <View style={styles.detectada}>
            <View style={styles.detectadaChip}>
              <Icone nome="tatica" tamanho={15} cor={cores.primaria} />
              <Text style={styles.detectadaTexto}>
                Formação detectada:{' '}
                <Text style={styles.detectadaForte}>{formacaoDetectada}</Text>
              </Text>
            </View>
          </View>

          {validacao ? <BannerValidacao validacao={validacao} /> : null}

          <DraggablePitch
            formacao={formacao}
            jogadores={jogadores}
            largura={largura}
            onAtualizarFormacao={atualizarFormacaoUsuario}
            onArrastandoChange={setArrastando}
            onAbrirJogador={jogadorId =>
              nav.navigate('PlayerDetail', {jogadorId})
            }
          />

          {/* Preencher rápido por esquema-base (atalho opcional) */}
          <Text style={styles.preencherTitulo}>Preencher rápido</Text>
          <View style={styles.chipRow}>
            {FORMACOES_DISPONIVEIS.map(tipo => (
              <Pressable
                accessibilityRole="button"
                key={tipo}
                onPress={() =>
                  atualizarFormacaoUsuario(montarFormacao(jogadores, tipo))
                }
                style={styles.chip}>
                <Text style={styles.chipTexto}>{tipo}</Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section titulo="Instruções">
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
          <Text style={[styles.bannerTitulo, {color: cores.secundaria}]}>
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
      <Text style={[styles.bannerTitulo, {color: cores.primaria}]}>
        Escalação válida
      </Text>
    </View>
  );
}

export default Tactics;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: cores.fundo,
    flex: 1,
  },
  conteudo: {
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
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
  banner: {
    alignItems: 'flex-start',
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.sm,
  },
  bannerErro: {
    backgroundColor: 'rgba(255,59,92,0.1)',
    borderColor: cores.perigo,
  },
  bannerAviso: {
    backgroundColor: 'rgba(255,214,0,0.1)',
    borderColor: cores.secundaria,
  },
  bannerOk: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,229,160,0.08)',
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
  preencherTitulo: {
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
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
});
