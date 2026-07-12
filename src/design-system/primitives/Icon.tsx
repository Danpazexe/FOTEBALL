/**
 * Icon — ponte para o registry semântico Lucide (`src/components/Icone`), com
 * tamanho por token e cor por token do tema. Mantém UMA família de ícones.
 */
import React from 'react';

import Icone, {type IconeNome} from '../../components/Icone';
import {tamanhos, type TamanhoIcone} from '../tokens';
import type {CoresSemanticas} from '../tokens/colors';
import {useTheme} from '../themes/useTheme';

type Props = {
  nome: IconeNome;
  size?: TamanhoIcone | number;
  color?: keyof CoresSemanticas;
};

export function Icon({
  nome,
  size = 'md',
  color = 'textPrimary',
}: Props): React.JSX.Element {
  const {cores} = useTheme();
  const px = typeof size === 'number' ? size : tamanhos.icone[size];
  return <Icone nome={nome} tamanho={px} cor={cores[color]} />;
}
