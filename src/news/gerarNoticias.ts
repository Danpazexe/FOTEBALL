/**
 * DERIVAÇÃO do feed de notícias — 100% pura e determinística.
 *
 * Cada notícia sai de um FATO já existente no estado do jogo (resultados,
 * tabela, elenco, mercado). Nada é inventado, nenhum estado novo é criado, não
 * há sorteio, `Math.random`, `Date.now` nem ordenação instável. A mesma entrada
 * produz sempre exatamente o mesmo feed. Entrada sem dados ⇒ feed vazio (ou só o
 * que os dados reais permitem).
 *
 * Consome o contrato de `./tipos` e é chamada pela tela Notícias.
 */
import type {Clube, Partida, Player} from '../types';

import type {
  DestaqueNoticia,
  EntradaFeedNoticias,
  FeedNoticias,
  Noticia,
} from './tipos';

type Resultado = 'V' | 'E' | 'D';

/** Escala de peso por categoria (ordenação decrescente do feed). */
const PESO = {
  sequencia: 100,
  posicao: 95,
  artilheiro: 90,
  resultadoBase: 70, // + recência (0..5)
  mercadoBase: 40, // + recência
  lesao: 20,
  suspensao: 15,
} as const;

/** Nome do clube pelo id (fallback = id) — nunca inventa. */
function nomeClube(clubes: Clube[], id: string): string {
  return clubes.find(c => c.id === id)?.nome ?? id;
}

/** Adversário do clube numa partida. */
function adversario(p: Partida, clubeId: string): string {
  return p.timeCasa === clubeId ? p.timeFora : p.timeCasa;
}

/**
 * Partidas JOGADAS do clube (placar definido), em ordem cronológica ascendente
 * e estável (data, depois rodada, depois id como desempate).
 */
function partidasJogadasDoClube(clubeId: string, partidas: Partida[]): Partida[] {
  return partidas
    .filter(
      p =>
        p.jogada &&
        (p.timeCasa === clubeId || p.timeFora === clubeId) &&
        p.placarCasa !== undefined &&
        p.placarFora !== undefined,
    )
    .sort((a, b) =>
      a.data < b.data
        ? -1
        : a.data > b.data
        ? 1
        : a.rodada !== b.rodada
        ? a.rodada - b.rodada
        : a.id < b.id
        ? -1
        : a.id > b.id
        ? 1
        : 0,
    );
}

/** Resultado (V/E/D) de uma partida jogada na ótica do clube. */
function resultadoDe(p: Partida, clubeId: string): Resultado {
  const pc = p.placarCasa as number;
  const pf = p.placarFora as number;
  const emCasa = p.timeCasa === clubeId;
  const pro = emCasa ? pc : pf;
  const contra = emCasa ? pf : pc;
  if (pro > contra) {
    return 'V';
  }
  if (pro < contra) {
    return 'D';
  }
  if (p.vencedorPenaltis) {
    return p.vencedorPenaltis === clubeId ? 'V' : 'D';
  }
  return 'E';
}

/** Gols pró / contra do clube numa partida jogada. */
function placarDoClube(p: Partida, clubeId: string): {pro: number; contra: number} {
  const pc = p.placarCasa as number;
  const pf = p.placarFora as number;
  const emCasa = p.timeCasa === clubeId;
  return emCasa ? {pro: pc, contra: pf} : {pro: pf, contra: pc};
}

/** Nome curto de um jogador (apelido quando houver). */
function nomeJogador(j: Player): string {
  return j.apelido && j.apelido.trim().length > 0 ? j.apelido : j.nome;
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/** Frase-título de um resultado, na ótica do clube. */
function tituloResultado(p: Partida, clubeId: string, advNome: string): string {
  const res = resultadoDe(p, clubeId);
  const {pro, contra} = placarDoClube(p, clubeId);
  const penaltis = pro === contra && !!p.vencedorPenaltis;
  if (res === 'V') {
    return penaltis
      ? `Vitória sobre o ${advNome} nos pênaltis`
      : `Vitória sobre o ${advNome} por ${pro} a ${contra}`;
  }
  if (res === 'D') {
    return penaltis
      ? `Derrota para o ${advNome} nos pênaltis`
      : `Derrota para o ${advNome} por ${pro} a ${contra}`;
  }
  return `Empate com o ${advNome} por ${pro} a ${contra}`;
}

function subtituloRodada(rodada: number, ehCasa: boolean): string {
  return `Rodada ${rodada} · ${ehCasa ? 'em casa' : 'fora'}`;
}

/** Tom da notícia por resultado. */
function tomResultado(res: Resultado): Noticia['tom'] {
  return res === 'V' ? 'success' : res === 'D' ? 'danger' : 'textSecondary';
}

// ---------------------------------------------------------------------------
// DESTAQUE
// ---------------------------------------------------------------------------

function derivarDestaque(
  entrada: EntradaFeedNoticias,
  jogados: Partida[],
  forma: Resultado[],
): DestaqueNoticia | null {
  const {clubeId, clubes, proximoJogo} = entrada;

  if (proximoJogo) {
    const ehCasa = proximoJogo.timeCasa === clubeId;
    const advId = adversario(proximoJogo, clubeId);
    return {
      tipo: 'proximo_jogo',
      titulo: `Próximo desafio: ${nomeClube(clubes, advId)}`,
      subtitulo: subtituloRodada(proximoJogo.rodada, ehCasa),
      clubeCasaId: proximoJogo.timeCasa,
      clubeForaId: proximoJogo.timeFora,
      rodada: proximoJogo.rodada,
      formaUsuario: forma,
      ehCasa,
      acao: {tipo: 'prejogo'},
    };
  }

  const ultimo = jogados[jogados.length - 1];
  if (ultimo) {
    const ehCasa = ultimo.timeCasa === clubeId;
    const advNome = nomeClube(clubes, adversario(ultimo, clubeId));
    return {
      tipo: 'ultimo_resultado',
      titulo: tituloResultado(ultimo, clubeId, advNome),
      subtitulo: subtituloRodada(ultimo.rodada, ehCasa),
      clubeCasaId: ultimo.timeCasa,
      clubeForaId: ultimo.timeFora,
      rodada: ultimo.rodada,
      formaUsuario: forma,
      ehCasa,
      acao: {tipo: 'partida', partidaId: ultimo.id},
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// NOTÍCIAS
// ---------------------------------------------------------------------------

/** 2. Últimas até 6 partidas jogadas do clube. */
function noticiasResultados(
  entrada: EntradaFeedNoticias,
  jogados: Partida[],
): Noticia[] {
  const {clubeId, clubes} = entrada;
  const ultimas = jogados.slice(-6);
  return ultimas.map((p, i) => {
    const res = resultadoDe(p, clubeId);
    const advId = adversario(p, clubeId);
    const advNome = nomeClube(clubes, advId);
    const ehCasa = p.timeCasa === clubeId;
    const {pro, contra} = placarDoClube(p, clubeId);
    const tom = tomResultado(res);
    return {
      id: `res_${p.id}`,
      categoria: 'partida',
      titulo: tituloResultado(p, clubeId, advNome),
      subtitulo: subtituloRodada(p.rodada, ehCasa),
      icone: 'bola',
      tom,
      clubeId: advId,
      selo: `${pro}-${contra}`,
      seloTom: tom,
      acao: {tipo: 'partida', partidaId: p.id},
      // `i` cresce com a recência (lista ascendente): mais recente = maior peso.
      peso: PESO.resultadoBase + i,
    };
  });
}

/** 3. Uma notícia de sequência, derivada da forma completa. */
function noticiaSequencia(forma: Resultado[]): Noticia | null {
  // Sequências "por trás" (a partir do jogo mais recente).
  let vitorias = 0;
  let invicto = 0;
  let derrotas = 0;
  for (let i = forma.length - 1; i >= 0; i--) {
    if (forma[i] === 'V') {
      vitorias++;
    } else {
      break;
    }
  }
  for (let i = forma.length - 1; i >= 0; i--) {
    if (forma[i] !== 'D') {
      invicto++;
    } else {
      break;
    }
  }
  for (let i = forma.length - 1; i >= 0; i--) {
    if (forma[i] === 'D') {
      derrotas++;
    } else {
      break;
    }
  }

  if (vitorias >= 3) {
    return {
      id: 'seq',
      categoria: 'partida',
      titulo: `Embalados: ${vitorias} vitórias seguidas`,
      subtitulo: `${vitorias} jogos vencendo em sequência`,
      icone: 'tendencia',
      tom: 'success',
      selo: `×${vitorias}`,
      seloTom: 'success',
      peso: PESO.sequencia,
    };
  }
  if (invicto >= 4) {
    return {
      id: 'seq',
      categoria: 'partida',
      titulo: `Invicto há ${invicto} jogos`,
      subtitulo: `${invicto} jogos sem perder`,
      icone: 'tendencia',
      tom: 'success',
      selo: 'INVICTO',
      seloTom: 'success',
      peso: PESO.sequencia,
    };
  }
  if (derrotas >= 3) {
    return {
      id: 'seq',
      categoria: 'partida',
      titulo: `Fase ruim: ${derrotas} derrotas seguidas`,
      subtitulo: `${derrotas} derrotas consecutivas`,
      icone: 'tendencia',
      tom: 'danger',
      selo: `×${derrotas}`,
      seloTom: 'danger',
      peso: PESO.sequencia,
    };
  }
  return null;
}

/** 4. Posição do clube na tabela. */
function noticiaPosicao(entrada: EntradaFeedNoticias): Noticia | null {
  const {clubeId, clube, tabela, divisao} = entrada;
  const idx = tabela.findIndex(t => t.clubeId === clubeId);
  if (idx < 0) {
    return null;
  }
  const posicao = idx + 1;
  const rebaixaAtivo = divisao !== 'Série D';
  const limiteRebaixamento = tabela.length - 3; // 4 últimas posições

  let subtitulo: string;
  let tom: Noticia['tom'];
  if (posicao <= 4) {
    subtitulo = divisao === 'Série A' ? 'Zona de Libertadores' : 'Zona de acesso';
    tom = 'success';
  } else if (rebaixaAtivo && posicao >= limiteRebaixamento) {
    subtitulo = 'Zona de rebaixamento';
    tom = 'danger';
  } else {
    subtitulo = 'Meio da tabela';
    tom = 'textSecondary';
  }

  return {
    id: 'pos',
    categoria: 'partida',
    titulo: `${clube.nome} em ${posicao}º lugar`,
    subtitulo,
    icone: 'tabela',
    tom,
    selo: `${posicao}º`,
    seloTom: tom,
    acao: {tipo: 'classificacao'},
    peso: PESO.posicao,
  };
}

/** 5. Artilheiro do time (mais gols na temporada, > 0). */
function noticiaArtilheiro(elenco: Player[]): Noticia | null {
  let melhor: Player | null = null;
  for (const j of elenco) {
    const gols = j.estatisticasTemporada.gols;
    if (gols <= 0) {
      continue;
    }
    if (
      !melhor ||
      gols > melhor.estatisticasTemporada.gols ||
      // Desempate estável por id ascendente.
      (gols === melhor.estatisticasTemporada.gols && j.id < melhor.id)
    ) {
      melhor = j;
    }
  }
  if (!melhor) {
    return null;
  }
  const gols = melhor.estatisticasTemporada.gols;
  return {
    id: `art_${melhor.id}`,
    categoria: 'clube',
    titulo: `${nomeJogador(melhor)} é o artilheiro do time`,
    subtitulo: `${plural(gols, 'gol', 'gols')} na temporada`,
    icone: 'estrela',
    tom: 'accent',
    jogadorId: melhor.id,
    selo: `${gols}`,
    seloTom: 'accent',
    acao: {tipo: 'elenco'},
    peso: PESO.artilheiro,
  };
}

/** 6/7. Lesões e suspensões do elenco. */
function noticiasDepartamento(elenco: Player[]): Noticia[] {
  const out: Noticia[] = [];
  for (const j of elenco) {
    if (j.lesionado) {
      out.push({
        id: `les_${j.id}`,
        categoria: 'clube',
        titulo: `${nomeJogador(j)} no departamento médico`,
        subtitulo: `Lesionado · ${plural(j.diasLesao, 'dia', 'dias')} de recuperação`,
        icone: 'lesao',
        tom: 'danger',
        jogadorId: j.id,
        acao: {tipo: 'medico'},
        peso: PESO.lesao,
      });
    }
    if (j.suspenso) {
      out.push({
        id: `sus_${j.id}`,
        categoria: 'clube',
        titulo: `${nomeJogador(j)} suspenso`,
        subtitulo: `${plural(j.jogosSuspensao, 'jogo', 'jogos')} de suspensão`,
        icone: 'cartao',
        tom: 'warning',
        jogadorId: j.id,
        peso: PESO.suspensao,
      });
    }
  }
  return out;
}

/** 8. Movimentações de mercado (contratações e vendas). */
function noticiasMercado(clube: Clube): Noticia[] {
  const transacoes = clube.financas.historicoTransacoes;
  const relevantes: Noticia[] = [];
  transacoes.forEach((t, idx) => {
    if (t.categoria !== 'contratacoes' && t.categoria !== 'vendaJogadores') {
      return;
    }
    relevantes.push({
      id: `mkt_${idx}`,
      categoria: 'mercado',
      titulo: t.categoria === 'contratacoes' ? 'Reforço confirmado' : 'Negócio fechado',
      subtitulo: t.descricao,
      icone: 'mercado',
      tom: 'brand',
      peso: 0, // definido abaixo por recência
    });
  });
  // Mantém só as ~5 mais recentes; peso cresce com a recência.
  const ultimas = relevantes.slice(-5);
  return ultimas.map((n, i) => ({...n, peso: PESO.mercadoBase + i}));
}

// ---------------------------------------------------------------------------
// ENTRADA PÚBLICA
// ---------------------------------------------------------------------------

export function gerarFeedNoticias(entrada: EntradaFeedNoticias): FeedNoticias {
  const {clubeId, clube, jogadores, partidas} = entrada;

  const jogados = partidasJogadasDoClube(clubeId, partidas);
  // Resultados COMPLETOS (cronológicos) — a sequência conta a partir do fim e
  // precisa da série inteira; a `forma` do destaque é só a janela dos últimos 5.
  const resultados: Resultado[] = jogados.map(p => resultadoDe(p, clubeId));
  const forma: Resultado[] = resultados.slice(-5);

  const elenco = jogadores.filter(j => j.clubeId === clubeId);

  const destaque = derivarDestaque(entrada, jogados, forma);

  const noticias: Noticia[] = [];

  const seq = noticiaSequencia(resultados);
  if (seq) {
    noticias.push(seq);
  }
  const pos = noticiaPosicao(entrada);
  if (pos) {
    noticias.push(pos);
  }
  const art = noticiaArtilheiro(elenco);
  if (art) {
    noticias.push(art);
  }
  noticias.push(...noticiasResultados(entrada, jogados));
  noticias.push(...noticiasMercado(clube));
  noticias.push(...noticiasDepartamento(elenco));

  // Ordenação decrescente por peso, estável e determinística (desempate por id).
  noticias.sort((a, b) =>
    b.peso !== a.peso ? b.peso - a.peso : a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  return {destaque, noticias};
}
