/**
 * Ultimato da diretoria. Puro e determinístico: quando um gatilho de demissão
 * está a UM passo de estourar (verificarDemissao em carreiraEngine.ts), a
 * diretoria dá um ultimato concreto com a consequência exata. É derivação do
 * estado de carreira já persistido — NÃO cria estado nem toca no save; ele
 * "resolve" sozinho pela própria lógica de demissão na rodada seguinte.
 *
 * Gatilhos (espelham verificarDemissao):
 *  • FINANCAS: rodadasNoVermelho == RODADAS_VERMELHO_FALENCIA-1 → outra rodada no
 *    vermelho decreta falência. Sobrevive quem fechar a rodada no azul
 *    (atualizarRodadasNoVermelho zera com saldo >= 0).
 *  • DERROTAS: derrotasConsecutivas == limiteDerrotas-1 → outra derrota demite.
 *    Sobrevive quem NÃO perder o próximo jogo (empate/vitória zeram a contagem).
 * Finança vem primeiro: é o gatilho mais duro (independe de resultado em campo).
 */

import {RODADAS_VERMELHO_FALENCIA} from './carreiraEngine';

export type GatilhoUltimato = 'FINANCAS' | 'DERROTAS';

export interface Ultimato {
  gatilho: GatilhoUltimato;
  /** Título curto para o banner (ex.: "Ultimato da diretoria"). */
  titulo: string;
  /** A exigência concreta + a consequência de falhar. */
  mensagem: string;
}

/**
 * Devolve o ultimato ativo, ou null se o técnico não está no fio da navalha.
 */
export function avaliarUltimato(args: {
  derrotasConsecutivas: number;
  limiteDerrotas: number;
  rodadasNoVermelho: number;
}): Ultimato | null {
  const {derrotasConsecutivas, limiteDerrotas, rodadasNoVermelho} = args;

  // Falência a uma rodada — gatilho mais duro, prevalece.
  if (rodadasNoVermelho === RODADAS_VERMELHO_FALENCIA - 1) {
    return {
      gatilho: 'FINANCAS',
      titulo: 'Ultimato da diretoria',
      mensagem:
        'Feche esta rodada no azul. Mais uma no vermelho e a diretoria decreta falência e demite.',
    };
  }

  // Demissão por desempenho a um jogo. Empate ou vitória zeram a sequência.
  if (limiteDerrotas > 0 && derrotasConsecutivas === limiteDerrotas - 1) {
    return {
      gatilho: 'DERROTAS',
      titulo: 'Ultimato da diretoria',
      mensagem: 'Não perca o próximo jogo. Outra derrota e você está demitido.',
    };
  }

  return null;
}
