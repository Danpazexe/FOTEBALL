import {resolverAcesso, SERIE_D_2025, SERIE_D_2026} from '../index';

const semifinalistas = ['s1', 's2', 's3', 's4'];
const perdedoresQuartas = ['q1', 'q2', 'q3', 'q4'];
const todos = [...semifinalistas, ...perdedoresQuartas];
const seedPorClube = new Map(todos.map((id, i) => [id, i + 1]));
const forcaPorClube = new Map(todos.map((id, i) => [id, 60 - i]));

function acesso(regra = SERIE_D_2026) {
  return resolverAcesso({
    semifinalistas,
    perdedoresQuartas,
    seedPorClube,
    forcaPorClube,
    temporada: '2026',
    seedBase: '2026',
    regra,
  });
}

describe('resolverAcesso', () => {
  it('formato 2026: 6 acessos = 4 semifinalistas + 2 vencedores do playoff', () => {
    const {promovidos, playoffAcesso} = acesso();
    expect(promovidos).toHaveLength(6);
    // Os 4 semifinalistas sobem direto.
    for (const s of semifinalistas) {
      expect(promovidos).toContain(s);
    }
    // As 2 vagas restantes vêm dos eliminados nas quartas.
    const viaPlayoff = promovidos.filter(id => perdedoresQuartas.includes(id));
    expect(viaPlayoff).toHaveLength(2);
    // Sem duplicidade.
    expect(new Set(promovidos).size).toBe(6);
    // Playoff com 2 confrontos, cada um com vencedor.
    expect(playoffAcesso).not.toBeNull();
    expect(playoffAcesso!.confrontos).toHaveLength(2);
    for (const confronto of playoffAcesso!.confrontos) {
      expect(confronto.vencedor).toBeTruthy();
    }
  });

  it('é determinístico para a mesma seed', () => {
    expect(acesso()).toEqual(acesso());
  });

  it('formato 2025: sobem só os 4 semifinalistas, sem playoff', () => {
    const {promovidos, playoffAcesso} = acesso(SERIE_D_2025);
    expect(promovidos).toHaveLength(4);
    expect(promovidos.sort()).toEqual([...semifinalistas].sort());
    expect(playoffAcesso).toBeNull();
  });
});
