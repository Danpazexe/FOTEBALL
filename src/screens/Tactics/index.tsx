/**
 * Tela Tática (North Star). O técnico monta o time no campo estilo FUT (CampoFUT,
 * com drag-drop) e ajusta as instruções em SELETORES (dropdown): formação no topo,
 * e mentalidade/marcação/linha/ritmo/lado/amplidão em linhas. "SALVAR TÁTICA"
 * confirma e volta (as mudanças já são persistidas na hora).
 *
 * Mantém o scroll travado durante um arraste, para o gesto não disputar com a
 * rolagem. O CampoFUT e seus gestos são preservados integralmente.
 */

import React, {useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import CampoFUT from '../../components/CampoFUT';
import {useConfirm, useToast} from '../../components/feedback';
import {
  AppBar,
  Button,
  Screen,
  SegmentedTabs,
  SelectRow,
  Text,
  espacamento,
} from '../../design-system';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../engine/tactics/escalacao';
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
const NOMES_ESTRATEGIA = ESTRATEGIAS.map(e => e.nome);

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
  const [aba, setAba] = useState('campo');

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
  const ovr = Math.round(forca?.overall ?? 0);

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

  const aplicarEstrategia = (nome: string) => {
    const estr = ESTRATEGIAS.find(e => e.nome === nome);
    if (estr) {
      atualizarTaticaUsuario(estr.tatica);
    }
  };

  const ajustar = <K extends keyof Tatica>(chave: K, valor: Tatica[K]) =>
    atualizarTaticaUsuario({...taticaAtual, [chave]: valor});

  const salvar = () => {
    toast('Tática salva.', 'sucesso');
    nav.goBack();
  };

  return (
    <Screen
      scroll
      scrollEnabled={!arrastando}
      header={
        <AppBar
          title="Escalação"
          subtitle={`${clubeUsuario.nome} · ${formacaoTipo}`}
          onBack={() => nav.goBack()}
          right={
            <View style={styles.ovr}>
              <Text variant="titleL" color="success">
                {ovr}
              </Text>
              <Text variant="caption" color="textSecondary">
                MÉDIA
              </Text>
            </View>
          }
        />
      }>
      <SegmentedTabs
        abas={[
          {chave: 'campo', rotulo: 'Campo'},
          {chave: 'estrategia', rotulo: 'Estratégia'},
        ]}
        ativa={aba}
        onSelect={setAba}
      />

      {aba === 'campo' ? (
        <CampoFUT
          clube={clubeUsuario}
          formacao={formacao}
          jogadores={jogadores}
          tatica={taticaAtual}
          forca={forca}
          reputacaoTecnico={reputacaoTecnico}
          largura={largura}
          formacaoTipo={formacaoTipo}
          formacoesDisponiveis={FORMACOES_DISPONIVEIS}
          onTrocarFormacao={v =>
            aplicarFormacao(v as (typeof FORMACOES_DISPONIVEIS)[number])
          }
          onAtualizarFormacao={atualizarFormacaoUsuario}
          onArrastandoChange={setArrastando}
          onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
          onEscalarMelhores={escalarMelhores}
          mostrarCabecalho={false}
        />
      ) : (
        <View style={styles.controles}>
          <SelectRow
            label="Estratégia"
            valor={estrategia ?? 'Personalizada'}
            opcoes={NOMES_ESTRATEGIA}
            onSelect={aplicarEstrategia}
          />
          <SelectRow
            label="Mentalidade"
            valor={taticaAtual.estiloOfensivo}
            opcoes={OPCOES_ESTILO}
            onSelect={v =>
              ajustar('estiloOfensivo', v as Tatica['estiloOfensivo'])
            }
          />
          <SelectRow
            label="Marcação"
            valor={taticaAtual.marcacao}
            opcoes={OPCOES_MARCACAO}
            onSelect={v => ajustar('marcacao', v as Tatica['marcacao'])}
          />
          <SelectRow
            label="Linha defensiva"
            valor={taticaAtual.linhaDefensiva}
            opcoes={OPCOES_LINHA}
            onSelect={v =>
              ajustar('linhaDefensiva', v as Tatica['linhaDefensiva'])
            }
          />
          <SelectRow
            label="Ritmo"
            valor={taticaAtual.ritmo}
            opcoes={OPCOES_RITMO}
            onSelect={v => ajustar('ritmo', v as Tatica['ritmo'])}
          />
          <SelectRow
            label="Lado de ataque"
            valor={taticaAtual.ladoAtaque ?? 'Ambos'}
            opcoes={OPCOES_LADO}
            onSelect={v =>
              ajustar('ladoAtaque', v as NonNullable<Tatica['ladoAtaque']>)
            }
          />
          <SelectRow
            label="Amplidão"
            valor={taticaAtual.amplidao ?? 'Normal'}
            opcoes={OPCOES_AMPLIDAO}
            onSelect={v =>
              ajustar('amplidao', v as NonNullable<Tatica['amplidao']>)
            }
          />
          <Button titulo="Salvar e voltar" onPress={salvar} fullWidth />
        </View>
      )}
    </Screen>
  );
}

export default Tactics;

const styles = StyleSheet.create({
  controles: {gap: espacamento[2]},
  ovr: {alignItems: 'center'},
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento[6],
  },
});
