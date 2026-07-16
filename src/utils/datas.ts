/**
 * Utilitários de data (puros e determinísticos) para o calendário do jogo.
 * Trabalham com strings ISO `YYYY-MM-DD`. Não usam a data "de hoje" (nada de
 * `Date.now()` / `new Date()` sem argumentos), então o resultado é estável.
 */

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function partes(iso: string): {ano: number; mes: number; dia: number} {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return {ano: ano ?? 2026, mes: mes ?? 1, dia: dia ?? 1};
}

function paraIso(d: Date): string {
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Soma (ou subtrai, com valor negativo) `dias` a uma data ISO. */
export function adicionarDias(iso: string, dias: number): string {
  const {ano, mes, dia} = partes(iso);
  const base = new Date(Date.UTC(ano, mes - 1, dia));
  base.setUTCDate(base.getUTCDate() + dias);
  return paraIso(base);
}

/** Diferença em dias inteiros entre duas datas (ate - de). */
export function diferencaEmDias(de: string, ate: string): number {
  const a = partes(de);
  const b = partes(ate);
  const da = Date.UTC(a.ano, a.mes - 1, a.dia);
  const db = Date.UTC(b.ano, b.mes - 1, b.dia);
  return Math.round((db - da) / 86400000);
}

/** Abreviação do dia da semana (Dom..Sáb). */
export function diaDaSemana(iso: string): string {
  const {ano, mes, dia} = partes(iso);
  return DIAS_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()] ?? '';
}

/** Índice do dia da semana (0 = Dom … 6 = Sáb). */
export function indiceDiaSemana(iso: string): number {
  const {ano, mes, dia} = partes(iso);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** Quantidade de dias no mês (1-12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Nome do mês capitalizado ("Abril"). */
export function nomeMes(mes: number): string {
  const nome = MESES[mes - 1] ?? '';
  return nome ? nome[0].toUpperCase() + nome.slice(1) : '';
}

/** "Qua 08/04" — dia da semana + dia/mês. */
export function formatarDataCurta(iso: string): string {
  const {mes, dia} = partes(iso);
  return `${diaDaSemana(iso)} ${String(dia).padStart(2, '0')}/${String(
    mes,
  ).padStart(2, '0')}`;
}

/** "Qua, 8 de abril" — para cabeçalhos. */
export function formatarDataLonga(iso: string): string {
  const {mes, dia} = partes(iso);
  return `${diaDaSemana(iso)}, ${dia} de ${MESES[mes - 1] ?? ''}`;
}

/**
 * Rótulo relativo da data-alvo vista da data atual do jogo: "Hoje", "Amanhã",
 * "em N dias" (até 6) ou a data curta. Determinístico (sem "hoje" do sistema).
 */
export function rotuloRelativo(dataAtual: string, dataAlvo: string): string {
  const dias = diferencaEmDias(dataAtual, dataAlvo);
  if (dias <= 0) {
    return 'Hoje';
  }
  if (dias === 1) {
    return 'Amanhã';
  }
  if (dias <= 6) {
    return `em ${dias} dias`;
  }
  return formatarDataCurta(dataAlvo);
}

/**
 * Horário PROVÁVEL de bola rolando, derivado do dia da semana — apenas
 * apresentacional (o jogo não modela kickoff) e determinístico. Fim de semana à
 * tarde/começo da noite; meio de semana à noite.
 */
export function horarioProvavel(iso: string): string {
  switch (indiceDiaSemana(iso)) {
    case 0: // domingo
      return '16:00';
    case 6: // sábado
      return '18:30';
    case 3: // quarta (rodada de meio de semana)
      return '21:30';
    default:
      return '20:00';
  }
}
