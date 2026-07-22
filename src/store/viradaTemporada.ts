/**
 * Virada de temporada — funcao PURA extraida do useGameStore (SRP). Recebe o
 * estado e devolve o PATCH da nova temporada, ou null se a temporada ainda nao
 * terminou. Sem efeitos colaterais: a store aplica o patch e dispara as
 * propostas de patrocinio. Move o processamento de fim de temporada (evolucao do
 * elenco, financas, Serie D, acesso/rebaixamento, cota de TV, nova liga, jovens,
 * mensagens e eixo de carreira) para fora do God object, testavel isoladamente.
 */
import {
  aplicarAcertoFinanceiroAnual,
  aplicarCotaTV,
  cotaTV,
} from '../engine/finance/financeEngine';
import {gerarJovensTemporada} from '../engine/progression/academiaEngine';
import {
  evoluirJogador,
  evoluirJogadorDetalhado,
} from '../engine/progression/playerProgression';
import {disponibilidadeInicial} from '../engine/disciplina';
import {reputacaoFimTemporada} from '../engine/carreira/carreiraEngine';
import {
  definirObjetivoTemporada,
  deltaReputacaoMeta,
  metaCumprida,
} from '../engine/carreira/objetivo';
import {criarRNGComSeed} from '../engine/simulation/rng';
import {processarRetornosEmprestimo} from '../engine/transfers/emprestimoEngine';
import {
  instantaneoInicial,
  jogadoresDoClube,
  mensagemDemissao,
  necessidadesPorPosicao,
  posicaoClube,
  ranquearDivisaoPorForca,
} from './helpers';
import {adicionarMensagem} from './mensagens';
import {
  calcularDatasFasesCopa,
  DIVISAO_PADRAO,
  ehDivisaoBrasileira,
  gerarCopaParaTemporada,
  gerarLiga,
  gerarLigaSerieDGrupo,
  N_ACESSO,
  PIRAMIDE_DIVISOES,
  piramidesDoMundo,
} from './setup';
import {resolverSerieDNaVirada} from './serieDSeason';
import {
  encerrarContratoTemporada,
  temContratoPatrocinioAtivo,
} from './patrocinioIntegracao';
import type {Player, RegistroDesenvolvimento} from '../types';
import type {GameState} from './useGameStore';

/** Teto do ledger de desenvolvimento (as mais recentes; poda o save). */
const MAX_LEDGER_DESENVOLVIMENTO = 120;
/** Teto da serie de evolucao do elenco (1 ponto por temporada; ~40 anos). */
const MAX_HISTORICO_DESENVOLVIMENTO = 40;

/** Delta INTEIRO por atributo entre dois estados (so os que mudaram). */
function diffAtributos(
  antes: Player['atributos'],
  depois: Player['atributos'],
): Partial<Player['atributos']> {
  const delta: Partial<Player['atributos']> = {};
  for (const chave of Object.keys(antes) as Array<keyof Player['atributos']>) {
    const d = depois[chave] - antes[chave];
    if (d !== 0) {
      delta[chave] = d;
    }
  }
  return delta;
}

export function computarViradaTemporada(
  state: GameState,
): Partial<GameState> | null {

    // Numa carreira na Série D a temporada termina pelo MATA-MATA (não pela
    // última rodada da liga): exige a chave do usuário resolvida (campeão/
    // eliminado). Nas demais, o total de rodadas é o da liga ATIVA (38 no
    // Brasileirão, 34 na Premier, 42 na Championship…).
    const carreiraSerieD = state.serieDCarreira;
    const totalRodadasLiga = state.partidas.reduce(
      (maior, partida) => Math.max(maior, partida.rodada),
      0,
    );
    if (carreiraSerieD) {
      if (
        carreiraSerieD.fase !== 'campeao' &&
        carreiraSerieD.fase !== 'eliminado'
      ) {
        return null;
      }
    } else if (state.rodadaAtual <= totalRodadasLiga) {
      return null;
    }

    const proximaTemporada = String(Number(state.temporadaAtual) + 1);
    const divisaoAtiva = state.clubes[0]?.divisao ?? DIVISAO_PADRAO;

    // Conjunto-mestre (todas as divisões): sobrepõe a divisão ATIVA (com as
    // mudanças desta temporada — transferências, finanças, base) sobre o resto do
    // seed, que não muda enquanto o usuário disputa só uma divisão.
    const clubesAtivos = new Map(state.clubes.map(clube => [clube.id, clube]));
    const jogadoresAtivos = new Map(
      state.jogadores.map(jogador => [jogador.id, jogador]),
    );
    const clubesMaster = state.todosClubes.map(
      clube => clubesAtivos.get(clube.id) ?? clube,
    );
    const idsSeed = new Set(state.todosJogadores.map(jogador => jogador.id));
    const jogadoresMaster = [
      ...state.todosJogadores.map(
        jogador => jogadoresAtivos.get(jogador.id) ?? jogador,
      ),
      // Jogadores criados na temporada (jovens promovidos) ainda não no seed.
      ...state.jogadores.filter(jogador => !idsSeed.has(jogador.id)),
    ];

    // Evolui TODOS os jogadores (cada um pelo seu clube), +1 ano, zera
    // cartões/lesões da pré-temporada. Agentes livres só envelhecem/arquivam.
    // Para o elenco do USUÁRIO, registra o detalhe (delta de atributos + reason
    // codes) no ledger de desenvolvimento (tela Desenvolvimento, Onda 7).
    const clubePorId = new Map(clubesMaster.map(clube => [clube.id, clube]));
    const registrosDesenvolvimento: RegistroDesenvolvimento[] = [];
    const evoluidos = jogadoresMaster.map(jogador => {
      const clube = jogador.clubeId
        ? clubePorId.get(jogador.clubeId)
        : undefined;
      if (clube && jogador.clubeId === state.clubeUsuarioId) {
        const {jogador: evoluidoUsuario, motivos} = evoluirJogadorDetalhado(
          jogador,
          clube,
        );
        const atributosDelta = diffAtributos(
          jogador.atributos,
          evoluidoUsuario.atributos,
        );
        if (
          motivos.length > 0 ||
          Object.keys(atributosDelta).length > 0 ||
          evoluidoUsuario.overall !== jogador.overall
        ) {
          registrosDesenvolvimento.push({
            id: `dev_${jogador.id}_${state.temporadaAtual}`,
            playerId: jogador.id,
            data: `${state.temporadaAtual}-fim`,
            origem: 'curva_idade',
            atributosDelta,
            overallAntes: jogador.overall,
            overallDepois: evoluidoUsuario.overall,
            motivos,
          });
        }
        return {
          ...evoluidoUsuario,
          suspenso: false,
          jogosSuspensao: 0,
          amarelosParaSuspensao: 0,
          // Disciplina zera entre EDIÇÕES: nova temporada, baldes limpos.
          disponibilidade: disponibilidadeInicial(),
          lesionado: false,
          diasLesao: 0,
        };
      }
      const evoluido = clube
        ? evoluirJogador(jogador, clube)
        : {
            ...jogador,
            idade: jogador.idade + 1,
            historicoTemporadas: [
              jogador.estatisticasTemporada,
              ...jogador.historicoTemporadas,
            ],
            estatisticasTemporada: {
              temporada: String(
                Number(jogador.estatisticasTemporada.temporada) + 1,
              ),
              jogos: 0,
              gols: 0,
              assistencias: 0,
              cartoesAmarelos: 0,
              cartoesVermelhos: 0,
              notaMedia: 0,
            },
          };
      return {
        ...evoluido,
        suspenso: false,
        jogosSuspensao: 0,
        amarelosParaSuspensao: 0,
        disponibilidade: disponibilidadeInicial(),
        lesionado: false,
        diasLesao: 0,
      };
    });

    // Empréstimos (§9.3): jogadores cedidos voltam aos donos na virada (com
    // leve desenvolvimento se jovens).
    const jogadoresEvoluidos = processarRetornosEmprestimo(
      evoluidos,
      proximaTemporada,
    );

    // Acerto financeiro de fim de temporada (patrocínio, salários, manutenção
    // e juros sobre dívida) em todos os clubes. O clube do usuário COM contrato
    // de patrocínio pula o patrocínio-por-reputação (a renda vem do contrato).
    const usuarioTemContrato = temContratoPatrocinioAtivo(state.patrocinio);
    let clubesComFolha = clubesMaster.map(clube =>
      aplicarAcertoFinanceiroAnual(
        clube,
        jogadoresDoClube(jogadoresEvoluidos, clube.id),
        `${state.temporadaAtual}-fim`,
        usuarioTemContrato && clube.id === state.clubeUsuarioId,
      ),
    );

    // Encerramento do contrato de patrocínio: metas finais + parcela da temporada
    // + fecha contrato expirado. Usa as classificações da temporada que acabou.
    let patrocinioEncerrado = state.patrocinio;
    const clubeUsuarioFolha = clubesComFolha.find(
      c => c.id === state.clubeUsuarioId,
    );
    if (clubeUsuarioFolha) {
      const res = encerrarContratoTemporada(
        state.patrocinio,
        {
          clube: clubeUsuarioFolha,
          tabela: state.tabela,
          partidas: state.partidas,
          temporada: Number(state.temporadaAtual),
        },
        Number(proximaTemporada),
        `${state.temporadaAtual}-fim`,
      );
      patrocinioEncerrado = res.patrocinio;
      clubesComFolha = clubesComFolha.map(c =>
        c.id === clubeUsuarioFolha.id ? res.clube : c,
      );
    }

    // A Série D roda DE VERDADE na virada (grupos + mata-mata reais via engine),
    // uma única vez, definindo a ordem de acesso à Série C. `null` = mundo sem os
    // 96 clubes da Série D (save antigo) → a pirâmide só ignora o par C↔D.
    const resolucaoSerieD = resolverSerieDNaVirada(
      clubesComFolha,
      jogadoresEvoluidos,
      state.temporadaAtual,
    );

    // Ordem da Série D para o acesso (promovidos primeiro). Numa carreira na D, o
    // destino REAL do clube do usuário manda: sobe (entra no top-N) se conquistou
    // o acesso; senão fica fora do top-N (a D é a última divisão, não rebaixa).
    let ordemSerieDFinal: string[] | null = resolucaoSerieD
      ? resolucaoSerieD.ordem
      : null;
    if (resolucaoSerieD && carreiraSerieD && state.clubeUsuarioId) {
      const uid = state.clubeUsuarioId;
      const resto = resolucaoSerieD.ordem.filter(id => id !== uid);
      ordemSerieDFinal = carreiraSerieD.acessoConquistado
        ? [uid, ...resto]
        : [...resto.slice(0, N_ACESSO), uid, ...resto.slice(N_ACESSO)];
    }

    // Acesso/rebaixamento (4 sobem / 4 descem). A Série D usa o resultado da
    // competição; a divisão JOGADA (não-D), a tabela real; as demais, a força.
    const ordemDivisao = (divisao: string): string[] => {
      if (divisao === 'Série D' && ordemSerieDFinal) {
        return ordemSerieDFinal;
      }
      const clubesDiv = clubesComFolha.filter(
        clube => (clube.divisao ?? DIVISAO_PADRAO) === divisao,
      );
      if (divisao === divisaoAtiva) {
        const ranque = new Map(
          state.tabela.map((linha, indice) => [linha.clubeId, indice]),
        );
        return clubesDiv
          .map(clube => clube.id)
          .sort((a, b) => (ranque.get(a) ?? 99) - (ranque.get(b) ?? 99));
      }
      return ranquearDivisaoPorForca(
        clubesDiv,
        jogadoresEvoluidos,
        state.temporadaAtual,
      );
    };

    // Pirâmides do MUNDO (Brasil + países internacionais, via registry): cada
    // país fecha sua temporada — posição final, cota e acesso/rebaixamento.
    const piramides = piramidesDoMundo();
    const piramideAtiva = piramides.find(piramide =>
      piramide.divisoes.includes(divisaoAtiva),
    );

    // Cota de TV (§8.3): premia a posição FINAL na liga. Distribuída a todos os
    // clubes conforme divisão e colocação, no acerto de fim de temporada.
    const posicaoFinalPorClube = new Map<string, number>();
    for (const piramide of piramides) {
      for (const div of piramide.divisoes) {
        ordemDivisao(div).forEach((id, indice) => {
          posicaoFinalPorClube.set(id, indice + 1);
        });
      }
    }
    const clubesComCotaTV = clubesComFolha.map(clube => {
      const posicao = posicaoFinalPorClube.get(clube.id);
      if (!posicao) {
        return clube;
      }
      return aplicarCotaTV(
        clube,
        clube.divisao ?? DIVISAO_PADRAO,
        posicao,
        `${state.temporadaAtual}-fim`,
      );
    });

    // Troca entre divisões ADJACENTES de CADA pirâmide (A↔B… no Brasil com 4;
    // Premier↔Championship com 3): os N últimos de cima descem e os N
    // primeiros de baixo sobem. País de divisão única não movimenta.
    const novaDivisaoPorClube = new Map<string, string>();
    for (const piramide of piramides) {
      if (piramide.nAcesso <= 0) {
        continue;
      }
      for (let i = 0; i < piramide.divisoes.length - 1; i += 1) {
        const acima = piramide.divisoes[i];
        const abaixo = piramide.divisoes[i + 1];
        const ordemAcima = ordemDivisao(acima);
        const ordemAbaixo = ordemDivisao(abaixo);
        if (ordemAcima.length === 0 || ordemAbaixo.length === 0) {
          continue; // divisão ainda não cadastrada (ex.: Série C vazia)
        }
        const n = Math.min(
          piramide.nAcesso,
          ordemAcima.length,
          ordemAbaixo.length,
        );
        ordemAcima.slice(-n).forEach(id => novaDivisaoPorClube.set(id, abaixo));
        ordemAbaixo.slice(0, n).forEach(id => novaDivisaoPorClube.set(id, acima));
      }
    }

    const todosClubesNovos = clubesComCotaTV.map(clube => {
      const nova = novaDivisaoPorClube.get(clube.id);
      return nova ? {...clube, divisao: nova} : clube;
    });

    // O usuário segue seu clube para a (possível) nova divisão.
    const clubeUsuario = state.clubeUsuarioId
      ? todosClubesNovos.find(clube => clube.id === state.clubeUsuarioId)
      : undefined;
    const divisaoUsuario = clubeUsuario?.divisao ?? divisaoAtiva;
    // Indo para a Série D (ficou na D, ou caiu da C): a liga ativa é o GRUPO de 6
    // do clube — não a divisão inteira de 96.
    const liga =
      divisaoUsuario === 'Série D' && state.clubeUsuarioId
        ? gerarLigaSerieDGrupo(
            todosClubesNovos,
            jogadoresEvoluidos,
            state.clubeUsuarioId,
            proximaTemporada,
          )
        : gerarLiga(
            todosClubesNovos,
            jogadoresEvoluidos,
            divisaoUsuario,
            proximaTemporada,
          );

    // Academia (Módulo 14): novas peneiras determinísticas para a temporada.
    const necessidades = state.clubeUsuarioId
      ? necessidadesPorPosicao(
          jogadoresDoClube(jogadoresEvoluidos, state.clubeUsuarioId),
        )
      : {};
    const jovensDisponiveis = gerarJovensTemporada(
      Number(proximaTemporada),
      necessidades,
      criarRNGComSeed(Number(proximaTemporada)),
    );

    // Mensagens: destino do clube do usuário + rebaixados da divisão jogada —
    // sempre relativos à pirâmide do PAÍS ativo (Brasil ou internacional).
    const nomeClube = (id: string): string =>
      todosClubesNovos.find(clube => clube.id === id)?.nome ?? id;
    const divisoesAtivas = piramideAtiva?.divisoes ?? PIRAMIDE_DIVISOES;
    const idxAntiga = divisoesAtivas.indexOf(divisaoAtiva);
    const idxNova = divisoesAtivas.indexOf(divisaoUsuario);
    let mensagens = state.mensagens;
    if (state.clubeUsuarioId && idxNova > idxAntiga) {
      mensagens = adicionarMensagem(
        mensagens,
        `Rebaixado para a ${divisaoUsuario}. Hora de reconstruir e buscar o acesso.`,
      );
    } else if (state.clubeUsuarioId && idxNova >= 0 && idxNova < idxAntiga) {
      mensagens = adicionarMensagem(
        mensagens,
        `Acesso à ${divisaoUsuario}! O clube subiu de divisão.`,
      );
    }
    const nAcessoAtivo = piramideAtiva?.nAcesso ?? 0;
    const ehUltimaDivisao =
      idxAntiga < 0 || idxAntiga === divisoesAtivas.length - 1;
    const rebaixadosMinha =
      ehUltimaDivisao || nAcessoAtivo <= 0
        ? []
        : ordemDivisao(divisaoAtiva).slice(-nAcessoAtivo);
    if (rebaixadosMinha.length > 0) {
      mensagens = adicionarMensagem(
        mensagens,
        `Rebaixados da ${divisaoAtiva}: ${rebaixadosMinha.map(nomeClube).join(', ')}.`,
      );
    }
    if (state.clubeUsuarioId) {
      const posicaoUsuario = posicaoFinalPorClube.get(state.clubeUsuarioId);
      if (posicaoUsuario) {
        const valorCota = cotaTV(divisaoAtiva, posicaoUsuario);
        mensagens = adicionarMensagem(
          mensagens,
          `Cota de TV (${divisaoAtiva}, ${posicaoUsuario}º): R$ ${(
            valorCota / 1_000_000
          ).toLocaleString('pt-BR')} mi creditada.`,
        );
      }
    }
    mensagens = adicionarMensagem(
      mensagens,
      `Temporada ${proximaTemporada} (${divisaoUsuario}) iniciada. ${jovensDisponiveis.length} jovens nas peneiras.`,
    );
    // Campeão da Série D: o clube do usuário se ele venceu a final; senão o da
    // competição de fundo.
    const campeaoSerieD =
      carreiraSerieD?.fase === 'campeao' && state.clubeUsuarioId
        ? state.clubeUsuarioId
        : resolucaoSerieD?.resumo.campeao;
    if (resolucaoSerieD && campeaoSerieD) {
      const nomeSerieD = (id: string): string =>
        todosClubesNovos.find(clube => clube.id === id)?.nome ?? id;
      mensagens = adicionarMensagem(
        mensagens,
        `Série D: ${nomeSerieD(campeaoSerieD)} é campeão e garante o acesso à Série C.`,
      );
    }

    // Eixo carreira: reputação de fim de temporada + demissão por rebaixamento.
    // Na carreira na D o título é vencer o mata-mata (não liderar a tabela do grupo).
    const campeao = carreiraSerieD
      ? carreiraSerieD.fase === 'campeao'
      : ordemDivisao(divisaoAtiva)[0] === state.clubeUsuarioId;
    const eventoTemporada: 'titulo' | 'acesso' | 'rebaixamento' | 'meio' =
      campeao
        ? 'titulo'
        : idxNova > idxAntiga
          ? 'rebaixamento'
          : idxNova >= 0 && idxNova < idxAntiga
            ? 'acesso'
            : 'meio';
    const reputacaoBase = reputacaoFimTemporada(
      state.reputacaoTecnico,
      eventoTemporada,
    );
    // Meta da diretoria: cumpriu a meta contratada? ajusta reputação + manchete.
    let reputacaoTecnico = reputacaoBase;
    const clubeUsuarioFim = state.clubes.find(
      clube => clube.id === state.clubeUsuarioId,
    );
    // A meta da diretoria é por posição na liga; na carreira na D (grupo+chave)
    // o resultado já está no `eventoTemporada`, então pula-se o ajuste de meta.
    if (clubeUsuarioFim && state.clubeUsuarioId && !carreiraSerieD) {
      // divisaoAtiva = divisão em que a temporada foi disputada (state.tabela),
      // NÃO a nova divisão pós acesso/rebaixamento (divisaoUsuario).
      const dificuldade = state.config.dificuldade;
      const objetivo = definirObjetivoTemporada(
        clubeUsuarioFim.reputacao,
        divisaoAtiva,
        dificuldade,
      );
      const posFinal = posicaoClube(state.tabela, state.clubeUsuarioId);
      reputacaoTecnico = Math.max(
        0,
        Math.min(
          100,
          reputacaoBase + deltaReputacaoMeta(objetivo, posFinal, dificuldade),
        ),
      );
      mensagens = adicionarMensagem(
        mensagens,
        metaCumprida(objetivo, posFinal)
          ? `Objetivo cumprido: ${objetivo.descricao}! A diretoria está satisfeita.`
          : `Objetivo não alcançado (${objetivo.descricao}). A diretoria cobra melhora.`,
      );
    }
    let demissao = state.demissao;
    if (!demissao && eventoTemporada === 'rebaixamento' && state.clubeUsuarioId) {
      demissao = 'REBAIXAMENTO';
      mensagens = adicionarMensagem(mensagens, mensagemDemissao('REBAIXAMENTO'));
    }

    return {
      temporadaAtual: proximaTemporada,
      // Disciplina reinicia a cada temporada: nada de partidas contabilizadas.
      partidasDisciplinaProcessada: [],
      rodadaAtual: 1,
      todosClubes: todosClubesNovos,
      todosJogadores: jogadoresEvoluidos,
      jogadores: liga.jogadores,
      clubes: liga.clubes.map(clube => ({
        ...clube,
        controladoPorIA: clube.id !== state.clubeUsuarioId,
      })),
      partidas: liga.partidas,
      tabela: liga.tabela,
      ultimaPartidaUsuario: null,
      dataAtual: liga.dataAtual,
      treinouProximoJogo: false,
      conversouComGrupo: false,
      reputacaoTecnico,
      derrotasConsecutivas: 0,
      demissao,
      historicoSerieD:
        resolucaoSerieD && campeaoSerieD
          ? [
              {...resolucaoSerieD.resumo, campeao: campeaoSerieD},
              ...state.historicoSerieD,
            ]
          : state.historicoSerieD,
      // A carreira na D recomeça na fase de grupos (mata-mata montado só ao fim).
      serieDCarreira: null,
      patrocinio: patrocinioEncerrado,
      jovensDisponiveis,
      // Ledger de desenvolvimento: acrescenta os registros da virada (mais
      // recentes primeiro), com teto para o save não crescer sem poda.
      ledgerDesenvolvimento: [
        ...registrosDesenvolvimento,
        ...state.ledgerDesenvolvimento,
      ].slice(0, MAX_LEDGER_DESENVOLVIMENTO),
      // Série de evolução: acrescenta o instantâneo do elenco JÁ evoluído para a
      // nova temporada (um ponto real por virada), com teto.
      historicoDesenvolvimento: [
        ...state.historicoDesenvolvimento,
        ...instantaneoInicial(
          jogadoresEvoluidos,
          state.clubeUsuarioId ?? '',
          liga.dataAtual,
          proximaTemporada,
        ),
      ].slice(-MAX_HISTORICO_DESENVOLVIMENTO),
      propostasRecebidas: [],
      copa:
        // Série D (grupo de 10 rodadas não comporta as fases) e carreiras fora
        // do Brasil ficam sem Copa do Brasil.
        divisaoUsuario === 'Série D' || !ehDivisaoBrasileira(divisaoUsuario)
          ? null
          : gerarCopaParaTemporada(
              todosClubesNovos,
              jogadoresEvoluidos,
              proximaTemporada,
              state.clubeUsuarioId,
              calcularDatasFasesCopa(liga.partidas),
            ),
      mensagens,
    };
}
