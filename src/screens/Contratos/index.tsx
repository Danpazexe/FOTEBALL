/**
 * Renovação de contratos (Módulo 13). Lista jogadores com contrato expirando
 * nesta temporada (urgente, vermelho) ou na próxima (amarelo). O técnico propõe
 * salário e duração; o jogador aceita se o salário cobre ~90% do atual ou se a
 * moral é alta.
 */

import React, {useMemo, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, TextoVazio} from '../../components/ui';
import OverallBadge from '../../components/OverallBadge';
import {useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore, useJogadoresUsuario} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {moeda} from '../../utils/formatters';
import type {Player} from '../../types';

const ANOS_OPCOES = [1, 2, 3];

function anoContrato(contratoAte: string): number {
  return Number(contratoAte.slice(0, 4));
}

function Contratos(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const elenco = useJogadoresUsuario();
  const temporadaAtual = useGameStore(state => state.temporadaAtual);
  const renovarContrato = useGameStore(state => state.renovarContrato);

  const anoAtual = Number(temporadaAtual);

  const aRenovar = useMemo(
    () =>
      elenco
        .filter(j => anoContrato(j.contratoAte) <= anoAtual + 1)
        .sort((a, b) => anoContrato(a.contratoAte) - anoContrato(b.contratoAte)),
    [elenco, anoAtual],
  );

  const [alvo, setAlvo] = useState<Player | null>(null);
  const [salario, setSalario] = useState('');
  const [anos, setAnos] = useState(2);

  const abrir = (jogador: Player) => {
    setAlvo(jogador);
    setSalario(String(Math.round(jogador.salario * 1.1)));
    setAnos(2);
  };

  const confirmar = () => {
    if (!alvo) {
      return;
    }
    const valor = Number(salario) || alvo.salario;
    const ok = renovarContrato(alvo.id, anos, valor);
    toast(
      ok ? `${alvo.nome} renovou!` : `${alvo.nome} recusou.`,
      ok ? 'sucesso' : 'erro',
    );
    setAlvo(null);
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Contratos"
        subtitulo="Renovações pendentes"
        onBack={() => nav.goBack()}
      />

      {aRenovar.length === 0 ? (
        <TextoVazio>Nenhum contrato expirando em breve.</TextoVazio>
      ) : (
        <View style={styles.lista}>
          {aRenovar.map(jogador => {
            const ano = anoContrato(jogador.contratoAte);
            const urgente = ano <= anoAtual;
            return (
              <View key={jogador.id} style={styles.card}>
                <OverallBadge overall={jogador.overall} />
                <View style={styles.main}>
                  <Text style={styles.nome}>{jogador.apelido ?? jogador.nome}</Text>
                  <Text style={styles.legenda}>
                    {jogador.posicaoPrincipal} · {moeda(jogador.salario)}/mês
                  </Text>
                  <Text
                    style={[
                      styles.contrato,
                      {color: urgente ? cores.perigo : cores.secundaria},
                    ]}>
                    Contrato até {ano} {urgente ? '· expira já!' : '· próxima'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => abrir(jogador)}
                  style={styles.botaoRenovar}>
                  <Text style={styles.botaoRenovarTexto}>Renovar</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <Modal
        visible={alvo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAlvo(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>
              Renovar {alvo?.apelido ?? alvo?.nome}
            </Text>
            <Text style={styles.modalLabel}>Salário mensal proposto</Text>
            <TextInput
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
              style={styles.input}
              placeholder="Salário"
              placeholderTextColor={cores.textoSecundario}
            />
            <Text style={styles.modalLabel}>Duração</Text>
            <View style={styles.anosRow}>
              {ANOS_OPCOES.map(opcao => (
                <Pressable
                  accessibilityRole="button"
                  key={opcao}
                  onPress={() => setAnos(opcao)}
                  style={[styles.anoChip, anos === opcao ? styles.anoChipAtivo : null]}>
                  <Text
                    style={[
                      styles.anoTexto,
                      anos === opcao ? styles.anoTextoAtivo : null,
                    ]}>
                    {opcao} {opcao === 1 ? 'ano' : 'anos'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalAcoes}>
              <View style={styles.modalAcaoFlex}>
                <Botao
                  variante="secundaria"
                  titulo="Cancelar"
                  onPress={() => setAlvo(null)}
                />
              </View>
              <View style={styles.modalAcaoFlex}>
                <Botao titulo="Propor" onPress={confirmar} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default Contratos;

const styles = StyleSheet.create({
  lista: {
    gap: espaco.sm,
  },
  card: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  nome: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  legenda: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  contrato: {
    fontSize: 12,
    fontWeight: '700',
  },
  botaoRenovar: {
    alignItems: 'center',
    borderColor: cores.primaria,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  botaoRenovarTexto: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '800',
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
    gap: espaco.sm,
    padding: espaco.lg,
  },
  modalTitulo: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: espaco.xs,
  },
  modalLabel: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    color: cores.texto,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  anosRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  anoChip: {
    alignItems: 'center',
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: espaco.sm,
  },
  anoChipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  anoTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  anoTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  modalAcoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: espaco.sm,
  },
  modalAcaoFlex: {
    flex: 1,
  },
});
