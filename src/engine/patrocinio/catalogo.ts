/**
 * Catálogo dos 36 patrocinadores (marcas fictícias/paródicas). A ordem espelha
 * a prancha 6×6 (linha a linha, esquerda→direita) e os `id` batem com as chaves
 * do mapa de logos (`src/assets/patrocinadores`) e com os arquivos NN-<id>.png.
 *
 * Aviso: nomes fictícios. Antes de lançamento comercial, validar juridicamente
 * ou substituir por marcas totalmente autorais.
 */
import type {AlcancePatrocinador, Patrocinador} from '../../types/patrocinio';

const R: AlcancePatrocinador = 'REGIONAL';
const N: AlcancePatrocinador = 'NACIONAL';
const G: AlcancePatrocinador = 'GLOBAL';

export const CATALOGO_PATROCINADORES: readonly Patrocinador[] = [
  {id: 'colacoca', nome: 'COLACOCA', categoria: 'Bebidas', alcance: G, ativo: true},
  {id: 'keni', nome: 'KENI', categoria: 'Material esportivo', alcance: G, ativo: true},
  {id: 'dibas', nome: 'DIBAS', categoria: 'Material esportivo', alcance: G, ativo: true},
  {id: 'pulma', nome: 'PULMA', categoria: 'Performance', alcance: G, ativo: true},
  {id: 'pipsy', nome: 'PIPSY', categoria: 'Refrigerantes', alcance: G, ativo: true},
  {id: 'amazoom', nome: 'AMAZOOM', categoria: 'Comércio digital', alcance: G, ativo: true},
  {id: 'perabyte', nome: 'PERABYTE', categoria: 'Tecnologia', alcance: N, ativo: true},
  {id: 'sunsam', nome: 'SUNSAM', categoria: 'Eletrônicos', alcance: N, ativo: true},
  {id: 'mc_dino', nome: 'MC DINO', categoria: 'Alimentação', alcance: R, ativo: true},
  {id: 'red_bison', nome: 'RED BISON', categoria: 'Energético', alcance: N, ativo: true},
  {id: 'upper', nome: 'UPPER', categoria: 'Mobilidade', alcance: R, ativo: true},
  {id: 'spotwave', nome: 'SPOTWAVE', categoria: 'Streaming', alcance: R, ativo: true},
  {id: 'nubrix', nome: 'NUBRIX', categoria: 'Banco digital', alcance: G, ativo: true},
  {id: 'itauno', nome: 'ITAUNO', categoria: 'Banco', alcance: N, ativo: true},
  {id: 'bradix', nome: 'BRADIX', categoria: 'Banco', alcance: N, ativo: true},
  {id: 'vivaon', nome: 'VIVAON', categoria: 'Telecomunicações', alcance: N, ativo: true},
  {id: 'tin', nome: 'TIN', categoria: 'Telecomunicações', alcance: R, ativo: true},
  {id: 'claru', nome: 'CLARU', categoria: 'Telecomunicações', alcance: R, ativo: true},
  {id: 'fati', nome: 'FATI', categoria: 'Automotivo', alcance: R, ativo: true},
  {id: 'voltz', nome: 'VOLTZ', categoria: 'Energia/mobilidade', alcance: R, ativo: true},
  {id: 'tayota', nome: 'TAYOTA', categoria: 'Automotivo', alcance: N, ativo: true},
  {id: 'vrolet', nome: 'VROLET', categoria: 'Automotivo', alcance: N, ativo: true},
  {id: 'brama', nome: 'BRAMA', categoria: 'Bebidas', alcance: R, ativo: true},
  {id: 'heniken', nome: 'HENIKEN', categoria: 'Bebidas', alcance: N, ativo: true},
  {id: 'amveb', nome: 'AMVEB', categoria: 'Bebidas', alcance: N, ativo: true},
  {id: 'gatora', nome: 'GATORA', categoria: 'Bebida esportiva', alcance: R, ativo: true},
  {id: 'netflex', nome: 'NETFLEX', categoria: 'Streaming', alcance: G, ativo: true},
  {id: 'youlive', nome: 'YOULIVE', categoria: 'Vídeos', alcance: N, ativo: true},
  {id: 'toktic', nome: 'TOKTIC', categoria: 'Rede social', alcance: R, ativo: true},
  {id: 'instaplay', nome: 'INSTAPLAY', categoria: 'Entretenimento', alcance: N, ativo: true},
  {id: 'gugol', nome: 'GUGOL', categoria: 'Tecnologia', alcance: G, ativo: true},
  {id: 'microsys', nome: 'MICROSYS', categoria: 'Software', alcance: G, ativo: true},
  {id: 'viza', nome: 'VIZA', categoria: 'Pagamentos', alcance: G, ativo: true},
  {id: 'mastercash', nome: 'MASTERCASH', categoria: 'Pagamentos', alcance: G, ativo: true},
  {id: 'mercado_vivo', nome: 'MERCADO VIVO', categoria: 'Comércio digital', alcance: R, ativo: true},
  {id: 'shopix', nome: 'SHOPIX', categoria: 'Comércio digital', alcance: G, ativo: true},
];

const PATROCINADORES_POR_ID = new Map(
  CATALOGO_PATROCINADORES.map(p => [p.id, p]),
);

export function patrocinadorPorId(id: string): Patrocinador | undefined {
  return PATROCINADORES_POR_ID.get(id);
}

export function nomePatrocinador(id: string): string {
  return PATROCINADORES_POR_ID.get(id)?.nome ?? id.toUpperCase();
}
