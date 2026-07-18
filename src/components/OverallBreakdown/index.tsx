/**
 * OverallBreakdown — bloco do Perfil do jogador que abre o Overall em duas
 * leituras: o Overall BASE (o que o atleta é, composto por 4 pilares) e o
 * Overall DE PARTIDA (o que ele é AGORA, modulado por forma/moral/condição).
 * Não é uma tela: é um Card para embutir no PlayerDetail. Puro em cima da
 * engine (ratings + overallPartida); nenhum número é inventado aqui.
 */
import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';

import {
  Box,
  Card,
  Divider,
  OverallRing,
  ProgressBar,
  Text,
  espacamento,
  useTheme,
  type CorTexto,
} from '../../design-system';
import {
  atributosEfetivos,
  overallDePartida,
} from '../../engine/progression/overallPartida';
import {calcularOverall} from '../../engine/progression/overall';
import {calcularRating, montarCoortes} from '../../engine/progression/ratings';
import type {Player} from '../../types';

type Props = {
  jogador: Player;
  /** População usada como coorte para montar os pilares do rating. */
  elenco: Player[];
};

/** Cor do delta: sobe = success, cai = danger, neutro = textSecondary. */
function corDelta(delta: number): CorTexto {
  if (delta > 0) {
    return 'success';
  }
  if (delta < 0) {
    return 'danger';
  }
  return 'textSecondary';
}

/** Rótulo do delta com sinal explícito (o negativo já vem com "-"). */
function rotuloDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export default function OverallBreakdown({
  jogador,
  elenco,
}: Props): React.JSX.Element {
  const {cores} = useTheme();

  // Coortes são O(n log n): memoiza pela população.
  const coortes = useMemo(() => montarCoortes(elenco), [elenco]);
  const rating = useMemo(
    () => calcularRating(jogador, coortes),
    [jogador, coortes],
  );
  const partida = useMemo(() => overallDePartida(jogador), [jogador]);

  const {fatores} = partida;
  // Contribuição de CADA fator em PONTOS de overall (não % do multiplicador):
  // isola o fator (demais neutros = 1) e mede o quanto o overall se move em
  // relação ao base. Assim os números reconciliam com "Em partida" (Base±8), em
  // vez de mostrarem o −20% do multiplicador que não bate com o overall.
  const pontosFator = (chave: 'fisico' | 'tecnico' | 'mental'): number => {
    const fs = {fisico: 1, tecnico: 1, mental: 1, goleiro: 1};
    fs[chave] = fatores[chave];
    fs.goleiro = (fs.fisico + fs.mental) / 2;
    const efetivos = atributosEfetivos(jogador, fs);
    return Math.round(
      calcularOverall(efetivos, jogador.posicaoPrincipal) - jogador.overall,
    );
  };
  const deltaForma = pontosFator('tecnico');
  const deltaMoral = pontosFator('mental');
  const deltaCondicao = pontosFator('fisico');

  const pilares: Array<{rotulo: string; valor: number; cor: string}> = [
    {rotulo: 'Técnica', valor: rating.pilares.tecnica, cor: cores.brand},
    {rotulo: 'Temporada', valor: rating.pilares.temporada, cor: cores.info},
    {rotulo: 'Avançadas', valor: rating.pilares.avancadas, cor: cores.accent},
    {rotulo: 'Mercado', valor: rating.pilares.mercado, cor: cores.success},
  ];

  return (
    <Card variante="outlined" padding={4}>
      <Box gap={5}>
        {/* Números lado a lado: Base × Partida */}
        <Box direction="row" align="center">
          <Box flex={1} align="center" gap={1}>
            <Text variant="caption" color="textSecondary">
              OVERALL BASE
            </Text>
            <Text variant="display" tabular>
              {rating.overallBase}
            </Text>
          </Box>
          <Divider vertical style={estilos.dividerVertical} />
          <Box flex={1} align="center" gap={1}>
            <Text variant="caption" color="textSecondary">
              EM PARTIDA
            </Text>
            <Box direction="row" align="center" gap={2}>
              <Text variant="display" tabular>
                {partida.overallPartida}
              </Text>
              <OverallRing
                valor={partida.overallPartida}
                tamanho={40}
                rotulo=""
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Fatores que impactam o overall de partida */}
        <Box gap={3}>
          <Text variant="labelL" color="textSecondary">
            Fatores que impactam o overall de partida
          </Text>
          <Box direction="row" gap={2}>
            <FatorCell rotulo="Forma" delta={deltaForma} />
            <FatorCell rotulo="Moral" delta={deltaMoral} />
            <FatorCell rotulo="Condição" delta={deltaCondicao} />
            {/* Entrosamento ainda não é modelado: placeholder honesto. */}
            <FatorCell rotulo="Entros." />
          </Box>
        </Box>

        <Divider />

        {/* Composição do Overall Base pelos 4 pilares */}
        <Box gap={3}>
          <Text variant="labelL" color="textSecondary">
            Composição do Overall Base
          </Text>
          <Box gap={3}>
            {pilares.map(pilar => (
              <Box
                key={pilar.rotulo}
                direction="row"
                align="center"
                gap={3}>
                <Text variant="labelM" style={estilos.rotuloPilar}>
                  {pilar.rotulo}
                </Text>
                <Box flex={1}>
                  <ProgressBar valor={pilar.valor} cor={pilar.cor} altura={8} />
                </Box>
                <Text
                  variant="numeric"
                  tabular
                  align="right"
                  style={estilos.valorPilar}>
                  {pilar.valor}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Card>
  );
}

/** Célula de fator: rótulo + delta colorido; sem delta = placeholder "—". */
function FatorCell({
  rotulo,
  delta,
}: {
  rotulo: string;
  delta?: number;
}): React.JSX.Element {
  return (
    <Box
      flex={1}
      align="center"
      gap={1}
      py={2}
      bg="surfaceSubtle"
      radius="md">
      <Text variant="caption" color="textSecondary">
        {rotulo}
      </Text>
      {delta === undefined ? (
        <Text variant="numeric" color="textSecondary" tabular>
          —
        </Text>
      ) : (
        <Text variant="numeric" color={corDelta(delta)} tabular>
          {rotuloDelta(delta)}
        </Text>
      )}
    </Box>
  );
}

const estilos = StyleSheet.create({
  dividerVertical: {marginHorizontal: espacamento[3]},
  rotuloPilar: {width: 88},
  valorPilar: {width: 28},
});
