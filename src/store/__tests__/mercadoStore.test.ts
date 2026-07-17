/**
 * Mercado no STORE (ROADMAP Fase 7 / TESTES_BALANCEAMENTO §11-12): compra e venda
 * do usuário movimentam caixa dos DOIS clubes e trocam o jogador de clube. Os
 * engines de negociação já têm testes unitários; aqui cobrimos o WIRING no store
 * (fazerPropostaCompra / venderJogador) que a suíte não exercitava.
 */
import {precoVenda, useGameStore} from '../useGameStore';
import {combinarMundoStore} from '../transferenciaMundo';

const estado = () => useGameStore.getState();
const clubeDe = (id: string) => estado().clubes.find(clube => clube.id === id)!;
const clubeMestre = (id: string) =>
  estado().todosClubes.find(clube => clube.id === id)!;
/** Dá saldo folgado ao clube do usuário (liga ativa) para bancar contratações. */
function darCaixa(usuarioId: string, saldo = 999_000_000) {
  useGameStore.setState({
    clubes: estado().clubes.map(clube =>
      clube.id === usuarioId
        ? {...clube, financas: {...clube.financas, saldo}}
        : clube,
    ),
  });
}

describe('mercado no store', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('venderJogador credita exatamente precoVenda e registra a transação', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const jogador = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    const esperado = precoVenda(jogador);
    const saldoAntes = clubeDe(usuario.id).financas.saldo;

    const resultado = estado().venderJogador(jogador.id);

    expect(resultado.ok).toBe(true);
    expect(clubeDe(usuario.id).financas.saldo).toBe(saldoAntes + esperado);
    expect(estado().jogadores.find(j => j.id === jogador.id)?.clubeId).toBeNull();
    expect(
      clubeDe(usuario.id).financas.historicoTransacoes.some(
        transacao =>
          transacao.categoria === 'vendaJogadores' &&
          transacao.valor === esperado,
      ),
    ).toBe(true);
  });

  it('fazerPropostaCompra sem saldo é recusada e não move nada', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const alvo = estado().jogadores.find(
      j => j.clubeId !== null && j.clubeId !== usuario.id,
    )!;
    const clubeAlvoAntes = alvo.clubeId;

    // Rebaixa o saldo do usuário para bem abaixo da oferta.
    useGameStore.setState({
      clubes: estado().clubes.map(clube =>
        clube.id === usuario.id
          ? {...clube, financas: {...clube.financas, saldo: 1000}}
          : clube,
      ),
    });

    const resultado = estado().fazerPropostaCompra(alvo.id, 50_000_000);

    expect(resultado.status).toBe('recusada');
    expect(resultado.mensagem).toContain('Saldo insuficiente');
    expect(estado().jogadores.find(j => j.id === alvo.id)?.clubeId).toBe(
      clubeAlvoAntes,
    );
  });

  it('fazerPropostaCompra aceita move o dinheiro (comprador↓ vendedor↑) e o jogador de clube', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const alvo = estado().jogadores.find(
      j => j.clubeId !== null && j.clubeId !== usuario.id,
    )!;
    const vendedorId = alvo.clubeId!;

    // Caixa folgado no usuário para cobrir a oferta.
    useGameStore.setState({
      clubes: estado().clubes.map(clube =>
        clube.id === usuario.id
          ? {...clube, financas: {...clube.financas, saldo: 999_000_000}}
          : clube,
      ),
    });

    // Oferta de 150% do valor de mercado — acima do limiar de aceite da IA (≥92%).
    const valor = Math.max(1, Math.ceil(alvo.valorMercado * 1.5));
    const saldoCompradorAntes = clubeDe(usuario.id).financas.saldo;
    const saldoVendedorAntes = clubeDe(vendedorId).financas.saldo;

    const resultado = estado().fazerPropostaCompra(alvo.id, valor);

    expect(resultado.status).toBe('aceita');
    expect(estado().jogadores.find(j => j.id === alvo.id)?.clubeId).toBe(
      usuario.id,
    );
    expect(clubeDe(usuario.id).financas.saldo).toBe(saldoCompradorAntes - valor);
    expect(clubeDe(vendedorId).financas.saldo).toBe(saldoVendedorAntes + valor);
  });

  describe('mercado UNIVERSAL (compra entre ligas)', () => {
    it('o mundo combinado enxerga jogadores de outras ligas; a liga ativa, não', () => {
      const usuario = estado().clubes[7]; // clube da Série A (divisão jogada)
      estado().iniciarNovaCarreira(usuario.id);

      const {jogadores} = combinarMundoStore(estado());
      // Jogadores da Premier (outra liga) aparecem no mercado combinado…
      expect(jogadores.some(j => j.clubeId === 'club_man_city')).toBe(true);
      // …mas não na divisão jogada (state.jogadores só tem a Série A).
      expect(estado().jogadores.some(j => j.clubeId === 'club_man_city')).toBe(
        false,
      );
    });

    it('clube BR compra jogador da Premier: ele entra na liga ativa e o caixa fecha nos dois mundos', () => {
      const usuario = estado().clubes[7];
      estado().iniciarNovaCarreira(usuario.id);

      // Alvo de OUTRA liga (Man City), presente no mundo mestre, ausente da liga.
      const alvo = estado().todosJogadores.find(
        j => j.clubeId === 'club_man_city',
      )!;
      expect(alvo).toBeDefined();
      expect(estado().jogadores.some(j => j.id === alvo.id)).toBe(false);
      const vendedorId = alvo.clubeId!;
      const saldoVendedorAntes = clubeMestre(vendedorId).financas.saldo;

      darCaixa(usuario.id);
      const saldoCompradorAntes = clubeDe(usuario.id).financas.saldo;
      const valor = Math.max(1, Math.ceil(alvo.valorMercado * 1.5));

      const resultado = estado().fazerPropostaCompra(alvo.id, valor);

      expect(resultado.status).toBe('aceita');
      // Posse muda no mundo MESTRE…
      expect(estado().todosJogadores.find(j => j.id === alvo.id)?.clubeId).toBe(
        usuario.id,
      );
      // …e o reforço ENTRA na liga ativa (pode jogar pela divisão).
      expect(estado().jogadores.find(j => j.id === alvo.id)?.clubeId).toBe(
        usuario.id,
      );
      expect(clubeDe(usuario.id).elenco).toContain(alvo.id);
      // Finanças simétricas entre os dois mundos.
      expect(clubeDe(usuario.id).financas.saldo).toBe(
        saldoCompradorAntes - valor,
      );
      expect(clubeMestre(vendedorId).financas.saldo).toBe(
        saldoVendedorAntes + valor,
      );
      // O vendedor perde o jogador do elenco (no mestre).
      expect(clubeMestre(vendedorId).elenco).not.toContain(alvo.id);
    });

    it('empréstimo de jogador de outra liga entra na liga ativa como cedido', () => {
      const usuario = estado().clubes[7];
      estado().iniciarNovaCarreira(usuario.id);
      darCaixa(usuario.id);

      const alvo = estado().todosJogadores.find(
        j => j.clubeId === 'club_liverpool' && !j.emprestimo,
      )!;
      expect(alvo).toBeDefined();

      estado().pegarEmprestado(alvo.id);

      const naLiga = estado().jogadores.find(j => j.id === alvo.id);
      expect(naLiga?.clubeId).toBe(usuario.id);
      expect(naLiga?.emprestimo?.clubeDonoId).toBe('club_liverpool');
      expect(clubeDe(usuario.id).elenco).toContain(alvo.id);
      // No mestre, o Liverpool cede o jogador (posse vai para o usuário).
      expect(estado().todosJogadores.find(j => j.id === alvo.id)?.clubeId).toBe(
        usuario.id,
      );
    });
  });
});
