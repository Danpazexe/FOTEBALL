/**
 * Mapa ESTÁTICO logo do patrocinador → asset PNG (require).
 *
 * O Metro Bundler não aceita `require()` com caminho dinâmico, então cada logo
 * é referenciado explicitamente. As chaves são os `id` do catálogo
 * (`src/engine/patrocinio/catalogo.ts`). Persistimos só o `id` — nunca o
 * `require`. Os PNGs são gerados por `scripts/split-sponsor-grid.mjs`.
 */
import type {ImageSourcePropType} from 'react-native';

export const logosPatrocinadores: Record<string, ImageSourcePropType> = {
  colacoca: require('./01-colacoca.png'),
  keni: require('./02-keni.png'),
  dibas: require('./03-dibas.png'),
  pulma: require('./04-pulma.png'),
  pipsy: require('./05-pipsy.png'),
  amazoom: require('./06-amazoom.png'),
  perabyte: require('./07-perabyte.png'),
  sunsam: require('./08-sunsam.png'),
  mc_dino: require('./09-mc_dino.png'),
  red_bison: require('./10-red_bison.png'),
  upper: require('./11-upper.png'),
  spotwave: require('./12-spotwave.png'),
  nubrix: require('./13-nubrix.png'),
  itauno: require('./14-itauno.png'),
  bradix: require('./15-bradix.png'),
  vivaon: require('./16-vivaon.png'),
  tin: require('./17-tin.png'),
  claru: require('./18-claru.png'),
  fati: require('./19-fati.png'),
  voltz: require('./20-voltz.png'),
  tayota: require('./21-tayota.png'),
  vrolet: require('./22-vrolet.png'),
  brama: require('./23-brama.png'),
  heniken: require('./24-heniken.png'),
  amveb: require('./25-amveb.png'),
  gatora: require('./26-gatora.png'),
  netflex: require('./27-netflex.png'),
  youlive: require('./28-youlive.png'),
  toktic: require('./29-toktic.png'),
  instaplay: require('./30-instaplay.png'),
  gugol: require('./31-gugol.png'),
  microsys: require('./32-microsys.png'),
  viza: require('./33-viza.png'),
  mastercash: require('./34-mastercash.png'),
  mercado_vivo: require('./35-mercado_vivo.png'),
  shopix: require('./36-shopix.png'),
};

/** Resolve o logo pelo id; `undefined` se o id não existir (fallback na UI). */
export function logoPatrocinador(
  id: string,
): ImageSourcePropType | undefined {
  return logosPatrocinadores[id];
}
