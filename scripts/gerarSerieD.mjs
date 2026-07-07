/**
 * Gera o seed da SÉRIE D: 96 clubes + elencos 100% PROCEDURAIS e DETERMINÍSTICOS.
 * Formato 2026 (CBF): 96 clubes / 16 grupos de 6 / 6 acessos à Série C.
 *
 * - RNG semeado por id do clube (hashString → mulberry32), sem Math.random.
 * - Atributos por arquétipo de posição, ancorados no tier D (mediana ~50, teto ~62).
 * - overall = calcularOverall(atributos, posicao) — MESMA fórmula do engine
 *   (PERFIS de overall.ts + grupoDaPosicao de posicoes.ts), replicada aqui pois
 *   este é um script Node standalone (não importa TS).
 *
 * Saída:
 *   src/data/seed/clubes/brasil/brasileirao/serie-d.json  (96 clubes)
 *   src/data/seed/jogadores/serie_d_<slug>.json           (96 arquivos, ~28 cada)
 *   <scratchpad>/seried_wiring.txt                        (snippets p/ os index.ts)
 *
 * Uso: node scripts/gerarSerieD.mjs
 */

import {writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_CLUBES = resolve(RAIZ, 'src/data/seed/clubes/brasil/brasileirao');
const DIR_JOGADORES = resolve(RAIZ, 'src/data/seed/jogadores');

// ---- RNG determinístico (copiado de src/engine/simulation/rng.ts) ----
function hashString(texto) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
function criarRNGComSeed(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const inteiro = (rng, lo, hi) => Math.floor(rng() * (hi - lo + 1)) + lo;
const escolher = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- overall = calcularOverall (PERFIS de overall.ts + grupos de posicoes.ts) ----
const GRUPO = {
  GOL: 'GOL', ZAG: 'ZAGUEIRO', LD: 'LATERAL', LE: 'LATERAL', VOL: 'VOLANTE',
  MC: 'MEIA_CENTRAL', MEI: 'MEIA_OFENSIVO', PD: 'PONTA', PE: 'PONTA',
  SA: 'ATACANTE', CA: 'ATACANTE',
};
const PERFIS = {
  GOL: {reflexos: 0.42, posicionamento: 0.3, forca: 0.12, resistencia: 0.08, velocidade: 0.08},
  ZAGUEIRO: {marcacao: 0.24, desarme: 0.22, forca: 0.16, cabeceio: 0.14, posicionamento: 0.14, velocidade: 0.1},
  LATERAL: {velocidade: 0.2, marcacao: 0.18, desarme: 0.16, cruzamento: 0.16, resistencia: 0.16, passe: 0.14},
  VOLANTE: {desarme: 0.22, marcacao: 0.2, passe: 0.18, posicionamento: 0.16, resistencia: 0.14, forca: 0.1},
  MEIA_CENTRAL: {passe: 0.24, posicionamento: 0.18, drible: 0.16, resistencia: 0.16, velocidade: 0.14, finalizacao: 0.12},
  MEIA_OFENSIVO: {passe: 0.22, drible: 0.18, posicionamento: 0.18, finalizacao: 0.15, cruzamento: 0.15, velocidade: 0.12},
  PONTA: {velocidade: 0.22, drible: 0.2, cruzamento: 0.18, finalizacao: 0.16, passe: 0.14, cabeceio: 0.1},
  ATACANTE: {finalizacao: 0.28, posicionamento: 0.2, cabeceio: 0.16, velocidade: 0.16, forca: 0.12, drible: 0.08},
};
function calcularOverall(atributos, posicao) {
  const pesos = PERFIS[GRUPO[posicao]];
  let soma = 0;
  let total = 0;
  for (const [chave, peso] of Object.entries(pesos)) {
    soma += atributos[chave] * peso;
    total += peso;
  }
  return total === 0 ? 0 : Math.round(clamp(soma / total, 1, 99));
}

// Atributos "fortes" por grupo (recebem o alvo do tier); os demais ficam abaixo.
const ATRIBUTOS = [
  'finalizacao', 'passe', 'marcacao', 'desarme', 'velocidade', 'resistencia',
  'forca', 'reflexos', 'posicionamento', 'drible', 'cabeceio', 'cruzamento',
];
const FORTES = {
  GOL: ['reflexos', 'posicionamento'],
  ZAGUEIRO: ['marcacao', 'desarme', 'forca', 'cabeceio', 'posicionamento'],
  LATERAL: ['velocidade', 'marcacao', 'desarme', 'cruzamento', 'resistencia'],
  VOLANTE: ['desarme', 'marcacao', 'passe', 'posicionamento', 'resistencia'],
  MEIA_CENTRAL: ['passe', 'posicionamento', 'drible', 'resistencia'],
  MEIA_OFENSIVO: ['passe', 'drible', 'posicionamento', 'finalizacao', 'cruzamento'],
  PONTA: ['velocidade', 'drible', 'cruzamento', 'finalizacao', 'cabeceio'],
  ATACANTE: ['finalizacao', 'posicionamento', 'cabeceio', 'velocidade', 'forca'],
};

// Elenco: 28 jogadores por clube cobrindo todas as posições.
const TEMPLATE = [
  'GOL', 'GOL', 'GOL',
  'ZAG', 'ZAG', 'ZAG', 'ZAG', 'ZAG',
  'LD', 'LD', 'LE', 'LE',
  'VOL', 'VOL', 'VOL',
  'MC', 'MC', 'MC',
  'MEI', 'MEI', 'MEI',
  'PD', 'PD', 'PE', 'PE',
  'CA', 'CA', 'CA',
];
const SECUNDARIAS = {
  GOL: [], ZAG: ['VOL', 'LD', 'LE'], LD: ['LE', 'VOL', 'PD'], LE: ['LD', 'VOL', 'PE'],
  VOL: ['MC', 'ZAG'], MC: ['VOL', 'MEI'], MEI: ['MC', 'SA', 'PD'],
  PD: ['PE', 'SA', 'MEI'], PE: ['PD', 'SA', 'MEI'], CA: ['SA', 'MEI'],
};

const NOMES = [
  'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'João', 'Pedro', 'Vinícius',
  'Wesley', 'Diego', 'Rodrigo', 'Felipe', 'Guilherme', 'Leandro', 'Thiago', 'Caio',
  'Marcelo', 'Anderson', 'Éverton', 'Renan', 'Kayky', 'Ryan', 'Igor', 'Alan',
  'Vitor', 'Danilo', 'Fábio', 'Jhon', 'Willian', 'Carlos', 'Douglas', 'Robson',
  'Nathan', 'Yuri', 'Emerson', 'Paulinho', 'Juninho', 'Cauã', 'Luan', 'Erick',
];
const SOBRENOMES = [
  'Silva', 'Santos', 'Souza', 'Oliveira', 'Costa', 'Pereira', 'Lima', 'Ferreira',
  'Alves', 'Ribeiro', 'Gomes', 'Martins', 'Rocha', 'Barbosa', 'Araújo', 'Nunes',
  'Cardoso', 'Teixeira', 'Moreira', 'Cavalcante', 'Freitas', 'Vieira', 'Pinto', 'Melo',
  'Batista', 'Correia', 'Dias', 'Nascimento', 'Andrade', 'Machado', 'Fonseca', 'Ramos',
];
const PERNAS = ['D', 'D', 'D', 'D', 'E', 'E', 'Ambidestro'];

// ---- 64 clubes (slug de escudo, nome, sigla, cidade, estado) ----
const CLUBES = [
  // NORTE
  ['tocantinopolis', 'Tocantinópolis EC', 'TOC', 'Tocantinópolis', 'TO'],
  ['araguaina', 'Araguaína FC', 'ARG', 'Araguaína', 'TO'],
  ['trem', 'Trem DC', 'TRM', 'Macapá', 'AP'],
  ['aguia_de_maraba', 'Águia de Marabá', 'AGU', 'Marabá', 'PA'],
  ['manaus', 'Manaus FC', 'MAN', 'Manaus', 'AM'],
  ['manauara', 'Manauara EC', 'MNA', 'Manaus', 'AM'],
  ['nacional_am', 'Nacional-AM', 'NAM', 'Manaus', 'AM'],
  ['sao_raimundo_rr', 'São Raimundo-RR', 'SRR', 'Boa Vista', 'RR'],
  ['porto_velho', 'Porto Velho EC', 'PVE', 'Porto Velho', 'RO'],
  ['galvez', 'Galvez EC', 'GLV', 'Rio Branco', 'AC'],
  ['gremio_atletico_sampaio', 'Grêmio Atlético Sampaio', 'GAS', 'Boa Vista', 'RR'],
  ['monte_roraima', 'Monte Roraima SC', 'MTR', 'Boa Vista', 'RR'],
  ['guapore', 'Guaporé FC', 'GPR', 'Rolim de Moura', 'RO'],
  ['humaita_ac', 'Humaitá', 'HUM', 'Porto Acre', 'AC'],
  ['independencia_ac', 'Independência-AC', 'IND', 'Rio Branco', 'AC'],
  ['oratorio', 'Oratório EC', 'ORA', 'Santana', 'AP'],
  ['tuna_luso', 'Tuna Luso', 'TUN', 'Belém', 'PA'],
  // NORDESTE
  ['abc', 'ABC FC', 'ABC', 'Natal', 'RN'],
  ['america_rn', 'América-RN', 'AMN', 'Natal', 'RN'],
  ['asa', 'ASA', 'ASA', 'Arapiraca', 'AL'],
  ['csa', 'CSA', 'CSA', 'Maceió', 'AL'],
  ['ferroviario_ce', 'Ferroviário AC', 'FER', 'Fortaleza', 'CE'],
  ['atletico_cearense', 'Atlético Cearense', 'ATC', 'Fortaleza', 'CE'],
  ['iguatu', 'Iguatu EC', 'IGU', 'Iguatu', 'CE'],
  ['maracana', 'Maracanã EC', 'MCN', 'Maracanaú', 'CE'],
  ['jacuipense', 'Jacuipense', 'JAC', 'Riachão do Jacuípe', 'BA'],
  ['juazeirense', 'Juazeirense', 'JUA', 'Juazeiro', 'BA'],
  ['atletico_de_alagoinhas', 'Atlético de Alagoinhas', 'ATA', 'Alagoinhas', 'BA'],
  ['lagarto', 'Lagarto FC', 'LAG', 'Lagarto', 'SE'],
  ['sergipe', 'Sergipe', 'SER', 'Aracaju', 'SE'],
  ['sousa', 'Sousa EC', 'SOU', 'Sousa', 'PB'],
  ['treze', 'Treze FC', 'TRE', 'Campina Grande', 'PB'],
  ['central_pe', 'Central SC', 'CEN', 'Caruaru', 'PE'],
  ['retro', 'Retrô FC', 'RET', 'Camaragibe', 'PE'],
  ['iape', 'IAPE', 'IAP', 'São Luís', 'MA'],
  ['moto_club_sao_luis', 'Moto Club', 'MOT', 'São Luís', 'MA'],
  ['parnahyba', 'Parnahyba SC', 'PNH', 'Parnaíba', 'PI'],
  ['altos', 'Altos EC', 'ALT', 'Altos', 'PI'],
  ['fluminense_pi', 'Fluminense-PI', 'FLP', 'Teresina', 'PI'],
  ['piaui', 'Piauí EC', 'PIA', 'Teresina', 'PI'],
  ['imperatriz', 'Imperatriz', 'IMP', 'Imperatriz', 'MA'],
  ['sampaio_correa', 'Sampaio Corrêa', 'SAM', 'São Luís', 'MA'],
  ['decisao', 'Decisão FC', 'DEC', 'Granjeiro', 'CE'],
  ['cse', 'CSE', 'CSE', 'Palmeira dos Índios', 'AL'],
  ['maguary_pe', 'Maguary EC', 'MGY', 'Recife', 'PE'],
  ['porto_ba', 'Porto', 'PBA', 'Porto Seguro', 'BA'],
  ['serra_branca', 'Serra Branca', 'SBR', 'Serra Branca', 'PB'],
  ['laguna_rn', 'Laguna EC', 'LGN', 'Ceará-Mirim', 'RN'],
  ['tirol', 'Tirol EC', 'TIR', 'Natal', 'RN'],
  // CENTRO-OESTE
  ['gama', 'Gama FC', 'GAM', 'Brasília', 'DF'],
  ['brasiliense', 'Brasiliense FC', 'BRA', 'Brasília', 'DF'],
  ['ceilandia', 'Ceilândia EC', 'CEI', 'Brasília', 'DF'],
  ['crac', 'CRAC', 'CRA', 'Catalão', 'GO'],
  ['aparecidense', 'Aparecidense', 'APA', 'Aparecida de Goiânia', 'GO'],
  ['luverdense', 'Luverdense', 'LUV', 'Lucas do Rio Verde', 'MT'],
  ['mixto', 'Mixto EC', 'MIX', 'Cuiabá', 'MT'],
  ['operario_ms', 'Operário-MS', 'OMS', 'Campo Grande', 'MS'],
  ['capital_cf', 'Capital CF', 'CAP', 'Brasília', 'DF'],
  ['abecat_ouvidorense', 'Ouvidorense', 'OUV', 'Ouvidor', 'GO'],
  ['goiatuba', 'Goiatuba EC', 'GTB', 'Goiatuba', 'GO'],
  ['inhumas', 'Inhumas EC', 'INH', 'Inhumas', 'GO'],
  ['ivinhema', 'Ivinhema FC', 'IVI', 'Ivinhema', 'MS'],
  ['uniao_rondonopolis', 'União-MT', 'URO', 'Rondonópolis', 'MT'],
  ['varzea_grande', 'Várzea Grande', 'VGR', 'Várzea Grande', 'MT'],
  // SUDESTE
  ['rio_branco_es', 'Rio Branco-ES', 'RBE', 'Cariacica', 'ES'],
  ['real_noroeste', 'Real Noroeste', 'RNO', 'Águia Branca', 'ES'],
  ['vitoria_es', 'Vitória-ES', 'VES', 'Vitória', 'ES'],
  ['nova_iguacu', 'Nova Iguaçu FC', 'NIG', 'Nova Iguaçu', 'RJ'],
  ['portuguesa_rj', 'Portuguesa-RJ', 'PRJ', 'Rio de Janeiro', 'RJ'],
  ['america_rj', 'América-RJ', 'AMR', 'Rio de Janeiro', 'RJ'],
  ['madureira', 'Madureira EC', 'MAD', 'Rio de Janeiro', 'RJ'],
  ['marica', 'Maricá FC', 'MRC', 'Maricá', 'RJ'],
  ['portuguesa', 'Portuguesa', 'LUS', 'São Paulo', 'SP'],
  ['agua_santa', 'Água Santa', 'AGS', 'Diadema', 'SP'],
  ['velo_clube', 'Velo Clube', 'VEL', 'Rio Claro', 'SP'],
  ['noroeste', 'Noroeste', 'NOR', 'Bauru', 'SP'],
  ['xv_de_piracicaba', 'XV de Piracicaba', 'XVP', 'Piracicaba', 'SP'],
  ['tombense', 'Tombense FC', 'TOM', 'Tombos', 'MG'],
  ['pouso_alegre', 'Pouso Alegre FC', 'POA', 'Pouso Alegre', 'MG'],
  ['uberlandia', 'Uberlândia EC', 'UBE', 'Uberlândia', 'MG'],
  ['betim', 'Betim', 'BET', 'Betim', 'MG'],
  ['democrata_gv', 'Democrata-GV', 'DGV', 'Governador Valadares', 'MG'],
  ['primavera', 'Primavera', 'PRI', 'Indaiatuba', 'SP'],
  ['sampaio_correa_rj', 'Sampaio Corrêa-RJ', 'SCR', 'Saquarema', 'RJ'],
  // SUL
  ['brasil_de_pelotas', 'Brasil de Pelotas', 'BRP', 'Pelotas', 'RS'],
  ['sao_jose_rs', 'São José-RS', 'SJR', 'Porto Alegre', 'RS'],
  ['guarany_de_bage', 'Guarany de Bagé', 'GBA', 'Bagé', 'RS'],
  ['sao_luiz', 'São Luiz FC', 'SLZ', 'Ijuí', 'RS'],
  ['joinville', 'Joinville EC', 'JOI', 'Joinville', 'SC'],
  ['marcilio_dias', 'Marcílio Dias', 'MDI', 'Itajaí', 'SC'],
  ['blumenau', 'Blumenau EC', 'BLU', 'Blumenau', 'SC'],
  ['sao_joseense', 'São Joseense', 'SJO', 'São José dos Pinhais', 'PR'],
  ['cianorte', 'Cianorte FC', 'CIA', 'Cianorte', 'PR'],
  ['fc_cascavel', 'FC Cascavel', 'CAS', 'Cascavel', 'PR'],
  ['azuriz', 'Azuriz FC', 'AZU', 'Pato Branco', 'PR'],
  ['santa_catarina', 'Santa Catarina', 'SCC', 'Florianópolis', 'SC'],
];

if (CLUBES.length !== 96) {
  console.error(`Esperado 96 clubes, obtido ${CLUBES.length}`);
  process.exit(1);
}

function gerarAtributos(rng, posicao, base) {
  const grupo = GRUPO[posicao];
  const fortes = new Set(FORTES[grupo]);
  const attrs = {};
  for (const a of ATRIBUTOS) {
    if (a === 'reflexos') {
      // Reflexo só importa p/ goleiro; fora do gol fica baixo (evita "GOL improvisado").
      attrs[a] = grupo === 'GOL' ? clamp(base + inteiro(rng, -3, 8), 20, 80) : inteiro(rng, 15, 40);
    } else if (grupo === 'GOL' && a !== 'posicionamento') {
      attrs[a] = inteiro(rng, 25, 48);
    } else if (fortes.has(a)) {
      attrs[a] = clamp(base + inteiro(rng, -4, 8), 20, 80);
    } else {
      attrs[a] = clamp(base - inteiro(rng, 6, 20), 15, 72);
    }
  }
  return attrs;
}

const clubesSaida = [];
const wiringJogImports = [];
const wiringJogSpreads = [];
const wiringEscudos = [];
const todosOveralls = [];

CLUBES.forEach(([slug, nome, sigla, cidade, estado], idx) => {
  const clubeId = `club_serie_d_${slug}`;
  const rng = criarRNGComSeed(hashString(clubeId));
  const numClube = String(idx + 1).padStart(2, '0');
  // Tier do clube: base 47-53 (alguns clubes um pouco melhores).
  const baseClube = inteiro(rng, 47, 53);

  const elencoIds = [];
  const jogadores = TEMPLATE.map((posicao, i) => {
    const playerId = `player_sd_${numClube}_${String(i + 1).padStart(3, '0')}`;
    elencoIds.push(playerId);
    // Variação do jogador em torno da base do clube (titular vs reserva).
    const base = clamp(baseClube + inteiro(rng, -6, 7), 40, 62);
    const atributos = gerarAtributos(rng, posicao, base);
    const overall = calcularOverall(atributos, posicao);
    todosOveralls.push(overall);
    const idade = inteiro(rng, 18, 35);
    const bonusPot = idade <= 21 ? inteiro(rng, 3, 9) : idade <= 25 ? inteiro(rng, 1, 5) : 0;
    const nome2 = `${escolher(rng, NOMES)} ${escolher(rng, SOBRENOMES)}`;
    const anoContrato = 2026 + inteiro(rng, 1, 3);
    return {
      id: playerId,
      nome: nome2,
      idade,
      nacionalidade: 'Brazil',
      posicaoPrincipal: posicao,
      posicoesSecundarias: rng() < 0.55 && SECUNDARIAS[posicao].length
        ? [escolher(rng, SECUNDARIAS[posicao])]
        : [],
      pernaDominante: escolher(rng, PERNAS),
      atributos,
      overall,
      potencial: clamp(overall + bonusPot, overall, 78),
      condicaoFisica: 100,
      moral: inteiro(rng, 60, 80),
      forma: 0,
      valorMercado: Math.round(clamp((overall - 40) * 12000 + inteiro(rng, 0, 40000), 20000, 900000) / 1000) * 1000,
      salario: Math.round(clamp((overall - 40) * 700 + inteiro(rng, 0, 2000), 3000, 60000) / 100) * 100,
      contratoAte: `${anoContrato}-12-31`,
      clubeId,
      lesionado: false,
      diasLesao: 0,
      suspenso: false,
      jogosSuspensao: 0,
      estatisticasTemporada: {
        temporada: '2026', jogos: 0, gols: 0, assistencias: 0,
        cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 0,
      },
      historicoTemporadas: [],
    };
  });

  writeFileSync(
    resolve(DIR_JOGADORES, `serie_d_${slug}.json`),
    JSON.stringify(jogadores, null, 2) + '\n',
  );

  clubesSaida.push({
    id: clubeId,
    nome,
    sigla,
    cidade,
    estado,
    fundacao: null,
    elenco: elencoIds,
    formacaoAtual: null,
    taticaAtual: null,
    financas: {
      saldo: inteiro(rng, 400, 1000) * 1000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {
      nome: `Estádio ${cidade}`,
      capacidade: inteiro(rng, 3, 12) * 1000,
      precoMedioIngresso: inteiro(rng, 15, 25),
      nivelInfraestrutura: 1,
    },
    reputacao: inteiro(rng, 50, 60),
    controladoPorIA: true,
    pais: 'Brasil',
    campeonato: 'Brasileirão',
    divisao: 'Série D',
  });

  // snippets de wiring
  const camel = slug.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  wiringJogImports.push(`import sd${camel[0].toUpperCase()}${camel.slice(1)} from './serie_d_${slug}.json';`);
  wiringJogSpreads.push(`  ...(sd${camel[0].toUpperCase()}${camel.slice(1)} as Player[]),`);
  wiringEscudos.push(`  ${clubeId}: require('./serie-d/${clubeId}.png'),`);
});

writeFileSync(
  resolve(DIR_CLUBES, 'serie-d.json'),
  JSON.stringify(clubesSaida, null, 2) + '\n',
);

// snippets p/ colar nos index.ts
const SP = process.env.SCRATCH || '/private/tmp';
const wiring = [
  '=== jogadores/index.ts — imports (após Série C) ===',
  '// Brasileirão Série D',
  ...wiringJogImports,
  '',
  '=== jogadores/index.ts — spreads (após Série C, antes do ]) ===',
  '  // Série D',
  ...wiringJogSpreads,
  '',
  '=== escudos/index.ts — entradas ESCUDOS (após Série C) ===',
  '  // Série D',
  ...wiringEscudos,
].join('\n');
writeFileSync(resolve(SP, 'seried_wiring.txt'), wiring + '\n');

// relatório
const overalls = [...todosOveralls].sort((a, b) => a - b);
console.log(`Clubes: ${clubesSaida.length} | jogadores: ${overalls.length}`);
console.log(`Overall — min ${overalls[0]} | mediana ${overalls[Math.floor(overalls.length / 2)]} | max ${overalls[overalls.length - 1]}`);
console.log(`Wiring salvo em ${resolve(SP, 'seried_wiring.txt')}`);
