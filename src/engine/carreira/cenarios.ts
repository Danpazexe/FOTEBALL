/**
 * Cenários / desafios de carreira. Puro e determinístico: classifica o CONTEXTO
 * do clube escolhido (reputação + caixa + divisão) num desafio narrativo — de
 * "Favorito ao título" a "Gigante em crise" ou "Reconstrução". É derivação do
 * estado do clube (não muda nada, não mexe no save); serve para o jogador saber
 * no que está se metendo ao assumir o clube.
 */

import {competicaoPorDivisaoLegada} from '../competitions/registry/competitionRegistry';

export interface Cenario {
  nome: string;
  descricao: string;
}

/** A divisão é a ELITE (tier 1) do seu país? Série A, Premier League, Primera… */
function ehElite(divisao: string): boolean {
  return divisao === 'Série A' || competicaoPorDivisaoLegada(divisao)?.tier === 1;
}

/** Classifica o desafio de assumir um clube pelo seu contexto atual. */
export function classificarCenario(args: {
  reputacao: number;
  saldo: number;
  divisao: string;
}): Cenario {
  const {reputacao, saldo, divisao} = args;

  // Fora da elite do país: o eixo é o tamanho do clube vs. a divisão.
  if (!ehElite(divisao)) {
    if (reputacao >= 62) {
      return {
        nome: 'Gigante fora da elite',
        descricao: 'Um grande clube longe da elite. Devolva-o ao topo.',
      };
    }
    return {
      nome: 'Reconstrução',
      descricao: 'Clube modesto: erga um projeto do zero rumo ao acesso.',
    };
  }

  // Série A com o caixa no vermelho: crise financeira pesa no desafio.
  if (saldo < 0) {
    if (reputacao >= 70) {
      return {
        nome: 'Gigante em crise',
        descricao: 'Clube grande com os cofres no vermelho. Equilibre e brigue em cima.',
      };
    }
    return {
      nome: 'Sobrevivência',
      descricao: 'Dívidas e elenco limitado: o foco é fugir do rebaixamento.',
    };
  }

  // Série A saudável: o eixo é a expectativa pela reputação.
  if (reputacao >= 80) {
    return {
      nome: 'Favorito ao título',
      descricao: 'Elenco de ponta e cobrança máxima: só o título basta.',
    };
  }
  if (reputacao >= 65) {
    return {
      nome: 'Sonho da Libertadores',
      descricao: 'Clube forte que mira o G6. Brigue pela vaga continental.',
    };
  }
  if (reputacao >= 52) {
    return {
      nome: 'Meio de tabela',
      descricao: 'Time de meio de tabela: estabilidade agora, sonhos depois.',
    };
  }
  return {
    nome: 'Azarão da elite',
    descricao: 'Recém-chegado ou clube pequeno na elite: cada ponto vale ouro.',
  };
}
