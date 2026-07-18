/**
 * TREINO RECORRENTE no store (Onda 4): onboarding resolve a pendência, o plano
 * é aplicado no avanço, a IA treina (fim da drenagem de condição) e o exploit
 * de treinar duas vezes na mesma rodada está fechado.
 */
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const elencoDoUsuario = (id: string) =>
  estado().jogadores.filter(j => j.clubeId === id);

describe('treino recorrente (Onda 4)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('aceitar o plano recomendado ativa o plano e limpa a pendência de treino', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    expect(
      estado().pendencias.some(p => p.tipo === 'definir_plano_treino'),
    ).toBe(true);
    expect(estado().recomendarPlanoTreino()).not.toBeNull();

    estado().aceitarPlanoRecomendado();

    expect(estado().planoTreino).not.toBeNull();
    expect(estado().planoTreinoStatus).toBe('configurado_usuario');
    expect(
      estado().pendencias.some(p => p.tipo === 'definir_plano_treino'),
    ).toBe(false);
  });

  it('configurar um plano próprio também resolve a pendência', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const rec = estado().recomendarPlanoTreino()!;

    estado().configurarPlanoTreino({...rec.plano, nome: 'Meu plano'});

    expect(estado().planoTreino?.nome).toBe('Meu plano');
    expect(estado().planoTreino?.status).toBe('ativo');
    expect(estado().planoTreinoStatus).toBe('configurado_usuario');
    expect(
      estado().pendencias.some(p => p.tipo === 'definir_plano_treino'),
    ).toBe(false);
  });

  it('exploit fechado: treinar de novo na mesma rodada não muda o elenco', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    estado().aplicarTreino('hab_finalizacao', 'forte');
    expect(estado().treinouProximoJogo).toBe(true);
    const snapshot = elencoDoUsuario(usuario.id).map(j => ({
      id: j.id,
      overall: j.overall,
      condicao: j.condicaoFisica,
    }));

    // Segunda tentativa no mesmo ciclo é recusada (sem novo ganho/lesão).
    estado().aplicarTreino('hab_fisico', 'muito_forte');
    const depois = elencoDoUsuario(usuario.id).map(j => ({
      id: j.id,
      overall: j.overall,
      condicao: j.condicaoFisica,
    }));
    expect(depois).toEqual(snapshot);
  });

  it('a IA da liga recupera condição no avanço (não drena mais até o piso)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    // Rebaixa a condição de TODA a liga da IA para simular fim de temporada.
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.clubeId && j.clubeId !== usuario.id
          ? {...j, condicaoFisica: 40}
          : j,
      ),
    });
    const antes = estado()
      .jogadores.filter(j => j.clubeId && j.clubeId !== usuario.id)
      .map(j => j.condicaoFisica);

    estado().avancarRodada();

    const depois = estado()
      .jogadores.filter(j => j.clubeId && j.clubeId !== usuario.id)
      .map(j => j.condicaoFisica);
    const mediaAntes = antes.reduce((s, v) => s + v, 0) / antes.length;
    const mediaDepois = depois.reduce((s, v) => s + v, 0) / depois.length;
    // Quem não jogou recuperou (+treino leve); a média sobe, não afunda.
    expect(mediaDepois).toBeGreaterThan(mediaAntes);
  });

  it('sem treino manual, o plano do ciclo é aplicado no avanço', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    // Plano focado em finalização: quem tem progresso deve caminhar.
    estado().aceitarPlanoRecomendado();
    const overallAntes = elencoDoUsuario(usuario.id).reduce(
      (s, j) => s + j.overall,
      0,
    );

    estado().avancarRodada();

    // O ciclo rodou (não travou) e o elenco segue coerente (nada sumiu).
    expect(elencoDoUsuario(usuario.id).length).toBeGreaterThan(0);
    const overallDepois = elencoDoUsuario(usuario.id).reduce(
      (s, j) => s + j.overall,
      0,
    );
    expect(overallDepois).toBeGreaterThanOrEqual(overallAntes);
  });
});
