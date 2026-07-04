import {analisarAdversario} from '../scout';
import {criarPlayer} from '../../../testing/fixtures';
import type {Player, Position} from '../../../types';

function jog(id: string, posicao: Position, overall: number, extra: Partial<Player> = {}): Player {
  return criarPlayer({id, posicaoPrincipal: posicao, overall, ...extra});
}

// Elenco base: ataque forte, meio fraco, defesa mediana.
function elencoBase(): Player[] {
  return [
    jog('a1', 'CA', 85),
    jog('a2', 'PD', 84),
    jog('a3', 'PE', 83),
    jog('m1', 'MC', 70),
    jog('m2', 'VOL', 70),
    jog('m3', 'MEI', 70),
    jog('d1', 'ZAG', 75),
    jog('d2', 'ZAG', 75),
    jog('d3', 'LD', 75),
    jog('d4', 'LE', 74),
    jog('g1', 'GOL', 74),
  ];
}

describe('analisarAdversario', () => {
  it('elenco vazio → força zero e sem melhor jogador', () => {
    const s = analisarAdversario([]);
    expect(s.forcaAtaque).toBe(0);
    expect(s.melhorJogador).toBeNull();
  });

  it('calcula força por setor e o melhor jogador', () => {
    const s = analisarAdversario(elencoBase());
    expect(s.forcaAtaque).toBe(84); // (85+84+83)/3
    expect(s.forcaMeio).toBe(70);
    expect(s.forcaDefesa).toBe(75); // (75+75+75+74+74)/5 = 74.6 → 75
    expect(s.melhorJogador?.id).toBe('a1');
    expect(s.melhorJogador?.overall).toBe(85);
  });

  it('identifica setor mais forte e mais fraco', () => {
    const s = analisarAdversario(elencoBase());
    expect(s.setorForte).toBe('ataque');
    expect(s.setorFraco).toBe('meio');
  });

  it('ignora lesionados e suspensos (não jogam)', () => {
    const elenco = [
      ...elencoBase(),
      jog('craque_lesionado', 'CA', 99, {lesionado: true, diasLesao: 20}),
      jog('zagueiro_suspenso', 'ZAG', 98, {suspenso: true, jogosSuspensao: 1}),
    ];
    const s = analisarAdversario(elenco);
    // O craque lesionado (99) NÃO deve ser o melhor jogador exibido.
    expect(s.melhorJogador?.overall).toBe(85);
    // Nem inflar a defesa (o suspenso 98 é ignorado).
    expect(s.forcaDefesa).toBe(75);
  });

  it('usa apelido quando existe', () => {
    const s = analisarAdversario([jog('x', 'CA', 90, {apelido: 'Xerife'})]);
    expect(s.melhorJogador?.nome).toBe('Xerife');
  });

  it('é determinística', () => {
    const elenco = elencoBase();
    expect(analisarAdversario(elenco)).toEqual(analisarAdversario(elenco));
  });
});
