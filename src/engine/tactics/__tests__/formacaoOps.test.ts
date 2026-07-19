import type {Formacao, Position} from '../../../types';
import {
  TAMANHO_BANCO,
  alternarBanco,
  preencherBanco,
  removerJogadorDaFormacao,
} from '../formacaoOps';

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

describe('banco (reservas escalados)', () => {
  // 11 titulares (t0..t10) + 19 não-titulares (b0..b18, overall decrescente).
  const elenco = [
    ...Array.from({length: 11}, (_, i) => ({id: `t${i}`, overall: 80})),
    ...Array.from({length: 19}, (_, i) => ({id: `b${i}`, overall: 70 - i})),
  ];
  function form(reservas: string[]): Formacao {
    return {
      tipo: '4-3-3',
      titulares: Array.from({length: 11}, (_, i) => ({
        posicao: 'MC' as Position,
        jogadorId: `t${i}`,
      })),
      reservas,
    };
  }

  it('preenche o banco com os melhores não-titulares até TAMANHO_BANCO', () => {
    const r = preencherBanco(form([]), elenco);
    expect(r.reservas).toHaveLength(TAMANHO_BANCO);
    expect(r.reservas).toContain('b0'); // maior overall
    expect(r.reservas.every(id => id.startsWith('b'))).toBe(true);
  });

  it('é idempotente: banco cheio e válido não muda a referência', () => {
    const cheio = form(Array.from({length: TAMANHO_BANCO}, (_, i) => `b${i}`));
    expect(preencherBanco(cheio, elenco)).toBe(cheio);
  });

  it('remove do banco ids inválidos (fora do elenco / titulares) sem re-encher', () => {
    const r = preencherBanco(form(['b0', 'fantasma', 't0']), elenco);
    expect(r.reservas).not.toContain('fantasma');
    expect(r.reservas).not.toContain('t0');
    expect(r.reservas).toContain('b0');
    // Só limpa a sujeira; NÃO completa de volta até o teto (gestão manual).
    expect(r.reservas).toEqual(['b0']);
  });

  it('abaixo do teto: NÃO re-enche o banco (respeita mover p/ fora do jogo)', () => {
    const onze = Array.from({length: 11}, (_, i) => `b${i}`);
    const formOnze = form(onze);
    const r = preencherBanco(formOnze, elenco);
    // Válido e abaixo do teto → devolve a MESMA formação (não completa até 12).
    expect(r).toBe(formOnze);
    expect(r.reservas).toHaveLength(11);
  });

  it('alternarBanco: move entre banco e fora, titular nunca entra, respeita o teto', () => {
    let f = form([]);
    f = alternarBanco(f, 'b5');
    expect(f.reservas).toContain('b5');
    f = alternarBanco(f, 'b5');
    expect(f.reservas).not.toContain('b5');
    expect(alternarBanco(f, 't0').reservas).not.toContain('t0');
    const cheio = form(Array.from({length: TAMANHO_BANCO}, (_, i) => `b${i}`));
    expect(alternarBanco(cheio, 'b15').reservas).toHaveLength(TAMANHO_BANCO);
  });
});
