/**
 * Defaults do SEED — adaptador que completa cada clube carregado com o que o
 * JSON não traz: formação inicial, tática padrão, capitão e estádio real.
 *
 * A REGRA de escalação/tática vive na engine (`engine/tactics/escalacao`);
 * aqui só se compõe. Os re-exports abaixo preservam a API histórica deste
 * módulo para os consumidores que ainda importam daqui.
 */
import type {Clube, Player} from '../../../types';
import {estadioDoClube} from '../../../data/estadios';
import {
  criarFormacaoDefault,
  taticaDefault,
} from '../../../engine/tactics/escalacao';
import {sugerirCapitao} from '../../../engine/carreira/capitao';

export {
  FORMACOES_DISPONIVEIS,
  TEMPLATES_FORMACAO,
  criarFormacaoDefault,
  montarFormacao,
  moverTitular,
  taticaDefault,
  trocarEsquema,
  trocarTitular,
} from '../../../engine/tactics/escalacao';

export function aplicarDefaultsClube(clube: Clube, jogadores: Player[]): Clube {
  const elenco = jogadores.filter(jogador => jogador.clubeId === clube.id);

  return {
    ...clube,
    formacaoAtual: clube.formacaoAtual ?? criarFormacaoDefault(elenco),
    taticaAtual: clube.taticaAtual ?? taticaDefault,
    // Capitão padrão (melhor líder do elenco) — senão nenhum time começa com
    // capitão e o © nunca aparece na escalação.
    capitaoId: clube.capitaoId ?? sugerirCapitao(elenco) ?? undefined,
    // Substitui o estádio genérico do seed por um real/variado por clube.
    estadio: estadioDoClube(clube.id, clube.nome),
  };
}
