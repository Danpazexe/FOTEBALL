/**
 * REPLAY DE GOL — reconstrução PURA e DETERMINÍSTICA da jogada de cada gol.
 *
 * Mesma filosofia do mapa de chutes (`finalizacoes.ts`): nada aqui é simulado
 * de novo nem persistido. Cada `LanceGol` é DERIVADO dos macro-eventos reais da
 * partida (autor, assistente, minuto, pênalti) + um RNG local semeado por gol —
 * mesma partida ⇒ mesmo replay, inclusive em saves antigos.
 *
 * Invariantes garantidos:
 *  • um `LanceGol` por evento de gol REAL (`gol`/`gol_contra`), em ordem de
 *    minuto — `chance_perdida` (inclui gol anulado pelo VAR) NÃO gera replay;
 *  • o passo de finalização usa EXATAMENTE a posição da `Finalizacao`
 *    correspondente de `extrairFinalizacoes` (x igual; yCampo = y·0.33), e
 *    `golX`/`xG` vêm dela — replay e mapa de chutes CONCORDAM;
 *  • a sequência tem 3–6 passos e termina SEMPRE em `gol`/`gol_contra`
 *    (única exceção documentada: gol contra de save antigo sem titulares,
 *    onde só o defensor é conhecido — 2 passos);
 *  • a construção usa companheiros REALMENTE em campo no minuto (snapshot de
 *    titulares + substituições + expulsões anteriores), cada um em no máximo
 *    um passo; autor e assistente nunca duplicam a construção;
 *  • y é estritamente decrescente ao longo da construção (progressão ao gol)
 *    e x varia suave (sem teleporte entre passos consecutivos).
 */
import type {EventoPartida, Partida, Position} from '../../types';
import {ehEventoGol} from '../../types';
import type {
  LanceGol,
  OrigemGol,
  PassoLance,
  PosicoesElenco,
  TipoPassoLance,
} from './lances';
import {
  obterFinalizacoesPartida,
  type Finalizacao,
  type SituacaoChute,
} from './finalizacoes';
import {
  criarRNGComSeed,
  hashString,
  inteiroEntre,
  limitar,
  type RandomGenerator,
} from './rng';

// ── Pools de função por fase da jogada (peso 4x na escolha ponderada) ────────
const POOL_INICIO: readonly Position[] = ['ZAG', 'VOL', 'LD', 'LE'];
const POOL_MEIO: readonly Position[] = ['VOL', 'MC', 'MEI'];
const POOL_FRENTE: readonly Position[] = ['MEI', 'PD', 'PE', 'SA', 'CA'];
const POOL_CRUZADOR: readonly Position[] = ['LD', 'LE', 'PD', 'PE', 'MEI'];
const POOL_BATEDOR: readonly Position[] = ['MEI', 'MC', 'VOL', 'PD', 'PE'];

/** Posição/qualidade do chute que ancora o replay (contrato com o mapa). */
interface AncoraChute {
  /** x do chute no campo (== `Finalizacao.x`). */
  x: number;
  /** y do chute no CAMPO INTEIRO (== `Finalizacao.y` · 0.33). */
  y: number;
  golX: number;
  xG: number;
  situacao: SituacaoChute;
}

/** Tudo que os construtores de sequência precisam para um gol. */
interface ContextoLance {
  rng: RandomGenerator;
  autorId: string;
  assistenteId?: string;
  anc: AncoraChute;
  posicoes: PosicoesElenco;
  /** Companheiros em campo, sem autor/assistente/goleiro; MUTADO pelos sorteios. */
  candidatos: string[];
}

function ancorarNaFinalizacao(fin: Finalizacao): AncoraChute {
  return {
    x: fin.x,
    y: fin.y * 0.33,
    golX: fin.golX ?? 0.5,
    xG: fin.xG,
    situacao: fin.situacao,
  };
}

/** Caso raríssimo (gol sem Finalizacao casada): deriva posição própria. */
function derivarAncoraPropria(
  evento: EventoPartida,
  rng: RandomGenerator,
): AncoraChute {
  if (evento.penaltiData) {
    return {
      x: 0.5 + (rng() - 0.5) * 0.1,
      y: (0.16 + rng() * 0.04) * 0.33,
      golX: limitar(0.2 + rng() * 0.6, 0, 1),
      xG: 0.76,
      situacao: 'Pênalti',
    };
  }
  return {
    x: 0.25 + rng() * 0.5,
    y: (0.06 + rng() * 0.24) * 0.33,
    golX: limitar(0.2 + rng() * 0.6, 0, 1),
    xG: 0.15 + rng() * 0.4,
    situacao: evento.jogadorAssistenciaId ? 'Assistência' : 'Jogo aberto',
  };
}

/** Origem tática: `Finalizacao.situacao` + tipo do evento. */
function derivarOrigem(
  evento: EventoPartida,
  situacao: SituacaoChute,
): OrigemGol {
  if (evento.tipo === 'gol_contra') {
    return 'gol_contra';
  }
  switch (situacao) {
    case 'Pênalti':
      return 'penalti';
    case 'Falta':
      return 'falta';
    case 'Escanteio':
      return 'escanteio';
    case 'Contra-ataque':
      return 'contra_ataque';
    default:
      return 'jogo_aberto';
  }
}

/**
 * Quem estava em campo pelo time no minuto do gol: snapshot de titulares com
 * substituições (sai `jogadorId`, entra `jogadorEntraId`) e expulsões
 * ANTERIORES ao minuto aplicadas. `undefined` em save antigo sem snapshot.
 */
function emCampoNoMinuto(
  partida: Partida,
  eventosOrdenados: EventoPartida[],
  timeId: string,
  minuto: number,
): string[] | undefined {
  const base =
    timeId === partida.timeCasa
      ? partida.titularesCasa
      : timeId === partida.timeFora
        ? partida.titularesFora
        : undefined;
  if (!base || base.length === 0) {
    return undefined;
  }
  const campo = [...base];
  for (const ev of eventosOrdenados) {
    if (ev.minuto >= minuto) {
      break;
    }
    if (ev.timeId !== timeId) {
      continue;
    }
    if (ev.tipo === 'substituicao') {
      const idx = campo.indexOf(ev.jogadorId);
      if (idx >= 0) {
        if (ev.jogadorEntraId) {
          campo[idx] = ev.jogadorEntraId;
        } else {
          campo.splice(idx, 1);
        }
      } else if (ev.jogadorEntraId && !campo.includes(ev.jogadorEntraId)) {
        campo.push(ev.jogadorEntraId);
      }
    } else if (ev.tipo === 'cartao_vermelho') {
      const idx = campo.indexOf(ev.jogadorId);
      if (idx >= 0) {
        campo.splice(idx, 1);
      }
    }
  }
  return campo;
}

/** Companheiros elegíveis para a construção (sem autor/assistente/goleiro). */
function candidatosDeConstrucao(
  campo: string[],
  posicoes: PosicoesElenco,
  excluir: Array<string | undefined>,
): string[] {
  return campo.filter(
    id => !excluir.includes(id) && (posicoes[id] ?? 'MC') !== 'GOL',
  );
}

/** Sorteio ponderado por função (pool preferida pesa 4×) que REMOVE o escolhido. */
function retirarPonderado(
  rng: RandomGenerator,
  candidatos: string[],
  posicoes: PosicoesElenco,
  pool: readonly Position[],
): string | undefined {
  if (candidatos.length === 0) {
    return undefined;
  }
  const pesos = candidatos.map(id =>
    pool.includes(posicoes[id] ?? 'MC') ? 4 : 1,
  );
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  let sorteio = rng() * total;
  for (let i = 0; i < candidatos.length; i += 1) {
    sorteio -= pesos[i];
    if (sorteio < 0) {
      return candidatos.splice(i, 1)[0];
    }
  }
  return candidatos.pop();
}

/** Coordenada plausível pela função do jogador (com jitter do RNG local). */
function coordPorFuncao(
  pos: Position,
  rng: RandomGenerator,
): {x: number; y: number} {
  switch (pos) {
    case 'ZAG':
      return {x: 0.32 + rng() * 0.36, y: 0.7 + rng() * 0.15};
    case 'LD':
      return {x: 0.78 + rng() * 0.16, y: 0.55 + rng() * 0.15};
    case 'LE':
      return {x: 0.06 + rng() * 0.16, y: 0.55 + rng() * 0.15};
    case 'VOL':
    case 'MC':
      return {x: 0.3 + rng() * 0.4, y: 0.45 + rng() * 0.15};
    case 'MEI':
      return {x: 0.28 + rng() * 0.44, y: 0.3 + rng() * 0.15};
    case 'PD':
      return {x: 0.75 + rng() * 0.2, y: 0.2 + rng() * 0.15};
    case 'PE':
      return {x: 0.05 + rng() * 0.2, y: 0.2 + rng() * 0.15};
    case 'SA':
    case 'CA':
      return {x: 0.3 + rng() * 0.4, y: 0.1 + rng() * 0.15};
    default:
      // GOL (não deveria construir) — fundo de campo.
      return {x: 0.35 + rng() * 0.3, y: 0.75 + rng() * 0.1};
  }
}

/**
 * Ajusta a CONSTRUÇÃO in-place para: y estritamente decrescente (piso que
 * garante folga acima da finalização, y ≥ 0.34) e x sem teleporte — cada passo
 * fica a ≤0.45 do anterior e num raio de `xAlvo` alcançável nos hops restantes.
 */
function ajustarTrajetoria(
  passos: PassoLance[],
  xAlvo: number,
  hopsAposConstrucao: number,
  yTetoInicial: number,
): void {
  const m = passos.length;
  let prevX: number | undefined;
  let prevY: number | undefined;
  passos.forEach((passo, i) => {
    const teto = prevY === undefined ? yTetoInicial : prevY - 0.03;
    const piso = Math.min(0.34 + 0.03 * (m - 1 - i), teto);
    passo.y = limitar(passo.y, piso, teto);

    const alcance = 0.45 * (m - 1 - i + hopsAposConstrucao);
    let minX = Math.max(0.02, xAlvo - alcance);
    let maxX = Math.min(0.98, xAlvo + alcance);
    if (prevX !== undefined) {
      minX = Math.max(minX, prevX - 0.45);
      maxX = Math.min(maxX, prevX + 0.45);
    }
    if (minX > maxX) {
      const meio = (minX + maxX) / 2;
      minX = meio;
      maxX = meio;
    }
    passo.x = limitar(passo.x, minX, maxX);

    prevX = passo.x;
    prevY = passo.y;
  });
}

/**
 * Fecha a sequência: [assistencia imediatamente antes] → finalizacao ANCORADA
 * (sempre do autor) → gol na boca da baliza (x = golX). Pressupõe `passos`
 * não vazio e com último y ≥ 0.34 (garantido por `ajustarTrajetoria`).
 */
function anexarDesfecho(
  passos: PassoLance[],
  rng: RandomGenerator,
  autorId: string,
  assistenteId: string | undefined,
  anc: AncoraChute,
): void {
  const ultimo = passos[passos.length - 1];
  if (assistenteId) {
    const tetoY = Math.min(0.32, (ultimo ? ultimo.y : 0.5) - 0.02);
    const y = limitar(anc.y + 0.02 + rng() * 0.08, anc.y + 0.01, tetoY);
    let x = anc.x + (rng() - 0.5) * 0.3;
    if (ultimo) {
      x = limitar(x, ultimo.x - 0.45, ultimo.x + 0.45);
    }
    x = limitar(x, 0.02, 0.98);
    passos.push({tipo: 'assistencia', jogadorId: assistenteId, x, y});
  }
  passos.push({tipo: 'finalizacao', jogadorId: autorId, x: anc.x, y: anc.y});
  passos.push({tipo: 'gol', jogadorId: autorId, x: anc.golX, y: 0});
}

/**
 * Fallback de save antigo (sem titulares): sequência curta só com
 * autor/assistente — recepcao → [assistencia] → finalizacao → gol.
 */
function passosFallbackCurto(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, assistenteId, anc} = ctx;
  const passos: PassoLance[] = [
    {
      tipo: 'recepcao',
      jogadorId: assistenteId ?? autorId,
      x: limitar(anc.x + (rng() - 0.5) * 0.3, 0.02, 0.98),
      y: 0.4 + rng() * 0.15,
    },
  ];
  anexarDesfecho(passos, rng, autorId, assistenteId, anc);
  return passos;
}

/** Jogo aberto: roubada no campo próprio/meio → 1–3 passes progressivos. */
function passosJogoAberto(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, assistenteId, anc, posicoes, candidatos} = ctx;
  const abridor = retirarPonderado(rng, candidatos, posicoes, POOL_INICIO);
  if (!abridor) {
    return passosFallbackCurto(ctx);
  }
  const tiposInicio: TipoPassoLance[] = [
    'recuperacao',
    'desarme',
    'interceptacao',
  ];
  const coordAbridor = coordPorFuncao(posicoes[abridor] ?? 'MC', rng);
  const passos: PassoLance[] = [
    {
      tipo: tiposInicio[inteiroEntre(rng, 0, tiposInicio.length - 1)],
      jogadorId: abridor,
      x: coordAbridor.x,
      y: limitar(coordAbridor.y, 0.55, 0.8),
    },
  ];
  const nMeio = Math.min(
    inteiroEntre(rng, 1, assistenteId ? 2 : 3),
    candidatos.length,
  );
  for (let i = 0; i < nMeio; i += 1) {
    const pool = i < nMeio - 1 ? POOL_MEIO : POOL_FRENTE;
    const id = retirarPonderado(rng, candidatos, posicoes, pool);
    if (!id) {
      break;
    }
    const sorteioTipo = rng();
    const coord = coordPorFuncao(posicoes[id] ?? 'MC', rng);
    passos.push({
      tipo:
        sorteioTipo < 0.6 ? 'passe' : sorteioTipo < 0.85 ? 'conducao' : 'drible',
      jogadorId: id,
      x: coord.x,
      y: coord.y,
    });
  }
  ajustarTrajetoria(passos, anc.x, assistenteId ? 2 : 1, 0.8);
  anexarDesfecho(passos, rng, autorId, assistenteId, anc);
  return passos;
}

/** Contra-ataque: roubada FUNDA → lançamento/condução longa → gol. */
function passosContraAtaque(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, assistenteId, anc, posicoes, candidatos} = ctx;
  const ladrao = retirarPonderado(rng, candidatos, posicoes, POOL_INICIO);
  if (!ladrao) {
    return passosFallbackCurto(ctx);
  }
  const passos: PassoLance[] = [
    {
      tipo: rng() < 0.5 ? 'interceptacao' : 'recuperacao',
      jogadorId: ladrao,
      x: coordPorFuncao(posicoes[ladrao] ?? 'MC', rng).x,
      y: 0.7 + rng() * 0.15,
    },
  ];
  const condutor = retirarPonderado(rng, candidatos, posicoes, POOL_MEIO);
  if (condutor) {
    const coord = coordPorFuncao(posicoes[condutor] ?? 'MC', rng);
    passos.push({
      tipo: rng() < 0.55 ? 'lancamento' : 'conducao',
      jogadorId: condutor,
      x: coord.x,
      y: coord.y,
    });
  } else {
    // Exceção permitida: o próprio autor conduz o contra-ataque e finaliza.
    passos.push({
      tipo: 'conducao',
      jogadorId: autorId,
      x: limitar(anc.x + (rng() - 0.5) * 0.2, 0.02, 0.98),
      y: 0.38 + rng() * 0.08,
    });
  }
  ajustarTrajetoria(passos, anc.x, assistenteId ? 2 : 1, 0.85);
  anexarDesfecho(passos, rng, autorId, assistenteId, anc);
  return passos;
}

/** Escanteio: batedor no canto → cruzamento implícito → finalização na área. */
function passosEscanteio(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, assistenteId, anc, posicoes, candidatos} = ctx;
  const batedor =
    assistenteId ??
    retirarPonderado(rng, candidatos, posicoes, POOL_BATEDOR) ??
    autorId;
  // A seta escanteio → finalização É o cruzamento (não há passo próprio).
  const passos: PassoLance[] = [
    {
      tipo: 'escanteio',
      jogadorId: batedor,
      x: anc.x < 0.5 ? 0.02 : 0.98,
      y: 0.02,
    },
    {tipo: 'finalizacao', jogadorId: autorId, x: anc.x, y: anc.y},
    {tipo: 'gol', jogadorId: autorId, x: anc.golX, y: 0},
  ];
  return passos;
}

/** Pênalti: autor sofre/vai à marca → cobrança ancorada → gol. */
function passosPenalti(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, anc} = ctx;
  return [
    {
      tipo: 'penalti_ganho',
      jogadorId: autorId,
      x: limitar(anc.x + (rng() - 0.5) * 0.08, 0.02, 0.98),
      y: limitar(anc.y + 0.03 + rng() * 0.05, 0, 1),
    },
    {tipo: 'finalizacao', jogadorId: autorId, x: anc.x, y: anc.y},
    {tipo: 'gol', jogadorId: autorId, x: anc.golX, y: 0},
  ];
}

/**
 * Falta: sofrida perto do chute → cobrança direta (o chute) → gol.
 *
 * RESERVADO PARA O FUTURO: hoje esta origem é INALCANÇÁVEL com dados reais —
 * `derivarSituacao` só devolve 'Falta' para eventos `falta_cobranca`, que nunca
 * são gol na engine atual. Se um dia a engine emitir gol de falta, atenção: o
 * passo do chute aqui é 'falta_cobranca' (não 'finalizacao'), então os testes
 * de ancoragem que procuram `tipo === 'finalizacao'` precisarão contemplar isso.
 */
function passosFalta(ctx: ContextoLance): PassoLance[] {
  const {rng, autorId, anc} = ctx;
  return [
    {
      tipo: 'falta_sofrida',
      jogadorId: autorId,
      x: limitar(anc.x + (rng() - 0.5) * 0.12, 0.02, 0.98),
      y: limitar(anc.y + 0.04 + rng() * 0.06, 0, 1),
    },
    {tipo: 'falta_cobranca', jogadorId: autorId, x: anc.x, y: anc.y},
    {tipo: 'gol', jogadorId: autorId, x: anc.golX, y: 0},
  ];
}

/**
 * Gol contra: construção do time ATACANTE (beneficiado) → cruzamento → passo
 * final `gol_contra` protagonizado pelo DEFENSOR (autor do evento) na posição
 * ancorada. Sem titulares do atacante, degrada para corte-que-trai (2 passos —
 * única exceção ao mínimo de 3, só em save antigo).
 */
function passosGolContra(ctx: ContextoLance, defensorId: string): PassoLance[] {
  const {rng, anc, posicoes, candidatos} = ctx;
  const cruzador = retirarPonderado(rng, candidatos, posicoes, POOL_CRUZADOR);
  if (!cruzador) {
    return [
      {
        tipo: 'interceptacao',
        jogadorId: defensorId,
        x: limitar(anc.x + (rng() - 0.5) * 0.2, 0.02, 0.98),
        y: limitar(anc.y + 0.08 + rng() * 0.06, 0, 1),
      },
      {tipo: 'gol_contra', jogadorId: defensorId, x: anc.x, y: anc.y},
    ];
  }
  const posCruzador = posicoes[cruzador] ?? 'MEI';
  const ladoDireito =
    posCruzador === 'LD' || posCruzador === 'PD'
      ? true
      : posCruzador === 'LE' || posCruzador === 'PE'
        ? false
        : rng() < 0.5;
  const xCruz = ladoDireito ? 0.75 + rng() * 0.17 : 0.08 + rng() * 0.17;

  const construcao: PassoLance[] = [];
  const n = Math.min(inteiroEntre(rng, 1, 2), candidatos.length);
  for (let i = 0; i < n; i += 1) {
    const id = retirarPonderado(
      rng,
      candidatos,
      posicoes,
      i === 0 ? POOL_MEIO : POOL_FRENTE,
    );
    if (!id) {
      break;
    }
    const coord = coordPorFuncao(posicoes[id] ?? 'MC', rng);
    construcao.push({
      tipo: rng() < 0.7 ? 'passe' : 'conducao',
      jogadorId: id,
      x: coord.x,
      y: coord.y,
    });
  }
  ajustarTrajetoria(construcao, xCruz, 1, 0.8);

  return [
    ...construcao,
    {tipo: 'cruzamento', jogadorId: cruzador, x: xCruz, y: 0.08 + rng() * 0.1},
    {tipo: 'gol_contra', jogadorId: defensorId, x: anc.x, y: anc.y},
  ];
}

/**
 * Reconstrói o replay de TODOS os gols reais da partida (ordenados por
 * minuto), ancorado no mapa de chutes. `posicoes` mapeia jogadorId → posição
 * natural (mesmo formato de `extrairFinalizacoes`). Puro e determinístico.
 */
export function reconstruirLancesGol(
  partida: Partida,
  posicoes: PosicoesElenco,
): LanceGol[] {
  const eventosOrdenados = [...partida.eventos].sort(
    (a, b) => a.minuto - b.minuto,
  );
  // Partidas V2 ancoram no chute FACTUAL do ledger (posição/xG reais);
  // legacy cai na reconstrução plausível — mesma fonte do mapa de chutes.
  const finalizacoes = obterFinalizacoesPartida(partida, posicoes).finalizacoes;
  const finUsadas = new Set<number>();
  const lances: LanceGol[] = [];

  eventosOrdenados.forEach((evento, idx) => {
    if (!ehEventoGol(evento.tipo)) {
      return;
    }

    // RNG isolado por lance — estável e independente dos demais gols.
    const rng = criarRNGComSeed(
      hashString(`${partida.id}:${evento.minuto}:${evento.jogadorId}:replay`),
    );

    // ANCORAGEM: casa o gol com sua Finalizacao (consumindo cada uma 1x).
    let fin: Finalizacao | undefined;
    for (let i = 0; i < finalizacoes.length; i += 1) {
      const f = finalizacoes[i];
      if (
        !finUsadas.has(i) &&
        f.gol &&
        f.minuto === evento.minuto &&
        f.timeId === evento.timeId &&
        f.jogadorId === evento.jogadorId
      ) {
        finUsadas.add(i);
        fin = f;
        break;
      }
    }
    const anc = fin ? ancorarNaFinalizacao(fin) : derivarAncoraPropria(evento, rng);
    const origem = derivarOrigem(evento, anc.situacao);

    const autorId = evento.jogadorId;
    const assistenteId =
      evento.tipo === 'gol' ? evento.jogadorAssistenciaId : undefined;
    // No gol contra, `timeId` é o BENEFICIADO — a construção é dele.
    const campo = emCampoNoMinuto(
      partida,
      eventosOrdenados,
      evento.timeId,
      evento.minuto,
    );
    const ctx: ContextoLance = {
      rng,
      autorId,
      assistenteId,
      anc,
      posicoes,
      candidatos: campo
        ? candidatosDeConstrucao(campo, posicoes, [autorId, assistenteId])
        : [],
    };

    let passos: PassoLance[];
    switch (origem) {
      case 'penalti':
        passos = passosPenalti(ctx);
        break;
      case 'falta':
        passos = passosFalta(ctx);
        break;
      case 'escanteio':
        // Sem elenco em campo (save antigo), o batedor degradaria para o próprio
        // autor — cobrança e finalização do MESMO jogador. Cai no fallback curto.
        passos = campo ? passosEscanteio(ctx) : passosFallbackCurto(ctx);
        break;
      case 'gol_contra':
        passos = passosGolContra(ctx, autorId);
        break;
      case 'contra_ataque':
        passos = campo ? passosContraAtaque(ctx) : passosFallbackCurto(ctx);
        break;
      default:
        passos = campo ? passosJogoAberto(ctx) : passosFallbackCurto(ctx);
        break;
    }

    // Cinto de segurança: toda coordenada emitida fica em [0, 1].
    passos.forEach(passo => {
      passo.x = limitar(passo.x, 0, 1);
      passo.y = limitar(passo.y, 0, 1);
    });

    lances.push({
      id: `${partida.id}:lance:${idx}`,
      minuto: evento.minuto,
      timeId: evento.timeId,
      autorId,
      assistenteId,
      origem,
      passos,
      golX: limitar(anc.golX, 0, 1),
      xG: anc.xG,
    });
  });

  return lances;
}
