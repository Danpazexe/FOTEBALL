/**
 * PlayerAvatar — rosto do jogador (avatares 3D estilizados). Como o jogo não tem
 * uma foto por jogador, há 36 rostos recortados e escolhemos um de forma
 * DETERMINÍSTICA pelo id (mesmo jogador → mesmo rosto). Recorte circular simples.
 */
import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// 36 rostos individuais (grade 6×6 recortada).
const FACES: ImageSourcePropType[] = [
  require('../../assets/avatars/faces/jogador_00.png'),
  require('../../assets/avatars/faces/jogador_01.png'),
  require('../../assets/avatars/faces/jogador_02.png'),
  require('../../assets/avatars/faces/jogador_03.png'),
  require('../../assets/avatars/faces/jogador_04.png'),
  require('../../assets/avatars/faces/jogador_05.png'),
  require('../../assets/avatars/faces/jogador_06.png'),
  require('../../assets/avatars/faces/jogador_07.png'),
  require('../../assets/avatars/faces/jogador_08.png'),
  require('../../assets/avatars/faces/jogador_09.png'),
  require('../../assets/avatars/faces/jogador_10.png'),
  require('../../assets/avatars/faces/jogador_11.png'),
  require('../../assets/avatars/faces/jogador_12.png'),
  require('../../assets/avatars/faces/jogador_13.png'),
  require('../../assets/avatars/faces/jogador_14.png'),
  require('../../assets/avatars/faces/jogador_15.png'),
  require('../../assets/avatars/faces/jogador_16.png'),
  require('../../assets/avatars/faces/jogador_17.png'),
  require('../../assets/avatars/faces/jogador_18.png'),
  require('../../assets/avatars/faces/jogador_19.png'),
  require('../../assets/avatars/faces/jogador_20.png'),
  require('../../assets/avatars/faces/jogador_21.png'),
  require('../../assets/avatars/faces/jogador_22.png'),
  require('../../assets/avatars/faces/jogador_23.png'),
  require('../../assets/avatars/faces/jogador_24.png'),
  require('../../assets/avatars/faces/jogador_25.png'),
  require('../../assets/avatars/faces/jogador_26.png'),
  require('../../assets/avatars/faces/jogador_27.png'),
  require('../../assets/avatars/faces/jogador_28.png'),
  require('../../assets/avatars/faces/jogador_29.png'),
  require('../../assets/avatars/faces/jogador_30.png'),
  require('../../assets/avatars/faces/jogador_31.png'),
  require('../../assets/avatars/faces/jogador_32.png'),
  require('../../assets/avatars/faces/jogador_33.png'),
  require('../../assets/avatars/faces/jogador_34.png'),
  require('../../assets/avatars/faces/jogador_35.png'),
];

/** id → índice 0..35 (hash determinístico, sem overflow). */
export function avatarIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) % 100000;
  }
  return h % FACES.length;
}

type Props = {
  id: string;
  tamanho: number;
  style?: StyleProp<ViewStyle>;
};

export default function PlayerAvatar({
  id,
  tamanho,
  style,
}: Props): React.JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        estilos.circulo,
        {width: tamanho, height: tamanho, borderRadius: tamanho / 2},
        style,
      ]}>
      <Image source={FACES[avatarIndex(id)]} resizeMode="cover" style={estilos.img} />
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: {overflow: 'hidden'},
  img: {width: '100%', height: '100%'},
});
