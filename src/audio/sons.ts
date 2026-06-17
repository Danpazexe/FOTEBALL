/**
 * Efeitos sonoros do FOTEBALL via react-native-sound.
 *
 * Os arquivos ficam empacotados como recursos nativos do Android
 * (android/app/src/main/res/raw/goal.mp3 e fim_de_jogo.mp3) e são carregados
 * pelo nome. No iOS precisariam ser adicionados ao bundle do app.
 *
 * O carregamento é preguiçoso e tolerante a falhas: se um som não carregar,
 * as funções de tocar simplesmente não fazem nada (o jogo segue sem áudio).
 */

import Sound from 'react-native-sound';

// Permite tocar mesmo com o app em primeiro plano sem segurar a sessão de áudio.
Sound.setCategory('Ambient', true);

let somGol: Sound | null = null;
let somFimDeJogo: Sound | null = null;
let carregado = false;
let habilitado = true;

function carregar(nome: string): Sound {
  // O segundo argumento (MAIN_BUNDLE) faz o Android procurar em res/raw.
  return new Sound(nome, Sound.MAIN_BUNDLE, () => {
    // Ignoramos o erro de propósito: sem áudio o jogo continua normal.
  });
}

/** Pré-carrega os efeitos. Idempotente — pode ser chamado a cada partida. */
export function inicializarSons(): void {
  if (carregado) {
    return;
  }
  carregado = true;
  try {
    somGol = carregar('goal.mp3');
    somFimDeJogo = carregar('fim_de_jogo.mp3');
  } catch {
    somGol = null;
    somFimDeJogo = null;
  }
}

/** Liga/desliga os efeitos (controlado pela tela de Ajustes). */
export function definirSomHabilitado(valor: boolean): void {
  habilitado = valor;
}

function tocar(som: Sound | null): void {
  if (!habilitado || !som) {
    return;
  }
  // Reinicia antes de tocar para permitir gols em sequência.
  som.stop(() => {
    som.play(() => {
      // play concluído — nada a fazer.
    });
  });
}

export function tocarGol(): void {
  tocar(somGol);
}

export function tocarFimDeJogo(): void {
  tocar(somFimDeJogo);
}
