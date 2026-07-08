/**
 * Chip — "peça que se repete" da identidade v2 ("noite de estádio").
 *
 * Pílula de estado/seleção com uma única gramática visual, usada para formações
 * (4-3-3, 4-4-2…), instruções táticas (Pressão alta, Retranca…), filtros e
 * marcadores. Inativo = contorno translúcido sobre o painel; ATIVO = preenchido
 * no acento (âmbar/refletor por padrão — "o acento é raro"), com o rótulo
 * cravado no acento vivo.
 *
 * Substitui as implementações inline duplicadas (TaticaStrip em CampoFUT,
 * formChip em AjustesPartida, Chip/ChipTreino em telas).
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {comAlfa, espaco, raio, type Tema} from '../../theme';
import {useEstilos, useTema} from '../../theme/useTema';
import Icone, {type IconeNome} from '../Icone';

type ChipProps = {
  label: string;
  /** Estado selecionado — preenche no acento. */
  ativo?: boolean;
  /** Toque; se omitido, o chip é só um marcador (não pressionável). */
  onPress?: () => void;
  /**
   * Cor do acento quando ativo. Padrão: âmbar/refletor (`secundaria`). Passe
   * `cores.primaria` para o verde (ex.: confirmação/validação).
   */
  cor?: string;
  /** Ícone opcional antes do rótulo. */
  icone?: IconeNome;
  /**
   * 'solido' (padrão) = seleção preenchida no acento. 'suave' = SELO DE ESTADO:
   * fundo/borda tingidos + texto colorido (status bom/ruim/aviso), sem gastar o
   * preenchimento cheio — reserva o acento cheio para a seleção de fato.
   */
  tom?: 'solido' | 'suave';
  /** Densidade compacta (chips em faixa apertada). */
  pequeno?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

function Chip({
  label,
  ativo = false,
  onPress,
  cor,
  icone,
  tom = 'solido',
  pequeno = false,
  disabled = false,
  style,
}: ChipProps): React.JSX.Element {
  const {cores} = useTema();
  const styles = useEstilos(criarEstilos);
  const acento = cor ?? cores.secundaria;
  const suave = tom === 'suave';
  const corTexto = suave
    ? acento
    : ativo
      ? cores.contrastePrimaria
      : cores.textoSecundario;

  const conteudo = (
    <>
      {icone ? (
        <Icone nome={icone} tamanho={pequeno ? 12 : 14} cor={corTexto} />
      ) : null}
      <Text style={[styles.texto, pequeno ? styles.textoPequeno : null, {color: corTexto}]}>
        {label}
      </Text>
    </>
  );

  const estiloBase = [
    styles.base,
    pequeno ? styles.basePequeno : null,
    suave
      ? {backgroundColor: comAlfa(acento, 0.14), borderColor: comAlfa(acento, 0.4)}
      : ativo
        ? {backgroundColor: acento, borderColor: acento}
        : null,
    disabled ? styles.disabled : null,
    style,
  ];

  if (!onPress) {
    return <View style={estiloBase}>{conteudo}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected: ativo, disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        estiloBase,
        pressed && !disabled ? styles.pressed : null,
      ]}>
      {conteudo}
    </Pressable>
  );
}

export default Chip;

const criarEstilos = (t: Tema) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      borderColor: t.cores.bordaTranslForte,
      borderRadius: raio.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: espaco.xs,
      minHeight: 34,
      paddingHorizontal: espaco.md,
      paddingVertical: espaco.xs,
    },
    basePequeno: {
      minHeight: 28,
      paddingHorizontal: espaco.sm,
    },
    texto: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    textoPequeno: {
      fontSize: 11,
    },
    pressed: {
      opacity: 0.9,
      transform: [{scale: 0.97}],
    },
    disabled: {
      opacity: 0.45,
    },
  });
