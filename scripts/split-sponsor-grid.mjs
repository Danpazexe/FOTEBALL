/**
 * split-sponsor-grid.mjs — recorta a prancha 6×6 de patrocinadores em 36 PNGs.
 *
 * FERRAMENTA DE DESENVOLVIMENTO — nunca roda no runtime Android/iOS.
 * Zero dependências: usa só `node:fs`, `node:zlib`, `node:path` (sem sharp,
 * sem ImageMagick), para não adicionar nada ao projeto (CLAUDE.md).
 *
 * Uso:
 *   node scripts/split-sponsor-grid.mjs [caminho-da-prancha]
 * Padrão: image.png na raiz do repositório.
 *
 * Espera PNG 1254×1254, 8 bits, RGB (tipo 2) ou RGBA (tipo 6), não-entrelaçado.
 * Os logos NÃO estão alinhados a uma grade rígida de 209px (há margem externa e
 * deslocamento por causa dos rótulos), então o script DETECTA a caixa de tinta
 * (não-branco) de cada célula e recorta um tile quadrado CENTRALIZADO nela —
 * assim cada logo fica no meio do PNG. Fundo branco preservado.
 * Falha com mensagem clara se a dimensão/formato divergir.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {deflateSync, inflateSync} from 'node:zlib';

// Rodar sempre da raiz do repositório: node scripts/split-sponsor-grid.mjs
const RAIZ = process.cwd();
const DESTINO = join(RAIZ, 'src/assets/patrocinadores');

const GRID = 6;
const LADO = 1254;
const TILE = 200; // lado do PNG de saída (centralizado no logo)
const LIMIAR_BRANCO = 235; // acima disso em R,G,B => considerado fundo branco

// Ordem exata do catálogo (linha a linha, esquerda→direita) — ver
// src/engine/patrocinio/catalogo.ts.
const IDS = [
  'colacoca', 'keni', 'dibas', 'pulma', 'pipsy', 'amazoom',
  'perabyte', 'sunsam', 'mc_dino', 'red_bison', 'upper', 'spotwave',
  'nubrix', 'itauno', 'bradix', 'vivaon', 'tin', 'claru',
  'fati', 'voltz', 'tayota', 'vrolet', 'brama', 'heniken',
  'amveb', 'gatora', 'netflex', 'youlive', 'toktic', 'instaplay',
  'gugol', 'microsys', 'viza', 'mastercash', 'mercado_vivo', 'shopix',
];

const ASSINATURA_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabela[n] = c >>> 0;
  }
  return tabela;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = TABELA_CRC[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function lerChunks(buffer) {
  if (!buffer.subarray(0, 8).equals(ASSINATURA_PNG)) {
    throw new Error('Arquivo não é um PNG válido (assinatura ausente).');
  }
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    const tamanho = buffer.readUInt32BE(offset);
    const tipo = buffer.toString('ascii', offset + 4, offset + 8);
    chunks.push({tipo, dados: buffer.subarray(offset + 8, offset + 8 + tamanho)});
    offset += 12 + tamanho;
  }
  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  return pb <= pc ? b : c;
}

function desfiltrar(dados, largura, altura, bpp) {
  const bytesPorLinha = largura * bpp;
  const saida = Buffer.alloc(bytesPorLinha * altura);
  let pos = 0;
  for (let y = 0; y < altura; y += 1) {
    const filtro = dados[pos];
    pos += 1;
    const inicioLinha = y * bytesPorLinha;
    const inicioAnterior = (y - 1) * bytesPorLinha;
    for (let x = 0; x < bytesPorLinha; x += 1) {
      const bruto = dados[pos + x];
      const a = x >= bpp ? saida[inicioLinha + x - bpp] : 0;
      const b = y > 0 ? saida[inicioAnterior + x] : 0;
      const c = y > 0 && x >= bpp ? saida[inicioAnterior + x - bpp] : 0;
      let valor;
      switch (filtro) {
        case 0: valor = bruto; break;
        case 1: valor = bruto + a; break;
        case 2: valor = bruto + b; break;
        case 3: valor = bruto + ((a + b) >> 1); break;
        case 4: valor = bruto + paeth(a, b, c); break;
        default: throw new Error(`Filtro PNG desconhecido: ${filtro}`);
      }
      saida[inicioLinha + x] = valor & 0xff;
    }
    pos += bytesPorLinha;
  }
  return saida;
}

function codificarPNG(pixels, largura, altura, bpp) {
  const tipoCor = bpp === 4 ? 6 : 2;
  const bytesPorLinha = largura * bpp;
  const bruto = Buffer.alloc((bytesPorLinha + 1) * altura);
  for (let y = 0; y < altura; y += 1) {
    bruto[y * (bytesPorLinha + 1)] = 0;
    pixels.copy(
      bruto,
      y * (bytesPorLinha + 1) + 1,
      y * bytesPorLinha,
      (y + 1) * bytesPorLinha,
    );
  }
  const idat = deflateSync(bruto, {level: 9});
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = tipoCor;
  const chunk = (tipo, dados) => {
    const tamanho = Buffer.alloc(4);
    tamanho.writeUInt32BE(dados.length, 0);
    const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(corpo), 0);
    return Buffer.concat([tamanho, corpo, crc]);
  };
  return Buffer.concat([
    ASSINATURA_PNG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Faixas contíguas de um perfil 1D acima do mínimo (largura > 30px). */
function faixas(perfil, minimo) {
  const bandas = [];
  let inicio = -1;
  for (let i = 0; i < perfil.length; i += 1) {
    if (perfil[i] > minimo && inicio < 0) {
      inicio = i;
    } else if (perfil[i] <= minimo && inicio >= 0) {
      bandas.push([inicio, i - 1]);
      inicio = -1;
    }
  }
  if (inicio >= 0) {
    bandas.push([inicio, perfil.length - 1]);
  }
  return bandas.filter(([a, z]) => z - a > 30);
}

function main() {
  const origem = resolve(process.argv[2] ?? join(RAIZ, 'image.png'));
  const chunks = lerChunks(readFileSync(origem));
  const ihdr = chunks.find(c => c.tipo === 'IHDR');
  if (!ihdr) {
    throw new Error('PNG sem IHDR.');
  }
  const largura = ihdr.dados.readUInt32BE(0);
  const altura = ihdr.dados.readUInt32BE(4);
  const bitDepth = ihdr.dados[8];
  const tipoCor = ihdr.dados[9];
  const interlace = ihdr.dados[12];
  if (largura !== LADO || altura !== LADO) {
    throw new Error(`Dimensão inesperada: ${largura}×${altura}. Esperado ${LADO}×${LADO}.`);
  }
  if (bitDepth !== 8 || (tipoCor !== 2 && tipoCor !== 6) || interlace !== 0) {
    throw new Error(
      `Formato não suportado (bitDepth=${bitDepth}, tipoCor=${tipoCor}, interlace=${interlace}).`,
    );
  }
  const bpp = tipoCor === 6 ? 4 : 3;
  const idat = Buffer.concat(chunks.filter(c => c.tipo === 'IDAT').map(c => c.dados));
  const px = desfiltrar(inflateSync(idat), largura, altura, bpp);
  const bpl = largura * bpp;

  const temTinta = (x, y) => {
    const i = y * bpl + x * bpp;
    return px[i] < LIMIAR_BRANCO || px[i + 1] < LIMIAR_BRANCO || px[i + 2] < LIMIAR_BRANCO;
  };

  // Descobre as 6 faixas de linhas e 6 de colunas onde há logos.
  const perfilLinha = new Array(altura).fill(0);
  const perfilColuna = new Array(largura).fill(0);
  for (let y = 0; y < altura; y += 1) {
    for (let x = 0; x < largura; x += 1) {
      if (temTinta(x, y)) {
        perfilLinha[y] += 1;
        perfilColuna[x] += 1;
      }
    }
  }
  const bandasLinha = faixas(perfilLinha, 3);
  const bandasColuna = faixas(perfilColuna, 3);
  if (bandasLinha.length !== GRID || bandasColuna.length !== GRID) {
    throw new Error(
      `Grid não reconhecido: ${bandasLinha.length} linhas × ${bandasColuna.length} colunas (esperado ${GRID}×${GRID}).`,
    );
  }

  const meio = ([a, z]) => Math.round((a + z) / 2);
  const centroClamp = c => Math.max(TILE / 2, Math.min(LADO - TILE / 2, c));

  let gerados = 0;
  for (let linha = 0; linha < GRID; linha += 1) {
    for (let coluna = 0; coluna < GRID; coluna += 1) {
      const indice = linha * GRID + coluna;
      // Centro da célula = cruzamento da faixa de linha × faixa de coluna
      // (bounding box da tinta daquela célula, robusto ao rótulo).
      const cx = centroClamp(meio(bandasColuna[coluna]));
      const cy = centroClamp(meio(bandasLinha[linha]));
      const x0 = Math.round(cx - TILE / 2);
      const y0 = Math.round(cy - TILE / 2);

      const tile = Buffer.alloc(TILE * TILE * bpp);
      for (let y = 0; y < TILE; y += 1) {
        const origemInicio = (y0 + y) * bpl + x0 * bpp;
        px.copy(tile, y * TILE * bpp, origemInicio, origemInicio + TILE * bpp);
      }
      const nome = `${String(indice + 1).padStart(2, '0')}-${IDS[indice]}.png`;
      writeFileSync(join(DESTINO, nome), codificarPNG(tile, TILE, TILE, bpp));
      gerados += 1;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`✅ ${gerados} PNGs (${TILE}×${TILE}) centralizados em src/assets/patrocinadores/`);
}

main();
