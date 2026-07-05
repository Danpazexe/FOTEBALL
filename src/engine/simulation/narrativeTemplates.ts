import type {EventoPartida, EventoPartidaTipo} from '../../types';

/**
 * Geração de texto narrativo para o modo narrado (estilo Brasfoot).
 * Módulo puro (sem React): mapeia um EventoPartida para uma frase variada,
 * escolhida de forma DETERMINÍSTICA (sem Math.random) para que a mesma
 * partida narre sempre igual — coerente com o motor determinístico.
 */

const TEMPLATES_GOL = [
  '{jogador} recebe na área e bate firme no canto! GOOOOOL! {placar}',
  'QUE GOLAÇO! {jogador} acerta um chute de fora da área! {placar}',
  '{jogador} aproveita o rebote e empurra pra rede! GOOOOOL! {placar}',
  'Cabeçada precisa de {jogador}, o goleiro não alcançou! {placar}',
  '{jogador} dribla o marcador e bate cruzado! É GOL! {placar}',
  'Passe magistral e {jogador} não perdoa na cara do gol! {placar}',
  'CONTRA-ATAQUE LETAL! {jogador} sai na cara do goleiro e decide! {placar}',
];

const TEMPLATES_CARTAO_AMARELO = [
  '{jogador} leva cartão amarelo por falta dura.',
  'O árbitro para a partida e mostra o amarelo para {jogador}.',
  '{jogador} reclama demais e é advertido pelo árbitro.',
  'Falta por trás e {jogador} vê o cartão amarelo.',
];

const TEMPLATES_CARTAO_VERMELHO = [
  'EXPULSO! {jogador} vê o cartão vermelho e deixa o campo!',
  'Entrada violenta de {jogador} e o árbitro não tem dúvidas: vermelho!',
  'Segundo amarelo para {jogador}! Vai tomar banho mais cedo.',
];

const TEMPLATES_LESAO = [
  '{jogador} cai no gramado com dores e pede substituição.',
  'Preocupação! {jogador} saiu mancando e pode ser baixa.',
  'Lance ruim deixa {jogador} no chão. Parece lesão muscular.',
];

const TEMPLATES_SUBSTITUICAO = [
  'Substituição: entra {jogadorEntra}, sai {jogador}.',
  'Mexe o time: {jogadorEntra} no lugar de {jogador}.',
];

const TEMPLATES_CHANCE_PERDIDA = [
  'Que chance! {jogador} ficou cara a cara e mandou pra fora.',
  '{jogador} chuta por cima em boa posição. Que pena!',
  'Na trave! {jogador} quase abriu o placar.',
  'Defesa absurda do goleiro no chute de {jogador}!',
  '{jogador} cabeceia com o gol aberto, mas a bola sai pela linha de fundo.',
];

const TEMPLATES_PENALTI = [
  'PÊNALTI! {jogador} foi derrubado na área! Cobrança marcada.',
  'O árbitro aponta para a marca da cal! Pênalti!',
];

const TEMPLATES_FALTA = [
  'Falta perigosa na entrada da área. {jogador} vai para a cobrança.',
  '{jogador} ajeita a bola para a cobrança de falta...',
];

const TEMPLATES_GOL_CONTRA = [
  'Que infelicidade! {jogador} desviou contra a própria meta!',
  'Gol contra! {jogador} mandou pra dentro do próprio gol.',
  'Lance azarado: {jogador} marcou contra!',
];

const TEMPLATES_TRAVE = [
  'Na trave! {jogador} carimbou a madeira!',
  'Quase! {jogador} acertou o travessão!',
  'No poste! {jogador} chegou pertíssimo do gol.',
];

const TEMPLATES_POR_TIPO: Record<EventoPartidaTipo, string[]> = {
  gol: TEMPLATES_GOL,
  gol_contra: TEMPLATES_GOL_CONTRA,
  cartao_amarelo: TEMPLATES_CARTAO_AMARELO,
  cartao_vermelho: TEMPLATES_CARTAO_VERMELHO,
  lesao: TEMPLATES_LESAO,
  substituicao: TEMPLATES_SUBSTITUICAO,
  chance_perdida: TEMPLATES_CHANCE_PERDIDA,
  bola_trave: TEMPLATES_TRAVE,
  penalti: TEMPLATES_PENALTI,
  falta_cobranca: TEMPLATES_FALTA,
};

/** Soma determinística dos códigos de um texto (hash simples e estável). */
function hashTexto(texto: string): number {
  let total = 0;
  for (let i = 0; i < texto.length; i++) {
    total = (total + texto.charCodeAt(i) * (i + 1)) % 100000;
  }
  return total;
}

function escolher(templates: string[], semente: number): string {
  if (templates.length === 0) {
    return '';
  }
  const indice = Math.abs(semente) % templates.length;
  return templates[indice];
}

export interface ContextoNarracao {
  /** Nome do jogador autor do evento. */
  nomeJogador: string;
  /** Nome do jogador que entra (substituição). */
  nomeJogadorEntra?: string;
  /** Nome do time do evento. */
  nomeTime: string;
  /** Placar no momento do evento, no formato "casa x fora". */
  placar: string;
}

/**
 * Devolve a frase narrada para um evento. Determinístico: a escolha do
 * template depende do minuto + jogador, então não varia entre execuções.
 */
export function narrarEvento(
  evento: EventoPartida,
  ctx: ContextoNarracao,
): string {
  // Pênalti carrega o DESFECHO na própria descrição (defendeu/para fora),
  // então não usamos template genérico de "pênalti marcado".
  if (evento.tipo === 'penalti') {
    return evento.descricao;
  }
  const templates = TEMPLATES_POR_TIPO[evento.tipo] ?? [];
  const semente = evento.minuto * 31 + hashTexto(evento.jogadorId);
  const template = escolher(templates, semente) || evento.descricao;

  return template
    .replace('{jogador}', ctx.nomeJogador)
    .replace('{jogadorEntra}', ctx.nomeJogadorEntra ?? '')
    .replace('{time}', ctx.nomeTime)
    .replace('{placar}', ctx.placar);
}

export function narrarInicio(timeCasa: string, timeFora: string): string {
  return `A bola rola! Começa o jogo: ${timeCasa} x ${timeFora}!`;
}

export function narrarIntervalo(
  timeCasa: string,
  timeFora: string,
  placarCasa: number,
  placarFora: number,
): string {
  return `Fim do 1º tempo: ${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}`;
}

export function narrarSegundoTempo(): string {
  return 'Recomeça a partida para o segundo tempo!';
}

export function narrarFim(
  timeCasa: string,
  timeFora: string,
  placarCasa: number,
  placarFora: number,
): string {
  return `Fim de jogo! ${timeCasa} ${placarCasa} x ${placarFora} ${timeFora}`;
}
