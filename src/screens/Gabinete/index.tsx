/**
 * Gabinete de troféus (Módulo 15). Grade de conquistas: desbloqueadas em cor,
 * bloqueadas em cinza com descrição oculta. Cabeçalho com % de conclusão.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {IconeGlifo} from '../../components/Icone';
import {AppHeader, ScreenContainer} from '../../components/ui';
import {useAppNavigation} from '../../navigation/types';
import {useAchievementsStore} from '../../store/useAchievementsStore';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra, tipografia} from '../../theme';
import type {EstadoFinanceiro} from '../../types';

const ESTADO_FINANCEIRO: Record<
  EstadoFinanceiro,
  {rotulo: string; cor: string}
> = {
  SAUDAVEL: {rotulo: 'Saudável', cor: cores.primaria},
  ATENCAO: {rotulo: 'Atenção', cor: cores.secundaria},
  CRITICO: {rotulo: 'Crítico', cor: cores.perigo},
  FALENCIA: {rotulo: 'Falência', cor: cores.perigo},
};

function Gabinete(): React.JSX.Element {
  const nav = useAppNavigation();
  const conquistas = useAchievementsStore(state => state.conquistas);
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);
  const estadoFinanceiro = useGameStore(state => state.estadoFinanceiro);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);

  const desbloqueadas = conquistas.filter(c => c.desbloqueada).length;
  const total = conquistas.length;
  const financeiro = ESTADO_FINANCEIRO[estadoFinanceiro];

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Gabinete"
        subtitulo={`${desbloqueadas}/${total} conquistas`}
        onBack={() => nav.goBack()}
      />

      {clubeUsuarioId ? (
        <View style={styles.carreiraCard}>
          <View style={styles.carreiraItem}>
            <Text style={styles.carreiraRotulo}>Reputação do técnico</Text>
            <Text style={styles.carreiraValor}>{reputacaoTecnico}/100</Text>
            <View style={styles.barraFundo}>
              <View
                style={[
                  styles.barraPreenchida,
                  {width: `${reputacaoTecnico}%`},
                ]}
              />
            </View>
          </View>
          <View style={styles.carreiraItem}>
            <Text style={styles.carreiraRotulo}>Finanças</Text>
            <View
              style={[styles.estadoChip, {backgroundColor: `${financeiro.cor}22`}]}>
              <Text style={[styles.estadoTexto, {color: financeiro.cor}]}>
                {financeiro.rotulo}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.grade}>
        {conquistas.map(conquista => (
          <View
            key={conquista.id}
            style={[
              styles.card,
              conquista.desbloqueada ? styles.cardAtivo : styles.cardInativo,
            ]}>
            <IconeGlifo
              nome={conquista.desbloqueada ? conquista.icone : 'lock-outline'}
              tamanho={32}
              cor={
                conquista.desbloqueada
                  ? conquista.corIcone
                  : cores.textoSecundario
              }
            />
            <Text
              style={[
                styles.nome,
                conquista.desbloqueada ? null : styles.textoInativo,
              ]}
              numberOfLines={1}>
              {conquista.nome}
            </Text>
            <Text style={styles.descricao} numberOfLines={2}>
              {conquista.desbloqueada ? conquista.descricao : '???'}
            </Text>
            {conquista.desbloqueada && conquista.dataDesbloqueio ? (
              <Text style={styles.data}>{conquista.dataDesbloqueio}</Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

export default Gabinete;

const styles = StyleSheet.create({
  carreiraCard: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.lg,
    marginBottom: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  carreiraItem: {
    flex: 1,
    gap: espaco.xs,
  },
  carreiraRotulo: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  carreiraValor: {
    color: cores.texto,
    ...tipografia.numero,
  },
  barraFundo: {
    backgroundColor: cores.fundo,
    borderRadius: raio.sm,
    height: 6,
    overflow: 'hidden',
  },
  barraPreenchida: {
    backgroundColor: cores.primaria,
    height: 6,
  },
  estadoChip: {
    alignSelf: 'flex-start',
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.xs,
  },
  estadoTexto: {
    fontSize: 14,
    fontWeight: '800',
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  card: {
    alignItems: 'center',
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.xs,
    minHeight: 132,
    padding: espaco.md,
    width: '48%',
    ...sombra.card,
  },
  cardAtivo: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
  },
  cardInativo: {
    backgroundColor: cores.fundo,
    borderColor: cores.bordaTransl,
    opacity: 0.75,
  },
  nome: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoInativo: {
    color: cores.textoSecundario,
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  data: {
    color: cores.primaria,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
