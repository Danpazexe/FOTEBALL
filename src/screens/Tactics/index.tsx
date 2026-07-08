/**
 * Tela Tática. Escalação estilo FUT: o técnico monta o time num campo com CARTAS
 * (CampoFUT) — arrasta um card sobre outro para trocar, ou puxa um reserva do
 * banco horizontal sobre um titular para substituir. O cabeçalho traz clube,
 * overall do time e card do técnico; o banner valida as regras mínimas. Também há
 * "preencher rápido" por esquema-base e as instruções táticas.
 *
 * Mantém o scroll travado enquanto há um arraste em curso, para o gesto de
 * reposicionar não disputar com a rolagem da tela.
 */

import React, {useState} from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import CampoFUT from '../../components/CampoFUT';
import Chip from '../../components/Chip';
import {useConfirm} from '../../components/feedback';
import {AppHeader, OptionGroup, Section} from '../../components/ui';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../api/database/seed/defaults';
import {ESTRATEGIAS, estrategiaAtiva} from '../../engine/tactics/estrategias';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useForcaUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, espaco} from '../../theme';
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
const OPCOES_LADO: NonNullable<Tatica['ladoAtaque']>[] = [
  'Esquerda',
  'Centro',
  'Direita',
  'Ambos',
];
const OPCOES_AMPLIDAO: NonNullable<Tatica['amplidao']>[] = [
  'Estreito',
  'Normal',
  'Amplo',
];

function Tactics(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const jogadores = useJogadoresUsuario();
  const forca = useForcaUsuario();
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
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

  if (!clubeUsuario || !taticaAtual || !formacao) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.vazio}>
          <Text style={styles.vazioTexto}>Carregando escalação…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const estrategia = estrategiaAtiva(taticaAtual);
  const formacaoTipo = formacao.tipo;

  // Trocar de esquema remonta TODA a escalação (ação destrutiva) — confirma antes.
  async function aplicarFormacao(
    tipo: (typeof FORMACOES_DISPONIVEIS)[number],
  ): Promise<void> {
    if (tipo === formacaoTipo) {
      return;
    }
    const ok = await confirm({
      titulo: `Trocar para ${tipo}?`,
      mensagem:
        'Isso remonta toda a escalação a partir do novo esquema, desfazendo ajustes manuais de posição.',
      confirmarLabel: 'Trocar',
    });
    if (!ok) {
      return;
    }
    atualizarFormacaoUsuario(montarFormacao(jogadores, tipo));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        scrollEnabled={!arrastando}
        showsVerticalScrollIndicator={false}>
        <AppHeader
          titulo="Escalação"
          subtitulo={clubeUsuario.nome}
          onBack={() => nav.goBack()}
        />

        <CampoFUT
          clube={clubeUsuario}
          formacao={formacao}
          jogadores={jogadores}
          tatica={taticaAtual}
          forca={forca}
          reputacaoTecnico={reputacaoTecnico}
          largura={largura}
          onAtualizarFormacao={atualizarFormacaoUsuario}
          onArrastandoChange={setArrastando}
          onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
        />

        <Section titulo="Estratégia">
          <View style={styles.chipRow}>
            {ESTRATEGIAS.map(estr => (
              <Chip
                key={estr.nome}
                label={estr.nome}
                ativo={estr.nome === estrategia}
                onPress={() => atualizarTaticaUsuario(estr.tatica)}
              />
            ))}
          </View>
        </Section>

        <Section titulo="Formação">
          <View style={styles.chipRow}>
            {FORMACOES_DISPONIVEIS.map(tipo => (
              <Chip
                key={tipo}
                label={tipo}
                ativo={tipo === formacaoTipo}
                onPress={() => aplicarFormacao(tipo)}
              />
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
          <OptionGroup
            titulo="Lado de ataque"
            valor={taticaAtual.ladoAtaque ?? 'Ambos'}
            opcoes={OPCOES_LADO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                ladoAtaque: valor as NonNullable<Tatica['ladoAtaque']>,
              })
            }
          />
          <OptionGroup
            titulo="Amplidão"
            valor={taticaAtual.amplidao ?? 'Normal'}
            opcoes={OPCOES_AMPLIDAO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                amplidao: valor as NonNullable<Tatica['amplidao']>,
              })
            }
          />
        </Section>
      </ScrollView>
    </SafeAreaView>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  vazio: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: espaco.xl,
  },
  vazioTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
});
