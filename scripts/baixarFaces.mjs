/**
 * Baixa fotos de jogador da API-Football e gera o índice estático de faces.
 *
 * PRÉ-REQUISITOS
 *   - Node 18+ (usa fetch global).
 *   - Sua chave da API-Football (api-sports.io) na env APIFOOTBALL_KEY.
 *
 * USO
 *   APIFOOTBALL_KEY=xxxx node scripts/baixarFaces.mjs            # todos
 *   APIFOOTBALL_KEY=xxxx node scripts/baixarFaces.mjs --limite 20  # teste
 *   node scripts/baixarFaces.mjs --somente-indice                 # só regera o índice
 *
 * O QUE FAZ
 *   1. Lê os jogadores de src/data/seed/jogadores/*.json.
 *   2. Para cada um SEM foto ainda, busca na API-Football por nome (Brasil) e
 *      baixa a melhor correspondência para src/assets/faces/<id>.png.
 *   3. Regenera src/data/facesIndex.ts com um require() por foto baixada.
 *
 * NOTAS
 *   - Resumível: pula quem já tem foto (não gasta requisição à toa — a API
 *     gratuita limita ~100/dia). Rode várias vezes até completar.
 *   - Determinístico o suficiente: escolhe o match por maior similaridade de nome
 *     + nacionalidade Brasil; casos duvidosos vão para faces_pendentes.json.
 *   - LICENÇA/OFFLINE: rodar isto baixa imagens de terceiros e as empacota no app.
 *     Habilitado sob autorização explícita do dono (ver README_FACES.md).
 */
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');
const DIR_JOGADORES = path.join(RAIZ, 'src/data/seed/jogadores');
const DIR_FACES = path.join(RAIZ, 'src/assets/faces');
const ARQ_INDICE = path.join(RAIZ, 'src/data/facesIndex.ts');
const ARQ_PENDENTES = path.join(RAIZ, 'scripts/faces_pendentes.json');

const API_BASE = 'https://v3.football.api-sports.io';
const KEY = process.env.APIFOOTBALL_KEY;
const ARGS = process.argv.slice(2);
const SOMENTE_INDICE = ARGS.includes('--somente-indice');
const LIMITE = (() => {
  const i = ARGS.indexOf('--limite');
  return i >= 0 ? Number(ARGS[i + 1]) : Infinity;
})();

/** Normaliza um nome para comparação (sem acento, minúsculo, só letras/espaços). */
function normalizar(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim();
}

/** Similaridade simples: fração de tokens do nome do jogo presentes no nome da API. */
function similaridade(nomeJogo, nomeApi) {
  const a = new Set(normalizar(nomeJogo).split(/\s+/).filter(Boolean));
  const b = new Set(normalizar(nomeApi).split(/\s+/).filter(Boolean));
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let comuns = 0;
  for (const t of a) {
    if (b.has(t)) {
      comuns += 1;
    }
  }
  return comuns / a.size;
}

async function lerJogadores() {
  const arquivos = (await fs.readdir(DIR_JOGADORES)).filter(f =>
    f.endsWith('.json'),
  );
  const jogadores = [];
  for (const arquivo of arquivos) {
    const bruto = await fs.readFile(path.join(DIR_JOGADORES, arquivo), 'utf8');
    const lista = JSON.parse(bruto);
    for (const j of lista) {
      if (j?.id && j?.nome) {
        jogadores.push({id: j.id, nome: j.nome});
      }
    }
  }
  return jogadores;
}

async function jaTemFoto(id) {
  try {
    await fs.access(path.join(DIR_FACES, `${id}.png`));
    return true;
  } catch {
    return false;
  }
}

async function buscarNaApi(nome) {
  const busca = encodeURIComponent(normalizar(nome).split(/\s+/).pop() ?? nome);
  const url = `${API_BASE}/players/profiles?search=${busca}`;
  const resp = await fetch(url, {headers: {'x-apisports-key': KEY}});
  if (!resp.ok) {
    throw new Error(`API ${resp.status} ${resp.statusText}`);
  }
  const dados = await resp.json();
  return Array.isArray(dados.response) ? dados.response : [];
}

/** Escolhe o melhor candidato por similaridade de nome (limiar 0.5). */
function melhorCandidato(nome, candidatos) {
  let melhor = null;
  let melhorScore = 0.5;
  for (const c of candidatos) {
    const p = c.player ?? c;
    const nomeApi = p.name ?? `${p.firstname ?? ''} ${p.lastname ?? ''}`;
    const score = similaridade(nome, nomeApi);
    if (score > melhorScore && p.photo) {
      melhorScore = score;
      melhor = p;
    }
  }
  return melhor;
}

async function baixarFoto(url, destino) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`foto ${resp.status}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(destino, buffer);
}

async function gerarIndice() {
  await fs.mkdir(DIR_FACES, {recursive: true});
  const arquivos = (await fs.readdir(DIR_FACES))
    .filter(f => f.endsWith('.png'))
    .sort();
  const linhas = arquivos.map(f => {
    const id = f.replace(/\.png$/, '');
    return `  ${JSON.stringify(id)}: require('../assets/faces/${f}'),`;
  });
  const conteudo = `/**
 * Índice ESTÁTICO de faces de jogador — AUTO-GERADO por scripts/baixarFaces.mjs.
 * NÃO edite à mão. Ver README_FACES.md.
 */

// prettier-ignore
export const FACES: Record<string, number> = {
${linhas.join('\n')}
};

/** true se há foto real empacotada para este jogador. */
export function temFace(jogadorId: string): boolean {
  return Object.prototype.hasOwnProperty.call(FACES, jogadorId);
}
`;
  await fs.writeFile(ARQ_INDICE, conteudo);
  console.log(`Índice regenerado: ${arquivos.length} faces em ${ARQ_INDICE}`);
}

async function main() {
  if (SOMENTE_INDICE) {
    await gerarIndice();
    return;
  }
  if (!KEY) {
    console.error(
      'Faltou APIFOOTBALL_KEY. Ex.: APIFOOTBALL_KEY=xxxx node scripts/baixarFaces.mjs',
    );
    process.exit(1);
  }
  await fs.mkdir(DIR_FACES, {recursive: true});

  const jogadores = await lerJogadores();
  const pendentes = [];
  let baixadas = 0;
  let processados = 0;

  for (const jogador of jogadores) {
    if (processados >= LIMITE) {
      break;
    }
    if (await jaTemFoto(jogador.id)) {
      continue;
    }
    processados += 1;
    try {
      const candidatos = await buscarNaApi(jogador.nome);
      const match = melhorCandidato(jogador.nome, candidatos);
      if (!match) {
        pendentes.push({id: jogador.id, nome: jogador.nome, motivo: 'sem match'});
        console.log(`— ${jogador.nome}: sem correspondência`);
        continue;
      }
      await baixarFoto(match.photo, path.join(DIR_FACES, `${jogador.id}.png`));
      baixadas += 1;
      console.log(`✓ ${jogador.nome} → ${match.name}`);
    } catch (erro) {
      pendentes.push({id: jogador.id, nome: jogador.nome, motivo: String(erro)});
      console.log(`! ${jogador.nome}: ${erro}`);
    }
    // Respeita o rate limit da API gratuita.
    await new Promise(r => setTimeout(r, 300));
  }

  await fs.writeFile(ARQ_PENDENTES, JSON.stringify(pendentes, null, 2));
  await gerarIndice();
  console.log(
    `\nConcluído: ${baixadas} baixadas, ${pendentes.length} pendentes (ver ${ARQ_PENDENTES}).`,
  );
}

main().catch(erro => {
  console.error(erro);
  process.exit(1);
});
