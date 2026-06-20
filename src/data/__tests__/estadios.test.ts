import {estadioDoClube} from '../estadios';

describe('estadioDoClube', () => {
  it('retorna o estádio real para clubes curados', () => {
    const maracana = estadioDoClube('club_flamengo', 'Flamengo');
    expect(maracana.nome).toBe('Maracanã');
    expect(maracana.capacidade).toBe(78838);
    expect(maracana.nivelInfraestrutura).toBe(4);
  });

  it('deriva capacidade variada e determinística para clubes não curados', () => {
    const a = estadioDoClube('club_desconhecido_x', 'Desconhecido X');
    const b = estadioDoClube('club_desconhecido_x', 'Desconhecido X');
    expect(a).toEqual(b); // determinístico
    expect(a.capacidade).toBeGreaterThanOrEqual(12000);
    expect(a.capacidade).toBeLessThanOrEqual(40000);
    expect(a.nome).toContain('Desconhecido X');

    // Clubes diferentes tendem a ter capacidades diferentes.
    const c = estadioDoClube('club_outro_y', 'Outro Y');
    expect(c.capacidade).not.toBe(a.capacidade);
  });
});
