/**
 * Pipeline diário do relógio da carreira (Onda 3): lesão anda em dias REAIS,
 * recuperação gera pendência para o clube do usuário, o relógio nunca anda
 * para trás e nenhum dia roda duas vezes. Drift diário de condição: quem não
 * está lesionado recupera `RECUPERACAO_CONDICAO_DIA` por dia, capado no teto.
 */
import {
  RECUPERACAO_CONDICAO_DIA,
} from '../../progression/condicao';
import {CONDICAO_MAX} from '../../progression/treinoTipos';
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

  it('processarDia não toca jogador saudável JÁ NO TETO de condição (mesma referência)', () => {
    const saudavel = criarPlayer({id: 's1', condicaoFisica: CONDICAO_MAX});
    const resultado = processarDia([saudavel], '2026-04-07', null);
    expect(resultado.jogadores[0]).toBe(saudavel);
    expect(resultado.novasPendencias).toHaveLength(0);
  });

  describe('drift diário de condição', () => {
    it('não lesionado recupera +2 por dia, capado no teto (100)', () => {
      const cansado = criarPlayer({id: 'c1', condicaoFisica: 60});
      const quaseCheio = criarPlayer({id: 'c2', condicaoFisica: 99});
      const dia = processarDia([cansado, quaseCheio], '2026-04-07', null);
      expect(dia.jogadores[0].condicaoFisica).toBe(60 + RECUPERACAO_CONDICAO_DIA);
      expect(dia.jogadores[1].condicaoFisica).toBe(CONDICAO_MAX);

      // Em lote: 4 dias = +8, sempre determinístico.
      const periodo = processarDiasAte(
        [cansado],
        '2026-04-06',
        '2026-04-10',
        null,
      );
      expect(periodo.jogadores[0].condicaoFisica).toBe(
        60 + 4 * RECUPERACAO_CONDICAO_DIA,
      );
    });

    it('lesionado NÃO recebe o drift enquanto se recupera da lesão', () => {
      const machucado = criarPlayer({
        id: 'l1',
        condicaoFisica: 50,
        lesionado: true,
        diasLesao: 10,
      });
      const periodo = processarDiasAte(
        [machucado],
        '2026-04-06',
        '2026-04-09',
        null,
      );
      expect(periodo.jogadores[0].lesionado).toBe(true);
      expect(periodo.jogadores[0].condicaoFisica).toBe(50);
    });

    it('vale para QUALQUER clube (simétrico usuário/IA)', () => {
      const daIA = criarPlayer({id: 'ia1', clubeId: 'clube_ia', condicaoFisica: 70});
      const resultado = processarDia([daIA], '2026-04-07', 'meu_clube');
      expect(resultado.jogadores[0].condicaoFisica).toBe(
        70 + RECUPERACAO_CONDICAO_DIA,
      );
    });
  });
});
