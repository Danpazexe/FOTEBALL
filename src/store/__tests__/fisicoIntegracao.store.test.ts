/**
 * Integração da engine física no store (Onda 5): estado físico presente no
 * seed, carga/ritmo evoluindo com as partidas, recuperação e retorno
 * progressivo pelo relógio, e a ação de descanso do elenco.
 */
import {fadiga, prontidao} from '../../engine/physical/fisicoEngine';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('engine física no store (Onda 5)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('todo jogador nasce com estado físico (fisico) após o load', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const semFisico = estado().jogadores.filter(j => !j.fisico);
    expect(semFisico).toHaveLength(0);
  });

  it('após uma rodada, os titulares ganham ritmo e carga aguda', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const antes = new Map(
      estado().jogadores.map(j => [j.id, j.fisico!.ritmo]),
    );

    estado().avancarRodada();

    // Alguém do mundo jogou e ganhou ritmo (titulares); o estado físico anda.
    const subiuRitmo = estado().jogadores.some(
      j => j.fisico!.ritmo > (antes.get(j.id) ?? 0),
    );
    expect(subiuRitmo).toBe(true);
  });

  it('lesão recuperada pelo relógio volta PROGRESSIVA (condição parcial)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const alvo = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === alvo.id
          ? {...j, condicaoFisica: 100, lesionado: true, diasLesao: 3}
          : j,
      ),
    });

    // Avança rodadas até a lesão zerar (3 dias ≈ 1 rodada de calendário).
    estado().avancarRodada();
    estado().avancarRodada();
    const voltou = estado().jogadores.find(j => j.id === alvo.id)!;
    expect(voltou.lesionado).toBe(false);
    // Retorno progressivo: NÃO voltou com condição cheia.
    expect(voltou.condicaoFisica).toBeLessThanOrEqual(60);
    expect(
      estado().pendencias.some(
        p => p.tipo === 'retorno_lesao' && p.entidadeId === alvo.id,
      ),
    ).toBe(true);
  });

  it('descansarElencoUsuario poupa os cansados e consome a atividade do ciclo', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    // Cansa o elenco do usuário.
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.clubeId === usuario.id
          ? {...j, condicaoFisica: 50, fisico: {cargaAguda: 80, cargaCronica: 60, ritmo: 70}}
          : j,
      ),
    });
    const condicaoAntes = estado()
      .jogadores.filter(j => j.clubeId === usuario.id)
      .map(j => j.condicaoFisica);

    const poupados = estado().descansarElencoUsuario();

    expect(poupados).toBeGreaterThan(0);
    expect(estado().treinouProximoJogo).toBe(true);
    const condicaoDepois = estado()
      .jogadores.filter(j => j.clubeId === usuario.id)
      .map(j => j.condicaoFisica);
    const mediaAntes = condicaoAntes.reduce((s, v) => s + v, 0) / condicaoAntes.length;
    const mediaDepois = condicaoDepois.reduce((s, v) => s + v, 0) / condicaoDepois.length;
    expect(mediaDepois).toBeGreaterThan(mediaAntes);

    // Fechado no ciclo: segunda tentativa não faz nada.
    expect(estado().descansarElencoUsuario()).toBe(0);
  });

  it('prontidão e fadiga são consultáveis para o elenco (Departamento/Performance)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const jogador = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    const p = prontidao(jogador);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(100);
    expect(fadiga(jogador)).toBeGreaterThanOrEqual(0);
  });
});
