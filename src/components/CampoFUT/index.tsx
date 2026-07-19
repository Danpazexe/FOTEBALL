/**
 * CampoFUT — sistema de escalação estilo FIFA Ultimate Team (mobile-first).
 *
 * Compõe, num só componente, tudo que a tela de escalação precisa:
 *  • Cabeçalho do clube (escudo + nome + formação detectada) e OVERALL do time.
 *  • Card do técnico (reputação em estrelas) à direita.
 *  • Campo responsivo com os 11 titulares como CARTAS FUT (tier + anel de encaixe).
 *  • Banco de reservas com SCROLL HORIZONTAL.
 *  • Banner de validação da escalação.
 *
 * Interação (drag-and-drop, estilo EA FC — posições TRAVADAS na formação):
 *  • Arrastar um TITULAR sobre outro    -> troca os dois de lugar.
 *  • Arrastar um RESERVA sobre um titular-> substitui (reserva entra).
 *  • Tocar num card                     -> abre o detalhe (opcional).
 * O campo é desenhado em PERSPECTIVA (gramado em trapézio; cards menores ao fundo).
 *
 * Toda a REGRA vem dos módulos puros já existentes (nada é reimplementado aqui):
 * geometria (coordenadas), adaptacao (penalidade fora de posição, item 12),
 * defaults (mutadores de formação) e validacao. Cores e espaçamento vêm do
 * Design System v2 (tokens). O componente é controlado: recebe a
 * formação e devolve a nova via `onAtualizarFormacao` (que valida na store).
 */

import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import Svg, {Ellipse, Line, Path, Rect} from 'react-native-svg';

import {trocarTitular} from '../../api/database/seed/defaults';
import type {ForcaTime} from '../../engine/simulation/teamStrength';
import {
  coordenadaDoTitular,
  detectarFormacao,
  preencherCoordenadas,
} from '../../engine/tactics/geometria';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {
  TAMANHO_BANCO,
  alternarBanco,
} from '../../engine/tactics/formacaoOps';
import {
  SelectRow,
  espacamento,
  raios,
  useEstilosDS,
  useTheme,
  type CorTexto,
  type TemaDS,
} from '../../design-system';
import type {
  Clube,
  Formacao,
  Player,
  Position,
  Tatica,
  TitularFormacao,
} from '../../types';
import Escudo from '../Escudo';
import Icone from '../Icone';
import PlayerAvatar from '../PlayerAvatar';

/**
 * Nome curto para caber sob a ficha (estilo Sofascore): apelido de uma palavra
 * fica como está (Neymar, Rafael); nome composto vira o ÚLTIMO sobrenome
 * (Deivid Washington → Washington). Evita que rótulos vizinhos colidam.
 */
function nomeCampo(jogador: Player): string {
  const base = (jogador.apelido ?? jogador.nome).trim();
  const partes = base.split(/\s+/);
  return partes.length <= 1 ? base : partes[partes.length - 1];
}

/**
 * Posição → ÁREA de função (goleiro/defesa/meio/ataque). Mesma família do
 * PositionBadge, para o círculo da ficha usar a MESMA cor do selo (goleiro roxo,
 * defesa azul, meio verde, ataque vermelho) — cor vem do token `esporte.posicao`.
 */
function areaDaPosicao(
  pos: Position,
): 'goleiro' | 'defesa' | 'meio' | 'ataque' {
  switch (pos) {
    case 'GOL':
      return 'goleiro';
    case 'ZAG':
    case 'LD':
    case 'LE':
      return 'defesa';
    case 'VOL':
    case 'MC':
    case 'MEI':
      return 'meio';
    default:
      return 'ataque';
  }
}

/**
 * Traduz a TÁTICA num vetor de movimento por jogador (puro, determinístico):
 * `dy < 0` = pra frente (ataque, topo) · `dx > 0` = pra direita. A magnitude
 * escala com o Ritmo. Cobre Mentalidade, Linha, Marcação, Amplidão e Lado — as
 * MESMAS opções que já pesam no motor (teamStrength/probabilityCalc). Goleiro
 * não recebe seta. Retorna `null` quando o vetor é curto demais pra desenhar.
 */
function vetorSeta(pos: Position, t: Tatica): {dx: number; dy: number} | null {
  const area = areaDaPosicao(pos);
  if (area === 'goleiro') {
    return null;
  }
  // Tendência base pra frente por linha (negativo = ataque).
  const frenteBase = area === 'ataque' ? -1 : area === 'meio' ? -0.6 : -0.2;

  // Mentalidade (estilo ofensivo).
  let dy: number;
  if (t.estiloOfensivo === 'Ataque direto') {
    dy = frenteBase * 1.2;
  } else if (t.estiloOfensivo === 'Contra-ataque') {
    // Atacantes disparam; defesa segura (recua leve); meio contido.
    dy = area === 'ataque' ? -1.1 : area === 'defesa' ? 0.3 : -0.3;
  } else if (t.estiloOfensivo === 'Posse de bola') {
    dy = frenteBase * 0.5; // circulação: passos curtos
  } else {
    dy = frenteBase; // Equilibrado
  }

  // Linha defensiva: mexe sobretudo na defesa, e um pouco no bloco todo.
  if (t.linhaDefensiva === 'Adiantada') {
    dy += area === 'defesa' ? -0.7 : -0.15;
  } else if (t.linhaDefensiva === 'Recuada') {
    dy += area === 'defesa' ? 0.7 : 0.2;
  }

  // Marcação pressão alta: todos sobem pra pressionar.
  if (t.marcacao === 'Pressão alta') {
    dy += -0.2;
  }

  // Horizontal: Amplidão (abre/fecha os flancos) + Lado de ataque.
  let dx = 0;
  const ladoDir = pos === 'LD' || pos === 'PD';
  const ladoEsq = pos === 'LE' || pos === 'PE';
  if (t.amplidao === 'Amplo') {
    dx += ladoDir ? 0.6 : ladoEsq ? -0.6 : 0;
  } else if (t.amplidao === 'Estreito') {
    dx += ladoDir ? -0.5 : ladoEsq ? 0.5 : 0;
  }
  if (t.ladoAtaque === 'Direita') {
    dx += 0.4;
  } else if (t.ladoAtaque === 'Esquerda') {
    dx -= 0.4;
  } else if (t.ladoAtaque === 'Centro') {
    dx += ladoDir ? -0.3 : ladoEsq ? 0.3 : 0;
  }

  // Ritmo escala a intensidade do movimento.
  const escala =
    t.ritmo === 'Intenso' ? 1.3 : t.ritmo === 'Lento' ? 0.65 : 1;
  dy *= escala;
  dx *= escala;

  if (Math.hypot(dx, dy) < 0.2) {
    return null; // vetor irrelevante — sem seta
  }
  return {dx, dy};
}

// Pivô vertical em torno do qual o bloco COMPRIME/ESTICA (0=nosso gol, 1=ataque).
const PIVO_Y = 0.46;

function limitar(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Reposiciona o jogador (coord. normalizada) conforme a TÁTICA — a FORMA do time
 * morfa de verdade, não só as linhas. `sY/sX` deslocam o bloco (frente/trás,
 * flanco); `kY/kX` comprimem/esticam em torno do centro (bloco "mais junto" na
 * postura defensiva; espalhado no ataque). Goleiro fica fixo. Visual apenas — a
 * formação salva não muda.
 */
function ajustePosicaoTatica(
  x: number,
  y: number,
  pos: Position,
  t: Tatica,
): {x: number; y: number} {
  if (areaDaPosicao(pos) === 'goleiro') {
    return {x, y};
  }
  let kY = 1;
  let sY = 0;
  let kX = 1;
  let sX = 0;

  if (t.estiloOfensivo === 'Contra-ataque') {
    kY -= 0.12; // bloco compacto
    sY -= 0.02; // senta um pouco
  } else if (t.estiloOfensivo === 'Ataque direto') {
    kY += 0.1; // estica pro ataque
    sY += 0.03;
  } else if (t.estiloOfensivo === 'Posse de bola') {
    kY -= 0.05;
  }

  if (t.linhaDefensiva === 'Adiantada') {
    sY += 0.05; // sobe o bloco
    kY += 0.03;
  } else if (t.linhaDefensiva === 'Recuada') {
    sY -= 0.05; // recua o bloco
    kY -= 0.06; // e junta
  }

  if (t.amplidao === 'Estreito') {
    kX -= 0.16; // fecha pro miolo
  } else if (t.amplidao === 'Amplo') {
    kX += 0.16; // abre nos flancos
  }

  if (t.ladoAtaque === 'Direita') {
    sX += 0.04;
  } else if (t.ladoAtaque === 'Esquerda') {
    sX -= 0.04;
  } else if (t.ladoAtaque === 'Centro') {
    kX -= 0.06; // concentra no centro
  }

  if (t.ritmo === 'Intenso') {
    kY += 0.03;
  } else if (t.ritmo === 'Lento') {
    kY -= 0.03;
  }

  return {
    x: limitar(0.5 + (x - 0.5) * kX + sX, 0.06, 0.94),
    y: limitar(PIVO_Y + (y - PIVO_Y) * kY + sY, 0.05, 0.97),
  };
}

/** Faixa de cor do overall — mesma régua do OverallBadge (DS). */
function faixaCorOverall(overall: number): CorTexto {
  if (overall >= 75) {
    return 'success';
  }
  if (overall >= 60) {
    return 'warning';
  }
  return 'danger';
}

type CampoFUTProps = {
  clube: Clube;
  formacao: Formacao;
  jogadores: Player[];
  tatica: Tatica;
  forca: ForcaTime | null;
  reputacaoTecnico: number;
  onAtualizarFormacao: (formacao: Formacao) => void;
  onAbrirJogador?: (jogadorId: string) => void;
  /** Avisa a tela quando um arraste começa/termina (trava o scroll externo). */
  onArrastandoChange?: (ativo: boolean) => void;
  largura: number;
  /** Seletor de formação embutido (no lugar do banner). Sem estes, não aparece. */
  formacaoTipo?: string;
  formacoesDisponiveis?: readonly string[];
  onTrocarFormacao?: (tipo: string) => void;
  /** Ação "escalar os 11 melhores" — botão estrela dourada no campo (se definida). */
  onEscalarMelhores?: () => void;
  /** Mostra o card de cabeçalho (escudo/nome/OVR/técnico). Default: true. */
  mostrarCabecalho?: boolean;
};

type Descritor = {tipo: 'titular' | 'reserva'; valor: string};

type SlotTela = {
  slotIndex: number;
  jogadorId: string;
  cx: number;
  cy: number;
  escala: number;
};


// Tabuleiro tático CHAPADO (visto de cima). As fichas são posicionadas por
// projetarSlot num retângulo plano; o MESMO mapa alimenta desenho e hit-test.
// Margens (fração) para as fichas + nomes caberem dentro das linhas.
// Margem lateral do tabuleiro. Menor = a linha de 4 se ESPALHA mais (antes 0.12
// apertava os 4 do meio até os círculos se encostarem). Fica ≥ metade da ficha
// pra não clipar o jogador mais aberto na borda.
const MARGEM_X = 0.075;
const MARGEM_Y = 0.05;

/**
 * Projeta (x,y ∈ 0..1) → centro da FICHA na tela. Mapa LINEAR (sem perspectiva):
 * x=0 esquerda … x=1 direita; y=0 nosso gol (base/baixo) … y=1 ataque (topo). A
 * escala é constante (tabuleiro plano) — todas as fichas do mesmo tamanho.
 */
function projetarSlot(
  x: number,
  y: number,
  largura: number,
  altura: number,
): {cx: number; cy: number; escala: number} {
  const mx = largura * MARGEM_X;
  const my = altura * MARGEM_Y;
  return {
    cx: mx + x * (largura - 2 * mx),
    cy: altura - my - y * (altura - 2 * my),
    escala: 1,
  };
}

/**
 * Gesto por card: TOQUE simples = selecionar (para trocar); TOQUE LONGO = abrir
 * detalhe. Sem arraste — a troca é por seleção (toca A, toca B). O long-press
 * tem prioridade sobre o toque (Exclusive) para o detalhe não disparar sozinho.
 */
function useGestoPeca(
  tipo: Descritor['tipo'],
  valor: string,
  aoTocar: (tipo: string, valor: string) => void,
  aoAbrirDetalhe: (tipo: string, valor: string) => void,
) {
  return useMemo(() => {
    const toque = Gesture.Tap().onStart(() => {
      runOnJS(aoTocar)(tipo, valor);
    });
    const longo = Gesture.LongPress()
      .minDuration(320)
      .onStart(() => {
        runOnJS(aoAbrirDetalhe)(tipo, valor);
      });
    return Gesture.Exclusive(longo, toque);
  }, [tipo, valor, aoTocar, aoAbrirDetalhe]);
}

function CampoFUT({
  clube,
  formacao,
  jogadores,
  tatica,
  forca,
  reputacaoTecnico,
  onAtualizarFormacao,
  onAbrirJogador,
  largura,
  formacaoTipo,
  formacoesDisponiveis,
  onTrocarFormacao,
  onEscalarMelhores,
  mostrarCabecalho = true,
}: CampoFUTProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  // Campo em LARGURA CHEIA (estilo mockup) + banco horizontal de avatares abaixo.
  const altura = Math.round(largura * 1.32);
  const cardW = Math.round(largura * 0.118); // camisa no campo (largura da peça)
  const cardH = cardW;
  const avatarBanco = Math.round(largura * 0.12); // rosto do reserva no banco
  // Seleção para TROCA por TOQUE (sem drag): toca num jogador (titular ou
  // reserva) → fica marcado; toca em outro → troca/entra; tocar no mesmo
  // desmarca. Substitui o antigo arraste + modo de edição (olho).
  const [selecionado, setSelecionado] = useState<Descritor | null>(null);

  const porId = useMemo(
    () => new Map(jogadores.map(j => [j.id, j])),
    [jogadores],
  );

  // Garante x/y em todos os titulares (saves antigos / formações por linha).
  const titulares = useMemo(
    () => preencherCoordenadas(formacao.titulares),
    [formacao.titulares],
  );

  const titularIds = useMemo(
    () => new Set(titulares.map(t => t.jogadorId)),
    [titulares],
  );

  // Banco = reservas ESCALADOS (primeiras TAMANHO_BANCO de formacao.reservas);
  // "fora do jogo" = resto do elenco não relacionado. A capação é só de EXIBIÇÃO
  // (não escreve no store durante o render); a formação já nasce capada em
  // montarFormacao/criarFormacaoDefault.
  const idsBanco = useMemo(
    () => formacao.reservas.slice(0, TAMANHO_BANCO),
    [formacao.reservas],
  );
  const bancoIds = useMemo(() => new Set(idsBanco), [idsBanco]);
  const banco = useMemo(
    () => idsBanco.map(id => porId.get(id)).filter((j): j is Player => !!j),
    [idsBanco, porId],
  );
  const foraDoJogo = useMemo(
    () => jogadores.filter(j => !titularIds.has(j.id) && !bancoIds.has(j.id)),
    [jogadores, titularIds, bancoIds],
  );
  const bancoCheio = banco.length >= TAMANHO_BANCO;
  const aoAlternarBanco = useCallback(
    (id: string) => onAtualizarFormacao(alternarBanco(formacao, id)),
    [formacao, onAtualizarFormacao],
  );

  const validacao = useMemo(
    () => validarEscalacao(formacao, jogadores),
    [formacao, jogadores],
  );
  const formacaoDetectada = useMemo(
    () => detectarFormacao(formacao.titulares),
    [formacao.titulares],
  );

  // Posições de tela de cada slot (centro da carta) EM PERSPECTIVA. Coordenada vem
  // da FONTE ÚNICA (coordenadaDoTitular); `projetarSlot` é o MESMO cálculo do
  // desenho do campo e do hit-test do drop.
  const slotsTela = useMemo<SlotTela[]>(
    () =>
      titulares.map((titular, slotIndex) => {
        const base = coordenadaDoTitular(titular);
        // A FORMA do time morfa com a tática (recuado junta, adiantado sobe…).
        const {x, y} = ajustePosicaoTatica(base.x, base.y, titular.posicao, tatica);
        const {cx, cy, escala} = projetarSlot(x, y, largura, altura);
        return {slotIndex, jogadorId: titular.jogadorId, cx, cy, escala};
      }),
    [titulares, largura, altura, tatica],
  );

  // Resolve a TROCA entre a seleção anterior (a) e o alvo tocado (b).
  const aplicarTroca = useCallback(
    (a: Descritor, b: Descritor) => {
      // Titular ↔ titular: troca os dois slots.
      if (a.tipo === 'titular' && b.tipo === 'titular') {
        const slotA = Number(a.valor);
        const idB = titulares[Number(b.valor)]?.jogadorId;
        if (idB) {
          onAtualizarFormacao(trocarTitular(formacao, slotA, idB));
        }
        return;
      }
      // Titular + reserva (em qualquer ordem): o reserva entra no slot do titular.
      const titular = a.tipo === 'titular' ? a : b.tipo === 'titular' ? b : null;
      const reserva = a.tipo === 'reserva' ? a : b.tipo === 'reserva' ? b : null;
      if (titular && reserva) {
        const entrante = porId.get(reserva.valor);
        if (!entrante || entrante.lesionado || entrante.suspenso) {
          return; // reserva indisponível (lesão/suspensão) não entra
        }
        onAtualizarFormacao(
          trocarTitular(formacao, Number(titular.valor), reserva.valor),
        );
      }
      // reserva + reserva: nada a trocar (ambos fora do XI).
    },
    [titulares, formacao, porId, onAtualizarFormacao],
  );

  // Toque = seleciona; segundo toque troca/entra; tocar no mesmo desmarca.
  const aoTocar = useCallback(
    (tipo: string, valor: string) => {
      const alvo: Descritor = {tipo: tipo as Descritor['tipo'], valor};
      setSelecionado(anterior => {
        if (!anterior) {
          return alvo;
        }
        if (anterior.tipo === alvo.tipo && anterior.valor === alvo.valor) {
          return null;
        }
        aplicarTroca(anterior, alvo);
        return null;
      });
    },
    [aplicarTroca],
  );

  // Toque longo abre o detalhe do jogador (o toque simples é a seleção).
  const aoAbrirDetalhe = useCallback(
    (tipo: string, valor: string) => {
      const id =
        tipo === 'titular' ? titulares[Number(valor)]?.jogadorId : valor;
      if (id && onAbrirJogador) {
        onAbrirJogador(id);
      }
    },
    [titulares, onAbrirJogador],
  );

  return (
    <View style={styles.overlay}>
      {mostrarCabecalho ? (
        <Cabecalho
          clube={clube}
          forca={forca}
          formacaoDetectada={formacaoDetectada}
          reputacaoTecnico={reputacaoTecnico}
        />
      ) : null}

      <BannerValidacao validacao={validacao} />

      <View style={[styles.pitch, {width: largura, height: altura}]}>
        <PitchEstadio largura={largura} altura={altura} />
        <SetasMovimento
          slots={slotsTela}
          titulares={titulares}
          tatica={tatica}
          cardH={cardH}
          largura={largura}
          altura={altura}
        />
        <LinhaImpedimento
          slots={slotsTela}
          titulares={titulares}
          tatica={tatica}
          cardH={cardH}
          largura={largura}
        />

        {onEscalarMelhores ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escalar os 11 melhores"
            onPress={onEscalarMelhores}
            style={styles.botaoMelhores}>
            <Icone nome="estrela" tamanho={18} cor={cores.accent} />
          </Pressable>
        ) : null}

        {slotsTela.map(slot => {
          const titular = titulares[slot.slotIndex];
          return (
            <PecaCampo
              key={`slot_${slot.slotIndex}`}
              slotIndex={slot.slotIndex}
              jogador={porId.get(slot.jogadorId)}
              posicaoEscalada={titular.posicao}
              ehCapitao={clube.capitaoId === slot.jogadorId}
              cx={slot.cx}
              cy={slot.cy}
              cardW={Math.round(cardW * slot.escala)}
              cardH={Math.round(cardH * slot.escala)}
              selecionado={
                selecionado?.tipo === 'titular' &&
                Number(selecionado.valor) === slot.slotIndex
              }
              aoTocar={aoTocar}
              aoAbrirDetalhe={aoAbrirDetalhe}
            />
          );
        })}
      </View>

      {onTrocarFormacao && formacaoTipo && formacoesDisponiveis ? (
        <SelectRow
          pill
          compacto
          label="Formação"
          valor={formacaoTipo}
          opcoes={formacoesDisponiveis as string[]}
          onSelect={onTrocarFormacao}
        />
      ) : null}

      {/* BANCO horizontal de avatares (estilo mockup). */}
      <View style={styles.bancoHeader}>
        <Text style={styles.bancoTitulo}>Banco</Text>
        <Text style={styles.bancoContagem}>
          {banco.length}/{TAMANHO_BANCO}
        </Text>
      </View>
      {banco.length === 0 ? (
        <Text style={styles.bancoVazio}>Banco vazio.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bancoFaixa}>
          {banco.map(jogador => (
            <AvatarBanco
              key={jogador.id}
              jogador={jogador}
              tamanho={avatarBanco}
              noBanco
              bancoCheio={bancoCheio}
              selecionado={
                selecionado?.tipo === 'reserva' &&
                selecionado.valor === jogador.id
              }
              aoAlternarBanco={aoAlternarBanco}
              aoTocar={aoTocar}
              aoAbrirDetalhe={aoAbrirDetalhe}
            />
          ))}
        </ScrollView>
      )}

      {foraDoJogo.length > 0 ? (
        <>
          <View style={[styles.bancoHeader, styles.bancoHeaderFora]}>
            <Text style={styles.bancoTitulo}>Fora do jogo</Text>
            <Text style={styles.bancoContagem}>{foraDoJogo.length}</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bancoFaixa}>
            {foraDoJogo.map(jogador => (
              <AvatarBanco
                key={jogador.id}
                jogador={jogador}
                tamanho={avatarBanco}
                noBanco={false}
                bancoCheio={bancoCheio}
                selecionado={
                  selecionado?.tipo === 'reserva' &&
                  selecionado.valor === jogador.id
                }
                aoAlternarBanco={aoAlternarBanco}
                aoTocar={aoTocar}
                aoAbrirDetalhe={aoAbrirDetalhe}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

/** Cabeçalho: escudo + nome + formação (esq.) · overall · técnico (dir.). */
function Cabecalho({
  clube,
  forca,
  formacaoDetectada,
  reputacaoTecnico,
}: {
  clube: Clube;
  forca: ForcaTime | null;
  formacaoDetectada: string;
  reputacaoTecnico: number;
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const overall = Math.round(forca?.overall ?? 0);
  return (
    <View style={styles.cabecalho}>
      <View style={styles.cabInfo}>
        <Escudo clubeId={clube.id} sigla={clube.sigla} tamanho={40} />
        <View style={styles.cabTextos}>
          <Text style={styles.cabNome} numberOfLines={1}>
            {clube.nome}
          </Text>
          <View style={styles.cabFormacaoChip}>
            <Icone nome="tatica" tamanho={12} cor={cores.brand} />
            <Text style={styles.cabFormacao}>{formacaoDetectada}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cabDireita}>
        <View style={styles.cabOverall}>
          <Text
            style={[
              styles.cabOverallNum,
              {color: cores[faixaCorOverall(overall)]},
            ]}>
            {overall}
          </Text>
          <Text style={styles.cabOverallRotulo}>OVR</Text>
        </View>
        <CardTecnico reputacao={reputacaoTecnico} />
      </View>
    </View>
  );
}

/** Card compacto do técnico: reputação em estrelas (0-5) + valor. */
function CardTecnico({reputacao}: {reputacao: number}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const estrelas = Math.max(0, Math.min(5, Math.round(reputacao / 20)));
  return (
    <View style={styles.tecnico}>
      <Icone nome="conversa" tamanho={16} cor={cores.accent} />
      <Text style={styles.tecnicoEstrelas}>
        {'★'.repeat(estrelas)}
        <Text style={styles.tecnicoEstrelasVazias}>
          {'★'.repeat(5 - estrelas)}
        </Text>
      </Text>
      <Text style={styles.tecnicoRotulo}>Técnico</Text>
    </View>
  );
}

/** Banner compacto de validação: 1ª mensagem de erro/aviso, ou "válida". */
function BannerValidacao({
  validacao,
}: {
  validacao: ReturnType<typeof validarEscalacao>;
}): React.JSX.Element | null {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  if (!validacao.valido) {
    return (
      <View style={[styles.banner, styles.bannerErro]}>
        <Icone nome="fechar" tamanho={14} cor={cores.danger} />
        <Text style={[styles.bannerTexto, {color: cores.danger}]}>
          {validacao.erros[0]}
        </Text>
      </View>
    );
  }
  if (validacao.avisos.length > 0) {
    return (
      <View style={[styles.banner, styles.bannerAviso]}>
        <Icone nome="lesao" tamanho={14} cor={cores.accent} />
        <Text style={[styles.bannerTexto, {color: cores.warning}]}>
          {validacao.avisos[0]}
          {validacao.avisos.length > 1
            ? ` (+${validacao.avisos.length - 1})`
            : ''}
        </Text>
      </View>
    );
  }
  // Escalação válida não desenha banner — o seletor de formação ocupa o lugar.
  return null;
}

/**
 * Ficha CIRCULAR do jogador no tabuleiro: círculo azul com o OVERALL e o nome
 * embaixo. Destaque (alvo de drop) = anel âmbar + cresce; esmaecer = card sendo
 * arrastado. Slot vazio = círculo tracejado com a posição.
 */
function CartaFUT({
  jogador,
  posicaoEscalada,
  largura,
  destaque,
  esmaecer,
  ehCapitao = false,
  semNome = false,
}: {
  jogador: Player | undefined;
  posicaoEscalada: Position;
  largura: number;
  destaque: boolean;
  esmaecer: boolean;
  ehCapitao?: boolean;
  semNome?: boolean; // oculta o rótulo do nome (usado na coluna lateral compacta)
}): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores, esporte} = useTheme();
  const raio2 = largura / 2;
  // Rótulo estreito e centrado sob a ficha (largura ~1.6× a ficha), com o nome
  // curto + reticências — antes 2.2× e nome inteiro faziam os nomes colidirem.
  const nomeStyle = {
    width: largura * 1.6,
    left: -largura * 0.3,
    top: largura + 2,
    fontSize: Math.max(9, Math.round(largura * 0.22)),
  };

  if (!jogador) {
    return (
      <View
        style={[
          styles.fichaVazia,
          {width: largura, height: largura, borderRadius: raio2},
        ]}>
        <Text
          style={[styles.fichaVaziaTexto, {fontSize: Math.round(largura * 0.3)}]}>
          {posicaoEscalada}
        </Text>
      </View>
    );
  }

  const indisponivel = jogador.lesionado || jogador.suspenso;
  const badge = Math.round(largura * 0.42);
  // Cor pela FUNÇÃO do jogador (posição principal), não pelo slot: um zagueiro
  // improvisado no ataque mantém a cor de defensor.
  const cor = esporte.posicao[areaDaPosicao(jogador.posicaoPrincipal)].cor;

  return (
    <View>
      <View
        style={[
          {width: largura, height: largura},
          destaque ? styles.fichaDestaque : null,
          esmaecer ? styles.fichaEsmaecida : null,
        ]}>
        <Svg
          width={largura}
          height={largura}
          viewBox="0 0 48 48"
          style={StyleSheet.absoluteFill}>
          <Path
            d={CAMISA_PATH}
            fill={cor}
            stroke={cores.onBrand}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
        <View style={[styles.camisaCentro, {paddingTop: largura * 0.14}]}>
          <Text
            style={[styles.fichaOverall, {fontSize: Math.round(largura * 0.34)}]}>
            {jogador.overall}
          </Text>
        </View>
        {ehCapitao ? (
          <Text
            style={[styles.fichaCapitao, {fontSize: Math.round(largura * 0.28)}]}>
            C
          </Text>
        ) : null}
        {indisponivel ? (
          <View
            style={[
              styles.fichaStatus,
              {width: badge, height: badge, borderRadius: badge / 2},
            ]}>
            <Icone
              nome={jogador.lesionado ? 'lesao' : 'cartao'}
              tamanho={Math.round(largura * 0.24)}
              cor={cores.onBrand}
            />
          </View>
        ) : null}
      </View>
      {semNome ? null : (
        <Text
          style={[styles.fichaNome, nomeStyle]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {nomeCampo(jogador)}
        </Text>
      )}
    </View>
  );
}

type PecaCampoProps = {
  slotIndex: number;
  jogador: Player | undefined;
  posicaoEscalada: Position;
  ehCapitao: boolean;
  cx: number;
  cy: number;
  cardW: number;
  cardH: number;
  selecionado: boolean;
  aoTocar: (tipo: string, valor: string) => void;
  aoAbrirDetalhe: (tipo: string, valor: string) => void;
};

function PecaCampo({
  slotIndex,
  jogador,
  posicaoEscalada,
  ehCapitao,
  cx,
  cy,
  cardW,
  cardH,
  selecionado,
  aoTocar,
  aoAbrirDetalhe,
}: PecaCampoProps): React.JSX.Element {
  const gesto = useGestoPeca(
    'titular',
    String(slotIndex),
    aoTocar,
    aoAbrirDetalhe,
  );

  return (
    <GestureDetector gesture={gesto}>
      <View
        style={[
          estilosFixos.slotWrap,
          {left: cx - cardW / 2, top: cy - cardH / 2, width: cardW},
        ]}>
        <CartaFUT
          jogador={jogador}
          posicaoEscalada={posicaoEscalada}
          largura={cardW}
          destaque={selecionado}
          esmaecer={false}
          ehCapitao={ehCapitao}
        />
      </View>
    </GestureDetector>
  );
}

type AvatarBancoProps = {
  jogador: Player;
  tamanho: number;
  noBanco: boolean; // true = está no banco (chip "−"); false = fora (chip "+")
  bancoCheio: boolean;
  selecionado: boolean;
  aoAlternarBanco: (id: string) => void;
  aoTocar: (tipo: string, valor: string) => void;
  aoAbrirDetalhe: (tipo: string, valor: string) => void;
};

/**
 * Item do BANCO horizontal (estilo mockup): rosto do jogador num anel colorido
 * pela posição + selo de overall + nome + tag de status (lesão/suspensão). O
 * rosto é selecionável por toque; o chip +/− chama/tira do banco.
 */
function AvatarBanco({
  jogador,
  tamanho,
  noBanco,
  bancoCheio,
  selecionado,
  aoAlternarBanco,
  aoTocar,
  aoAbrirDetalhe,
}: AvatarBancoProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  const {cores, esporte} = useTheme();
  const gesto = useGestoPeca('reserva', jogador.id, aoTocar, aoAbrirDetalhe);
  const cor = esporte.posicao[areaDaPosicao(jogador.posicaoPrincipal)].cor;
  const apto = !jogador.lesionado && !jogador.suspenso;
  const chipDesabilitado = !noBanco && bancoCheio;
  const status = jogador.lesionado
    ? 'Lesão'
    : jogador.suspenso
    ? 'Suspenso'
    : null;
  return (
    <View style={[styles.avatarItem, {width: tamanho + espacamento[3]}]}>
      <View>
        <GestureDetector gesture={gesto}>
          <View
            style={[
              styles.avatarAnel,
              {
                width: tamanho + 8,
                height: tamanho + 8,
                borderRadius: (tamanho + 8) / 2,
                borderColor: cor,
              },
              selecionado ? styles.avatarAnelSel : null,
              !apto ? estilosFixos.reservaIndisponivel : null,
            ]}>
            <PlayerAvatar id={jogador.id} tamanho={tamanho} />
          </View>
        </GestureDetector>
        <View style={[styles.avatarOverall, {borderColor: cor}]}>
          <Text style={styles.avatarOverallTexto}>{jogador.overall}</Text>
        </View>
        <Pressable
          style={[
            styles.avatarChip,
            {backgroundColor: noBanco ? cores.danger : cores.brand},
            chipDesabilitado ? styles.bancoChipDesabilitado : null,
          ]}
          hitSlop={6}
          disabled={chipDesabilitado}
          onPress={() => aoAlternarBanco(jogador.id)}
          accessibilityLabel={
            noBanco
              ? `Tirar ${jogador.nome} do jogo`
              : `Chamar ${jogador.nome} para o banco`
          }>
          <Text style={styles.avatarChipTexto}>{noBanco ? '−' : '+'}</Text>
        </Pressable>
      </View>
      <Text style={styles.avatarNome} numberOfLines={1}>
        {nomeCampo(jogador)}
      </Text>
      {status ? (
        <View style={styles.avatarStatus}>
          <Text style={styles.avatarStatusTexto}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Campo tático CHAPADO (visto de cima): gramado com listras + linhas de cal
 * brancas (borda, meio, círculo central, áreas). viewBox proporcional ao
 * container (sem distorção), SVG puro — sem perspectiva.
 */
function PitchEstadio({
  largura,
  altura,
}: {
  largura: number;
  altura: number;
}): React.JSX.Element {
  const VH = Math.round((altura / largura) * 100);
  const M = 3.5;
  const meio = VH / 2;
  const areaH = Math.round(VH * 0.13);
  const golH = Math.round(VH * 0.05);
  const raioC = 9;
  const faixas = 8;
  const fh = VH / faixas;
  const sw = 0.7;
  return (
    <Svg
      width={largura}
      height={altura}
      viewBox={`0 0 100 ${VH}`}
      preserveAspectRatio="none"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={100} height={VH} fill={CAMPO_VERDE} />
      {Array.from({length: faixas}).map((_, i) =>
        i % 2 === 0 ? (
          <Rect
            key={i}
            x={0}
            y={i * fh}
            width={100}
            height={fh}
            fill={CAMPO_VERDE_2}
          />
        ) : null,
      )}
      <Rect
        x={M}
        y={M}
        width={100 - 2 * M}
        height={VH - 2 * M}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Line
        x1={M}
        y1={meio}
        x2={100 - M}
        y2={meio}
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Ellipse
        cx={50}
        cy={meio}
        rx={raioC}
        ry={raioC}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Ellipse cx={50} cy={meio} rx={0.9} ry={0.9} fill={LINHA_CAMPO} />
      {/* Área de ataque (topo) */}
      <Rect
        x={25}
        y={M}
        width={50}
        height={areaH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Rect
        x={37}
        y={M}
        width={26}
        height={golH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      {/* Área de defesa (base) */}
      <Rect
        x={25}
        y={VH - M - areaH}
        width={50}
        height={areaH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
      <Rect
        x={37}
        y={VH - M - golH}
        width={26}
        height={golH}
        fill="none"
        stroke={LINHA_CAMPO}
        strokeWidth={sw}
      />
    </Svg>
  );
}

export default CampoFUT;

// Cores do gramado (tabuleiro chapado): verde base + verde da listra ceifada e
// linhas de cal brancas. Objeto de campo — fixo nos dois temas.
const CAMPO_VERDE = '#2E9E58';
const CAMPO_VERDE_2 = '#2A9151';
const LINHA_CAMPO = 'rgba(255, 255, 255, 0.85)';

// Silhueta de CAMISA (viewBox 0 0 48 48): gola + ombros + mangas + corpo. O
// número (overall) é sobreposto por cima como <Text> (fonte consistente).
const CAMISA_PATH =
  'M18 6 C20 9 28 9 30 6 L38 9 L47 18 L40 26 L36 23 L36 41 C36 43.5 34.5 45 32 45 L16 45 C13.5 45 12 43.5 12 41 L12 23 L8 26 L1 18 L10 9 Z';

/**
 * Setas de MOVIMENTO TÁTICO: uma seta por jogador cuja DIREÇÃO e TAMANHO vêm de
 * `vetorSeta(posição, tática)` — logo, refletem a estratégia (frente/trás,
 * flancos, ritmo). Overlay abaixo das camisas; pointerEvents desligado.
 */
function SetasMovimento({
  slots,
  titulares,
  tatica,
  cardH,
  largura,
  altura,
}: {
  slots: SlotTela[];
  titulares: TitularFormacao[];
  tatica: Tatica;
  cardH: number;
  largura: number;
  altura: number;
}): React.JSX.Element {
  const cor = 'rgba(255, 255, 255, 0.62)';
  return (
    <Svg
      width={largura}
      height={altura}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}>
      {slots.map(s => {
        const pos = titulares[s.slotIndex]?.posicao;
        const v = pos ? vetorSeta(pos, tatica) : null;
        if (!v) {
          return null;
        }
        const mag = Math.hypot(v.dx, v.dy);
        const ux = v.dx / mag;
        const uy = v.dy / mag;
        const comp = Math.min(Math.max(mag, 0.5), 1.7) * cardH * 0.85;
        const sx = s.cx + ux * cardH * 0.58; // parte da borda da camisa
        const sy = s.cy + uy * cardH * 0.58;
        const ex = sx + ux * comp;
        const ey = sy + uy * comp;
        const wing = cardH * 0.24;
        const px = -uy; // perpendicular unitária
        const py = ux;
        const bx = ex - ux * wing * 0.85;
        const by = ey - uy * wing * 0.85;
        return (
          <React.Fragment key={s.slotIndex}>
            <Line
              x1={sx}
              y1={sy}
              x2={ex}
              y2={ey}
              stroke={cor}
              strokeWidth={2}
              strokeDasharray="3,3"
              strokeLinecap="round"
            />
            <Path
              d={`M ${bx + px * wing * 0.6} ${by + py * wing * 0.6} L ${ex} ${ey} L ${bx - px * wing * 0.6} ${by - py * wing * 0.6}`}
              fill="none"
              stroke={cor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/**
 * LINHA DE IMPEDIMENTO: marcação horizontal na altura da última linha de defesa,
 * que SOBE com a linha "Adiantada" (armadilha de impedimento alta) e RECUA com a
 * "Recuada". Deriva da posição média dos zagueiros + o ajuste da Linha defensiva.
 */
function LinhaImpedimento({
  slots,
  titulares,
  tatica,
  cardH,
  largura,
}: {
  slots: SlotTela[];
  titulares: TitularFormacao[];
  tatica: Tatica;
  cardH: number;
  largura: number;
}): React.JSX.Element | null {
  const styles = useEstilosDS(criarEstilos);
  const {cores} = useTheme();
  const defs = slots.filter(
    s => areaDaPosicao(titulares[s.slotIndex]?.posicao ?? 'MC') === 'defesa',
  );
  if (defs.length === 0) {
    return null;
  }
  const yBase = defs.reduce((soma, s) => soma + s.cy, 0) / defs.length;
  const desloc =
    tatica.linhaDefensiva === 'Adiantada'
      ? -cardH
      : tatica.linhaDefensiva === 'Recuada'
      ? cardH
      : 0;
  const y = yBase + desloc;
  return (
    <View
      pointerEvents="none"
      style={[styles.linhaImped, {top: y - 8, width: largura}]}>
      <Svg width={largura} height={16}>
        <Line
          x1={4}
          y1={8}
          x2={largura - 4}
          y2={8}
          stroke={cores.accent}
          strokeWidth={2}
          strokeDasharray="7,5"
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.linhaImpedTag, {backgroundColor: cores.accent}]}>
        <Text style={styles.linhaImpedTagTxt}>IMPEDIMENTO</Text>
      </View>
    </View>
  );
}

const criarEstilos = (t: TemaDS) =>
  StyleSheet.create({
    overlay: {
      gap: espacamento[2],
    },
    cabecalho: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.border,
      borderRadius: raios.md,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: espacamento[2],
    },
    cabInfo: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: espacamento[2],
    },
    cabTextos: {
      flex: 1,
      gap: 3,
    },
    cabNome: {
      color: t.cores.textPrimary,
      fontSize: 15,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    cabFormacaoChip: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: raios.sm,
      flexDirection: 'row',
      gap: 4,
      paddingHorizontal: espacamento[2],
      paddingVertical: 2,
    },
    cabFormacao: {
      color: t.cores.textPrimary,
      fontSize: 12,
      fontWeight: '800',
    },
    cabDireita: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[2],
    },
    cabOverall: {
      alignItems: 'center',
    },
    cabOverallNum: {
      fontSize: 30,
      fontWeight: '900',
      letterSpacing: -1,
    },
    cabOverallRotulo: {
      color: t.cores.textSecondary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: -2,
    },
    tecnico: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderColor: t.cores.border,
      borderRadius: raios.sm,
      borderWidth: 1,
      gap: 1,
      paddingHorizontal: espacamento[2],
      paddingVertical: espacamento[1],
    },
    tecnicoEstrelas: {
      color: t.cores.accent,
      fontSize: 11,
      letterSpacing: 1,
    },
    tecnicoEstrelasVazias: {
      color: t.cores.borderStrong,
    },
    tecnicoRotulo: {
      color: t.cores.textSecondary,
      fontSize: 9,
      fontWeight: '700',
    },
    banner: {
      alignItems: 'center',
      borderRadius: raios.sm,
      borderWidth: 1,
      flexDirection: 'row',
      gap: espacamento[1],
      paddingHorizontal: espacamento[2],
      paddingVertical: espacamento[1],
    },
    bannerErro: {
      backgroundColor: t.cores.dangerSoft,
      borderColor: t.cores.danger,
    },
    bannerAviso: {
      backgroundColor: t.cores.accentSoft,
      borderColor: t.cores.accent,
    },
    bannerTexto: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
    },
    pitch: {
      alignSelf: 'center',
      position: 'relative',
    },
    linhaImped: {
      position: 'absolute',
      left: 0,
      height: 16,
      justifyContent: 'center',
    },
    linhaImpedTag: {
      position: 'absolute',
      left: 6,
      top: 1,
      borderRadius: raios.sm,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    linhaImpedTagTxt: {
      color: '#0B1E3F',
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    botaoMelhores: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderColor: t.cores.accent,
      borderRadius: 999,
      borderWidth: 1.5,
      elevation: 3,
      height: 38,
      justifyContent: 'center',
      position: 'absolute',
      right: 6,
      shadowColor: '#0F1E3D',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.12,
      shadowRadius: 5,
      top: 6,
      width: 38,
      zIndex: 999,
    },
    ficha: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cores.brand,
      borderWidth: 2,
      borderColor: t.cores.onBrand,
    },
    camisaCentro: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    fichaOverall: {
      color: t.cores.onBrand,
      fontWeight: '900',
      textShadowColor: 'rgba(0, 0, 0, 0.35)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaNome: {
      position: 'absolute',
      textAlign: 'center',
      color: t.cores.onBrand,
      fontSize: 10,
      fontWeight: '800',
      textShadowColor: 'rgba(0, 0, 0, 0.55)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaDestaque: {
      borderColor: t.cores.accent,
      borderWidth: 3,
      elevation: 8,
      shadowColor: t.cores.accent,
      shadowOffset: {width: 0, height: 0},
      shadowOpacity: 0.85,
      shadowRadius: 8,
      transform: [{scale: 1.14}],
    },
    fichaEsmaecida: {
      opacity: 0.35,
    },
    fichaVazia: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.16)',
      borderColor: 'rgba(255, 255, 255, 0.7)',
      borderStyle: 'dashed',
      borderWidth: 2,
    },
    fichaVaziaTexto: {
      color: t.cores.onBrand,
      fontWeight: '800',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaCapitao: {
      position: 'absolute',
      top: -2,
      right: 0,
      color: t.cores.accent,
      fontWeight: '900',
      textShadowColor: 'rgba(0, 0, 0, 0.6)',
      textShadowOffset: {width: 0, height: 1},
      textShadowRadius: 2,
    },
    fichaStatus: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.cores.danger,
      borderWidth: 1.5,
      borderColor: t.cores.onBrand,
      position: 'absolute',
      right: -2,
      bottom: -2,
      zIndex: 5,
    },
    bancoHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: espacamento[1],
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    bancoHeaderFora: {
      marginTop: espacamento[1],
    },
    bancoTitulo: {
      color: t.cores.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    bancoContagem: {
      backgroundColor: t.cores.surfaceSubtle,
      borderRadius: 999,
      color: t.cores.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      overflow: 'hidden',
      paddingHorizontal: 7,
      paddingVertical: 1,
    },
    bancoVazio: {
      color: t.cores.textSecondary,
      fontSize: 11,
      paddingHorizontal: 2,
    },
    bancoFaixa: {
      gap: espacamento[1],
      paddingHorizontal: 2,
      paddingVertical: espacamento[1],
    },
    avatarItem: {
      alignItems: 'center',
      gap: 3,
    },
    avatarAnel: {
      alignItems: 'center',
      backgroundColor: t.cores.surfaceSubtle,
      borderWidth: 2.5,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarAnelSel: {
      borderColor: t.cores.accent,
    },
    avatarOverall: {
      alignItems: 'center',
      backgroundColor: t.cores.surface,
      borderRadius: 999,
      borderWidth: 1.5,
      justifyContent: 'center',
      minWidth: 20,
      paddingHorizontal: 3,
      position: 'absolute',
      right: -2,
      top: -2,
    },
    avatarOverallTexto: {
      color: t.cores.textPrimary,
      fontSize: 10,
      fontWeight: '900',
    },
    avatarChip: {
      alignItems: 'center',
      borderRadius: 9,
      bottom: -2,
      height: 18,
      justifyContent: 'center',
      left: -2,
      position: 'absolute',
      width: 18,
    },
    avatarChipTexto: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
      lineHeight: 15,
    },
    avatarNome: {
      color: t.cores.textPrimary,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },
    avatarStatus: {
      backgroundColor: t.cores.dangerSoft,
      borderRadius: raios.sm,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    avatarStatusTexto: {
      color: t.cores.danger,
      fontSize: 9,
      fontWeight: '800',
    },
    bancoChipDesabilitado: {opacity: 0.4},
  });

/**
 * Estilos SEM cor (geometria/estado) das peças de gesto. Estáticos de propósito:
 * PecaCampo/PecaReserva não dependem do tema, então não precisam do hook e a
 * lógica de drag-drop fica intocada.
 */
const estilosFixos = StyleSheet.create({
  slotWrap: {
    position: 'absolute',
  },
  reservaIndisponivel: {
    opacity: 0.5,
  },
});
