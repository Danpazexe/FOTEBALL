/**
 * Prova do mundo MULTI-PAÍS: o seed carrega Brasil + Argentina + Inglaterra, o
 * mercado global enxerga jogadores dos três países, uma transferência
 * cross-país é atômica, e as novas ligas passam os invariantes do mundo.
 */
import {loadSeedData} from '../../../api/database/seed/loadSeed';
import {
  competicaoPorDivisaoLegada,
  listarPaises,
} from '../../../engine/competitions/registry/competitionRegistry';
import {applyTransfer} from '../../../engine/transfers/applyTransfer';
import {criarWorld} from '../worldTypes';
import {verificarInvariantesMundo} from '../worldInvariants';
import {
  selectClubesCompeticao,
  selectJogadoresClube,
  selectJogadoresMercadoGlobal,
} from '../worldSelectors';

const seed = loadSeedData();
const world = criarWorld({
  clubes: seed.clubes,
  jogadores: seed.jogadores,
  activeCompetitionId: 'br-serie-a',
  userClubId: null,
});

describe('mundo multi-país (Brasil + Argentina + Inglaterra)', () => {
  it('o registry conhece os três países', () => {
    const ids = listarPaises().map(p => p.id);
    expect(ids).toEqual(expect.arrayContaining(['brasil', 'argentina', 'inglaterra']));
  });

  it('o seed carrega as ligas: AR Primera (20), Premier (20) e Championship (24)', () => {
    const ar = selectClubesCompeticao(world, 'ar-primera').map(c => c.id);
    const premier = selectClubesCompeticao(world, 'en-premier').map(c => c.id);
    const championship = selectClubesCompeticao(world, 'en-championship').map(c => c.id);
    expect(championship).toHaveLength(24);
    expect(ar).toEqual(
      expect.arrayContaining(['club_boca_juniors', 'club_racing_club', 'club_lanus']),
    );
    // Primera expandida para uma liga jogável de 20 clubes reais.
    expect(ar).toHaveLength(20);
    expect(premier).toEqual(
      expect.arrayContaining([
        'club_man_city', 'club_liverpool', 'club_chelsea', 'club_arsenal',
        'club_man_united', 'club_tottenham', 'club_newcastle', 'club_aston_villa',
        'club_west_ham', 'club_everton', 'club_wolves', 'club_brentford',
        'club_leeds', 'club_sunderland',
      ]),
    );
    expect(premier).toHaveLength(20);
    // Leicester foi rebaixado no jogo → 2ª divisão (liga B); Sheffield
    // Wednesday e Charlton completam os 24 (EA FC 26).
    expect(championship).toEqual(
      expect.arrayContaining([
        'club_leicester', 'club_sheffield_wednesday', 'club_charlton',
        'club_bristol_city',
      ]),
    );
  });

  it('cada clube novo tem elenco coerente (posse = clubeId) e sem id fantasma', () => {
    for (const id of ['club_boca_juniors', 'club_man_city', 'club_liverpool']) {
      expect(selectJogadoresClube(world, id).length).toBeGreaterThanOrEqual(18);
    }
    // Invariantes do MUNDO INTEIRO (Brasil + novas ligas) — nada quebrado.
    expect(verificarInvariantesMundo(world)).toHaveLength(0);
  });

  it('mercado GLOBAL enxerga jogadores dos três países', () => {
    const brasil = selectJogadoresMercadoGlobal(world, {countryId: 'brasil'});
    // 20 clubes × ~23 jogadores.
    const argentina = selectJogadoresMercadoGlobal(world, {countryId: 'argentina'});
    const inglaterra = selectJogadoresMercadoGlobal(world, {countryId: 'inglaterra'});
    expect(brasil.length).toBeGreaterThan(100);
    expect(argentina.length).toBeGreaterThanOrEqual(60); // 3 clubes
    expect(inglaterra.length).toBeGreaterThanOrEqual(400); // 44 clubes (Premier 20 + Championship 24)
  });

  it('busca global acha um jogador internacional pelo nome', () => {
    const r = selectJogadoresMercadoGlobal(world, {busca: 'Haaland'});
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0]!.nacionalidade).toBe('Norway');
  });

  it('transferência CROSS-PAÍS (Inglaterra → Argentina) é atômica', () => {
    const haaland = selectJogadoresMercadoGlobal(world, {busca: 'Haaland'})[0]!;
    const boca = world.clubsById.club_boca_juniors!;
    // Dá saldo ao Boca para bancar a contratação (o seed não tem tanto).
    const worldRico = {
      ...world,
      clubsById: {
        ...world.clubsById,
        club_boca_juniors: {...boca, financas: {...boca.financas, saldo: 50_000_000}},
      },
    };
    const r = applyTransfer({
      world: worldRico,
      playerId: haaland.id,
      fromClubId: 'club_man_city',
      toClubId: 'club_boca_juniors',
      type: 'permanent',
      fee: 20_000_000,
      date: '2026-06-01',
      ignorarJanela: true,
      source: 'user',
    });
    expect(r.ok).toBe(true);
    expect(r.world.playersById[haaland.id]!.clubeId).toBe('club_boca_juniors');
    expect(r.world.clubsById.club_boca_juniors!.elenco).toContain(haaland.id);
    expect(r.world.clubsById.club_man_city!.elenco).not.toContain(haaland.id);
    // Invariantes intactos após o negócio internacional.
    expect(verificarInvariantesMundo(r.world)).toHaveLength(0);
    // O jogador do Man City agora conta como argentino no mercado por competição.
    const naArgentina = selectJogadoresMercadoGlobal(r.world, {
      competitionId: 'ar-primera',
      busca: 'Haaland',
    });
    expect(naArgentina).toHaveLength(1);
  });

  it('não há colisão de ids entre ligas (todos os jogadores únicos)', () => {
    const ids = seed.jogadores.map(j => j.id);
    expect(new Set(ids).size).toBe(ids.length);
    const clubeIds = seed.clubes.map(c => c.id);
    expect(new Set(clubeIds).size).toBe(clubeIds.length);
  });

  it('a divisão dos clubes novos mapeia para a competição certa', () => {
    expect(competicaoPorDivisaoLegada('Primera División')?.countryId).toBe('argentina');
    expect(competicaoPorDivisaoLegada('Premier League')?.countryId).toBe('inglaterra');
  });
});
