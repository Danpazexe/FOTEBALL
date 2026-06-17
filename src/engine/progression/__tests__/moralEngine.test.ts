import {criarPartida, criarPlayer} from '../../../testing/fixtures';
import {
  aplicarMoral,
  calcularDeltasMoralPartida,
  converteComGrupo,
} from '../moralEngine';

describe('moralEngine', () => {
  it('vitória aumenta moral dos titulares em +3', () => {
    const titular = criarPlayer({id: 't1', clubeId: 'casa'});
    const partida = criarPartida({
      id: 'p',
      timeCasa: 'casa',
      timeFora: 'fora',
      placarCasa: 1,
      placarFora: 0,
    });
    const deltas = calcularDeltasMoralPartida(
      partida,
      'casa',
      [titular],
      ['t1'],
      'casa',
    );
    expect(deltas[0].delta).toBe(3);
  });

  it('artilheiro recebe +8 adicional', () => {
    const artilheiro = criarPlayer({id: 'g', clubeId: 'casa'});
    const partida = criarPartida({
      id: 'p',
      timeCasa: 'casa',
      placarCasa: 1,
      placarFora: 0,
      eventos: [
        {minuto: 10, tipo: 'gol', timeId: 'casa', jogadorId: 'g', descricao: ''},
      ],
    });
    const deltas = calcularDeltasMoralPartida(
      partida,
      'casa',
      [artilheiro],
      ['g'],
      'casa',
    );
    expect(deltas[0].delta).toBe(11); // 3 (vitória) + 8 (gol)
  });

  it('derrota reduz reservas em -1', () => {
    const reserva = criarPlayer({id: 'r', clubeId: 'casa'});
    const partida = criarPartida({
      id: 'p',
      timeCasa: 'casa',
      placarCasa: 0,
      placarFora: 2,
    });
    const deltas = calcularDeltasMoralPartida(partida, 'casa', [reserva], [], 'fora');
    expect(deltas[0].delta).toBe(-1);
  });

  it('moral não ultrapassa 100 nem cai abaixo de 10', () => {
    expect(aplicarMoral(98, 10)).toBe(100);
    expect(aplicarMoral(12, -50)).toBe(10);
  });

  it('converteComGrupo aplica +5 a todos', () => {
    const jogadores = [criarPlayer({id: 'a'}), criarPlayer({id: 'b'})];
    const deltas = converteComGrupo(jogadores);
    expect(deltas).toHaveLength(2);
    expect(deltas.every(delta => delta.delta === 5)).toBe(true);
  });
});
