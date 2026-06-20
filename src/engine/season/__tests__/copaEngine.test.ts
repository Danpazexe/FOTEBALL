import {
  avancarCopa,
  confrontoDoClube,
  definirResultadoConfronto,
  faseAtualCopa,
  gerarCopaDoBrasil,
  type EstadoCopa,
} from '../copaEngine';
import {criarClube, criarPlayer} from '../../../testing/fixtures';
import {criarRNGComSeed} from '../../simulation/rng';

function cenario(n: number) {
  const clubes = Array.from({length: n}, (_, i) => criarClube({id: `c${i}`}));
  // overall cresce com o índice; 'c0' é o mais fraco (testa inclusão forçada).
  const jogadores = clubes.map((clube, i) =>
    criarPlayer({id: `j${i}`, clubeId: clube.id, overall: 50 + i}),
  );
  return {clubes, jogadores};
}

function resolverFaseInteira(estado: EstadoCopa): EstadoCopa {
  // Resolve todos os confrontos da fase atual com o timeA vencendo por 1x0.
  const fases = estado.fases.map((f, idx) =>
    idx === estado.faseAtual
      ? {...f, confrontos: f.confrontos.map(c => definirResultadoConfronto(c, 1, 0))}
      : f,
  );
  return avancarCopa({...estado, fases});
}

describe('copaEngine', () => {
  it('gera a Copa com 16 clubes (Oitavas, 8 confrontos) e inclui o usuário', () => {
    const {clubes, jogadores} = cenario(18);
    const estado = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(1));
    const fase = faseAtualCopa(estado);

    expect(fase.nome).toBe('Oitavas de final');
    expect(fase.confrontos).toHaveLength(8);
    const ids = fase.confrontos.flatMap(c => [c.timeA, c.timeB]);
    expect(new Set(ids).size).toBe(16); // todos distintos
    expect(ids).toContain('c0'); // usuário entrou mesmo sendo o mais fraco
  });

  it('é determinística com a mesma seed', () => {
    const {clubes, jogadores} = cenario(18);
    const a = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(7));
    const b = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(7));
    expect(faseAtualCopa(a).confrontos).toEqual(faseAtualCopa(b).confrontos);
  });

  it('definirResultadoConfronto decide por placar e por pênaltis no empate', () => {
    const base = {id: 'x', timeA: 'a', timeB: 'b'};
    expect(definirResultadoConfronto(base, 2, 1).vencedor).toBe('a');
    expect(definirResultadoConfronto(base, 0, 3).vencedor).toBe('b');
    expect(definirResultadoConfronto(base, 1, 1, 'b').vencedor).toBe('b');
  });

  it('avança Oitavas → Quartas → Semi → Final → campeão', () => {
    const {clubes, jogadores} = cenario(18);
    let estado = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(3));
    let guarda = 0;
    while (!estado.campeao && guarda < 10) {
      guarda += 1;
      estado = resolverFaseInteira(estado);
    }
    expect(estado.campeao).toBeTruthy();
    expect(estado.fases).toHaveLength(4);
    expect(estado.fases.map(f => f.nome)).toEqual([
      'Oitavas de final',
      'Quartas de final',
      'Semifinal',
      'Final',
    ]);
  });

  it('avancarCopa lança se a fase ainda tem confronto sem vencedor', () => {
    const {clubes, jogadores} = cenario(18);
    const estado = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(2));
    expect(() => avancarCopa(estado)).toThrow();
  });

  it('confrontoDoClube acha o jogo do clube e some quando há campeão', () => {
    const {clubes, jogadores} = cenario(18);
    const estado = gerarCopaDoBrasil(clubes, jogadores, '2026', 'c0', criarRNGComSeed(5));
    const meu = confrontoDoClube(estado, 'c0');
    expect(meu).not.toBeNull();
    expect([meu!.timeA, meu!.timeB]).toContain('c0');
    expect(confrontoDoClube({...estado, campeao: 'c0'}, 'c0')).toBeNull();
  });
});
