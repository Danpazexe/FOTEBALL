/**
 * Painel "quem entra": ao tocar num titular, mostra os reservas APTOS numa lista
 * já ordenada por encaixe na vaga (natural → improviso) e overall, com condição
 * física visível. Um toque na linha confirma a substituição — sem arraste, sem
 * procurar o jogador certo no banco.
 */
import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';

import {
  corCondicao,
  corEncaixe,
  faixaCorOverall,
  useEstilosDS,
  useTheme,
} from '../../../design-system';
import type {NivelAdaptacao} from '../../../engine/tactics/adaptacao';
import type {Player, Position} from '../../../types';
import Icone from '../../Icone';
import {criarEstilos} from './estilos';
import type {CandidatoTroca} from './tipos';

/** Rótulo curto do encaixe (o `rotulo` do engine é longo demais para o chip). */
const ROTULO_FIT: Record<NivelAdaptacao, string> = {
  natural: 'Natural',
  similar: 'Similar',
  adaptado: 'Adaptado',
  improvisado: 'Improviso',
};

type PainelTrocaProps = {
  posicao: Position;
  saindo: Player | undefined;
  nomeSaindo: string;
  candidatos: CandidatoTroca[];
  nomeDe: (id: string) => string;
  onEscolher: (id: string) => void;
  onFechar: () => void;
};

function PainelTroca({
  posicao,
  saindo,
  nomeSaindo,
  candidatos,
  nomeDe,
  onEscolher,
  onFechar,
}: PainelTrocaProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores, esporte} = useTheme();
  return (
    <View style={styles.trocaOverlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={styles.trocaScrim}
        onPress={onFechar}
      />
      <View style={styles.trocaCard}>
        <View style={styles.trocaHeader}>
          <View style={styles.flex1}>
            <Text style={styles.trocaLabel}>Entra no lugar de</Text>
            <Text style={styles.trocaSaindo} numberOfLines={1}>
              {nomeSaindo}
            </Text>
          </View>
          <View style={styles.trocaPosChip}>
            <Text style={styles.trocaPosChipTexto}>{posicao}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onFechar}
            style={styles.trocaFechar}>
            <Icone nome="fechar" tamanho={18} cor={cores.textSecondary} />
          </Pressable>
        </View>

        {saindo ? (
          <View style={styles.trocaSaiLinha}>
            <View
              style={[
                styles.condDot,
                {backgroundColor: corCondicao(saindo.condicaoFisica, esporte)},
              ]}
            />
            <Text style={styles.trocaSaiInfo}>
              Sai com {Math.round(saindo.condicaoFisica)}% de condição
            </Text>
          </View>
        ) : null}

        <View style={styles.trocaDivisor} />

        {candidatos.length === 0 ? (
          <Text style={styles.trocaVazio}>
            Nenhum reserva disponível para entrar.
          </Text>
        ) : (
          <ScrollView
            style={styles.trocaLista}
            showsVerticalScrollIndicator={false}>
            {candidatos.map(({jogador, adaptacao}) => {
              const cor = cores[faixaCorOverall(jogador.overall)];
              // null quando natural: chip neutro (borda/texto), sem tinta.
              const corFit = corEncaixe(adaptacao.nivel, cores);
              const rotulo =
                adaptacao.nivel === 'natural'
                  ? ROTULO_FIT.natural
                  : `${ROTULO_FIT[adaptacao.nivel]} ${Math.round(
                      adaptacao.fator * 100,
                    )}%`;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={jogador.id}
                  onPress={() => onEscolher(jogador.id)}
                  style={styles.trocaLinha}>
                  <View style={[styles.trocaBadge, {borderColor: cor}]}>
                    <Text style={[styles.trocaBadgeTexto, {color: cor}]}>
                      {jogador.overall}
                    </Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.trocaNome} numberOfLines={1}>
                      {nomeDe(jogador.id)}
                    </Text>
                    <View style={styles.trocaMeta}>
                      <Text style={styles.trocaMetaPos}>
                        {jogador.posicaoPrincipal}
                      </Text>
                      <View
                        style={[
                          styles.condDot,
                          {
                            backgroundColor: corCondicao(
                              jogador.condicaoFisica,
                              esporte,
                            ),
                          },
                        ]}
                      />
                      <Text style={styles.trocaMetaCond}>
                        {Math.round(jogador.condicaoFisica)}%
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.trocaFit,
                      corFit
                        ? {borderColor: corFit, backgroundColor: `${corFit}1A`}
                        : {borderColor: cores.border},
                    ]}>
                    <Text
                      style={[
                        styles.trocaFitTexto,
                        {color: corFit ?? cores.textSecondary},
                      ]}>
                      {rotulo}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default PainelTroca;
