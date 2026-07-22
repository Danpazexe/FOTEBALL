/**
 * Conclusão da rodada AO VIVO: quando o usuário decide a própria partida durante
 * a narração, `concluirPartidaAoVivo` grava o placar/eventos informados, simula
 * os demais jogos da rodada (IA), avança a rodada e atualiza tabela/finanças.
 * Rede de segurança antes de deduplicar o pipeline de rodada com avancarRodada.
 */
import {selecionarProximoJogo, useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('concluirPartidaAoVivo', () => {
  it('grava o resultado ao vivo do usuário, avança a rodada e disputa os demais jogos', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);

    const rodadaAntes = estado().rodadaAtual;
    const proximo = selecionarProximoJogo(estado())!;
    expect(proximo).toBeTruthy();

    estado().prepararPartidaAoVivo();
    // Resultado decidido pelo usuário: 2 x 1 (placar da partida `proximo`).
    estado().concluirPartidaAoVivo(proximo.id, [], 2, 1);

    // O jogo do usuário guarda EXATAMENTE o resultado ao vivo.
    const jogo = estado().partidas.find(p => p.id === proximo.id)!;
    expect(jogo.jogada).toBe(true);
    expect(jogo.modoJogado).toBe('interativo');
    expect(jogo.placarCasa).toBe(2);
    expect(jogo.placarFora).toBe(1);

    // A rodada avançou e TODOS os jogos dela foram disputados (IA simulada).
    expect(estado().rodadaAtual).toBe(rodadaAntes + 1);
    const naRodada = estado().partidas.filter(p => p.rodada === rodadaAntes);
    expect(naRodada.length).toBeGreaterThan(0);
    expect(naRodada.every(p => p.jogada)).toBe(true);

    // Estado pós-rodada: preLive limpo, tabela contabilizada, última partida = a do usuário.
    expect(estado().formacaoPreLive).toBeNull();
    expect(estado().tabela.reduce((soma, linha) => soma + linha.jogos, 0)).toBeGreaterThan(0);
    expect(estado().ultimaPartidaUsuario?.id).toBe(proximo.id);
  });
});
