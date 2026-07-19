/**
 * Integração da disciplina no store (Onda 2): carreira nova nasce com
 * `disponibilidade` derivada (comDisponibilidade nos loads), o set de
 * idempotência existe e ambos sobrevivem a salvar/recarregar.
 */
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('disciplina no store (Onda 2)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('carreira nova: todo jogador tem disponibilidade e o set de idempotência é vazio', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id);
    expect(estado().partidasDisciplinaProcessada).toEqual([]);
    for (const j of estado().jogadores) {
      expect(j.disponibilidade).toBeDefined();
      expect(Array.isArray(j.disponibilidade!.disciplinas)).toBe(true);
    }
  });

  it('disponibilidade e o set de idempotência sobrevivem a salvar/recarregar', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id);
    useGameStore.setState({partidasDisciplinaProcessada: ['brasileirao_2026_r1_x_y']});
    const aplicado = aplicarSnapshot(montarSnapshot(estado()));
    expect(aplicado.partidasDisciplinaProcessada).toEqual([
      'brasileirao_2026_r1_x_y',
    ]);
    expect(aplicado.jogadores?.every(j => j.disponibilidade !== undefined)).toBe(
      true,
    );
  });

  it('save antigo (sem o campo) carrega com set de idempotência vazio', () => {
    estado().iniciarNovaCarreira(estado().clubes[3].id);
    const snap = montarSnapshot(estado());
    delete snap.partidasDisciplinaProcessada;
    expect(aplicarSnapshot(snap).partidasDisciplinaProcessada).toEqual([]);
  });
});
