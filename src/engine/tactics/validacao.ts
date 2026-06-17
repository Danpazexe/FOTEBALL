import type {Formacao, Player} from '../../types';
import {linhaDaPosicao} from './posicoes';

/**
 * Validação das regras mínimas da escalação livre. Recebe a formação montada
 * pelo técnico (titulares com posição derivada das coordenadas) e o elenco, e
 * devolve erros que BLOQUEIAM a escalação (ex.: número errado de goleiros) e
 * avisos que apenas ALERTAM (ex.: titular lesionado), sem impedir o uso.
 *
 * As regras são propositalmente "frouxas" — não exigem um esquema específico,
 * só o esqueleto mínimo de um time jogável: 1 goleiro, 11 titulares e um número
 * razoável de defensores/meias/atacantes. A contagem agrupa cada posição pela
 * sua LINHA tática (ver `linhaDaPosicao`); 'GOL' conta como goleiro.
 *
 * Função pura: não lê nem altera estado externo, apenas inspeciona os dados.
 */

/** Quantidade de titulares preenchidos em cada linha tática. */
export interface ContagemLinhas {
  goleiros: number;
  defesa: number;
  meio: number;
  ataque: number;
}

export interface ResultadoValidacao {
  /** true se NÃO houver erros (avisos não invalidam). */
  valido: boolean;
  /** Mensagens (pt-BR) que bloqueiam a escalação. */
  erros: string[];
  /** Mensagens (pt-BR) que apenas alertam, sem bloquear. */
  avisos: string[];
  contagem: ContagemLinhas;
}

export function validarEscalacao(
  formacao: Formacao,
  jogadores: Player[],
): ResultadoValidacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  // Índice por id para resolver cada slot em O(1).
  const porId = new Map<string, Player>();
  for (const jogador of jogadores) {
    porId.set(jogador.id, jogador);
  }

  const contagem: ContagemLinhas = {
    goleiros: 0,
    defesa: 0,
    meio: 0,
    ataque: 0,
  };

  const idsVistos = new Set<string>();
  let temDuplicado = false;
  let temSlotInvalido = false;

  for (const titular of formacao.titulares) {
    const jogador =
      titular.jogadorId !== '' ? porId.get(titular.jogadorId) : undefined;

    // Slot vazio ou apontando para jogador inexistente: não conta nas linhas.
    if (jogador === undefined) {
      temSlotInvalido = true;
      continue;
    }

    // Conta só uma vez por jogador (duplicados não inflam a contagem).
    if (idsVistos.has(jogador.id)) {
      temDuplicado = true;
      continue;
    }
    idsVistos.add(jogador.id);

    switch (linhaDaPosicao(titular.posicao)) {
      case 'GOL':
        contagem.goleiros += 1;
        break;
      case 'DEFESA':
        contagem.defesa += 1;
        break;
      case 'MEIO':
        contagem.meio += 1;
        break;
      case 'ATAQUE':
        contagem.ataque += 1;
        break;
    }

    if (jogador.lesionado || jogador.suspenso) {
      avisos.push(`${jogador.nome} está indisponível (lesão/suspensão).`);
    }
  }

  const totalPreenchidos =
    contagem.goleiros + contagem.defesa + contagem.meio + contagem.ataque;

  if (contagem.goleiros !== 1) {
    erros.push('É necessário exatamente 1 goleiro.');
  }
  if (totalPreenchidos !== 11) {
    erros.push('A escalação precisa de 11 titulares.');
  }
  if (contagem.defesa < 3) {
    erros.push('Escale ao menos 3 defensores.');
  }
  if (contagem.meio < 2) {
    erros.push('Escale ao menos 2 meio-campistas.');
  }
  if (contagem.ataque < 1) {
    erros.push('Escale ao menos 1 atacante.');
  }
  if (temDuplicado) {
    erros.push('Há jogadores repetidos na escalação.');
  }
  if (temSlotInvalido) {
    avisos.push('Há posições sem jogador válido.');
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    contagem,
  };
}
