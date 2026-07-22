/**
 * ARBITRAGEM — árbitro nomeado com rigor + disponibilidade de VAR por divisão.
 *
 * Tudo aqui é PURO e DETERMINÍSTICO por seed via `hashString`: nenhuma função
 * consome draw dos RNGs da partida (eventos/posse/estatísticas/subs), então a
 * ordem dos sorteios existentes fica bit-a-bit intacta. O rigor entra na
 * simulação como FATOR multiplicativo sobre as probabilidades de cartão/falta
 * ANTES do draw já existente (nunca como um sorteio novo).
 *
 * Como `iniciarPartidaAoVivo(seed)` e `simularPartida(seed)` derivam o árbitro
 * da MESMA seed, a paridade ao-vivo == simularPartida é automática.
 */
import type {ArbitroPartida} from '../../types';

import {hashString} from './rng';

/**
 * Pool de árbitros FICTÍCIOS (nomes plausíveis de arbitragem brasileira —
 * nenhum árbitro real). Estável: mudar a ordem/tamanho muda o árbitro de
 * partidas já vistas pelo usuário (o sorteio é `hash % length`).
 */
export const NOMES_ARBITROS: readonly string[] = [
  'Adalberto Nogueira Filho',
  'Célio Ramos Barbosa',
  'Douglas Vilaça',
  'Edmilson Quaresma',
  'Fabrício Longo Neto',
  'Gilvan Peixoto da Cruz',
  'Heraldo Simões',
  'Ivanildo Castelo Branco',
  'Jandir Sarmento',
  'Laércio Bonfim Júnior',
  'Marcos Aurélio Tenório',
  'Nivaldo Serra Freire',
  'Otacílio Furtado',
  'Péricles Vasconcelos',
  'Quirino Sales do Amaral',
  'Ronaldo Espíndola',
  'Saulo Bittencourt',
  'Tadeu Mascarenhas',
  'Ubiratan Leal da Costa',
  'Valmir Drummond',
] as const;

/**
 * Fator disciplinar por rigor (índice = rigor − 1): árbitro "deixa jogar"
 * segura o apito (~0.8), o rigoroso marca tudo (~1.25). Média do pool ≈ 1.01 —
 * neutro no balanceamento agregado (as faixas dos testes de balanceamento não
 * se movem; muda a variância entre partidas, que é o objetivo).
 */
const FATOR_POR_RIGOR: readonly number[] = [0.8, 0.9, 1, 1.12, 1.25];

/**
 * Sorteia o árbitro da partida a partir da seed — determinístico (mesma seed,
 * mesmo árbitro) e SEM consumir RNG da partida. Rigor uniforme em 1..5.
 */
export function sortearArbitro(seedPartida: number): ArbitroPartida {
  const indiceNome =
    hashString(`${seedPartida}_arbitro_nome`) % NOMES_ARBITROS.length;
  return {
    nome: NOMES_ARBITROS[indiceNome] ?? NOMES_ARBITROS[0] ?? 'Árbitro',
    rigor: 1 + (hashString(`${seedPartida}_arbitro_rigor`) % 5),
  };
}

/** Fator multiplicativo do rigor sobre probs de cartão/falta (~0.8 → ~1.25). */
export function fatorRigorArbitro(rigor: number): number {
  const indice = Math.min(
    FATOR_POR_RIGOR.length - 1,
    Math.max(0, Math.round(rigor) - 1),
  );
  return FATOR_POR_RIGOR[indice] ?? 1;
}

/** Rótulo pt-BR do estilo de arbitragem (1–2 solto, 3 médio, 4–5 duro). */
export function rotuloRigorArbitro(rigor: number): string {
  return rigor <= 2 ? 'deixa jogar' : rigor >= 4 ? 'rigoroso' : 'equilibrado';
}

/**
 * Divisões SEM infraestrutura de VAR. Conferido no registry de competições
 * (`competitions/registry/catalogoBrasil`): existem hoje Séries A/B/C/D e a
 * Copa do Brasil — A e B têm VAR; C e D não; estaduais ainda não existem no
 * jogo (quando entrarem, suas divisões entram aqui). A Copa segue a infra dos
 * CLUBES envolvidos: jogo com clube de C/D não tem cabine de VAR.
 */
const DIVISOES_SEM_VAR: ReadonlySet<string> = new Set(['Série C', 'Série D']);

/**
 * VAR disponível na partida? Derivado da DIVISÃO dos dois clubes (campo
 * `Clube.divisao`; ausente = divisão padrão/Série A ⇒ tem VAR) — a mesma
 * informação existe nos dois caminhos de simulação (ao vivo e headless), o que
 * mantém a paridade sem tocar as assinaturas das telas.
 */
export function varDisponivelPartida(
  divisaoCasa: string | undefined,
  divisaoFora: string | undefined,
): boolean {
  const temVar = (divisao: string | undefined): boolean =>
    divisao === undefined || !DIVISOES_SEM_VAR.has(divisao);
  return temVar(divisaoCasa) && temVar(divisaoFora);
}

/**
 * Árbitro escalado para uma partida a partir do ID dela — usa a MESMA
 * derivação de seed do ao vivo (`hashString(partidaId) % 1_000_000`, em
 * `MatchSimulation`), então o Pré-Jogo mostra exatamente o árbitro que vai
 * apitar quando a bola rolar. Puro e determinístico.
 */
export function arbitroDoJogo(partidaId: string): ArbitroPartida {
  return sortearArbitro(hashString(partidaId) % 1_000_000);
}
