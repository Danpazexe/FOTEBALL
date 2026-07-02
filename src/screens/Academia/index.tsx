/**
 * Academia de base (Módulo 14). Lista os jovens das peneiras da temporada
 * (gerados em `finalizarTemporada`) com potencial em letra (B/A/S). O técnico
 * promove ao elenco ou libera. Potencial S é destacado em dourado.
 */

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {ScreenContainer, Section, TextoVazio} from '../../components/ui';
import {AppHeader} from '../../components/ui';
import Icone from '../../components/Icone';
import OverallBadge from '../../components/OverallBadge';
import {
  faixaPotencial,
  type FaixaPotencial,
} from '../../engine/progression/academiaEngine';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio, sombra, suaves} from '../../theme';
import {moeda} from '../../utils/formatters';
import {Pressable} from 'react-native';

function corFaixa(faixa: FaixaPotencial): string {
  if (faixa === 'S') {
    return cores.secundaria;
  }
  if (faixa === 'A') {
    return cores.primaria;
  }
  return cores.textoSecundario;
}

function Academia(): React.JSX.Element {
  const nav = useAppNavigation();
  const jovens = useGameStore(state => state.jovensDisponiveis);
  const promoverJovem = useGameStore(state => state.promoverJovem);
  const liberarJovem = useGameStore(state => state.liberarJovem);

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Academia de Base"
        subtitulo={`${jovens.length} jovens nas peneiras`}
        onBack={() => nav.goBack()}
      />

      <Section titulo="Jovens talentos">
        {jovens.length === 0 ? (
          <TextoVazio>
            Nenhum jovem disponível. Novas peneiras surgem a cada temporada.
          </TextoVazio>
        ) : (
          <View style={styles.lista}>
            {jovens.map(jovem => {
              const faixa = faixaPotencial(jovem.potencial);
              return (
                <View key={jovem.id} style={styles.card}>
                  <OverallBadge overall={jovem.overall} />
                  <View style={styles.main}>
                    <Text style={styles.nome}>{jovem.nome}</Text>
                    <Text style={styles.legenda}>
                      {jovem.posicao} · {jovem.idade} anos · {moeda(jovem.salarioBase)}
                      /mês
                    </Text>
                    <View style={styles.potencialLinha}>
                      <Text style={styles.potencialLabel}>Potencial</Text>
                      <View
                        style={[
                          styles.faixaChip,
                          {borderColor: corFaixa(faixa)},
                          faixa === 'S' ? styles.faixaChipS : null,
                        ]}>
                        <Text style={[styles.faixaTexto, {color: corFaixa(faixa)}]}>
                          {faixa}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.acoes}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => promoverJovem(jovem.id)}
                      style={styles.botaoPromover}>
                      <Icone nome="check" tamanho={14} cor={cores.contrastePrimaria} />
                      <Text style={styles.botaoPromoverTexto}>Promover</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => liberarJovem(jovem.id)}
                      style={styles.botaoLiberar}>
                      <Text style={styles.botaoLiberarTexto}>Liberar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Section>
    </ScreenContainer>
  );
}

export default Academia;

const styles = StyleSheet.create({
  lista: {
    gap: espaco.sm,
  },
  card: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    padding: espaco.md,
    ...sombra.card,
  },
  main: {
    flex: 1,
    gap: 3,
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
  potencialLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    marginTop: 2,
  },
  potencialLabel: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  faixaChip: {
    alignItems: 'center',
    borderRadius: raio.sm,
    borderWidth: 1.5,
    minWidth: 26,
    paddingHorizontal: espaco.sm,
    paddingVertical: 1,
  },
  faixaChipS: {
    // Fundo suave dourado (token do tema claro) sob o texto do acento.
    backgroundColor: suaves.amarelo,
  },
  faixaTexto: {
    fontSize: 14,
    fontWeight: '900',
  },
  acoes: {
    gap: espaco.xs,
  },
  botaoPromover: {
    alignItems: 'center',
    backgroundColor: cores.primaria,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
    paddingHorizontal: espaco.sm,
    paddingVertical: espaco.sm,
  },
  botaoPromoverTexto: {
    color: cores.contrastePrimaria,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoLiberar: {
    alignItems: 'center',
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingVertical: espaco.xs,
  },
  botaoLiberarTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
});
