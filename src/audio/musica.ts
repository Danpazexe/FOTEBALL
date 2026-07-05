/**
 * Música de fundo do menu (lobby) via react-native-sound.
 *
 * As faixas vivem em `src/audio/lobby/*.mp3` e são empacotadas como recursos
 * nativos (Android `res/raw/`, iOS bundle) — o carregamento é pelo NOME.
 *
 * O jogador escolhe a faixa, o volume ("altura") e liga/desliga nos Ajustes.
 * Carregamento preguiçoso e tolerante a falhas: se a faixa não carregar, o menu
 * segue em silêncio, sem derrubar nada.
 */
import Sound from 'react-native-sound';

// Toca de fundo sem segurar a sessão de áudio (mesma categoria dos efeitos).
Sound.setCategory('Ambient', true);

export interface FaixaMusica {
  id: number;
  /** Nome do arquivo empacotado (Android res/raw + iOS bundle). */
  arquivo: string;
  titulo: string;
}

/** Faixas disponíveis no menu (índice = id). */
export const FAIXAS_MUSICA: readonly FaixaMusica[] = [
  {id: 0, arquivo: 'lobby1.mp3', titulo: 'Faixa 1'},
  {id: 1, arquivo: 'lobby2.mp3', titulo: 'Faixa 2'},
  {id: 2, arquivo: 'lobby3.mp3', titulo: 'Faixa 3'},
];

/** Faixa carregada e pronta (null enquanto carrega ou se falhou). */
let faixa: Sound | null = null;
/** Id da faixa alvo — o load em voo compara com isto para não tocar faixa velha. */
let faixaId = -1;
let habilitada = true;
let volume = 0.6;
/** true = alguma tela quer a música tocando (menu/ajustes em foco). */
let ativa = false;

function limitar(valor: number): number {
  if (Number.isNaN(valor)) {
    return 0;
  }
  return Math.max(0, Math.min(1, valor));
}

function normalizarId(id: number): number {
  if (!Number.isInteger(id) || id < 0 || id >= FAIXAS_MUSICA.length) {
    return 0;
  }
  return id;
}

/** Começa (ou retoma) a faixa já carregada, se tudo estiver ligado. */
function tocarFaixaCarregada(): void {
  if (!faixa || !ativa || !habilitada) {
    return;
  }
  faixa.setNumberOfLoops(-1);
  faixa.setVolume(volume);
  faixa.play();
}

/** Libera a faixa anterior e carrega a de `id` (tocando ao ficar pronta). */
function carregar(id: number): void {
  if (faixa) {
    faixa.stop();
    faixa.release();
    faixa = null;
  }
  faixaId = id;
  const alvo = id;
  const meta = FAIXAS_MUSICA[id];
  try {
    const som = new Sound(meta.arquivo, Sound.MAIN_BUNDLE, erro => {
      if (erro !== null) {
        // Sem música: o menu segue normal.
        return;
      }
      // Usuário trocou de faixa durante o load? Descarta esta.
      if (faixaId !== alvo) {
        som.release();
        return;
      }
      faixa = som;
      tocarFaixaCarregada();
    });
  } catch {
    // Faixa indisponível não pode derrubar o menu.
  }
}

/**
 * Marca a música como desejada por uma tela (menu/ajustes) e começa a tocar.
 * Idempotente — pode ser chamado a cada foco de tela.
 */
export function iniciarMusica(config: {
  faixa: number;
  volume: number;
  habilitada: boolean;
}): void {
  volume = limitar(config.volume);
  habilitada = config.habilitada;
  ativa = true;
  if (!habilitada) {
    return;
  }
  const id = normalizarId(config.faixa);
  if (faixa && faixaId === id) {
    tocarFaixaCarregada();
  } else {
    carregar(id);
  }
}

/** Para a música (ao sair do menu / entrar no jogo). Mantém a faixa carregada. */
export function pararMusica(): void {
  ativa = false;
  faixa?.stop();
}

/** Liga/desliga a música do menu, aplicando na hora. */
export function definirMusicaHabilitada(valor: boolean): void {
  habilitada = valor;
  if (!valor) {
    faixa?.stop();
    return;
  }
  if (!ativa) {
    return;
  }
  if (faixa) {
    tocarFaixaCarregada();
  } else {
    carregar(normalizarId(faixaId >= 0 ? faixaId : 0));
  }
}

/** Ajusta o volume/altura da música (0-1), aplicando na hora. */
export function definirVolumeMusica(valor: number): void {
  volume = limitar(valor);
  faixa?.setVolume(volume);
}

/** Troca a faixa; se a música estiver ativa e ligada, começa a nova na hora. */
export function selecionarFaixa(id: number): void {
  const alvo = normalizarId(id);
  if (alvo === faixaId && faixa) {
    return;
  }
  carregar(alvo);
}
