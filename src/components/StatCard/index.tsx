/**
 * StatCard — "peça que se repete" da identidade v2 ("noite de estádio").
 *
 * Tile de estado no relance: rótulo minúsculo em caixa-alta, VALOR grande em
 * fonte tabular ("o número é sagrado") e uma linha de apoio. Usado na Mesa do
 * Técnico para saldo, moral, reputação e propostas; padroniza o que hoje é
 * renderizado inline em cada tela. O acento do valor é raro — só quando o número
 * comunica um estado (saldo positivo/negativo, alerta).
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {espaco, raio, tabular, tipografia, type Tema} from '../../theme';
import {useEstilos, useTema} from '../../theme/useTema';
import Icone, {type IconeNome} from '../Icone';

type StatCardProps = {
  label: string;
  valor: string;
  /** Linha de apoio abaixo do valor (ex.: "+R$ 3,1M no mês"). */
  sub?: string;
  /** Acento do valor (ex.: verde para saldo positivo). Padrão: cal (texto). */
  corValor?: string;
  /** Acento da linha de apoio. Padrão: textoSecundario. */
  corSub?: string;
  /** Ícone no canto (opcional). */
  icone?: IconeNome;
  /** Torna o card tocável. */
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function StatCard({
  label,
  valor,
  sub,
  corValor,
  corSub,
  icone,
  onPress,
  style,
}: StatCardProps): React.JSX.Element {
  const {cores} = useTema();
  const styles = useEstilos(criarEstilos);

  const conteudo = (
    <>
      <View style={styles.topo}>
        <Text style={styles.label}>{label}</Text>
        {icone ? (
          <Icone nome={icone} tamanho={14} cor={cores.textoMuted} />
        ) : null}
      </View>
      <Text
        style={[styles.valor, tabular, corValor ? {color: corValor} : null]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {valor}
      </Text>
      {sub ? (
        <Text style={[styles.sub, corSub ? {color: corSub} : null]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, style]}>{conteudo}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.card, pressed ? styles.pressed : null, style]}>
      {conteudo}
    </Pressable>
  );
}

export default StatCard;

const criarEstilos = (t: Tema) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.cores.superficie,
      borderColor: t.cores.bordaTransl,
      borderRadius: raio.lg,
      borderWidth: 1,
      flex: 1,
      gap: espaco.xs,
      justifyContent: 'center',
      minHeight: 82,
      padding: espaco.md,
    },
    topo: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    label: {
      color: t.cores.textoMuted,
      ...tipografia.secao,
    },
    valor: {
      color: t.cores.texto,
      ...tipografia.numero,
    },
    sub: {
      color: t.cores.textoSecundario,
      fontSize: 11,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.9,
    },
  });
