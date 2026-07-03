/**
 * Recalibra os overalls do seed com RATINGS REAIS (eFootball 2026 / EA FC 26).
 *
 * Entrada: um JSON `{ <arquivoClube>: {ratings: [{nome, overall}], fonte} }`
 * (produzido pela pesquisa web) + os arquivos de `src/data/seed/jogadores/`.
 *
 * Para cada clube:
 *  1. casa os nomes pesquisados com os do seed (normalização sem acentos);
 *  2. jogador casado recebe o overall REAL;
 *  3. os demais recebem `novo = alvoMedianaClube + (antigo − medianaSeedClube)`
 *     — deslocamento ancorado na mediana REAL do clube (dos casados; fallback
 *     manual p/ clube sem cobertura), preservando o spread interno do seed e
 *     sem achatar clubes fracos contra a média da liga;
 *  4. atributos escalam pela razão novo/antigo (perfil da posição preservado);
 *  5. potencial = max(potencial escalado, overall + bônus por idade).
 *
 * Uso: node scripts/recalibrarSeed.mjs <ratings.json> [--aplicar]
 * Sem --aplicar roda em modo relatório (dry-run).
 */

import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_JOGADORES = resolve(RAIZ, 'src/data/seed/jogadores');

const OVERALL_MIN = 48;
const OVERALL_MAX = 92;

function normalizar(nome) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function bonusPotencialPorIdade(idade) {
  if (idade <= 21) {
    return 6;
  }
  if (idade <= 24) {
    return 3;
  }
  if (idade <= 28) {
    return 1;
  }
  return 0;
}

const [, , caminhoRatings, flagAplicar] = process.argv;
if (!caminhoRatings) {
  console.error('Uso: node scripts/recalibrarSeed.mjs <ratings.json> [--aplicar]');
  process.exit(1);
}
const aplicar = flagAplicar === '--aplicar';
const pesquisa = JSON.parse(readFileSync(caminhoRatings, 'utf8'));

// Regressão GLOBAL (todos os pares casados de todos os clubes) — fallback.
const paresGlobais = [];
const casamentosPorClube = new Map();
for (const [clube, dados] of Object.entries(pesquisa)) {
  const jogadores = JSON.parse(
    readFileSync(resolve(DIR_JOGADORES, `${clube}.json`), 'utf8'),
  );
  const porNome = new Map(jogadores.map(j => [normalizar(j.nome), j]));
  const casados = [];
  for (const rating of dados.ratings ?? []) {
    const alvo = Math.round(rating.overall);
    if (!Number.isFinite(alvo) || alvo < 40 || alvo > 99) {
      continue;
    }
    const jogador = porNome.get(normalizar(rating.nome));
    if (jogador) {
      casados.push({jogador, alvo});
      paresGlobais.push([jogador.overall, alvo]);
    }
  }
  casamentosPorClube.set(clube, {jogadores, casados});
}

if (paresGlobais.length < 20) {
  console.error('Sem pares suficientes para calibrar. Abortando.');
  process.exit(1);
}
console.log(`Pares casados no total: ${paresGlobais.length}`);

/** Mediana-alvo manual para clubes sem cobertura da pesquisa (tier fraco). */
const MEDIANA_MANUAL = {remo: 66};

function mediana(valores) {
  const ordenados = [...valores].sort((x, y) => x - y);
  return ordenados[Math.floor(ordenados.length / 2)];
}

let totalAjustados = 0;
for (const [clube, {jogadores, casados}] of casamentosPorClube) {
  const alvoPorId = new Map(casados.map(({jogador, alvo}) => [jogador.id, alvo]));
  const medianaSeed = mediana(jogadores.map(j => j.overall));
  const alvoMediana =
    casados.length >= 3
      ? mediana(casados.map(({alvo}) => alvo))
      : MEDIANA_MANUAL[clube] ?? medianaSeed + 4;
  // Teto dos não-casados: ninguém "inventado" acima do melhor rating real.
  const tetoNaoCasado =
    casados.length >= 3 ? Math.max(...casados.map(({alvo}) => alvo)) : 78;

  const ajustados = jogadores.map(jogador => {
    const antigo = jogador.overall;
    const casado = alvoPorId.get(jogador.id);
    const bruto =
      casado ?? Math.min(tetoNaoCasado, alvoMediana + (antigo - medianaSeed));
    const novo = Math.max(OVERALL_MIN, Math.min(OVERALL_MAX, Math.round(bruto)));
    const razao = novo / Math.max(1, antigo);

    const atributos = Object.fromEntries(
      Object.entries(jogador.atributos).map(([chave, valor]) => [
        chave,
        Math.max(5, Math.min(96, Math.round(valor * razao))),
      ]),
    );
    const potencialEscalado = Math.round(jogador.potencial * razao);
    const potencial = Math.min(
      95,
      Math.max(potencialEscalado, novo + bonusPotencialPorIdade(jogador.idade)),
    );
    return {...jogador, overall: novo, potencial, atributos};
  });

  const antes = jogadores.map(j => j.overall);
  const depois = ajustados.map(j => j.overall);
  console.log(
    `${clube.padEnd(16)} casados ${String(casados.length).padStart(2)}/${jogadores.length} · top ${Math.max(...antes)}→${Math.max(...depois)} · mediana ${antes.sort((x, y) => x - y)[Math.floor(antes.length / 2)]}→${depois.sort((x, y) => x - y)[Math.floor(depois.length / 2)]}`,
  );
  totalAjustados += ajustados.length;

  if (aplicar) {
    writeFileSync(
      resolve(DIR_JOGADORES, `${clube}.json`),
      JSON.stringify(ajustados, null, 2) + '\n',
    );
  }
}

console.log(
  `${aplicar ? 'APLICADO' : 'DRY-RUN'} — ${totalAjustados} jogadores em ${casamentosPorClube.size} clubes.`,
);
