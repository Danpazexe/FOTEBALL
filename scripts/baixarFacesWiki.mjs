/**
 * Baixa fotos de jogador da WIKIPEDIA (pt) / Wikimedia Commons e gera o índice
 * estático de faces. Fonte GRATUITA, sem API key, imagens em geral sob licença
 * livre (CC BY-SA) — bem mais limpa que fotos de agência.
 *
 * USO
 *   node scripts/baixarFacesWiki.mjs               # todos os jogadores do seed
 *   node scripts/baixarFacesWiki.mjs --limite 40   # testa com 40
 *   node scripts/baixarFacesWiki.mjs --somente-indice
 *
 * SEGURANÇA DE CASAMENTO: só aceita a foto se o TÍTULO da página da Wikipedia
 * casar com o nome do jogador (todos os tokens do nome presentes no título) —
 * assim evita baixar a foto de outra pessoa de nome parecido. Sem match seguro,
 * cai no fallback de iniciais (nada quebra). Resumível (pula quem já tem foto).
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

const WIKI = 'https://pt.wikipedia.org/w/api.php';
const UA =
  'FOTEBALL-faces/1.0 (jogo offline de gestao; github.com/Danpazexe/FOTEBALL)';

const ARGS = process.argv.slice(2);
const SOMENTE_INDICE = ARGS.includes('--somente-indice');
const LIMITE = (() => {
  const i = ARGS.indexOf('--limite');
  return i >= 0 ? Number(ARGS[i + 1]) : Infinity;
})();
const EXTS = ['.jpg', '.jpeg', '.png'];

const dormir = ms => new Promise(r => setTimeout(r, ms));

/** Normaliza para comparação (sem acento, minúsculo, só letras/espaço). */
function normalizar(t) {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Título da página casa com o nome do jogador? (todos os tokens ≥3 presentes) */
function nomeCasa(nome, titulo) {
  const tituloLimpo = normalizar(titulo.replace(/\(.*?\)/g, ' '));
  const tokensTitulo = new Set(tituloLimpo.split(' '));
  const tokensNome = normalizar(nome)
    .split(' ')
    .filter(t => t.length >= 3);
  if (tokensNome.length === 0) {
    return false;
  }
  return tokensNome.every(t => tokensTitulo.has(t));
}

async function fetchRetry(url, opts = {}, tentativas = 4) {
  for (let i = 0; i < tentativas; i += 1) {
    const r = await fetch(url, {headers: {'User-Agent': UA}, ...opts});
    if (r.ok) {
      return r;
    }
    if (r.status === 429 || r.status >= 500) {
      await dormir(1500 * 2 ** i); // 1.5s, 3s, 6s, 12s
      continue;
    }
    throw new Error(`http ${r.status}`);
  }
  throw new Error('esgotou tentativas (429)');
}

async function lerJogadores() {
  const arquivos = (await fs.readdir(DIR_JOGADORES)).filter(f =>
    f.endsWith('.json'),
  );
  const jogadores = [];
  for (const arquivo of arquivos) {
    const lista = JSON.parse(
      await fs.readFile(path.join(DIR_JOGADORES, arquivo), 'utf8'),
    );
    for (const j of lista) {
      if (j?.id && j?.nome) {
        jogadores.push({id: j.id, nome: j.nome});
      }
    }
  }
  return jogadores;
}

async function arquivoExistente(id) {
  for (const ext of EXTS) {
    try {
      await fs.access(path.join(DIR_FACES, `${id}${ext}`));
      return true;
    } catch {
      // continua
    }
  }
  return false;
}

/** Foto + título da página mais relevante que CASA com o nome. */
async function fotoDoJogador(nome) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${nome} futebolista`,
    gsrlimit: '5',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '256',
  });
  const r = await fetchRetry(`${WIKI}?${params}`);
  const d = await r.json();
  const pages = (d?.query?.pages ?? [])
    .filter(p => p?.thumbnail?.source && p?.title)
    .sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const escolhida = pages.find(p => nomeCasa(nome, p.title));
  return escolhida
    ? {url: escolhida.thumbnail.source, titulo: escolhida.title}
    : null;
}

async function baixar(url, id) {
  const r = await fetchRetry(url);
  let ext = path.extname(new URL(url).pathname).toLowerCase();
  if (!EXTS.includes(ext)) {
    ext = '.jpg';
  }
  await fs.writeFile(
    path.join(DIR_FACES, `${id}${ext}`),
    Buffer.from(await r.arrayBuffer()),
  );
}

async function gerarIndice() {
  await fs.mkdir(DIR_FACES, {recursive: true});
  const arquivos = (await fs.readdir(DIR_FACES))
    .filter(f => EXTS.includes(path.extname(f).toLowerCase()))
    .sort();
  const linhas = arquivos.map(f => {
    const id = f.replace(/\.[^.]+$/, '');
    return `  ${JSON.stringify(id)}: require('../assets/faces/${f}'),`;
  });
  const conteudo = `/**
 * Índice ESTÁTICO de faces de jogador — AUTO-GERADO por scripts/baixarFacesWiki.mjs.
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
  console.log(`Índice: ${arquivos.length} faces → ${ARQ_INDICE}`);
}

async function main() {
  if (SOMENTE_INDICE) {
    await gerarIndice();
    return;
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
    if (await arquivoExistente(jogador.id)) {
      continue;
    }
    processados += 1;
    try {
      const foto = await fotoDoJogador(jogador.nome);
      if (!foto) {
        pendentes.push({id: jogador.id, nome: jogador.nome, motivo: 'sem match seguro'});
      } else {
        await baixar(foto.url, jogador.id);
        baixadas += 1;
        console.log(`✓ ${jogador.nome} → ${foto.titulo}`);
      }
    } catch (erro) {
      pendentes.push({id: jogador.id, nome: jogador.nome, motivo: String(erro)});
      console.log(`! ${jogador.nome}: ${erro}`);
    }
    await dormir(2500); // gentil com a Wikipedia (evita 429)
  }

  await fs.writeFile(ARQ_PENDENTES, JSON.stringify(pendentes, null, 2));
  await gerarIndice();
  console.log(
    `\nConcluído: ${baixadas} baixadas, ${pendentes.length} pendentes (${ARQ_PENDENTES}).`,
  );
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
