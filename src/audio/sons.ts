/**
 * Efeitos sonoros do FOTEBALL via react-native-sound.
 *
 * Os arquivos-fonte vivem em `src/audio/*.mp3` e são empacotados como recursos
 * nativos do Android (`android/app/src/main/res/raw/`) e do iOS (bundle do
 * Xcode) — o carregamento é pelo NOME do arquivo.
 *
 * O carregamento é preguiçoso e tolerante a falhas: se um som não carregar,
 * as funções de tocar simplesmente não fazem nada (o jogo segue sem áudio).
 *
 * IMPORTANTE (bug corrigido): na lib 0.13, `stop()`/`play()` são no-op
 * SILENCIOSOS enquanto o som não terminou de carregar — um gol nos primeiros
 * segundos da primeira partida ficava mudo. Agora acompanhamos o load de cada
 * efeito: pedido antes de carregar fica PENDENTE e toca assim que o load
 * termina, em vez de se perder.
 */

import Sound from 'react-native-sound';

// Permite tocar mesmo com o app em primeiro plano sem segurar a sessão de áudio.
Sound.setCategory('Ambient', true);

/** Um efeito para cada momento da partida; sufixo `Adversario` = lance deles. */
const ARQUIVOS = {
  gol: 'gol1.mp3',
  golAdversario: 'goladv.mp3',
  golContra: 'golcontra.mp3',
  falhaGoleiro: 'falhouogoleiro.mp3',
  expulsao: 'expulsao.mp3',
  expulsaoAdversario: 'expulsaoadv.mp3',
  penaltiPerdido: 'penalty.mp3',
  penaltiPerdidoAdversario: 'penaltyadv.mp3',
  contusao: 'contusao.mp3',
  intervalo: 'intervalo.mp3',
  fimDeJogo: 'fimjogo.mp3',
  fimDeJogoAlt: 'fimjogo2.mp3',
  // Narração (voz) — novos lances.
  inicio: 'apitoinicial.mp3',
  cartaoAmarelo: 'amarelo.mp3',
  chancePerdida: 'chance1.mp3',
  chancePerdidaAlt: 'chance2.mp3',
  chancePerdidaTrave: 'bolanatrave.mp3',
  penaltiMarcado: 'penaltimarcado.mp3',
  substituicao: 'substituicao.mp3',
  varAnulado: 'varanulado.mp3',
  // Ambiente de estádio (toca em loop durante a partida).
  torcida: 'torcida.mp3',
} as const;

type NomeSom = keyof typeof ARQUIVOS;

const sons = new Map<NomeSom, Sound>();
/** Sons cujo load nativo já terminou com sucesso. */
const prontos = new Set<NomeSom>();
/** Pedidos feitos ANTES de o som carregar — tocam assim que ficarem prontos. */
const pendentes = new Set<NomeSom>();
let carregado = false;
let habilitado = true;
/** Volume mestre dos efeitos/narração (0-1), controlado pelos Ajustes. */
let volumeEfeitos = 1;
/** Ambiente de estádio pedido (loop) — retomado quando o arquivo termina de carregar. */
let torcidaAtiva = false;
/** Volume-base do ambiente de torcida (fundo discreto), antes do volume mestre. */
const VOLUME_TORCIDA = 0.35;

function reproduzirTorcida(): void {
  const som = sons.get('torcida');
  if (!habilitado || !som || !prontos.has('torcida')) {
    return;
  }
  som.setNumberOfLoops(-1);
  som.setVolume(VOLUME_TORCIDA * volumeEfeitos);
  som.play();
}

function reproduzir(nome: NomeSom): void {
  const som = sons.get(nome);
  if (!habilitado || !som) {
    return;
  }
  som.setVolume(volumeEfeitos);
  // Reinicia antes de tocar para permitir lances em sequência.
  som.stop(() => {
    som.play(() => {
      // play concluído — nada a fazer.
    });
  });
}

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
        new Sound(arquivo, Sound.MAIN_BUNDLE, erro => {
          if (erro !== null) {
            // Erro ignorado de propósito: sem áudio o jogo continua normal.
            pendentes.delete(nome);
            return;
          }
          prontos.add(nome);
          // Ambiente pedido antes de carregar? Começa o loop assim que pronto.
          if (nome === 'torcida') {
            if (torcidaAtiva) {
              reproduzirTorcida();
            }
          } else if (pendentes.delete(nome)) {
            // Lance aconteceu enquanto o som carregava? Toca agora (atraso de
            // ~1s é melhor que um gol mudo).
            reproduzir(nome);
          }
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
  if (!valor) {
    pendentes.clear();
    sons.get('torcida')?.stop();
  } else if (torcidaAtiva) {
    reproduzirTorcida();
  }
}

/**
 * Ajusta o volume mestre dos efeitos/narração (0-1). Aplica na hora ao ambiente
 * de torcida que já está tocando; os lances usam o novo volume no próximo toque.
 */
export function definirVolumeEfeitos(valor: number): void {
  volumeEfeitos = Math.max(0, Math.min(1, valor));
  const torcida = sons.get('torcida');
  if (torcida && torcidaAtiva) {
    torcida.setVolume(VOLUME_TORCIDA * volumeEfeitos);
  }
}

/** Inicia o ambiente de estádio em loop (chamar ao começar a partida). */
export function iniciarTorcida(): void {
  torcidaAtiva = true;
  reproduzirTorcida();
}

/** Para o ambiente de estádio (ao terminar ou sair da partida). */
export function pararTorcida(): void {
  torcidaAtiva = false;
  sons.get('torcida')?.stop();
}

function tocar(nome: NomeSom): void {
  if (!habilitado || !sons.has(nome)) {
    return;
  }
  if (!prontos.has(nome)) {
    pendentes.add(nome);
    return;
  }
  reproduzir(nome);
}

/** Gol: festa quando é do time do usuário, lamento quando é do adversário. */
export function tocarGol(doUsuario: boolean): void {
  tocar(doUsuario ? 'gol' : 'golAdversario');
}

/** Gol contra: reação dedicada (independe de quem se beneficiou). */
export function tocarGolContra(): void {
  tocar('golContra');
}

/** Gol saído de falha do goleiro: comentário dedicado ("falhou o goleiro"). */
export function tocarFalhaGoleiro(): void {
  tocar('falhaGoleiro');
}

export function tocarExpulsao(doUsuario: boolean): void {
  tocar(doUsuario ? 'expulsao' : 'expulsaoAdversario');
}

/** Pênalti desperdiçado/defendido (o convertido vira gol e toca como gol). */
export function tocarPenaltiPerdido(doUsuario: boolean): void {
  tocar(doUsuario ? 'penaltiPerdido' : 'penaltiPerdidoAdversario');
}

/** Marcação do pênalti ("PÊNALTI!") — o árbitro apontou para a marca da cal. */
export function tocarPenalti(): void {
  tocar('penaltiMarcado');
}

/** Substituição — mexe o treinador. */
export function tocarSubstituicao(): void {
  tocar('substituicao');
}

export function tocarContusao(): void {
  tocar('contusao');
}

/** Apito inicial — a bola vai rolar. */
export function tocarInicio(): void {
  tocar('inicio');
}

export function tocarCartaoAmarelo(): void {
  tocar('cartaoAmarelo');
}

const CHANCES: NomeSom[] = ['chancePerdida', 'chancePerdidaAlt'];

/** Chance perdida: sorteia entre as gravações para não repetir. */
export function tocarChancePerdida(): void {
  tocar(CHANCES[Math.floor(Math.random() * CHANCES.length)]);
}

/** Bola na trave: quase-gol (usa a gravação dedicada do travessão). */
export function tocarBolaNaTrave(): void {
  tocar('chancePerdidaTrave');
}

/** Gol anulado pelo VAR (impedimento). */
export function tocarVarAnulado(): void {
  tocar('varAnulado');
}

export function tocarIntervalo(): void {
  tocar('intervalo');
}

/** Apito final: varia entre as duas gravações para não enjoar. */
export function tocarFimDeJogo(): void {
  tocar(Math.random() < 0.5 ? 'fimDeJogo' : 'fimDeJogoAlt');
}
