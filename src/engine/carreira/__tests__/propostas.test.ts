import {proporEmpregos, type ClubeCandidato} from '../propostas';

const clubes: ClubeCandidato[] = [
  {id: 'atual', nome: 'Atual', reputacao: 55, divisao: 'Série A'},
  {id: 'medio', nome: 'Médio', reputacao: 60, divisao: 'Série A'},
  {id: 'grande', nome: 'Grande', reputacao: 68, divisao: 'Série A'},
  {id: 'gigante', nome: 'Gigante', reputacao: 90, divisao: 'Série A'},
  {id: 'pequeno', nome: 'Pequeno', reputacao: 40, divisao: 'Série B'},
];

describe('proporEmpregos', () => {
  it('só propõe clubes MAIORES que o atual', () => {
    const p = proporEmpregos({
      reputacaoTecnico: 70,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
    });
    const ids = p.map(x => x.clubeId);
    expect(ids).not.toContain('atual');
    expect(ids).not.toContain('pequeno'); // menor que o atual
    expect(ids).toContain('medio');
    expect(ids).toContain('grande');
  });

  it('respeita a elegibilidade por reputação (margem +10)', () => {
    // Técnico com reputação 70: o Gigante (90) NÃO o contrata (90 > 70+10).
    const p = proporEmpregos({
      reputacaoTecnico: 70,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
    });
    expect(p.map(x => x.clubeId)).not.toContain('gigante');
    // Com reputação 85, o Gigante entra (90 <= 85+10... não, 95>=90 sim).
    const p2 = proporEmpregos({
      reputacaoTecnico: 85,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
    });
    expect(p2.map(x => x.clubeId)).toContain('gigante');
  });

  it('ordena do maior ao menor e respeita o máximo', () => {
    const p = proporEmpregos({
      reputacaoTecnico: 99,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
      maximo: 2,
    });
    expect(p).toHaveLength(2);
    expect(p[0].clubeId).toBe('gigante'); // 90
    expect(p[1].clubeId).toBe('grande'); // 68
  });

  it('técnico pequeno sem clube maior elegível → sem propostas', () => {
    const p = proporEmpregos({
      reputacaoTecnico: 45,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
    });
    // 45+10=55; nenhum clube MAIOR que 55 é <=55 → nada.
    expect(p).toHaveLength(0);
  });

  it('é determinística', () => {
    const args = {
      reputacaoTecnico: 80,
      clubeAtualId: 'atual',
      reputacaoClubeAtual: 55,
      clubes,
    };
    expect(proporEmpregos(args)).toEqual(proporEmpregos(args));
  });
});
