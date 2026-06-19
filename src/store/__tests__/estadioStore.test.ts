import {
  CAPACIDADE_MAX_ESTADIO,
  LUGARES_POR_AMPLIACAO,
  custoAmpliacaoEstadio,
  custoMelhoriaInfra,
  useGameStore,
} from '../useGameStore';

const estado = () => useGameStore.getState();

function darSaldo(uid: string, saldo: number) {
  useGameStore.setState({
    clubes: estado().clubes.map(c =>
      c.id === uid ? {...c, financas: {...c.financas, saldo}} : c,
    ),
  });
}

describe('melhorarEstadio', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('amplia a capacidade, debita o custo e registra a obra', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = usuario.id;
    const clube = () => estado().clubes.find(c => c.id === uid)!;

    const capAntes = clube().estadio.capacidade;
    const custo = custoAmpliacaoEstadio(capAntes);
    darSaldo(uid, custo + 1_000_000);
    const saldoAntes = clube().financas.saldo;

    const r = estado().melhorarEstadio('capacidade');
    expect(r.ok).toBe(true);
    expect(clube().estadio.capacidade).toBe(capAntes + LUGARES_POR_AMPLIACAO);
    expect(clube().financas.saldo).toBe(saldoAntes - custo);
    expect(
      clube().financas.historicoTransacoes[0].categoria,
    ).toBe('obras');
  });

  it('sobe a infraestrutura um nível', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = usuario.id;
    const clube = () => estado().clubes.find(c => c.id === uid)!;

    const nivelAntes = clube().estadio.nivelInfraestrutura;
    darSaldo(uid, custoMelhoriaInfra(nivelAntes) + 1_000_000);

    expect(estado().melhorarEstadio('infraestrutura').ok).toBe(true);
    expect(clube().estadio.nivelInfraestrutura).toBe(nivelAntes + 1);
  });

  it('recusa quando o saldo é insuficiente (sem alterar o estádio)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = usuario.id;
    const clube = () => estado().clubes.find(c => c.id === uid)!;

    darSaldo(uid, 0);
    const capAntes = clube().estadio.capacidade;
    const r = estado().melhorarEstadio('capacidade');
    expect(r.ok).toBe(false);
    expect(clube().estadio.capacidade).toBe(capAntes);
  });

  it('recusa ampliar além da capacidade máxima', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = usuario.id;
    useGameStore.setState({
      clubes: estado().clubes.map(c =>
        c.id === uid
          ? {
              ...c,
              financas: {...c.financas, saldo: 999_000_000},
              estadio: {...c.estadio, capacidade: CAPACIDADE_MAX_ESTADIO},
            }
          : c,
      ),
    });
    expect(estado().melhorarEstadio('capacidade').ok).toBe(false);
  });
});
