/**
 * @format
 *
 * Smoke test do estado inicial do jogo. Renderizar o <App/> completo exigiria
 * mockar os módulos nativos do React Navigation (stack/screens/gesture-handler),
 * o que não agrega valor; aqui validamos a fundação de dados que toda a UI
 * consome (seed + calendário + tabela), sem dependências nativas.
 */

import {useGameStore} from '../src/store/useGameStore';

test('estado inicial do jogo está coerente', () => {
  const estado = useGameStore.getState();

  // 20 clubes da Série A, com elencos populados.
  expect(estado.clubes).toHaveLength(20);
  expect(estado.jogadores.length).toBeGreaterThan(300);

  // Calendário round-robin turno+returno: 38 rodadas x 10 jogos = 380 partidas.
  expect(estado.partidas).toHaveLength(380);

  // Tabela com uma linha por clube.
  expect(estado.tabela).toHaveLength(20);

  // Carreira ainda não iniciada.
  expect(estado.clubeUsuarioId).toBeNull();
});
