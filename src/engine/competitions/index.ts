/**
 * API pública da engine de competições nacionais. Importe daqui
 * (`engine/competitions`) em vez de alcançar os submódulos diretamente.
 */
export type {
  Classificado,
  ClassificacaoGrupo,
  ConfrontoMataMata,
  DecididoPor,
  FaseMataMata,
  ForcaPorClube,
  GrupoCompeticao,
  LinhaClassificacao,
} from './tipos';

export {
  SERIE_D_2026,
  SERIE_D_2025,
  totalAcessos,
  totalClassificados,
  validarRegulamento,
  type RegulamentoSerieD,
} from './rules/serieD2026';

export {embaralhar, forcaDoElenco, letraGrupo, mapaDeForca} from './util';

export {simularPlacar, simularPartidaRapida, type Placar} from './simulacao/placar';

export {
  montarGruposRegionais,
  type OpcoesAgrupamento,
} from './groups/regionalGrouping';

export {
  classificarGrupo,
  classificarTodosGrupos,
  gerarPartidasGrupos,
  ordenarClassificacao,
  rankearClassificados,
  simularFaseGrupos,
} from './groups/faseGrupos';

export {criarConfronto, resolverConfronto} from './knockout/confronto';
export {montarFase, nomeFaseSerieD, type Semente} from './knockout/bracket';

export {resolverAcesso, type ResultadoAcesso} from './serieD/acesso';
export {
  simularSerieD,
  type OpcoesSerieD,
  type ResultadoSerieD,
} from './serieD/simularSerieD';

/** Clubes da Série D dentro de um conjunto (filtro por `divisao`). */
export function filtrarClubesSerieD<T extends {divisao?: string}>(
  clubes: T[],
): T[] {
  return clubes.filter(clube => clube.divisao === 'Série D');
}
