/**
 * Tela Tática. Escalação estilo FUT: o técnico monta o time num campo com CARTAS
 * (CampoFUT) — arrasta um card sobre outro para trocar, ou puxa um reserva do
 * banco horizontal sobre um titular para substituir. O cabeçalho traz clube,
 * overall do time e card do técnico; o banner valida as regras mínimas. Também há
 * "escalar os 11 melhores" por esquema-base e as instruções táticas.
 *
 * Mantém o scroll travado enquanto há um arraste em curso, para o gesto de
 * reposicionar não disputar com a rolagem da tela. Migrado ao Design System v2.
 */

import React, {useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import CampoFUT from '../../components/CampoFUT';
import {useConfirm, useToast} from '../../components/feedback';
import {
  AppBar,
  Button,
  Chip,
  Screen,
  Text,
  espacamento,
} from '../../design-system';
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

/** Bloco com rótulo em caixa-alta + conteúdo (substitui o Section antigo). */
function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.grupo}>
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Instrução tática: rótulo + linha de chips (seleção única). */
function GrupoInstrucao({
  titulo,
  valor,
  opcoes,
  onSelect,
}: {
  titulo: string;
  valor: string;
  opcoes: readonly string[];
  onSelect: (valor: string) => void;
}): React.JSX.Element {
  return (
    <Grupo titulo={titulo}>
      <View style={styles.chipRow}>
        {opcoes.map(opcao => (
          <Chip
            key={opcao}
            label={opcao}
            selected={valor === opcao}
            onPress={() => onSelect(opcao)}
          />
        ))}
      </View>
    </Grupo>
  );
}

function Tactics(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();
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

  const largura = Math.min(
    Dimensions.get('window').width - espacamento[4] * 2,
    360,
  );

  if (!clubeUsuario || !taticaAtual || !formacao) {
    return (
      <Screen>
        <View style={styles.vazio}>
          <Text variant="bodyM" color="textSecondary">
            Carregando escalação…
          </Text>
        </View>
      </Screen>
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

  // Preenche o XI com os melhores jogadores disponíveis para a formação atual.
  async function escalarMelhores(): Promise<void> {
    const ok = await confirm({
      titulo: 'Escalar os 11 melhores?',
      mensagem:
        'Preenche a escalação automaticamente com os melhores jogadores disponíveis para a formação atual, desfazendo ajustes manuais de posição.',
      confirmarLabel: 'Escalar',
    });
    if (!ok) {
      return;
    }
    const preset = formacaoTipo === 'Personalizada' ? '4-3-3' : formacaoTipo;
    atualizarFormacaoUsuario(montarFormacao(jogadores, preset));
    toast('Escalados os 11 melhores.', 'sucesso');
  }

  return (
    <Screen scroll scrollEnabled={!arrastando}>
      <AppBar
        title="Escalação"
        subtitle={clubeUsuario.nome}
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

      <Button
        titulo="Escalar os 11 melhores"
        variante="secondary"
        icone="tatica"
        onPress={escalarMelhores}
        fullWidth
      />

      <Grupo titulo="Estratégia">
        <View style={styles.chipRow}>
          {ESTRATEGIAS.map(estr => (
            <Chip
              key={estr.nome}
              label={estr.nome}
              selected={estr.nome === estrategia}
              onPress={() => atualizarTaticaUsuario(estr.tatica)}
            />
          ))}
        </View>
      </Grupo>

      <Grupo titulo="Formação">
        <View style={styles.chipRow}>
          {FORMACOES_DISPONIVEIS.map(tipo => (
            <Chip
              key={tipo}
              label={tipo}
              selected={tipo === formacaoTipo}
              onPress={() => aplicarFormacao(tipo)}
            />
          ))}
        </View>
      </Grupo>

      <Grupo titulo="Instruções">
        <View style={styles.instrucoes}>
          <GrupoInstrucao
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
          <GrupoInstrucao
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
          <GrupoInstrucao
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
          <GrupoInstrucao
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
          <GrupoInstrucao
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
          <GrupoInstrucao
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
        </View>
      </Grupo>
    </Screen>
  );
}

export default Tactics;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  grupo: {gap: espacamento[2]},
  instrucoes: {gap: espacamento[4]},
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento[6],
  },
});
