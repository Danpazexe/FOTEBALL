/**
 * Ícones do FOTEBALL via lucide-react-native (renderiza SVG sobre
 * react-native-svg — não precisa de fonte nativa).
 *
 * Duas APIs:
 *  • `Icone` — por nome SEMÂNTICO tipado (`IconeNome`), usado nas dezenas de
 *    telas/componentes. Cada nome mapeia para um ícone do Lucide.
 *  • `IconeGlifo` — por nome-string DINÂMICO, para ícones que vêm de dados
 *    (conquistas, status), com fallback seguro quando o nome é desconhecido.
 *
 * Uso: <Icone nome="inicio" tamanho={20} cor={cores.primaria} />
 */

import React from 'react';
import {
  ArrowRightLeft,
  Bandage,
  Banknote,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  CircleX,
  ClipboardList,
  Clock,
  Cloud,
  CloudRain,
  Crosshair,
  Crown,
  FastForward,
  Flag,
  Gauge,
  Goal,
  GraduationCap,
  Hand,
  Handshake,
  Home,
  Landmark,
  ListOrdered,
  Lock,
  type LucideIcon,
  Medal,
  Megaphone,
  Pause,
  Play,
  Rocket,
  Settings,
  Shield,
  ShieldHalf,
  ShieldPlus,
  Smile,
  Sprout,
  Square,
  Sun,
  Target,
  Trophy,
  Users,
  UserStar,
  X,
  Zap,
} from 'lucide-react-native';

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
  | 'base'
  | 'medalha'
  | 'estadio'
  | 'publico'
  | 'clima-sol'
  | 'clima-nublado'
  | 'clima-chuva'
  | 'gramado';

/** Nome semântico → componente do Lucide. */
const ICONES_SEMANTICOS: Record<IconeNome, LucideIcon> = {
  inicio: Home,
  elenco: Users,
  tatica: ClipboardList,
  tabela: ListOrdered,
  clube: Shield,
  ajustes: Settings,
  jogar: Play,
  simular: FastForward,
  pausar: Pause,
  mercado: ArrowRightLeft,
  voltar: ChevronLeft,
  'seta-baixo': ChevronDown,
  'seta-cima': ChevronUp,
  avancar: ChevronRight,
  bola: Goal,
  cartao: Square,
  lesao: Bandage,
  substituicao: ArrowRightLeft,
  chance: CircleX,
  penalti: Target,
  apito: Flag,
  relogio: Clock,
  check: Check,
  fechar: X,
  dinheiro: Banknote,
  troca: ArrowRightLeft,
  trofeu: Trophy,
  calendario: CalendarDays,
  conversa: Megaphone,
  base: GraduationCap,
  medalha: Medal,
  estadio: Building2,
  publico: Users,
  'clima-sol': Sun,
  'clima-nublado': Cloud,
  'clima-chuva': CloudRain,
  gramado: Sprout,
};

/**
 * Nome-string dinâmico (vindo de dados: conquistas, habilidades, status) →
 * componente do Lucide. Mantém os nomes históricos para não mexer nos dados.
 */
const ICONES_GLIFO: Record<string, LucideIcon> = {
  // Conquistas (src/data/conquistas.ts)
  trophy: Trophy,
  soccer: Goal,
  'lightning-bolt': Zap,
  'account-star': UserStar,
  bank: Landmark,
  'shield-star': ShieldPlus,
  'emoticon-happy': Smile,
  'run-fast': Gauge,
  'calendar-check': CalendarCheck,
  'shield-half-full': ShieldHalf,
  'lock-outline': Lock,
  // Escudo placeholder / habilidades (src/engine/progression/habilidades.ts)
  shield: Shield,
  target: Target,
  handshake: Handshake,
  crown: Crown,
  'bullseye-arrow': Crosshair,
  'rocket-launch': Rocket,
  whistle: Flag,
  'hand-back-right': Hand,
};

type IconeProps = {
  nome: IconeNome;
  tamanho?: number;
  cor?: string;
};

function Icone({nome, tamanho = 20, cor}: IconeProps): React.JSX.Element {
  const Componente = ICONES_SEMANTICOS[nome];
  return <Componente size={tamanho} color={cor ?? cores.texto} />;
}

export default Icone;

type IconeGlifoProps = {
  nome: string;
  tamanho?: number;
  cor?: string;
};

/**
 * Ícone por nome-string dinâmico (dados). Cai em um ponto de interrogação
 * quando o nome não está mapeado — nunca quebra a renderização.
 */
export function IconeGlifo({
  nome,
  tamanho = 20,
  cor,
}: IconeGlifoProps): React.JSX.Element {
  const Componente = ICONES_GLIFO[nome] ?? CircleHelp;
  return <Componente size={tamanho} color={cor ?? cores.texto} />;
}
