/**
 * Integração de patrocínio com o estado do jogo: perfil derivado, crédito por
 * rodada (bônus por vitória), encerramento de temporada (pagamento + metas) e
 * roundtrip de persistência (o estado sobrevive ao save; legacy fica vazio).
 */
import type {Clube, TabelaClassificacao} from '../../types';
import {criarEstadoPatrocinioVazio, type EstadoPatrocinio} from '../../types/patrocinio';

import {criarClube} from '../../testing/fixtures';
import {
  aceitarPropostaPatrocinio,
  gerarPropostasPatrocinio,
} from '../../engine/patrocinio/patrocinioEngine';
import {
  encerrarContratoTemporada,
  montarPerfilPatrocinio,
  processarPatrocinioRodada,
} from '../patrocinioIntegracao';
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

function tabelaCom(clubeId: string, over: Partial<TabelaClassificacao> = {}): TabelaClassificacao[] {
  const linha: TabelaClassificacao = {
    clubeId, pontos: 30, jogos: 15, vitorias: 10, empates: 0, derrotas: 5,
    golsPro: 20, golsContra: 10, saldoGols: 10, ...over,
  };
  const outros = Array.from({length: 19}, (_, i) => ({
    ...linha, clubeId: `outro_${i}`, pontos: 20,
  }));
  return [linha, ...outros];
}

function estadoComContrato(clube: Clube): EstadoPatrocinio {
  const perfil = montarPerfilPatrocinio({
    clube, tabela: tabelaCom(clube.id), partidas: [], temporada: 2026,
  });
  const propostas = gerarPropostasPatrocinio(perfil, null);
  return aceitarPropostaPatrocinio(
    {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026},
    propostas[0]!.id,
  );
}

describe('montarPerfilPatrocinio', () => {
  it('deriva reputação, divisão e posição do estado', () => {
    const clube = criarClube({id: 'meu', reputacao: 72, divisao: 'Série B'});
    const perfil = montarPerfilPatrocinio({
      clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026,
    });
    expect(perfil.reputacao).toBe(72);
    expect(perfil.divisao).toBe('Série B');
    expect(perfil.posicaoLiga).toBe(1);
    expect(perfil.desempenhoRecente).toBeCloseTo(30 / (15 * 3), 3);
  });
});

describe('processarPatrocinioRodada — crédito por vitória', () => {
  it('vitória credita o bônus por vitória no saldo do clube', () => {
    const clube = criarClube({id: 'meu', reputacao: 80, divisao: 'Série A'});
    const estado = estadoComContrato(clube);
    const bonus = estado.contratoAtivo!.bonusPorVitoria;
    const res = processarPatrocinioRodada(
      estado,
      {clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026},
      true,
      '2026-05-01',
    );
    expect(res.clube.financas.saldo).toBe(clube.financas.saldo + bonus);
    // Derrota não credita.
    const semVitoria = processarPatrocinioRodada(
      estado,
      {clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026},
      false,
      '2026-05-01',
    );
    expect(semVitoria.clube.financas.saldo).toBe(clube.financas.saldo);
  });

  it('sem contrato ativo não credita nada', () => {
    const clube = criarClube({id: 'meu'});
    const res = processarPatrocinioRodada(
      criarEstadoPatrocinioVazio(),
      {clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026},
      true,
      '2026-05-01',
    );
    expect(res.clube).toBe(clube);
  });
});

describe('encerrarContratoTemporada — pagamento e metas', () => {
  it('credita a parcela da temporada e encerra o contrato de 1 ano', () => {
    const clube = criarClube({id: 'meu', reputacao: 80, divisao: 'Série A'});
    // Força um contrato de 1 temporada.
    const perfil = montarPerfilPatrocinio({
      clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026,
    });
    const propostas = gerarPropostasPatrocinio(perfil, null);
    const umAno = propostas.find(p => p.duracaoTemporadas === 1) ?? propostas[0]!;
    const estado = aceitarPropostaPatrocinio(
      {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026},
      umAno.id,
    );
    const parcela = estado.contratoAtivo!.valorPorTemporada;

    const res = encerrarContratoTemporada(
      estado,
      {clube, tabela: tabelaCom('meu'), partidas: [], temporada: 2026},
      2027,
      '2026-fim',
    );
    // Ao menos a parcela fixa foi creditada.
    expect(res.clube.financas.saldo).toBeGreaterThanOrEqual(
      clube.financas.saldo + parcela,
    );
    // Contrato de 1 ano (fim 2026) encerra ao entrar em 2027.
    if (umAno.duracaoTemporadas === 1) {
      expect(res.patrocinio.contratoAtivo).toBeNull();
      expect(res.patrocinio.historico[0]?.status).toBe('CONCLUIDO');
    }
  });
});

describe('persistência do estado de patrocínio', () => {
  it('roundtrip preserva propostas/contrato; save legacy vira estado vazio', () => {
    const state = useGameStore.getState();
    const clube = state.clubes[0] ?? criarClube({id: 'meu', reputacao: 80});
    const patrocinio = estadoComContrato(clube);

    const snap = montarSnapshot({...state, patrocinio});
    const aplicado = aplicarSnapshot(snap);
    expect(aplicado.patrocinio?.contratoAtivo?.patrocinadorId).toBe(
      patrocinio.contratoAtivo?.patrocinadorId,
    );

    // Save antigo (sem o campo) → estado vazio, nada fabricado.
    const snapLegacy = {...snap, patrocinio: undefined};
    const legacy = aplicarSnapshot(snapLegacy);
    expect(legacy.patrocinio).toEqual(criarEstadoPatrocinioVazio());
  });
});
