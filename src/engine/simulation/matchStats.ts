/**
 * ESTATÍSTICAS DA PARTIDA — REDUCERS DO LEDGER CAUSAL (Fase 6 da engine V2).
 *
 * Este módulo NÃO sorteia futebol: ele REDUZ os fatos produzidos pela cadeia
 * causal (posse → chance → chute → resolução) em números agregados:
 *  • finalizações / no alvo / na área / de fora ← ChutePartida reais;
 *  • xG ← soma do xG dos chutes válidos; xA ← xG dos chutes assistidos;
 *  • grandes chances ← classificação da OPORTUNIDADE (não do resultado);
 *  • escanteios/impedimentos/faltas ← contagens factuais do minuto + cartões;
 *  • posse/zonas/passes/duelos ← derivação determinística da posse real e dos
 *    atributos de quem está EM CAMPO (sem RNG — mesmo minuto, mesmos números).
 *
 * Convenções documentadas:
 *  • finalização NO ALVO = gol + defesa (trave NÃO conta);
 *  • chute com gol ANULADO pelo VAR fica no ledger, mas NÃO conta em
 *    finalizações nem no xG oficial (o lance foi invalidado por impedimento);
 *  • gol contra conta como finalização no alvo do time que marcou, sem
 *    creditar chute a nenhum jogador.
 */

import type {
  ChutePartida,
  ClimaPartida,
  EstatisticasPartida,
  EstatisticasTimePartida,
  EventoPartida,
  Player,
  Position,
  Tatica,
} from '../../types';

import {limitar, type RandomGenerator} from './rng';

/** Acumulador mutável de um time (floats; arredonda só no fim). */
interface AcumuladorTime {
  golsEsperados: number;
  assistenciasEsperadas: number;
  finalizacoes: number;
  finalizacoesNoAlvo: number;
  finalizacoesNaArea: number;
  finalizacoesDeFora: number;
  grandesChances: number;
  passesTentados: number;
  passesCertos: number;
  dribles: number;
  desarmes: number;
  interceptacoes: number;
  cruzamentos: number;
  escanteios: number;
  faltas: number;
  impedimentos: number;
  posseZonas: number[][];
  perigoSetores: number[];
  finalizacoesPorJogador: Record<string, {total: number; noAlvo: number}>;
  passesPorJogador: Record<string, {tentados: number; certos: number}>;
}

/** Estado vivo das estatísticas da partida (casa + fora + condições do jogo). */
export interface EstatisticasAoVivo {
  casa: AcumuladorTime;
  fora: AcumuladorTime;
  clima: ClimaPartida;
  temperatura: number;
  /** Momentum por minuto na perspectiva da casa (−1..1) — ver momentumEngine. */
  momentumPorMinuto: number[];
}

/** Fatos REAIS de um lado num minuto (produzidos pela cadeia causal). */
export interface FatosMinutoLado {
  chutes: ChutePartida[];
  escanteios: number;
  impedimentos: number;
  faltas: number;
}

/** Tudo que o reducer precisa saber sobre UM minuto simulado. */
export interface EntradaMinutoEstatisticas {
  timeCasaId: string;
  /** Jogadores realmente EM CAMPO neste minuto (sem expulsos/lesionados). */
  emCampoCasa: Player[];
  emCampoFora: Player[];
  taticaCasa: Tatica | null | undefined;
  taticaFora: Tatica | null | undefined;
  /** Eventos do minuto (cartões viram faltas; falta de pênalti idem). */
  eventosDoMinuto: EventoPartida[];
  fatosCasa: FatosMinutoLado;
  fatosFora: FatosMinutoLado;
  /** Fração de posse da CASA neste minuto (a mesma da barra de posse). */
  fracaoPosseCasa: number;
  /** Urgência pelo placar (>1 = atrás, correndo atrás do prejuízo). */
  urgenciaCasa: number;
  urgenciaFora: number;
}

function criarAcumuladorTime(): AcumuladorTime {
  return {
    golsEsperados: 0,
    assistenciasEsperadas: 0,
    finalizacoes: 0,
    finalizacoesNoAlvo: 0,
    finalizacoesNaArea: 0,
    finalizacoesDeFora: 0,
    grandesChances: 0,
    passesTentados: 0,
    passesCertos: 0,
    dribles: 0,
    desarmes: 0,
    interceptacoes: 0,
    cruzamentos: 0,
    escanteios: 0,
    faltas: 0,
    impedimentos: 0,
    posseZonas: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    perigoSetores: [0, 0, 0],
    finalizacoesPorJogador: {},
    passesPorJogador: {},
  };
}

/**
 * Sorteia as CONDIÇÕES do jogo (clima/temperatura) — apresentação, não fato
 * esportivo: influencia execução (precisão de passe), nunca cria lances.
 * Determinístico pela seed via `rng` (stream de apresentação).
 */
export function criarEstatisticasAoVivo(rng: RandomGenerator): EstatisticasAoVivo {
  const sorteioClima = rng();
  const clima: ClimaPartida =
    sorteioClima < 0.5 ? 'Ensolarado' : sorteioClima < 0.8 ? 'Nublado' : 'Chuvoso';
  const temperatura = Math.round(17 + rng() * 19); // 17–36°C
  return {
    casa: criarAcumuladorTime(),
    fora: criarAcumuladorTime(),
    clima,
    temperatura,
    momentumPorMinuto: [],
  };
}

function mediaAtributo(
  jogadores: Player[],
  seletor: (jogador: Player) => number,
): number {
  if (jogadores.length === 0) {
    return 60;
  }
  return jogadores.reduce((soma, j) => soma + seletor(j), 0) / jogadores.length;
}

/** Corredor do campo pela posição natural: 0=esquerda, 1=centro, 2=direita. */
function corredorDaPosicao(posicao: Position): 0 | 1 | 2 {
  if (posicao === 'LE' || posicao === 'PE') {
    return 0;
  }
  if (posicao === 'LD' || posicao === 'PD') {
    return 2;
  }
  return 1;
}

/** Corredor REAL do chute pela coordenada x persistida no ledger. */
function corredorDoChute(chute: ChutePartida): 0 | 1 | 2 {
  return chute.x < 0.42 ? 0 : chute.x > 0.58 ? 2 : 1;
}

function registrarFinalizacaoJogador(
  time: AcumuladorTime,
  jogadorId: string,
  noAlvo: boolean,
): void {
  const atual = time.finalizacoesPorJogador[jogadorId] ?? {total: 0, noAlvo: 0};
  time.finalizacoesPorJogador[jogadorId] = {
    total: atual.total + 1,
    noAlvo: atual.noAlvo + (noAlvo ? 1 : 0),
  };
}

/** Reduz os CHUTES reais de um lado no acumulador (fonte única: o ledger). */
function reduzirChutes(time: AcumuladorTime, chutes: ChutePartida[]): void {
  for (const chute of chutes) {
    if (chute.resultado === 'gol_anulado') {
      continue; // invalidado pelo VAR: fica no ledger, fora das estatísticas
    }
    const noAlvo = chute.resultado === 'gol' || chute.resultado === 'defesa';
    time.finalizacoes += 1;
    time.finalizacoesNoAlvo += noAlvo ? 1 : 0;
    time.finalizacoesNaArea += chute.deFora ? 0 : 1;
    time.finalizacoesDeFora += chute.deFora ? 1 : 0;
    time.grandesChances += chute.grandeChance ? 1 : 0;
    time.golsEsperados += chute.xg;
    if (chute.assistenciaId !== undefined) {
      time.assistenciasEsperadas += chute.xg;
    }
    const corredor = corredorDoChute(chute);
    time.perigoSetores[corredor] =
      (time.perigoSetores[corredor] ?? 0) +
      (chute.resultado === 'gol' ? 1 : chute.deFora ? 0.3 : 0.55);
    // Gol contra: o lance conta para o time que marcou, mas não credita
    // finalização a jogador nenhum (o "autor" é um defensor adversário).
    if (chute.golContra !== true) {
      registrarFinalizacaoJogador(time, chute.jogadorId, noAlvo);
    }
  }
}

/** Faltas implícitas nos eventos: cartão = falta; falta de pênalti idem. */
function reduzirEventos(
  entrada: EntradaMinutoEstatisticas,
  casa: AcumuladorTime,
  fora: AcumuladorTime,
): void {
  // Faltas de pênalti que JÁ viraram cartão neste minuto: o cartão conta a
  // falta sozinho — sem isto o mesmo lance somaria duas faltas.
  const punidosComCartao = new Set(
    entrada.eventosDoMinuto
      .filter(e => e.tipo === 'cartao_amarelo' || e.tipo === 'cartao_vermelho')
      .map(e => e.jogadorId),
  );

  for (const evento of entrada.eventosDoMinuto) {
    const ehCasa = evento.timeId === entrada.timeCasaId;
    const time = ehCasa ? casa : fora;
    const adversario = ehCasa ? fora : casa;

    if (evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho') {
      time.faltas += 1;
    } else if (
      evento.penaltiData !== undefined &&
      !(evento.jogadorFaltaId && punidosComCartao.has(evento.jogadorFaltaId))
    ) {
      // Pênalti (convertido ou não): o adversário cometeu a falta da cobrança.
      adversario.faltas += 1;
    }
  }
}

/** Pesos das LINHAS (def/meio/ata) da posse por zona, conforme tática e jogo. */
function pesosLinhas(tatica: Tatica | null | undefined, urgencia: number): number[] {
  const linhas = [0.28, 0.44, 0.28];
  if (tatica?.linhaDefensiva === 'Recuada') {
    linhas[0] += 0.05;
    linhas[2] -= 0.05;
  } else if (tatica?.linhaDefensiva === 'Adiantada') {
    linhas[0] -= 0.05;
    linhas[2] += 0.05;
  }
  if (tatica?.estiloOfensivo === 'Posse de bola') {
    linhas[1] += 0.06;
    linhas[0] -= 0.03;
    linhas[2] -= 0.03;
  } else if (tatica?.estiloOfensivo === 'Ataque direto') {
    // Bola longa pula o meio-campo.
    linhas[1] -= 0.08;
    linhas[0] += 0.03;
    linhas[2] += 0.05;
  }
  // Atrás do placar (urgência > 1): empurra o time para o terço ofensivo.
  if (urgencia > 1.02) {
    linhas[2] += 0.05;
    linhas[0] -= 0.05;
  }
  return linhas;
}

/** Pesos das COLUNAS (esq/centro/dir) pela força real dos corredores em campo. */
function pesosColunas(emCampo: Player[]): number[] {
  const base = [0.27, 0.46, 0.27];
  const overallGeral = mediaAtributo(
    emCampo.filter(j => j.posicaoPrincipal !== 'GOL'),
    j => j.overall,
  );
  const pesos = base.map((peso, coluna) => {
    const doCorredor = emCampo.filter(
      j =>
        j.posicaoPrincipal !== 'GOL' &&
        corredorDaPosicao(j.posicaoPrincipal) === coluna,
    );
    const overallCorredor =
      doCorredor.length > 0
        ? mediaAtributo(doCorredor, j => j.overall)
        : overallGeral * 0.85; // corredor sem ninguém escala pouco
    return peso * (1 + (overallCorredor - overallGeral) / 150);
  });
  const total = pesos.reduce((s, p) => s + p, 0);
  return pesos.map(p => p / total);
}

/**
 * Volume DERIVADO de um lado num minuto: passes, duelos, cruzamentos e posse
 * por zona — tudo função determinística da posse real do minuto, da tática e
 * de quem está em campo (execução), sem criar fatos novos.
 */
function acumularVolumeDerivado(
  time: AcumuladorTime,
  emCampo: Player[],
  tatica: Tatica | null | undefined,
  fracaoPosse: number,
  urgencia: number,
  clima: ClimaPartida,
  temperatura: number,
): void {
  const chuva = clima === 'Chuvoso';
  const linha = emCampo.filter(j => j.posicaoPrincipal !== 'GOL');

  // Passes: ~9.5 passes/minuto de jogo repartidos pela posse do minuto.
  const fatorEstiloPasses =
    tatica?.estiloOfensivo === 'Posse de bola'
      ? 1.15
      : tatica?.estiloOfensivo === 'Ataque direto'
        ? 0.85
        : tatica?.estiloOfensivo === 'Contra-ataque'
          ? 0.9
          : 1;
  const volumePasses =
    9.5 * fracaoPosse * fatorEstiloPasses * (temperatura > 32 ? 0.97 : 1);
  const acerto =
    limitar(0.62 + (mediaAtributo(linha, j => j.atributos.passe) / 100) * 0.33, 0.7, 0.94) *
    (chuva ? 0.96 : 1);
  time.passesTentados += volumePasses;
  time.passesCertos += volumePasses * acerto;

  // Reparte os passes do minuto entre quem está EM CAMPO: construtores (meio/
  // defesa) tocam mais; a precisão individual segue o atributo de passe.
  const pesoPasse = (j: Player): number => {
    const posicao = j.posicaoPrincipal;
    const fatorPosicao = ['VOL', 'MC', 'MEI'].includes(posicao)
      ? 1.3
      : posicao === 'ZAG'
        ? 1.15
        : ['LD', 'LE'].includes(posicao)
          ? 1.0
          : posicao === 'GOL'
            ? 0.45
            : ['PD', 'PE', 'SA'].includes(posicao)
              ? 0.85
              : 0.7;
    return fatorPosicao * (Math.max(30, j.atributos.passe) / 70);
  };
  const somaPesos = emCampo.reduce((s, j) => s + pesoPasse(j), 0);
  if (somaPesos > 0) {
    for (const jogador of emCampo) {
      const parcela = volumePasses * (pesoPasse(jogador) / somaPesos);
      const acertoJogador =
        limitar(0.6 + (jogador.atributos.passe / 100) * 0.35, 0.65, 0.95) *
        (chuva ? 0.96 : 1);
      const atual = time.passesPorJogador[jogador.id] ?? {tentados: 0, certos: 0};
      time.passesPorJogador[jogador.id] = {
        tentados: atual.tentados + parcela,
        certos: atual.certos + parcela * acertoJogador,
      };
    }
  }

  // Duelos: com a bola dribla-se; sem a bola desarma-se e intercepta-se.
  time.dribles +=
    fracaoPosse * (mediaAtributo(linha, j => j.atributos.drible) / 70) * 0.26 *
    (chuva ? 0.9 : 1);
  time.desarmes +=
    (1 - fracaoPosse) *
    (mediaAtributo(linha, j => j.atributos.desarme) / 70) *
    0.24 *
    (tatica?.marcacao === 'Pressão alta' ? 1.2 : 1);
  time.interceptacoes +=
    (1 - fracaoPosse) * (mediaAtributo(linha, j => j.atributos.marcacao) / 70) * 0.16;

  const alas = linha.filter(j =>
    ['LD', 'LE', 'PD', 'PE'].includes(j.posicaoPrincipal),
  ).length;
  time.cruzamentos +=
    fracaoPosse *
    (mediaAtributo(linha, j => j.atributos.cruzamento) / 70) *
    0.2 *
    limitar(alas / 4, 0.4, 1.2) *
    (tatica?.estiloOfensivo === 'Ataque direto' ? 1.25 : 1);

  // Posse por zona: distribui a posse do minuto na grade 3×3 do próprio time.
  const linhas = pesosLinhas(tatica, urgencia);
  const colunas = pesosColunas(emCampo);
  for (let l = 0; l < 3; l += 1) {
    for (let c = 0; c < 3; c += 1) {
      const linhaZona = time.posseZonas[l];
      if (linhaZona) {
        linhaZona[c] =
          (linhaZona[c] ?? 0) + fracaoPosse * (linhas[l] ?? 0) * (colunas[c] ?? 0);
      }
    }
  }
}

/** Acumula TUDO de um minuto simulado (fatos do ledger + volume derivado). */
export function acumularEstatisticasMinuto(
  stats: EstatisticasAoVivo,
  entrada: EntradaMinutoEstatisticas,
): void {
  reduzirChutes(stats.casa, entrada.fatosCasa.chutes);
  reduzirChutes(stats.fora, entrada.fatosFora.chutes);

  stats.casa.escanteios += entrada.fatosCasa.escanteios;
  stats.fora.escanteios += entrada.fatosFora.escanteios;
  stats.casa.impedimentos += entrada.fatosCasa.impedimentos;
  stats.fora.impedimentos += entrada.fatosFora.impedimentos;
  stats.casa.faltas += entrada.fatosCasa.faltas;
  stats.fora.faltas += entrada.fatosFora.faltas;

  reduzirEventos(entrada, stats.casa, stats.fora);

  acumularVolumeDerivado(
    stats.casa,
    entrada.emCampoCasa,
    entrada.taticaCasa,
    entrada.fracaoPosseCasa,
    entrada.urgenciaCasa,
    stats.clima,
    stats.temperatura,
  );
  acumularVolumeDerivado(
    stats.fora,
    entrada.emCampoFora,
    entrada.taticaFora,
    1 - entrada.fracaoPosseCasa,
    entrada.urgenciaFora,
    stats.clima,
    stats.temperatura,
  );
}

function normalizar(valores: number[], uniforme: number): number[] {
  const total = valores.reduce((s, v) => s + v, 0);
  if (total <= 0) {
    return valores.map(() => uniforme);
  }
  return valores.map(v => v / total);
}

function fecharTime(acumulador: AcumuladorTime): EstatisticasTimePartida {
  const passesTentados = Math.round(acumulador.passesTentados);
  return {
    golsEsperados: Math.round(acumulador.golsEsperados * 100) / 100,
    assistenciasEsperadas:
      Math.round(acumulador.assistenciasEsperadas * 100) / 100,
    finalizacoes: acumulador.finalizacoes,
    finalizacoesNoAlvo: acumulador.finalizacoesNoAlvo,
    finalizacoesNaArea: acumulador.finalizacoesNaArea,
    finalizacoesDeFora: acumulador.finalizacoesDeFora,
    grandesChances: acumulador.grandesChances,
    passesTentados,
    passesCertos: Math.min(passesTentados, Math.round(acumulador.passesCertos)),
    dribles: Math.round(acumulador.dribles),
    desarmes: Math.round(acumulador.desarmes),
    interceptacoes: Math.round(acumulador.interceptacoes),
    cruzamentos: Math.round(acumulador.cruzamentos),
    escanteios: acumulador.escanteios,
    faltas: acumulador.faltas,
    impedimentos: acumulador.impedimentos,
    posseZonas: (() => {
      const plano = acumulador.posseZonas.flat();
      const normalizado = normalizar(plano, 1 / 9);
      return [
        normalizado.slice(0, 3),
        normalizado.slice(3, 6),
        normalizado.slice(6, 9),
      ];
    })(),
    perigoSetores: normalizar(acumulador.perigoSetores, 1 / 3),
    finalizacoesPorJogador: acumulador.finalizacoesPorJogador,
    passesPorJogador: Object.fromEntries(
      Object.entries(acumulador.passesPorJogador).map(([id, passes]) => {
        const tentados = Math.round(passes.tentados);
        return [
          id,
          {tentados, certos: Math.min(tentados, Math.round(passes.certos))},
        ];
      }),
    ),
  };
}

/** Fecha as estatísticas (arredonda e normaliza) para persistir na Partida. */
export function finalizarEstatisticas(
  stats: EstatisticasAoVivo,
): EstatisticasPartida {
  return {
    casa: fecharTime(stats.casa),
    fora: fecharTime(stats.fora),
    clima: stats.clima,
    temperatura: stats.temperatura,
    momentumPorMinuto: stats.momentumPorMinuto,
  };
}
