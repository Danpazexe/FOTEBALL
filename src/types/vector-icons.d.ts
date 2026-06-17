/**
 * Declaração de tipos para react-native-vector-icons (o pacote não traz .d.ts).
 * Cobre o uso que fazemos: o componente de ícone com `name`, `size`, `color`.
 */
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type * as React from 'react';
  import type {TextProps} from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  const MaterialCommunityIcons: React.ComponentType<IconProps>;
  export default MaterialCommunityIcons;
}
