/**
 * TREINO COLETIVO no store: plano de função em lote por grupo posicional
 * (definirPlanoDoGrupo) e sugestão do staff em 1 toque (aplicarPlanosSugeridos).
 * O efeito por jogador é IDÊNTICO ao fluxo individual do PlayerDetail:
 * ativar um plano limpa o foco de atributo único.
 */
import {
  planosParaGrupo,
  sugerirPlanosElenco,
} from '../../engine/progression/treinoIndividual';
import {grupoDaPosicao} from '../../engine/tactics/posicoes';
import {useGameStore} from '../useGameStore';
import type {Player} from '../../types';

const estado = () => useGameStore.getState();

function iniciarCarreira(): string {
  estado().reiniciarCarreira();
  const usuario = estado().clubes[3];
  estado().iniciarNovaCarreira(usuario.id);
  return usuario.id;
}

const elencoDoUsuario = (clubeId: string): Player[] =>
  estado().jogadores.filter(j => j.clubeId === clubeId);

const doGrupo = (jogadores: Player[], grupo: string): Player[] =>
  jogadores.filter(j => grupoDaPosicao(j.posicaoPrincipal) === grupo);

describe('definirPlanoDoGrupo (treino coletivo por grupo)', () => {
  it('aplica o plano a TODO o grupo do usuário, limpa o foco e preserva o resto', () => {
    const clubeId = iniciarCarreira();
    const elenco = elencoDoUsuario(clubeId);
    const grupo = grupoDaPosicao(elenco[0].posicaoPrincipal);
    const plano = planosParaGrupo(grupo)[0];
    const alvo = doGrupo(elenco, grupo)[0];
    // Um do grupo com foco individual: ativar plano deve limpar (como no individual).
    estado().definirFocoTreino(alvo.id, 'passe');
    // Fora do grupo/clube: snapshots para provar que nada mudou.
    const foraDoGrupo = elenco.filter(
      j => grupoDaPosicao(j.posicaoPrincipal) !== grupo,
    );
    const outroClube = estado().jogadores.filter(j => j.clubeId !== clubeId);

    const afetados = estado().definirPlanoDoGrupo(grupo, plano.id);

    const depois = elencoDoUsuario(clubeId);
    const grupoDepois = doGrupo(depois, grupo);
    expect(afetados).toBe(grupoDepois.length);
    expect(afetados).toBeGreaterThan(0);
    for (const jogador of grupoDepois) {
      expect(jogador.planoDesenvolvimento).toBe(plano.id);
      expect(jogador.focoTreino).toBeUndefined();
    }
    expect(
      depois.filter(j => grupoDaPosicao(j.posicaoPrincipal) !== grupo),
    ).toEqual(foraDoGrupo);
    expect(estado().jogadores.filter(j => j.clubeId !== clubeId)).toEqual(
      outroClube,
    );
  });

  it('recusa plano que não vale para o grupo (no-op, retorna 0)', () => {
    const clubeId = iniciarCarreira();
    const antes = elencoDoUsuario(clubeId);
    // gol_reativo só vale para GOL — aplicar em ZAGUEIRO não muda nada.
    expect(estado().definirPlanoDoGrupo('ZAGUEIRO', 'gol_reativo')).toBe(0);
    expect(elencoDoUsuario(clubeId)).toEqual(antes);
  });

  it('é idempotente: aplicar duas vezes deixa o elenco no mesmo estado', () => {
    const clubeId = iniciarCarreira();
    const grupo = grupoDaPosicao(elencoDoUsuario(clubeId)[0].posicaoPrincipal);
    const plano = planosParaGrupo(grupo)[0];

    const primeira = estado().definirPlanoDoGrupo(grupo, plano.id);
    const aposPrimeira = estado().jogadores;
    const segunda = estado().definirPlanoDoGrupo(grupo, plano.id);

    expect(segunda).toBe(primeira);
    expect(estado().jogadores).toEqual(aposPrimeira);
  });

  it('null limpa o plano do grupo inteiro (sem tocar o foco)', () => {
    const clubeId = iniciarCarreira();
    const grupo = grupoDaPosicao(elencoDoUsuario(clubeId)[0].posicaoPrincipal);
    const plano = planosParaGrupo(grupo)[0];
    estado().definirPlanoDoGrupo(grupo, plano.id);
    // Como no individual: LIMPAR o plano não mexe no foco de atributo.
    const alvo = doGrupo(elencoDoUsuario(clubeId), grupo)[0];
    estado().definirFocoTreino(alvo.id, 'velocidade');

    const limpos = estado().definirPlanoDoGrupo(grupo, null);

    expect(limpos).toBeGreaterThan(0);
    for (const jogador of doGrupo(elencoDoUsuario(clubeId), grupo)) {
      expect(jogador.planoDesenvolvimento).toBeUndefined();
    }
    expect(
      estado().jogadores.find(j => j.id === alvo.id)?.focoTreino,
    ).toBe('velocidade');
  });
});

describe('aplicarPlanosSugeridos (sugestão do staff em 1 toque)', () => {
  it('aplica exatamente o mapa de sugerirPlanosElenco ao elenco do usuário', () => {
    const clubeId = iniciarCarreira();
    // Trava um jogador SEM margem de potencial: não deve receber sugestão.
    const semMargem = elencoDoUsuario(clubeId)[0];
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === semMargem.id ? {...j, potencial: j.overall} : j,
      ),
    });
    const esperado = sugerirPlanosElenco(elencoDoUsuario(clubeId));
    expect(esperado.has(semMargem.id)).toBe(false);
    expect(esperado.size).toBeGreaterThan(0);

    const aplicados = estado().aplicarPlanosSugeridos();

    expect(aplicados).toBe(esperado.size);
    for (const jogador of elencoDoUsuario(clubeId)) {
      expect(jogador.planoDesenvolvimento).toBe(esperado.get(jogador.id));
      if (esperado.has(jogador.id)) {
        // Mesmo efeito do individual: plano ativo limpa o foco único.
        expect(jogador.focoTreino).toBeUndefined();
      }
    }
  });

  it('não toca em jogadores de outros clubes', () => {
    const clubeId = iniciarCarreira();
    const outrosAntes = estado().jogadores.filter(j => j.clubeId !== clubeId);

    estado().aplicarPlanosSugeridos();

    expect(estado().jogadores.filter(j => j.clubeId !== clubeId)).toEqual(
      outrosAntes,
    );
  });
});
