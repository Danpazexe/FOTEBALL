import type {Formacao, Position} from '../../../types';
import {removerJogadorDaFormacao} from '../formacaoOps';

function criarFormacao(): Formacao {
  return {
    tipo: '4-3-3',
    titulares: Array.from({length: 11}, (_, i) => ({
      posicao: 'MC' as Position,
      jogadorId: `t${i}`,
    })),
    reservas: ['r0', 'r1', 'r2'],
  };
}

const ELENCO_COMPLETO = [
  ...Array.from({length: 11}, (_, i) => `t${i}`),
  'r0',
  'r1',
  'r2',
];

describe('removerJogadorDaFormacao', () => {
  it('promove um reserva apto ao slot quando um titular sai (mantém 11)', () => {
    const nova = removerJogadorDaFormacao(
      criarFormacao(),
      't0',
      ELENCO_COMPLETO.filter(id => id !== 't0'),
    );
    expect(nova.titulares).toHaveLength(11);
    expect(nova.titulares.some(t => t.jogadorId === 't0')).toBe(false);
    // O slot 0 herda a posição original, agora com o reserva promovido.
    expect(nova.titulares[0]).toEqual({posicao: 'MC', jogadorId: 'r0'});
    // O reserva promovido sai do banco.
    expect(nova.reservas).toEqual(['r1', 'r2']);
  });

  it('sem reserva apto no elenco, remove o slot (fica com 10, sem id fantasma)', () => {
    // elencoRestante só com titulares — nenhum reserva está apto a subir.
    const nova = removerJogadorDaFormacao(
      criarFormacao(),
      't3',
      Array.from({length: 11}, (_, i) => `t${i}`).filter(id => id !== 't3'),
    );
    expect(nova.titulares).toHaveLength(10);
    expect(nova.titulares.some(t => t.jogadorId === 't3')).toBe(false);
    expect(nova.reservas).toEqual(['r0', 'r1', 'r2']);
  });

  it('remove um reserva sem tocar nos titulares', () => {
    const nova = removerJogadorDaFormacao(criarFormacao(), 'r1', ELENCO_COMPLETO);
    expect(nova.titulares).toHaveLength(11);
    expect(nova.reservas).toEqual(['r0', 'r2']);
  });

  it('jogador fora da formação: retorna equivalente (nada muda)', () => {
    const nova = removerJogadorDaFormacao(
      criarFormacao(),
      'inexistente',
      ELENCO_COMPLETO,
    );
    expect(nova.titulares).toHaveLength(11);
    expect(nova.reservas).toEqual(['r0', 'r1', 'r2']);
  });

  it('nunca deixa o id removido na formação (nem titular nem reserva)', () => {
    for (const alvo of ['t5', 'r2']) {
      const nova = removerJogadorDaFormacao(criarFormacao(), alvo, ELENCO_COMPLETO);
      const ids = [
        ...nova.titulares.map(t => t.jogadorId),
        ...nova.reservas,
      ];
      expect(ids).not.toContain(alvo);
    }
  });
});
