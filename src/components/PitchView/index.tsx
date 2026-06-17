import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Circle, Line, Rect, Text as SvgText} from 'react-native-svg';

import {corOverall} from '../../theme';
import type {Formacao, Player, Position} from '../../types';

/**
 * Campo de futebol em SVG com os 11 titulares posicionados pela linha tática.
 * Cada ficha é tocável (abre o seletor de jogador no editor de escalação).
 */

type PitchViewProps = {
  formacao: Formacao;
  jogadores: Player[];
  onTapSlot?: (slotIndex: number) => void;
  largura?: number;
};

const VERDE_CAMPO = '#123524';
const VERDE_LINHA = '#1F5235';
const LINHA = 'rgba(240,244,255,0.55)';

/** Linha vertical do campo por posição (0 = gol, 4 = ataque). */
function linhaCampo(posicao: Position): number {
  if (posicao === 'GOL') {
    return 0;
  }
  if (posicao === 'ZAG' || posicao === 'LD' || posicao === 'LE') {
    return 1;
  }
  if (posicao === 'VOL' || posicao === 'MC') {
    return 2;
  }
  if (posicao === 'MEI' || posicao === 'PD' || posicao === 'PE') {
    return 3;
  }
  return 4;
}

const Y_POR_LINHA = [0.9, 0.72, 0.54, 0.37, 0.18];

function primeiroNome(jogador: Player): string {
  if (jogador.apelido) {
    return jogador.apelido;
  }
  const partes = jogador.nome.split(' ');
  return partes[partes.length - 1] ?? jogador.nome;
}

export function PitchView({
  formacao,
  jogadores,
  onTapSlot,
  largura = 320,
}: PitchViewProps) {
  const altura = largura * 1.4;
  const jogadoresPorId = new Map(jogadores.map(j => [j.id, j]));

  // Agrupa os índices dos titulares por linha do campo.
  const porLinha = new Map<number, number[]>();
  formacao.titulares.forEach((titular, index) => {
    const linha = linhaCampo(titular.posicao);
    const lista = porLinha.get(linha) ?? [];
    lista.push(index);
    porLinha.set(linha, lista);
  });

  const raioFicha = largura * 0.052;

  return (
    <View style={styles.wrap}>
      <Svg width={largura} height={altura}>
        {/* Gramado */}
        <Rect x={0} y={0} width={largura} height={altura} rx={10} fill={VERDE_CAMPO} />
        {/* Faixas */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Rect
            key={`faixa_${i}`}
            x={0}
            y={(altura / 6) * i}
            width={largura}
            height={altura / 12}
            fill={VERDE_LINHA}
            opacity={0.4}
          />
        ))}
        {/* Linhas do campo */}
        <Rect
          x={6}
          y={6}
          width={largura - 12}
          height={altura - 12}
          rx={8}
          stroke={LINHA}
          strokeWidth={2}
          fill="none"
        />
        <Line x1={6} y1={altura / 2} x2={largura - 6} y2={altura / 2} stroke={LINHA} strokeWidth={2} />
        <Circle cx={largura / 2} cy={altura / 2} r={largura * 0.13} stroke={LINHA} strokeWidth={2} fill="none" />
        {/* Áreas */}
        <Rect
          x={largura * 0.2}
          y={altura - 6 - altura * 0.13}
          width={largura * 0.6}
          height={altura * 0.13}
          stroke={LINHA}
          strokeWidth={2}
          fill="none"
        />
        <Rect
          x={largura * 0.2}
          y={6}
          width={largura * 0.6}
          height={altura * 0.13}
          stroke={LINHA}
          strokeWidth={2}
          fill="none"
        />

        {/* Fichas dos jogadores */}
        {Array.from(porLinha.entries()).flatMap(([linha, indices]) => {
          const y = Y_POR_LINHA[linha] * altura;
          return indices.map((slotIndex, posicaoNaLinha) => {
            const titular = formacao.titulares[slotIndex];
            const jogador = jogadoresPorId.get(titular.jogadorId);
            const x = ((posicaoNaLinha + 1) / (indices.length + 1)) * largura;
            const cor = jogador ? corOverall(jogador.overall) : '#8892A4';
            return (
              <React.Fragment key={`slot_${slotIndex}`}>
                <Circle
                  cx={x}
                  cy={y}
                  r={raioFicha}
                  fill="#0A0E1A"
                  stroke={cor}
                  strokeWidth={2.5}
                  onPress={onTapSlot ? () => onTapSlot(slotIndex) : undefined}
                />
                <SvgText
                  x={x}
                  y={y + raioFicha * 0.35}
                  fill={cor}
                  fontSize={raioFicha * 0.95}
                  fontWeight="bold"
                  textAnchor="middle"
                  onPress={onTapSlot ? () => onTapSlot(slotIndex) : undefined}>
                  {jogador ? jogador.overall : '--'}
                </SvgText>
                <SvgText
                  x={x}
                  y={y + raioFicha + 13}
                  fill="#F0F4FF"
                  fontSize={10}
                  fontWeight="600"
                  textAnchor="middle">
                  {jogador ? primeiroNome(jogador) : titular.posicao}
                </SvgText>
                <SvgText
                  x={x}
                  y={y - raioFicha - 5}
                  fill="rgba(240,244,255,0.6)"
                  fontSize={9}
                  fontWeight="700"
                  textAnchor="middle">
                  {titular.posicao}
                </SvgText>
              </React.Fragment>
            );
          });
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
