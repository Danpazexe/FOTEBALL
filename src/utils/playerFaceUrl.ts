const removerBarrasFinais = (url: string): string => url.replace(/\/+$/, '');
const removerBarrasIniciais = (path: string): string => path.replace(/^\/+/, '');

export interface BuildPlayerFaceUrlOptions {
  cdnBaseUrl: string;
  playerId: string;
  extension?: 'webp' | 'png' | 'jpg' | 'jpeg';
  folder?: string;
}

/**
 * Monta uma URL previsível para a face remota do jogador.
 *
 * Exemplo:
 * buildPlayerFaceUrl({
 *   cdnBaseUrl: 'https://cdn.seusite.com',
 *   folder: 'faces',
 *   playerId: 'player-001',
 * })
 *
 * Resultado:
 * https://cdn.seusite.com/faces/player-001.webp
 */
export const buildPlayerFaceUrl = ({
  cdnBaseUrl,
  playerId,
  extension = 'webp',
  folder = 'faces',
}: BuildPlayerFaceUrlOptions): string => {
  const base = removerBarrasFinais(cdnBaseUrl.trim());
  const safeFolder = removerBarrasIniciais(removerBarrasFinais(folder.trim()));
  const safePlayerId = encodeURIComponent(playerId.trim());

  return `${base}/${safeFolder}/${safePlayerId}.${extension}`;
};

export const isValidRemoteFaceUrl = (url?: string | null): boolean => {
  if (!url) {
    return false;
  }

  return /^https:\/\/[^\s]+\.(webp|png|jpe?g)(\?.*)?$/i.test(url.trim());
};
