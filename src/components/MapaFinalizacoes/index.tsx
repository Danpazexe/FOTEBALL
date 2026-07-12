/**
 * MapaFinalizacoes — mapa de chutes estilo Sofascore (meia-quadra de ataque:
 * gol no topo, grande/pequena área, marca do pênalti; cada chute é um dot cujo
 * TAMANHO reflete o xG e a COR o desfecho).
 *
 * Recebe uma lista JÁ FILTRADA (time + tempo) de `Finalizacao` — a extração é
 * pura e determinística (`engine/simulation/finalizacoes`). Só desenho aqui.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, ClipPath, Defs, G, Line, Path, Rect} from 'react-native-svg';

import {cores, espaco} from '../../theme';

/** Cor "sem preenchimento" para os dots vazados (fora/bloqueada). */
const TRANSPARENTE = 'transparent';
import type {Finalizacao, ResultadoFinalizacao} from '../../engine/simulation/finalizacoes';

// Cal e turfa noturna — mesmos tons do CampoFUT (coerência visual).
const LINHA = 'rgba(234, 242, 230, 0.55)';
const TURFA = '#0F2E1E';
const TURFA_LISTRA = '#16402A';
const LISTRAS = 6;

/** Cor + preenchimento do dot conforme o desfecho do chute. */
function estiloResultado(resultado: ResultadoFinalizacao): {
  cor: string;
  preenchido: boolean;
} {
  switch (resultado) {
    case 'gol':
      return {cor: cores.sucesso, preenchido: true};
    case 'defesa':
      return {cor: cores.aviso, preenchido: true};
    case 'trave':
      return {cor: cores.secundaria, preenchido: true};
    case 'penalti_perdido':
      return {cor: cores.perigo, preenchido: true};
    case 'bloqueada':
      return {cor: cores.textoSecundario, preenchido: false};
    default: // fora
      return {cor: cores.textoMuted, preenchido: false};
  }
}

type LegendaItem = {rotulo: string; cor: string; preenchido: boolean};

const LEGENDA: LegendaItem[] = [
  {rotulo: 'Gol', cor: cores.sucesso, preenchido: true},
  {rotulo: 'No alvo', cor: cores.aviso, preenchido: true},
  {rotulo: 'Trave', cor: cores.secundaria, preenchido: true},
  {rotulo: 'Para fora', cor: cores.textoMuted, preenchido: false},
];

export default function MapaFinalizacoes({
  finalizacoes,
  largura,
  vazioTexto = 'Sem finalizações no filtro selecionado.',
}: {
  finalizacoes: Finalizacao[];
  largura: number;
  vazioTexto?: string;
}): React.JSX.Element {
  const W = largura;
  const H = Math.round(W * 0.96);
  const mx = 10;
  const mb = 10;
  const goalY = 18;
  const areaW = W * 0.6;
  const areaH = H * 0.3;
  const golW = W * 0.28;
  const golH = 8;
  const pequenaW = W * 0.3;
  const pequenaH = H * 0.11;
  const pitchTop = goalY;
  const pitchBottom = H - mb;
  const depth = pitchBottom - pitchTop;
  const cx = W / 2;
  const penaltiY = goalY + depth * 0.2;

  // Resumo (a lista já vem filtrada por time/tempo).
  const total = finalizacoes.length;
  const gols = finalizacoes.filter(f => f.gol).length;
  const noAlvo = finalizacoes.filter(
    f => f.resultado === 'gol' || f.resultado === 'defesa',
  ).length;

  // Converte coordenada normalizada (0..1) → pixel do SVG.
  const px = (x: number): number => mx + x * (W - 2 * mx);
  const py = (y: number): number => pitchTop + y * depth;
  const raioDot = (xG: number): number => 3 + Math.min(1, xG) * 9;

  return (
    <View style={styles.wrap}>
      <View style={styles.resumo}>
        <Resumo valor={total} rotulo="Finalizações" />
        <Resumo valor={noAlvo} rotulo="No alvo" />
        <Resumo valor={gols} rotulo="Gols" destaque />
      </View>

      <Svg width={W} height={H}>
        <Defs>
          <ClipPath id="mapaClip">
            <Rect x={mx} y={goalY} width={W - 2 * mx} height={H - goalY - mb} rx={12} />
          </ClipPath>
        </Defs>
        {/* Turfa + listras ceifadas. */}
        <G clipPath="url(#mapaClip)">
          <Rect x={mx} y={goalY} width={W - 2 * mx} height={H - goalY - mb} fill={TURFA} />
          {Array.from({length: LISTRAS}).map((_, i) =>
            i % 2 === 1 ? (
              <Rect
                key={`l-${i}`}
                x={mx + ((W - 2 * mx) / LISTRAS) * i}
                y={goalY}
                width={(W - 2 * mx) / LISTRAS}
                height={H - goalY - mb}
                fill={TURFA_LISTRA}
              />
            ) : null,
          )}
        </G>
        {/* Contorno do campo. */}
        <Rect
          x={mx}
          y={goalY}
          width={W - 2 * mx}
          height={H - goalY - mb}
          rx={12}
          fill="none"
          stroke={LINHA}
          strokeWidth={1.5}
        />
        {/* Baliza (gol) no topo. */}
        <Rect
          x={cx - golW / 2}
          y={goalY - golH}
          width={golW}
          height={golH}
          fill="none"
          stroke={LINHA}
          strokeWidth={2.5}
        />
        {/* Grande área. */}
        <Rect
          x={cx - areaW / 2}
          y={goalY}
          width={areaW}
          height={areaH}
          fill="none"
          stroke={LINHA}
          strokeWidth={1.5}
        />
        {/* Pequena área. */}
        <Rect
          x={cx - pequenaW / 2}
          y={goalY}
          width={pequenaW}
          height={pequenaH}
          fill="none"
          stroke={LINHA}
          strokeWidth={1.2}
        />
        {/* Meia-lua no limite da área. */}
        <Path
          d={`M ${cx - areaW * 0.18} ${goalY + areaH} Q ${cx} ${
            goalY + areaH + H * 0.07
          } ${cx + areaW * 0.18} ${goalY + areaH}`}
          fill="none"
          stroke={LINHA}
          strokeWidth={1.2}
        />
        {/* Marca do pênalti. */}
        <Circle cx={cx} cy={penaltiY} r={2} fill={LINHA} />
        {/* Linha de fundo do terço (limite inferior do mapa). */}
        <Line
          x1={mx}
          y1={pitchBottom}
          x2={W - mx}
          y2={pitchBottom}
          stroke={LINHA}
          strokeWidth={1.2}
        />

        {/* Dots dos chutes: gols por último (ficam por cima). */}
        {[...finalizacoes]
          .sort((a, b) => Number(a.gol) - Number(b.gol))
          .map((f, i) => {
            const {cor, preenchido} = estiloResultado(f.resultado);
            const r = raioDot(f.xG);
            return (
              <Circle
                key={`${f.minuto}-${f.jogadorId}-${i}`}
                cx={px(f.x)}
                cy={py(f.y)}
                r={r}
                fill={preenchido ? cor : 'transparent'}
                stroke={cor}
                strokeWidth={preenchido ? 1 : 1.6}
                opacity={0.92}
              />
            );
          })}
      </Svg>

      {total === 0 ? <Text style={styles.vazio}>{vazioTexto}</Text> : null}

      <View style={styles.legenda}>
        {LEGENDA.map(item => {
          const fundo = item.preenchido ? item.cor : TRANSPARENTE;
          return (
            <View key={item.rotulo} style={styles.legendaItem}>
              <View
                style={[
                  styles.legendaDot,
                  {borderColor: item.cor, backgroundColor: fundo},
                ]}
              />
              <Text style={styles.legendaTexto}>{item.rotulo}</Text>
            </View>
          );
        })}
        <Text style={styles.legendaXg}>tamanho = xG</Text>
      </View>
    </View>
  );
}

function Resumo({
  valor,
  rotulo,
  destaque = false,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.resumoItem}>
      <Text style={[styles.resumoValor, destaque && {color: cores.primariaClara}]}>
        {valor}
      </Text>
      <Text style={styles.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: espaco.sm,
  },
  resumo: {
    flexDirection: 'row',
    gap: espaco.lg,
    justifyContent: 'center',
  },
  resumoItem: {
    alignItems: 'center',
  },
  resumoValor: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: '900',
  },
  resumoRotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  vazio: {
    color: cores.textoSecundario,
    fontSize: 12,
    textAlign: 'center',
  },
  legenda: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
    justifyContent: 'center',
  },
  legendaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  legendaDot: {
    borderRadius: 999,
    borderWidth: 1.6,
    height: 11,
    width: 11,
  },
  legendaTexto: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  legendaXg: {
    color: cores.textoMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
});
