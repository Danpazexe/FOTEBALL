/**
 * Mercado no STORE (ROADMAP Fase 7 / TESTES_BALANCEAMENTO §11-12): compra e venda
 * do usuário movimentam caixa dos DOIS clubes e trocam o jogador de clube. Os
 * engines de negociação já têm testes unitários; aqui cobrimos o WIRING no store
 * (fazerPropostaCompra / venderJogador) que a suíte não exercitava.
 */
import {precoVenda, useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const clubeDe = (id: string) => estado().clubes.find(clube => clube.id === id)!;

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
});
