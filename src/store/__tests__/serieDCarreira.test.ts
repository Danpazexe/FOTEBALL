import type {Semente} from '../../engine/competitions';
import {clubesSeed} from '../../data/seed/clubes';
import {jogadoresSeed} from '../../data/seed/jogadores';
import {filtrarClubesSerieD, simularFaseGrupos} from '../../engine/competitions';
import {mapaDeForca} from '../../engine/competitions';
import {
  avancarMataMataSerieDCarreira,
  classificadosSerieDCarreira,
  iniciarMataMataSerieDCarreira,
  type EstadoSerieDCarreira,
} from '../serieDCarreira';
import {gruposSerieDDaTemporada} from '../serieDSeason';

const USUARIO = 'clube_usuario';

/** 64 sementes sintéticas com o usuário como melhor campanha (seed 1). */
function sementes64(): Semente[] {
  const lista: Semente[] = [{clubeId: USUARIO, seed: 1}];
  for (let i = 2; i <= 64; i += 1) {
    lista.push({clubeId: `c${i}`, seed: i});
  }
  return lista;
}

const forcaIgual = new Map<string, number>(
  sementes64().map(s => [s.clubeId, 50]),
);

function avancar(
  estado: EstadoSerieDCarreira,
  vitoriaUsuario?: boolean,
): EstadoSerieDCarreira {
  return avancarMataMataSerieDCarreira(estado, USUARIO, forcaIgual, vitoriaUsuario);
}

describe('iniciarMataMataSerieDCarreira', () => {
  it('usuário classificado começa no mata-mata com um confronto seu', () => {
    const estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    expect(estado.fase).toBe('mata_mata');
    expect(estado.faseCorrente?.confrontos).toHaveLength(32);
    expect(estado.faseCorrente?.nome).toBe('Segunda Fase');
    const meu = estado.faseCorrente!.confrontos.find(
      c => c.clubeA === USUARIO || c.clubeB === USUARIO,
    );
    expect(meu).toBeTruthy();
  });

  it('usuário não classificado já começa eliminado', () => {
    const semUsuario = sementes64().filter(s => s.clubeId !== USUARIO);
    semUsuario.push({clubeId: 'extra', seed: 1});
    const estado = iniciarMataMataSerieDCarreira(semUsuario, USUARIO, '2026', 'A');
    expect(estado.fase).toBe('eliminado');
    expect(estado.acessoConquistado).toBe(false);
  });
});

describe('avancarMataMataSerieDCarreira — trajetória do usuário', () => {
  it('vencer todas as chaves leva ao título e garante acesso', () => {
    let estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    // 64→32→16→8→4→2→1 = 6 fases vencidas.
    for (let i = 0; i < 6; i += 1) {
      estado = avancar(estado, true);
    }
    expect(estado.fase).toBe('campeao');
    expect(estado.campeao).toBe(USUARIO);
    expect(estado.acessoConquistado).toBe(true);
    expect(estado.fasesResolvidas).toHaveLength(6);
  });

  it('vencer as quartas garante acesso mesmo perdendo a semifinal', () => {
    let estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    // Vence 2ª fase, 3ª fase, oitavas e quartas (4 fases) → semifinalista.
    for (let i = 0; i < 4; i += 1) {
      estado = avancar(estado, true);
    }
    expect(estado.acessoConquistado).toBe(true);
    expect(estado.faseCorrente?.nome).toBe('Semifinal');
    // Perde a semi.
    estado = avancar(estado, false);
    expect(estado.fase).toBe('eliminado');
    expect(estado.acessoConquistado).toBe(true); // semifinalista sobe
  });

  it('perder as quartas manda ao playoff de acesso; vencer o playoff sobe', () => {
    let estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    // Vence 2ª fase, 3ª e oitavas (3 fases) → chega às quartas.
    for (let i = 0; i < 3; i += 1) {
      estado = avancar(estado, true);
    }
    expect(estado.faseCorrente?.nome).toBe('Quartas de final');
    // Perde as quartas → playoff.
    estado = avancar(estado, false);
    expect(estado.fase).toBe('playoff_acesso');
    expect(estado.acessoConquistado).toBe(false);
    const meu = estado.faseCorrente!.confrontos.find(
      c => c.clubeA === USUARIO || c.clubeB === USUARIO,
    );
    expect(meu).toBeTruthy();
    // Vence o playoff → acesso.
    estado = avancar(estado, true);
    expect(estado.fase).toBe('eliminado');
    expect(estado.acessoConquistado).toBe(true);
  });

  it('perder o playoff de acesso não sobe', () => {
    let estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    for (let i = 0; i < 3; i += 1) {
      estado = avancar(estado, true);
    }
    estado = avancar(estado, false); // perde quartas → playoff
    estado = avancar(estado, false); // perde playoff
    expect(estado.fase).toBe('eliminado');
    expect(estado.acessoConquistado).toBe(false);
  });

  it('perder antes das quartas elimina sem playoff', () => {
    let estado = iniciarMataMataSerieDCarreira(sementes64(), USUARIO, '2026', 'A');
    estado = avancar(estado, false); // perde a 2ª fase
    expect(estado.fase).toBe('eliminado');
    expect(estado.acessoConquistado).toBe(false);
  });
});

describe('classificadosSerieDCarreira (grupo do usuário real + 15 simulados)', () => {
  const clubesD = filtrarClubesSerieD(clubesSeed);
  const grupos = gruposSerieDDaTemporada(clubesD, '2026');
  const grupoUsuario = grupos[0];
  const clubeUsuarioId = grupoUsuario.clubeIds[0];
  // "Resultados reais" do grupo do usuário: simula o grupo dele.
  const forca = mapaDeForca(clubesD.map(c => c.id), jogadoresSeed);
  const partidasGrupo = simularFaseGrupos([grupoUsuario], '2026', forca, '2026_serie_d');

  it('produz 64 classificados e diz se o usuário passou', () => {
    const {sementes, usuarioClassificado, grupoId} = classificadosSerieDCarreira(
      clubesSeed,
      jogadoresSeed,
      '2026',
      clubeUsuarioId,
      partidasGrupo,
    );
    expect(sementes).toHaveLength(64);
    expect(new Set(sementes.map(s => s.clubeId)).size).toBe(64);
    expect(grupoId).toBe(grupoUsuario.id);
    expect(typeof usuarioClassificado).toBe('boolean');
  });

  it('é determinístico', () => {
    const a = classificadosSerieDCarreira(clubesSeed, jogadoresSeed, '2026', clubeUsuarioId, partidasGrupo);
    const b = classificadosSerieDCarreira(clubesSeed, jogadoresSeed, '2026', clubeUsuarioId, partidasGrupo);
    expect(b.sementes).toEqual(a.sementes);
  });
});
