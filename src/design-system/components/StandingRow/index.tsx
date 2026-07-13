/**
 * StandingRow — linha COMPACTA de classificação: posição · escudo · nome · J ·
 * Pts, com realce do clube do usuário (fundo `brandSoft`) e filete opcional de
 * zona (acesso = success / rebaixamento = danger). Números tabulares. Cor por
 * token. Não recalcula nada — recebe os valores já derivados.
 */
import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';

import {Pressable} from '../../primitives/Pressable';
import {Text} from '../../primitives/Text';
import {espacamento, raios} from '../../tokens';
import type {CoresSemanticas} from '../../tokens/colors';
import {useTheme} from '../../themes/useTheme';
import {TeamCrest} from '../../sports/TeamCrest';

type Zona = 'promocao' | 'rebaixamento' | 'nenhuma';

type Props = {
  posicao: number;
  clubeId: string;
  sigla: string;
  nome: string;
  jogos: number;
  pontos: number;
  destacado?: boolean;
  zona?: Zona;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

const COR_ZONA: Record<Zona, keyof CoresSemanticas | null> = {
  promocao: 'success',
  rebaixamento: 'danger',
  nenhuma: null,
};

export function StandingRow({
  posicao,
  clubeId,
  sigla,
  nome,
  jogos,
  pontos,
  destacado,
  zona = 'nenhuma',
  onPress,
  style,
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const corZona = COR_ZONA[zona];
  const corTexto = destacado ? 'brand' : 'textPrimary';

  const conteudo = (
    <>
      <View
        style={[
          estilos.zona,
          corZona ? {backgroundColor: cores[corZona]} : null,
        ]}
      />
      <Text
        variant="labelM"
        color={destacado ? 'brand' : 'textSecondary'}
        tabular
        style={estilos.pos}>
        {posicao}
      </Text>
      <TeamCrest clubeId={clubeId} sigla={sigla} size={22} />
      <Text
        variant="labelL"
        color={corTexto}
        numberOfLines={1}
        style={estilos.nome}>
        {nome}
      </Text>
      <Text variant="labelM" color="textMuted" tabular style={estilos.col}>
        {jogos}
      </Text>
      <Text variant="labelL" color={corTexto} tabular style={estilos.colPts}>
        {pontos}
      </Text>
    </>
  );

  const st: StyleProp<ViewStyle> = [
    estilos.linha,
    destacado ? {backgroundColor: cores.brandSoft} : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        minSize="min"
        style={st}
        accessibilityLabel={`${posicao}º ${nome}, ${pontos} pontos`}>
        {conteudo}
      </Pressable>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`${posicao}º ${nome}, ${jogos} jogos, ${pontos} pontos`}
      style={st}>
      {conteudo}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 40,
    paddingHorizontal: espacamento[2],
    borderRadius: raios.sm,
    overflow: 'hidden',
  },
  zona: {width: 3, alignSelf: 'stretch', borderRadius: raios.full},
  pos: {width: 22, textAlign: 'center'},
  nome: {flex: 1},
  col: {width: 28, textAlign: 'center'},
  colPts: {width: 32, textAlign: 'right'},
});
