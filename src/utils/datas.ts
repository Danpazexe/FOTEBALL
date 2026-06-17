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
