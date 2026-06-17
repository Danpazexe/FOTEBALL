import React, {useMemo, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
  trocarTitular,
} from '../../api/database/seed/defaults';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import type {Clube, FormacaoPreset, Player} from '../../types';
import {Botao, Section} from '../ui';
import Icone from '../Icone';
import OverallBadge from '../OverallBadge';
import {PitchView} from '../PitchView';

type FormationEditorProps = {
  clube: Clube;
  jogadores: Player[];
  onAbrirJogador: (jogadorId: string) => void;
};

function FormationEditor({
  clube,
  jogadores,
  onAbrirJogador,
}: FormationEditorProps) {
  const atualizarFormacaoUsuario = useGameStore(
    state => state.atualizarFormacaoUsuario,
  );
  const [slotEditando, setSlotEditando] = useState<number | null>(null);
  const [mostrarLista, setMostrarLista] = useState(false);

  const jogadoresPorId = useMemo(
    () => new Map(jogadores.map(jogador => [jogador.id, jogador])),
    [jogadores],
  );

  const formacao = clube.formacaoAtual;

  if (!formacao) {
    return null;
  }

  const trocarTipo = (tipo: FormacaoPreset) => {
    if (tipo === formacao.tipo) {
      return;
    }
    atualizarFormacaoUsuario(montarFormacao(jogadores, tipo));
  };

  const titularIds = new Set(
    formacao.titulares.map(titular => titular.jogadorId),
  );

  return (
    <Section titulo={`Escalação · ${formacao.tipo}`}>
      <View style={styles.chipRow}>
        {FORMACOES_DISPONIVEIS.map(tipo => (
          <Pressable
            accessibilityRole="button"
            key={tipo}
            onPress={() => trocarTipo(tipo)}
            style={[
              styles.chip,
              formacao.tipo === tipo ? styles.chipAtivo : null,
            ]}>
            <Text
              style={[
                styles.chipTexto,
                formacao.tipo === tipo ? styles.chipTextoAtivo : null,
              ]}>
              {tipo}
            </Text>
          </Pressable>
        ))}
      </View>

      <PitchView
        formacao={formacao}
        jogadores={jogadores}
        onTapSlot={setSlotEditando}
      />
      <Text style={styles.dica}>Toque num jogador no campo para substituí-lo.</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => setMostrarLista(valor => !valor)}
        style={styles.toggleLista}>
        <Text style={styles.toggleListaTexto}>
          {mostrarLista ? 'Ocultar lista' : 'Editar por lista'}
        </Text>
        <Icone
          nome={mostrarLista ? 'seta-cima' : 'seta-baixo'}
          tamanho={16}
          cor={cores.primaria}
        />
      </Pressable>

      {mostrarLista
        ? formacao.titulares.map((titular, index) => {
            const jogador = jogadoresPorId.get(titular.jogadorId);
            const foraDePosicao =
              jogador !== undefined &&
              jogador.posicaoPrincipal !== titular.posicao &&
              !jogador.posicoesSecundarias.includes(titular.posicao);
            return (
              <Pressable
                accessibilityRole="button"
                key={`${titular.posicao}_${index}`}
                onPress={() => setSlotEditando(index)}
                style={styles.slotRow}>
                <View style={styles.slotPos}>
                  <Text style={styles.slotPosTexto}>{titular.posicao}</Text>
                </View>
                <View style={styles.slotMain}>
                  <Text style={styles.slotNome}>{jogador?.nome ?? 'Vazio'}</Text>
                  {jogador ? (
                    <Text style={styles.slotLegenda}>
                      {jogador.posicaoPrincipal}
                      {foraDePosicao ? ' · fora de posição (-5)' : ''}
                    </Text>
                  ) : null}
                </View>
                {jogador ? <OverallBadge overall={jogador.overall} /> : null}
                <Text style={styles.slotTrocar}>trocar</Text>
              </Pressable>
            );
          })
        : null}

      <SeletorJogadorModal
        visivel={slotEditando !== null}
        titulo={
          slotEditando !== null
            ? `Escolher para ${formacao.titulares[slotEditando].posicao}`
            : ''
        }
        jogadores={jogadores}
        titularIds={titularIds}
        onSelecionar={jogadorId => {
          if (slotEditando !== null) {
            atualizarFormacaoUsuario(
              trocarTitular(formacao, slotEditando, jogadorId),
            );
          }
          setSlotEditando(null);
        }}
        onFechar={() => setSlotEditando(null)}
        onAbrirJogador={onAbrirJogador}
      />
    </Section>
  );
}

type SeletorJogadorModalProps = {
  visivel: boolean;
  titulo: string;
  jogadores: Player[];
  titularIds: Set<string>;
  onSelecionar: (jogadorId: string) => void;
  onFechar: () => void;
  onAbrirJogador: (jogadorId: string) => void;
};

function SeletorJogadorModal({
  visivel,
  titulo,
  jogadores,
  titularIds,
  onSelecionar,
  onFechar,
  onAbrirJogador,
}: SeletorJogadorModalProps) {
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={onFechar}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{titulo}</Text>
            <Botao titulo="Fechar" onPress={onFechar} variante="pequena" />
          </View>
          <ScrollView>
            {jogadores.map(jogador => {
              const escalado = titularIds.has(jogador.id);
              return (
                <Pressable
                  accessibilityRole="button"
                  key={jogador.id}
                  onPress={() => onSelecionar(jogador.id)}
                  onLongPress={() => onAbrirJogador(jogador.id)}
                  style={styles.playerRow}>
                  <OverallBadge overall={jogador.overall} />
                  <View style={styles.slotMain}>
                    <Text style={styles.slotNome}>{jogador.nome}</Text>
                    <Text style={styles.slotLegenda}>
                      {jogador.posicaoPrincipal} · {jogador.idade} anos
                      {escalado ? ' · titular' : ''}
                      {jogador.lesionado ? ' · contundido' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default FormationEditor;

const styles = StyleSheet.create({
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
    minHeight: 38,
    paddingHorizontal: espaco.md,
  },
  chipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  dica: {
    color: cores.textoSecundario,
    fontSize: 12,
    textAlign: 'center',
  },
  toggleLista: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
    paddingVertical: espaco.sm,
  },
  toggleListaTexto: {
    color: cores.primaria,
    fontSize: 13,
    fontWeight: '700',
  },
  slotRow: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    minHeight: 56,
    padding: espaco.sm,
  },
  slotPos: {
    alignItems: 'center',
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    justifyContent: 'center',
    minWidth: 42,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.sm,
  },
  slotPosTexto: {
    color: cores.primaria,
    fontSize: 13,
    fontWeight: '800',
  },
  slotMain: {
    flex: 1,
  },
  slotNome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  slotLegenda: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  slotTrocar: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  playerRow: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    marginBottom: espaco.sm,
    minHeight: 66,
    padding: espaco.sm,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(5,8,14,0.82)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: cores.superficie,
    borderTopLeftRadius: raio.lg,
    borderTopRightRadius: raio.lg,
    gap: espaco.md,
    maxHeight: '88%',
    padding: espaco.lg,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.md,
    justifyContent: 'space-between',
    marginBottom: espaco.xs,
  },
  modalTitulo: {
    color: cores.texto,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
  },
});
