/**
 * Música de fundo (lobby) via react-native-sound.
 *
 * Modelo CONTÍNUO e global — a música NÃO é ligada por tela. Toca sempre que
 * está habilitada, o app está em primeiro plano e NÃO há partida em andamento.
 * Trocar de tela não corta a música; só a partida a suspende (e o app em
 * background pausa/retoma).
 *
 * As faixas vivem em `src/audio/lobby/*.mp3` (Android res/raw + iOS bundle).
 * Carregamento preguiçoso e tolerante a falha: se a faixa não carregar, segue
 * em silêncio sem derrubar nada.
 *
 * Estado desejado x real: `faixaId` = faixa ALVO; `faixa`/`faixaCarregadaId` =
 * Sound realmente carregado. Toca iff `podeTocar()` (habilitada && !suprimido &&
 * emPrimeiroPlano). As funções públicas ajustam o desejado e reconciliam.
 */
import Sound from 'react-native-sound';
import {AppState} from 'react-native';

// Toca de fundo sem segurar a sessão de áudio (mesma categoria dos efeitos).
Sound.setCategory('Ambient', true);

export interface FaixaMusica {
  id: number;
  /** Nome do arquivo empacotado (Android res/raw + iOS bundle). */
  arquivo: string;
  titulo: string;
}

/** Faixas disponíveis (índice = id). */
export const FAIXAS_MUSICA: readonly FaixaMusica[] = [
  {id: 0, arquivo: 'lobby1.mp3', titulo: 'Faixa 1'},
  {id: 1, arquivo: 'lobby2.mp3', titulo: 'Faixa 2'},
  {id: 2, arquivo: 'lobby3.mp3', titulo: 'Faixa 3'},
];

let faixa: Sound | null = null;
/** Faixa que o `faixa` acima representa (-1 = nenhuma). */
let faixaCarregadaId = -1;
/** Faixa ALVO — o que deve tocar. Sempre válida. */
let faixaId = 0;
/** Contador de carregamentos: só o mais recente assume a faixa. Um load antigo,
 * resolvido tarde, se descarta em vez de vazar um Sound tocando em paralelo. */
let geracao = 0;
let habilitada = true;
let volume = 0.6;
/** Partida em andamento — única situação que suspende a música. */
let suprimido = false;
/** App em primeiro plano (o SO não pausa o MediaPlayer sozinho no Android). */
let emPrimeiroPlano = true;
/** A faixa atual está de fato tocando (evita reiniciar num play() repetido). */
let tocando = false;

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

/** Tudo alinhado para a música tocar? */
function podeTocar(): boolean {
  return habilitada && !suprimido && emPrimeiroPlano;
}

/** Toca (ou mantém tocando) a faixa carregada, respeitando o volume. */
function play(): void {
  if (!faixa || !podeTocar()) {
    return;
  }
  faixa.setNumberOfLoops(-1);
  faixa.setVolume(volume);
  if (!tocando) {
    faixa.play();
    tocando = true;
  }
}

/** Pausa (mantém a posição, para retomar depois). */
function pause(): void {
  if (faixa && tocando) {
    faixa.pause();
    tocando = false;
  }
}

/** Garante que a faixa ALVO esteja carregada e tocando (se puder tocar). */
function reconciliar(): void {
  if (!podeTocar()) {
    return;
  }
  if (faixa && faixaCarregadaId === faixaId) {
    play();
  } else {
    carregar(faixaId);
  }
}

/** Libera a faixa anterior e carrega a de `id` (tocando ao ficar pronta). */
function carregar(id: number): void {
  if (faixa) {
    faixa.stop();
    faixa.release();
    faixa = null;
    faixaCarregadaId = -1;
    tocando = false;
  }
  faixaId = id;
  const meuToken = ++geracao;
  const meta = FAIXAS_MUSICA[id];
  try {
    const som = new Sound(meta.arquivo, Sound.MAIN_BUNDLE, erro => {
      // Superado por um carregar mais novo (troca de faixa durante o load)?
      // Descarta este Sound — senão tocaria em paralelo, órfão, sem referência.
      if (meuToken !== geracao) {
        som.release();
        return;
      }
      if (erro !== null) {
        return;
      }
      faixa = som;
      faixaCarregadaId = id;
      tocando = false;
      play();
    });
  } catch {
    // Faixa indisponível não pode derrubar o app.
  }
}

/**
 * Sincroniza a música com as preferências (chamado no boot e a cada mudança de
 * config). É a fonte única do estado desejado — faixa, volume e ligado/desligado.
 */
export function sincronizarMusica(config: {
  faixa: number;
  volume: number;
  habilitada: boolean;
}): void {
  volume = limitar(config.volume);
  faixa?.setVolume(volume);
  faixaId = normalizarId(config.faixa);
  habilitada = config.habilitada;
  if (!habilitada) {
    faixa?.stop();
    tocando = false;
    return;
  }
  reconciliar();
}

/** Suspende/retoma a música por causa da partida (true = em jogo). */
export function suprimirMusica(valor: boolean): void {
  suprimido = valor;
  if (valor) {
    pause();
  } else {
    reconciliar();
  }
}

// App em background: o MediaPlayer do Android não é pausado pelo SO — pausamos
// aqui e retomamos quando volta ao primeiro plano.
AppState.addEventListener('change', estado => {
  if (estado === 'active') {
    emPrimeiroPlano = true;
    reconciliar();
  } else {
    emPrimeiroPlano = false;
    pause();
  }
});
