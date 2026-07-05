/**
 * Música de fundo do menu (lobby) via react-native-sound.
 *
 * As faixas vivem em `src/audio/lobby/*.mp3` e são empacotadas como recursos
 * nativos (Android `res/raw/`, iOS bundle) — o carregamento é pelo NOME.
 *
 * O jogador escolhe a faixa, o volume ("altura") e liga/desliga nos Ajustes.
 * Carregamento preguiçoso e tolerante a falhas: se a faixa não carregar, o menu
 * segue em silêncio, sem derrubar nada.
 *
 * Estado desejado (o que DEVE tocar) x estado real (o que está carregado):
 *   - faixaId          = faixa ALVO escolhida (sempre válida; default 0)
 *   - faixa/faixaCarregadaId = Sound realmente carregado e sua faixa
 *   - ativa            = alguma tela (menu/ajustes) quer música
 *   - habilitada       = ligada nos Ajustes
 *   - emPrimeiroPlano  = app à frente (pausa no background, retoma no active)
 * As funções públicas ajustam o estado desejado e reconciliam com o real.
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

/** Faixas disponíveis no menu (índice = id). */
export const FAIXAS_MUSICA: readonly FaixaMusica[] = [
  {id: 0, arquivo: 'lobby1.mp3', titulo: 'Faixa 1'},
  {id: 1, arquivo: 'lobby2.mp3', titulo: 'Faixa 2'},
  {id: 2, arquivo: 'lobby3.mp3', titulo: 'Faixa 3'},
];

/** Sound carregado e pronto (null enquanto carrega ou se falhou). */
let faixa: Sound | null = null;
/** Faixa que o `faixa` acima representa (-1 = nenhuma). */
let faixaCarregadaId = -1;
/** Faixa ALVO — o que deve tocar. Sempre válida (nunca fica -1). */
let faixaId = 0;
/** Id de um carregamento em voo (evita disparar dois loads da mesma faixa). */
let carregando: number | null = null;
let habilitada = true;
let volume = 0.6;
/** true = alguma tela quer a música tocando (menu/ajustes em foco). */
let ativa = false;
/** true = app em primeiro plano (o SO não pausa MediaPlayer sozinho no Android). */
let emPrimeiroPlano = true;

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

/** Começa (ou retoma) a faixa carregada, se tudo estiver ligado e à frente. */
function tocarFaixaCarregada(): void {
  if (!faixa || !ativa || !habilitada || !emPrimeiroPlano) {
    return;
  }
  faixa.setNumberOfLoops(-1);
  faixa.setVolume(volume);
  faixa.play();
}

/** Reconcilia: garante que a faixa ALVO esteja carregada e tocando (se ligada). */
function reconciliar(): void {
  if (!ativa || !habilitada || !emPrimeiroPlano) {
    return;
  }
  if (faixa && faixaCarregadaId === faixaId) {
    tocarFaixaCarregada();
  } else {
    carregar(faixaId);
  }
}

/** Libera a faixa anterior e carrega a de `id` (tocando ao ficar pronta). */
function carregar(id: number): void {
  // Já existe um load em voo para ESTA faixa? Não dispare outro (senão duas
  // instâncias tocam ao mesmo tempo e a primeira vaza sem referência).
  if (carregando === id) {
    return;
  }
  if (faixa) {
    faixa.stop();
    faixa.release();
    faixa = null;
    faixaCarregadaId = -1;
  }
  faixaId = id;
  carregando = id;
  const alvo = id;
  const meta = FAIXAS_MUSICA[id];
  try {
    const som = new Sound(meta.arquivo, Sound.MAIN_BUNDLE, erro => {
      if (carregando === alvo) {
        carregando = null;
      }
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
      faixaCarregadaId = alvo;
      tocarFaixaCarregada();
    });
  } catch {
    // Faixa indisponível não pode derrubar o menu.
    if (carregando === alvo) {
      carregando = null;
    }
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
  // Guarda a faixa escolhida SEMPRE — mesmo desligada — para religar na certa.
  faixaId = normalizarId(config.faixa);
  if (!habilitada) {
    faixa?.stop();
    return;
  }
  reconciliar();
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
  reconciliar();
}

/** Ajusta o volume/altura da música (0-1), aplicando na hora. */
export function definirVolumeMusica(valor: number): void {
  volume = limitar(valor);
  faixa?.setVolume(volume);
}

/** Troca a faixa; se a música estiver ativa e ligada, começa a nova na hora. */
export function selecionarFaixa(id: number): void {
  const alvo = normalizarId(id);
  // Já é a faixa atual (carregada ou carregando)? Não recarrega.
  if (alvo === faixaId && (faixa !== null || carregando === alvo)) {
    return;
  }
  carregar(alvo);
}

// App em background: o MediaPlayer do Android NÃO é pausado pelo SO, então a
// música continuaria em loop com o app minimizado. Pausamos aqui e retomamos
// quando o app volta ao primeiro plano (se ainda houver tela querendo música).
AppState.addEventListener('change', estado => {
  if (estado === 'active') {
    emPrimeiroPlano = true;
    reconciliar();
  } else {
    emPrimeiroPlano = false;
    faixa?.pause();
  }
});
