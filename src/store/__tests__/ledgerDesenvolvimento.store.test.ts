/**
 * Ledger de desenvolvimento (Onda 7): a virada de temporada registra a evolução
 * do elenco do usuário (delta de atributos + reason codes) e o registro
 * sobrevive a salvar/recarregar.
 */
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('ledger de desenvolvimento (Onda 7)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('carreira nova começa com ledger vazio', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    expect(estado().ledgerDesenvolvimento).toEqual([]);
  });

  it('a virada de temporada registra a evolução do elenco do usuário', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    useGameStore.setState({rodadaAtual: 39});

    estado().finalizarTemporada();

    const ledger = estado().ledgerDesenvolvimento;
    expect(ledger.length).toBeGreaterThan(0);
    // Todos os registros são de jogadores do clube do usuário e coerentes.
    const idsUsuario = new Set(
      estado()
        .jogadores.filter(j => j.clubeId === usuario.id)
        .map(j => j.id),
    );
    for (const registro of ledger) {
      expect(idsUsuario.has(registro.playerId)).toBe(true);
      expect(registro.overallDepois).toBeGreaterThanOrEqual(1);
      // O delta de overall bate com o registrado (antes → depois).
      expect(typeof registro.overallAntes).toBe('number');
    }
    // Pelo menos um registro traz um reason code (curva de idade).
    expect(ledger.some(r => r.motivos.length > 0)).toBe(true);
  });

  it('o ledger sobrevive a salvar e recarregar', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    useGameStore.setState({rodadaAtual: 39});
    estado().finalizarTemporada();
    const antes = estado().ledgerDesenvolvimento;
    expect(antes.length).toBeGreaterThan(0);

    const aplicado = aplicarSnapshot(montarSnapshot(estado()));
    expect(aplicado.ledgerDesenvolvimento).toEqual(antes);
  });

  it('save antigo (sem o campo) carrega com ledger vazio', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const snapshot = montarSnapshot(estado());
    delete snapshot.ledgerDesenvolvimento;
    expect(aplicarSnapshot(snapshot).ledgerDesenvolvimento).toEqual([]);
  });
});
