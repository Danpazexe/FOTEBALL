/**
 * WorldState + selectors + invariantes: mercado global vê todas as ligas,
 * qualquer clube é acessível por id, e o detector de corrupção pega id fantasma.
 */
import {criarClube, criarPlayer} from '../../../testing/fixtures';
import {criarWorld, worldParaArrays} from '../worldTypes';
import {
  selectClubePorId,
  selectJogadoresClube,
  selectJogadoresMercadoGlobal,
} from '../worldSelectors';
import {verificarInvariantesMundo} from '../worldInvariants';

function mundoDuasLigas() {
  const flamengo = criarClube({id: 'flamengo', nome: 'Flamengo', divisao: 'Série A'});
  const cruzeiro = criarClube({id: 'cruzeiro', nome: 'Cruzeiro', divisao: 'Série B'});
  const j1 = criarPlayer({id: 'j1', nome: 'Arrascaeta', clubeId: 'flamengo', posicaoPrincipal: 'MEI', overall: 85});
  const j2 = criarPlayer({id: 'j2', nome: 'Matheus', clubeId: 'cruzeiro', posicaoPrincipal: 'ZAG', overall: 78});
  const livre = criarPlayer({id: 'j3', nome: 'Livre', clubeId: null, overall: 70});
  return criarWorld({
    clubes: [
      {...flamengo, elenco: ['j1']},
      {...cruzeiro, elenco: ['j2']},
    ],
    jogadores: [j1, j2, livre],
    activeCompetitionId: 'br-serie-a',
    userClubId: 'flamengo',
  });
}

describe('WorldState e selectors', () => {
  it('acessa qualquer clube por id', () => {
    const world = mundoDuasLigas();
    expect(selectClubePorId(world, 'cruzeiro')?.nome).toBe('Cruzeiro');
    expect(selectClubePorId(world, 'inexistente')).toBeUndefined();
  });

  it('lista jogadores de um clube pela posse (clubeId)', () => {
    const world = mundoDuasLigas();
    expect(selectJogadoresClube(world, 'flamengo').map(j => j.id)).toEqual(['j1']);
  });

  it('mercado GLOBAL enxerga jogadores de ligas diferentes', () => {
    const world = mundoDuasLigas();
    const ids = selectJogadoresMercadoGlobal(world).map(j => j.id).sort();
    expect(ids).toEqual(['j1', 'j2', 'j3']);
  });

  it('filtra por competição, posição e agente livre', () => {
    const world = mundoDuasLigas();
    expect(
      selectJogadoresMercadoGlobal(world, {competitionId: 'br-serie-b'}).map(j => j.id),
    ).toEqual(['j2']);
    expect(
      selectJogadoresMercadoGlobal(world, {posicao: 'MEI'}).map(j => j.id),
    ).toEqual(['j1']);
    expect(
      selectJogadoresMercadoGlobal(world, {soAgentesLivres: true}).map(j => j.id),
    ).toEqual(['j3']);
  });

  it('busca por nome é acento-insensível e cobre nome do clube', () => {
    const world = mundoDuasLigas();
    expect(
      selectJogadoresMercadoGlobal(world, {busca: 'arrascaeta'}).map(j => j.id),
    ).toEqual(['j1']);
    expect(
      selectJogadoresMercadoGlobal(world, {busca: 'cruzeiro'}).map(j => j.id),
    ).toEqual(['j2']);
  });

  it('roundtrip world→arrays preserva clubes/jogadores', () => {
    const world = mundoDuasLigas();
    const arrays = worldParaArrays(world);
    expect(arrays.clubes).toHaveLength(2);
    expect(arrays.jogadores).toHaveLength(3);
  });
});

describe('invariantes do mundo', () => {
  it('mundo íntegro não tem violações', () => {
    expect(verificarInvariantesMundo(mundoDuasLigas())).toHaveLength(0);
  });

  it('detecta id fantasma na formação', () => {
    const clube = criarClube({
      id: 'flamengo',
      elenco: [],
      formacaoAtual: {tipo: '4-3-3', titulares: [{jogadorId: 'fantasma', posicao: 'CA'}], reservas: []},
    });
    const world = criarWorld({clubes: [clube], jogadores: []});
    const v = verificarInvariantesMundo(world);
    expect(v.some(m => m.includes('fantasma'))).toBe(true);
  });

  it('detecta jogador com clubeId apontando para clube inexistente', () => {
    const world = criarWorld({
      clubes: [],
      jogadores: [criarPlayer({id: 'j1', clubeId: 'nao_existe'})],
    });
    expect(verificarInvariantesMundo(world).some(m => m.includes('clubeId fantasma'))).toBe(true);
  });
});
