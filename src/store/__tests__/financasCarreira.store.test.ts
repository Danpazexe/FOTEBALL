/**
 * Finanças ↔ carreira no STORE (TESTES_BALANCEAMENTO §12): manter o clube no
 * vermelho tem consequências — salários atrasam (e derrubam a moral) e, no limite,
 * a falência demite o técnico. Os engines puros (salariosAtrasados/verificarDemissao)
 * já têm teste; aqui cobrimos o WIRING disparado por avancarRodada.
 */
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

/** Deixa o clube do usuário no vermelho e ajusta as rodadas no vermelho. */
function forcarVermelho(usuarioId: string, rodadasNoVermelho: number) {
  useGameStore.setState({
    rodadasNoVermelho,
    derrotasConsecutivas: 0,
    clubes: estado().clubes.map(clube =>
      clube.id === usuarioId
        ? {...clube, financas: {...clube.financas, saldo: -50_000_000}}
        : clube,
    ),
  });
}

describe('finanças ↔ carreira no store', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('salário atrasado (rodadas no vermelho) avisa que a moral despencou', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    forcarVermelho(usuario.id, 2); // vira 3 ao avançar → salário atrasa

    estado().avancarRodada();

    expect(
      estado().mensagens.some(mensagem =>
        mensagem.texto.includes('Salários atrasados'),
      ),
    ).toBe(true);
  });

  it('falência (muitas rodadas no vermelho) demite o técnico', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    forcarVermelho(usuario.id, 7); // vira 8 ao avançar → falência

    estado().avancarRodada();

    expect(estado().demissao).toBe('FALENCIA');
  });
});
