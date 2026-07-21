/**
 * Renovação de contratos. Lista jogadores com contrato expirando nesta temporada
 * (urgente) ou na próxima; o técnico propõe salário e duração. Migrada ao DS v2.
 */

import React, {useMemo, useState} from 'react';
import {Modal, StyleSheet, View} from 'react-native';

import OverallBadge from '../../components/OverallBadge';
import {
  AppBar,
  Button,
  Card,
  Chip,
  Screen,
  Text,
  TextField,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore, useJogadoresUsuario} from '../../store/useGameStore';
import {anoContrato, contratoVenceNaTemporada} from '../../utils/contratos';
import {moeda} from '../../utils/formatters';
import type {Player} from '../../types';

const ANOS_OPCOES = [1, 2, 3];

function Contratos(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const {cores} = useTheme();
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
    <Screen
      scroll
      header={
        <AppBar
          title="Contratos"
          subtitle="Renovações pendentes"
          onBack={() => nav.goBack()}
        />
      }>

      {aRenovar.length === 0 ? (
        <Text variant="bodyM" color="textSecondary">
          Nenhum contrato expirando em breve.
        </Text>
      ) : (
        <View style={styles.lista}>
          {aRenovar.map(jogador => {
            const ano = anoContrato(jogador.contratoAte);
            const urgente = contratoVenceNaTemporada(jogador.contratoAte, anoAtual);
            return (
              <Card key={jogador.id} variante="outlined" style={styles.card}>
                <OverallBadge overall={jogador.overall} />
                <View style={styles.main}>
                  <Text variant="titleM" numberOfLines={1}>
                    {jogador.apelido ?? jogador.nome}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {jogador.posicaoPrincipal} · {moeda(jogador.salario)}/mês
                  </Text>
                  <Text variant="caption" color={urgente ? 'danger' : 'warning'}>
                    Contrato até {ano} {urgente ? '· expira já!' : '· próxima'}
                  </Text>
                </View>
                <Button
                  variante="ghost"
                  tamanho="sm"
                  titulo="Renovar"
                  onPress={() => abrir(jogador)}
                />
              </Card>
            );
          })}
        </View>
      )}

      <Modal
        visible={alvo !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAlvo(null)}>
        <View style={[styles.modalBackdrop, {backgroundColor: cores.overlay}]}>
          <View
            style={[
              styles.modalCard,
              {backgroundColor: cores.surface, borderColor: cores.border},
            ]}>
            <Text variant="titleL">Renovar {alvo?.apelido ?? alvo?.nome}</Text>
            <Text variant="labelM" color="textSecondary">
              Salário mensal proposto
            </Text>
            <TextField
              variante="valor"
              keyboardType="numeric"
              value={salario}
              onChangeText={setSalario}
              accessibilityLabel="Salário mensal proposto"
              placeholder="Salário"
            />
            <Text variant="labelM" color="textSecondary">
              Duração
            </Text>
            <View style={styles.anosRow}>
              {ANOS_OPCOES.map(opcao => (
                <Chip
                  key={opcao}
                  label={`${opcao} ${opcao === 1 ? 'ano' : 'anos'}`}
                  selected={anos === opcao}
                  onPress={() => setAnos(opcao)}
                  style={styles.flex}
                />
              ))}
            </View>
            <View style={styles.modalAcoes}>
              <View style={styles.flex}>
                <Button
                  variante="secondary"
                  titulo="Cancelar"
                  onPress={() => setAlvo(null)}
                  fullWidth
                />
              </View>
              <View style={styles.flex}>
                <Button
                  variante="primary"
                  titulo="Propor"
                  onPress={confirmar}
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

export default Contratos;

const styles = StyleSheet.create({
  lista: {gap: espacamento[2]},
  card: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  main: {flex: 1, gap: 2},
  modalBackdrop: {flex: 1, justifyContent: 'flex-end'},
  modalCard: {
    borderTopLeftRadius: raios.lg,
    borderTopRightRadius: raios.lg,
    borderWidth: 1,
    gap: espacamento[2],
    padding: espacamento[5],
  },
  anosRow: {flexDirection: 'row', gap: espacamento[2]},
  modalAcoes: {
    flexDirection: 'row',
    gap: espacamento[2],
    marginTop: espacamento[2],
  },
  flex: {flex: 1},
});
