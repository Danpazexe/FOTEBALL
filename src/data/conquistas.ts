/**
 * Catálogo de conquistas (Módulo 15). O campo `icone` é um nome-string resolvido
 * por `IconeGlifo` (Lucide) — ver o mapa ICONES_GLIFO em components/Icone.
 * A definição é estática; o estado de desbloqueio vive em `useAchievementsStore`.
 */

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  corIcone: string;
  desbloqueada: boolean;
  dataDesbloqueio?: string;
}

/** Forma mínima persistida no save: só o que foi desbloqueado (e quando). */
export interface ConquistaSalva {
  id: string;
  dataDesbloqueio?: string;
}

export const CONQUISTAS: Conquista[] = [
  {
    id: 'primeiro_titulo',
    nome: 'Campeão!',
    descricao: 'Vença o Brasileirão',
    icone: 'trophy',
    corIcone: '#F59E0B',
    desbloqueada: false,
  },
  {
    id: 'primeira_vitoria',
    nome: 'Início promissor',
    descricao: 'Vença sua primeira partida',
    icone: 'soccer',
    corIcone: '#22C55E',
    desbloqueada: false,
  },
  {
    id: 'goleada',
    nome: 'Sem piedade',
    descricao: 'Vença por 5 ou mais gols',
    icone: 'lightning-bolt',
    corIcone: '#EF4444',
    desbloqueada: false,
  },
  {
    id: 'revelacao',
    nome: 'Olheiro nato',
    descricao: 'Promova um jovem com potencial S',
    icone: 'account-star',
    corIcone: '#8B5CF6',
    desbloqueada: false,
  },
  {
    id: 'saldo_positivo',
    nome: 'Presidente aprova',
    descricao: 'Mantenha saldo acima de R$ 10M',
    icone: 'bank',
    corIcone: '#10B981',
    desbloqueada: false,
  },
  {
    id: 'invicto_5',
    nome: 'Série invicta',
    descricao: 'Fique 5 rodadas sem perder',
    icone: 'shield-star',
    corIcone: '#3B82F6',
    desbloqueada: false,
  },
  {
    id: 'moral_alto',
    nome: 'Vestiário unido',
    descricao: 'Moral médio do elenco maior ou igual a 85',
    icone: 'emoticon-happy',
    corIcone: '#F59E0B',
    desbloqueada: false,
  },
  {
    id: 'artilheiro_proprio',
    nome: 'Garçom do gol',
    descricao: 'Um jogador seu marca 15+ gols',
    icone: 'run-fast',
    corIcone: '#EF4444',
    desbloqueada: false,
  },
  {
    id: 'temporadas_3',
    nome: 'Técnico experiente',
    descricao: 'Jogue 3 temporadas com o mesmo clube',
    icone: 'calendar-check',
    corIcone: '#6366F1',
    desbloqueada: false,
  },
  {
    id: 'sem_gol_sofrido',
    nome: 'Muralha',
    descricao: 'Fique 3 partidas sem sofrer gol',
    icone: 'shield-half-full',
    corIcone: '#64748B',
    desbloqueada: false,
  },
];
