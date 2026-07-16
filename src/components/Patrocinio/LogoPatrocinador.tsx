/**
 * LogoPatrocinador — renderiza o logo (PNG) de um patrocinador pelo `id`,
 * resolvido no mapa estático `src/assets/patrocinadores`. Usa `Image` nativo
 * com `resizeMode="contain"` (sem distorção) sobre um contêiner branco. Fallback
 * visual (inicial do nome) quando o id não existe. Nunca usa URI remota.
 */
import React from 'react';
import {Image, StyleSheet, View} from 'react-native';

import {Text, raios, useTheme} from '../../design-system';
import {logoPatrocinador} from '../../assets/patrocinadores';
import {nomePatrocinador} from '../../engine/patrocinio/catalogo';

interface Props {
  patrocinadorId: string;
  /** Lado do contêiner quadrado (px). */
  tamanho?: number;
}

export function LogoPatrocinador({
  patrocinadorId,
  tamanho = 56,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const fonte = logoPatrocinador(patrocinadorId);
  const nome = nomePatrocinador(patrocinadorId);
  const lado = {width: tamanho, height: tamanho, borderRadius: raios.md};

  return (
    <View
      style={[estilos.caixa, estilos.placa, lado, {borderColor: cores.border}]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Logo ${nome}`}>
      {fonte ? (
        <Image
          source={fonte}
          style={[estilos.img, {width: tamanho * 0.82, height: tamanho * 0.82}]}
          resizeMode="contain"
        />
      ) : (
        <Text variant="titleM" color="textMuted">
          {nome.charAt(0)}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  // Placa BRANCA sob o logo: os PNGs têm fundo branco, então o contêiner precisa
  // ser branco para o logo não "flutuar" numa borda de cor diferente (independe
  // do tema — é constraint do asset, não decoração).
  placa: {backgroundColor: '#FFFFFF'},
  img: {},
});
