/**
 * Superfície premium do FOTEBALL (Premium UI v0.0.3): gradiente profundo +
 * borda translúcida + sombra (ou glow colorido), com realce opcional de borda
 * (marca/ouro) e uma faixa de acento no topo. É a base visual que as telas
 * herdam — substitui os cards "chapados" por profundidade real.
 *
 * O gradiente é desenhado com react-native-svg (já é dependência) atrás do
 * conteúdo, medindo o painel via onLayout para renderizar igual em iOS/Android.
 */
import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';

import {espaco, raio, type Tema} from '../../theme';
import {useEstilos, useTema} from '../../theme/useTema';

type PainelProps = {
  children: React.ReactNode;
  /** Realce de borda: 'primaria' (ação/destaque) ou 'ouro' (prestígio). */
  destaque?: 'primaria' | 'ouro';
  /** Glow colorido no lugar da sombra preta — 'primaria' (verde) ou 'ouro'. */
  glow?: 'primaria' | 'ouro';
  /** Faixa de acento (cor) no topo do painel — ex.: avisos, conquista. */
  acento?: string;
  /** Gradiente de fundo (lista de stops). Default: superfície premium. */
  gradiente?: string[];
  /** Remove o padding interno (o conteúdo controla o próprio espaçamento). */
  semPadding?: boolean;
  /** Faz o painel crescer (flex:1) para preencher o espaço disponível. */
  preencher?: boolean;
  style?: ViewStyle;
};

/** Superfície elevada com gradiente + borda translúcida + sombra/glow (premium). */
function Painel({
  children,
  destaque,
  glow,
  acento,
  gradiente,
  semPadding,
  preencher,
  style,
}: PainelProps): React.JSX.Element {
  const {gradientes} = useTema();
  const styles = useEstilos(criarEstilos);
  const [tamanho, setTamanho] = React.useState({largura: 0, altura: 0});
  // id único do gradiente por instância (evita colisão entre vários painéis).
  const gid = `pnl${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stops = gradiente ?? gradientes.card;

  const sombraEstilo =
    glow === 'primaria'
      ? styles.glowPrimaria
      : glow === 'ouro'
        ? styles.glowOuro
        : styles.sombraPadrao;

  const bordaDestaque =
    destaque === 'primaria'
      ? styles.bordaPrimaria
      : destaque === 'ouro'
        ? styles.bordaOuro
        : null;

  return (
    <View
      style={[
        styles.base,
        sombraEstilo,
        preencher ? styles.preencher : null,
        style,
      ]}>
      <View
        style={[
          styles.clip,
          bordaDestaque,
          preencher ? styles.preencher : null,
        ]}
        onLayout={e =>
          setTamanho({
            largura: e.nativeEvent.layout.width,
            altura: e.nativeEvent.layout.height,
          })
        }>
        {tamanho.largura > 0 ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={tamanho.largura} height={tamanho.altura}>
              <Defs>
                <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  {stops.map((cor, i) => (
                    <Stop
                      key={`${i}-${cor}`}
                      offset={stops.length === 1 ? 0 : i / (stops.length - 1)}
                      stopColor={cor}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width={tamanho.largura}
                height={tamanho.altura}
                fill={`url(#${gid})`}
              />
            </Svg>
          </View>
        ) : null}
        {acento ? (
          <View
            style={[styles.acento, {backgroundColor: acento}]}
            pointerEvents="none"
          />
        ) : null}
        <View
          style={[
            semPadding ? null : styles.conteudo,
            preencher ? styles.preencher : null,
          ]}>
          {children}
        </View>
      </View>
    </View>
  );
}

export default Painel;

const criarEstilos = (t: Tema) =>
  StyleSheet.create({
  base: {
    // bg sólido (coberto pelo clip) garante a sombra/elevation no Android.
    backgroundColor: t.cores.superficie,
    borderRadius: raio.xl,
  },
  preencher: {
    flex: 1,
  },
  sombraPadrao: {
    ...t.sombra.card,
  },
  glowPrimaria: {
    ...t.sombra.glow,
  },
  glowOuro: {
    ...t.sombra.ouro,
  },
  clip: {
    backgroundColor: t.cores.superficie,
    borderColor: t.cores.bordaTransl,
    borderRadius: raio.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bordaPrimaria: {
    borderColor: t.cores.primaria,
  },
  bordaOuro: {
    borderColor: t.cores.secundaria,
  },
  acento: {
    height: 3,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  conteudo: {
    padding: espaco.lg,
  },
});
