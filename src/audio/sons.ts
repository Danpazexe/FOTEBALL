/**
 * Efeitos sonoros do FOTEBALL via react-native-sound.
 *
 * Os arquivos-fonte vivem em `src/audio/*.mp3` e são empacotados como recursos
 * nativos do Android (`android/app/src/main/res/raw/`) — o carregamento é pelo
 * NOME do arquivo. No iOS precisariam ser adicionados ao bundle do Xcode.
 *
 * O carregamento é preguiçoso e tolerante a falhas: se um som não carregar,
 * as funções de tocar simplesmente não fazem nada (o jogo segue sem áudio).
 */

import Sound from 'react-native-sound';

// Permite tocar mesmo com o app em primeiro plano sem segurar a sessão de áudio.
Sound.setCategory('Ambient', true);

/** Um efeito para cada momento da partida; sufixo `Adversario` = lance deles. */
const ARQUIVOS = {
  gol: 'gol1.mp3',
  golAdversario: 'goladv.mp3',
  expulsao: 'expulsao.mp3',
  expulsaoAdversario: 'expulsaoadv.mp3',
  penaltiPerdido: 'penalty.mp3',
  penaltiPerdidoAdversario: 'penaltyadv.mp3',
  contusao: 'contusao.mp3',
  intervalo: 'intervalo.mp3',
  fimDeJogo: 'fimjogo.mp3',
  fimDeJogoAlt: 'fimjogo2.mp3',
} as const;

type NomeSom = keyof typeof ARQUIVOS;

const sons = new Map<NomeSom, Sound>();
let carregado = false;
let habilitado = true;

/** Pré-carrega os efeitos. Idempotente — pode ser chamado a cada partida. */
export function inicializarSons(): void {
  if (carregado) {
    return;
  }
  carregado = true;
  for (const [nome, arquivo] of Object.entries(ARQUIVOS) as Array<
    [NomeSom, string]
  >) {
    try {
      // O segundo argumento (MAIN_BUNDLE) faz o Android procurar em res/raw.
      sons.set(
        nome,
        new Sound(arquivo, Sound.MAIN_BUNDLE, () => {
          // Erro ignorado de propósito: sem áudio o jogo continua normal.
        }),
      );
    } catch {
      // Idem: efeito indisponível não pode derrubar a partida.
    }
  }
}

/** Liga/desliga os efeitos (controlado pela tela de Ajustes). */
export function definirSomHabilitado(valor: boolean): void {
  habilitado = valor;
}

function tocar(nome: NomeSom): void {
  const som = sons.get(nome);
  if (!habilitado || !som) {
    return;
  }
  // Reinicia antes de tocar para permitir lances em sequência.
  som.stop(() => {
    som.play(() => {
      // play concluído — nada a fazer.
    });
  });
}

/** Gol: festa quando é do time do usuário, lamento quando é do adversário. */
export function tocarGol(doUsuario: boolean): void {
  tocar(doUsuario ? 'gol' : 'golAdversario');
}

export function tocarExpulsao(doUsuario: boolean): void {
  tocar(doUsuario ? 'expulsao' : 'expulsaoAdversario');
}

/** Pênalti desperdiçado/defendido (o convertido vira gol e toca como gol). */
export function tocarPenaltiPerdido(doUsuario: boolean): void {
  tocar(doUsuario ? 'penaltiPerdido' : 'penaltiPerdidoAdversario');
}

export function tocarContusao(): void {
  tocar('contusao');
}

export function tocarIntervalo(): void {
  tocar('intervalo');
}

/** Apito final: varia entre as duas gravações para não enjoar. */
export function tocarFimDeJogo(): void {
  tocar(Math.random() < 0.5 ? 'fimDeJogo' : 'fimDeJogoAlt');
}
