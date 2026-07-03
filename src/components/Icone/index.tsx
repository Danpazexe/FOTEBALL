/**
 * Ícones do FOTEBALL via react-native-vector-icons (MaterialCommunityIcons).
 *
 * Mantemos a API por nome semântico (`IconeNome`) para não mexer nas dezenas de
 * usos pelo app; internamente cada nome mapeia para um glyph do
 * MaterialCommunityIcons. A cor vem por prop.
 *
 * Requer a fonte nativa empacotada (android/app/build.gradle aplica
 * `fonts.gradle`) — após o setup é preciso um rebuild (`npm run android`).
 *
 * Uso: <Icone nome="inicio" tamanho={20} cor={cores.primaria} />
 */

import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {cores} from '../../theme';

export type IconeNome =
  | 'inicio'
  | 'elenco'
  | 'tatica'
  | 'tabela'
  | 'clube'
  | 'ajustes'
  | 'jogar'
  | 'simular'
  | 'pausar'
  | 'mercado'
  | 'voltar'
  | 'seta-baixo'
  | 'seta-cima'
  | 'avancar'
  | 'bola'
  | 'cartao'
  | 'lesao'
  | 'substituicao'
  | 'chance'
  | 'penalti'
  | 'apito'
  | 'relogio'
  | 'check'
  | 'fechar'
  | 'dinheiro'
  | 'troca'
  | 'trofeu'
  | 'calendario'
  | 'conversa'
  | 'estadio'
  | 'publico'
  | 'clima-sol'
  | 'clima-nublado'
  | 'clima-chuva'
  | 'gramado';

/** Nome semântico → glyph do MaterialCommunityIcons. */
const GLYPHS: Record<IconeNome, string> = {
  inicio: 'home-variant',
  elenco: 'account-group',
  tatica: 'strategy',
  tabela: 'format-list-numbered',
  clube: 'shield-outline',
  ajustes: 'cog-outline',
  jogar: 'play',
  simular: 'fast-forward',
  pausar: 'pause',
  mercado: 'swap-horizontal',
  voltar: 'chevron-left',
  'seta-baixo': 'chevron-down',
  'seta-cima': 'chevron-up',
  avancar: 'chevron-right',
  bola: 'soccer',
  cartao: 'card',
  lesao: 'bandage',
  substituicao: 'swap-horizontal',
  chance: 'close-circle-outline',
  penalti: 'bullseye-arrow',
  apito: 'whistle',
  relogio: 'clock-outline',
  check: 'check',
  fechar: 'close',
  dinheiro: 'cash',
  troca: 'swap-horizontal',
  trofeu: 'trophy',
  calendario: 'calendar-month',
  conversa: 'bullhorn',
  estadio: 'stadium-variant',
  publico: 'account-group',
  'clima-sol': 'weather-sunny',
  'clima-nublado': 'weather-cloudy',
  'clima-chuva': 'weather-rainy',
  gramado: 'grass',
};

type IconeProps = {
  nome: IconeNome;
  tamanho?: number;
  cor?: string;
};

function Icone({nome, tamanho = 20, cor}: IconeProps): React.JSX.Element {
  return (
    <MaterialCommunityIcons
      name={GLYPHS[nome]}
      size={tamanho}
      color={cor ?? cores.texto}
    />
  );
}

export default Icone;
