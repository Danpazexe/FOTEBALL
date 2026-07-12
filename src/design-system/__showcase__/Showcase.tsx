/**
 * Showcase de DEV (não roteado) — renderiza todos os tokens de cor, a escala
 * tipográfica e os primitives no tema ativo, com troca claro/escuro/sistema ao
 * vivo. Serve de QA manual das fundações (ADR-0003). Não faz parte do app.
 */
import React from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {espacamento, raios, type PapelTipografico} from '../tokens';
import type {CoresSemanticas} from '../tokens/colors';
import {Box} from '../primitives/Box';
import {Icon} from '../primitives/Icon';
import {Pressable} from '../primitives/Pressable';
import {Text} from '../primitives/Text';
import {useModoTema, useTheme} from '../themes/useTheme';
import type {ModoTema} from '../themes/types';

const MODOS: {valor: ModoTema; rotulo: string}[] = [
  {valor: 'claro', rotulo: 'Claro'},
  {valor: 'escuro', rotulo: 'Escuro'},
  {valor: 'sistema', rotulo: 'Sistema'},
];

const PAPEIS: PapelTipografico[] = [
  'display',
  'scoreXL',
  'titleXL',
  'titleL',
  'titleM',
  'bodyL',
  'bodyM',
  'labelL',
  'labelM',
  'caption',
  'numeric',
];

export function Showcase(): React.JSX.Element {
  const {cores, esquema} = useTheme();
  const {modo, definirModo} = useModoTema();
  const chavesCor = Object.keys(cores) as (keyof CoresSemanticas)[];

  return (
    <View style={[styles.flex, {backgroundColor: cores.canvas}]}>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.conteudo}>
          <Text variant="titleXL">Design System v2</Text>
          <Text variant="bodyM" color="textSecondary">
            Esquema ativo: {esquema} · preferência: {modo}
          </Text>

          {/* Seletor de aparência */}
          <Box direction="row" gap={2} style={styles.linha}>
            {MODOS.map(m => {
              const ativo = modo === m.valor;
              return (
                <Pressable
                  key={m.valor}
                  onPress={() => definirModo(m.valor)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: ativo ? cores.brandStrong : cores.surface,
                      borderColor: ativo ? cores.brandStrong : cores.border,
                    },
                  ]}>
                  <Text
                    variant="labelL"
                    color={ativo ? 'onBrand' : 'textPrimary'}>
                    {m.rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </Box>

          {/* Swatches de cor */}
          <Text variant="titleM" style={styles.secao}>
            Cores semânticas
          </Text>
          <View style={styles.grade}>
            {chavesCor.map(chave => (
              <View key={chave} style={styles.swatchWrap}>
                <View
                  style={[
                    styles.swatch,
                    {backgroundColor: cores[chave], borderColor: cores.border},
                  ]}
                />
                <Text variant="caption" color="textSecondary" numberOfLines={1}>
                  {chave}
                </Text>
              </View>
            ))}
          </View>

          {/* Tipografia */}
          <Text variant="titleM" style={styles.secao}>
            Tipografia
          </Text>
          {PAPEIS.map(papel => (
            <Text key={papel} variant={papel} tabular={papel === 'numeric'}>
              {papel} — 2–1 · 88 · R$ 18,5 mi
            </Text>
          ))}

          {/* Primitives */}
          <Text variant="titleM" style={styles.secao}>
            Primitives
          </Text>
          <Box
            bg="surface"
            padding={4}
            radius="md"
            bordered
            gap={2}
            style={styles.linha}>
            <Box direction="row" gap={2} align="center">
              <Icon nome="jogar" color="brand" />
              <Icon nome="trofeu" color="accent" size="lg" />
              <Icon nome="cartao" color="danger" />
              <Text variant="bodyM" color="textSecondary">
                Icon por token
              </Text>
            </Box>
            <Pressable
              onPress={() => undefined}
              style={[styles.botao, {backgroundColor: cores.brandStrong}]}>
              <Text variant="labelL" color="onBrand">
                Pressable
              </Text>
            </Pressable>
          </Box>

          <View style={styles.rodape} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  conteudo: {padding: espacamento[4], gap: espacamento[2]},
  secao: {marginTop: espacamento[5]},
  linha: {marginTop: espacamento[2]},
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderWidth: 1,
    borderRadius: raios.md,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacamento[3],
    marginTop: espacamento[2],
  },
  swatchWrap: {width: 72, gap: espacamento[1]},
  swatch: {height: 48, borderRadius: raios.sm, borderWidth: 1},
  botao: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: raios.md,
    paddingHorizontal: espacamento[4],
  },
  rodape: {height: espacamento[12]},
});
