import {buildPlayerFaceUrl} from '../utils/playerFaceUrl';

export const PLAYER_FACES_GITHUB_BASE_URL =
  'https://raw.githubusercontent.com/Danpazexe/FOTEBALL-FACES/main';

export const buildGithubPlayerFaceUrl = (playerId: string): string =>
  buildPlayerFaceUrl({
    cdnBaseUrl: PLAYER_FACES_GITHUB_BASE_URL,
    folder: 'faces',
    playerId,
    extension: 'webp',
  });
