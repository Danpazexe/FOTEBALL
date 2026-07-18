/**
 * Pipeline diário do relógio da carreira (Onda 3): lesão anda em dias REAIS,
 * recuperação gera pendência para o clube do usuário, o relógio nunca anda
 * para trás e nenhum dia roda duas vezes.
 */
import {criarPlayer} from '../../../testing/fixtures';
import {processarDia, processarDiasAte} from '../pipelineDiario';

const lesionado = (id: string, dias: number, clubeId = 'meu_clube') =>
  criarPlayer({id, clubeId, lesionado: true, diasLesao: dias});

describe('pipelineDiario', () => {
  it('decrementa a lesão 1 dia por dia de calendário', () => {
    const resultado = processarDiasAte(
      [lesionado('j1', 5)],
      '2026-04-06',
      '2026-04-09',
      'meu_clube',
    );
    expect(resultado.diasProcessados).toBe(3);
    expect(resultado.dataFinal).toBe('2026-04-09');
    expect(resultado.jogadores[0].diasLesao).toBe(2);
    expect(resultado.jogadores[0].lesionado).toBe(true);
  });

  it('recuperação zera a lesão e gera pendência de retorno para o usuário', () => {
    const resultado = processarDiasAte(
      [lesionado('j1', 2), lesionado('j2', 2, 'outro_clube')],
      '2026-04-06',
      '2026-04-10',
      'meu_clube',
    );
    expect(resultado.jogadores[0].lesionado).toBe(false);
    expect(resultado.jogadores[0].diasLesao).toBe(0);
    expect(resultado.jogadores[1].lesionado).toBe(false);
    // Só o retorno do MEU clube vira pendência na Central.
    expect(resultado.novasPendencias).toHaveLength(1);
    expect(resultado.novasPendencias[0].tipo).toBe('retorno_lesao');
    expect(resultado.novasPendencias[0].entidadeId).toBe('j1');
    expect(resultado.novasPendencias[0].bloqueante).toBe(false);
  });

  it('o relógio nunca anda para trás (alvo anterior = no-op integral)', () => {
    const jogadores = [lesionado('j1', 5)];
    const resultado = processarDiasAte(jogadores, '2026-04-10', '2026-04-06', 'x');
    expect(resultado.diasProcessados).toBe(0);
    expect(resultado.dataFinal).toBe('2026-04-10');
    expect(resultado.jogadores).toBe(jogadores);
  });

  it('processarDia não toca jogador saudável (mesma referência de objeto)', () => {
    const saudavel = criarPlayer({id: 's1'});
    const resultado = processarDia([saudavel], '2026-04-07', null);
    expect(resultado.jogadores[0]).toBe(saudavel);
    expect(resultado.novasPendencias).toHaveLength(0);
  });
});
