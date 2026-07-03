/**
 * Lance "clean" da narração ao vivo (modelo SofaScore): eventos do mandante
 * alinham à ESQUERDA e os do visitante à DIREITA, com o minuto na borda
 * externa; gol carrega a pill do placar no momento; assistência (ou quem saiu,
 * na substituição) aparece em cinza logo abaixo do nome. Marcos da partida
 * (início/intervalo/2º tempo/fim) ficam centralizados com caixinha de placar.
 */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Icone, {type IconeNome} from '../Icone';
import {acentos, cores, espaco, raio} from '../../theme';

export type LadoLance = 'casa' | 'fora' | 'neutro';

type LanceLimpoProps = {
  minuto: number;
  tipo: string;
  lado: LadoLance;
  /** Nome principal do lance (autor do gol, quem entra na troca...). */
  autor?: string;
  /** Linha cinza secundária: "(assistente)", "(quem saiu)", "(pênalti)". */
  detalhe?: string;
  /** Placar no momento do lance — só em gols e marcos. */
  placarPill?: string;
  /** Fallback para itens antigos/sem estrutura (marcos usam o rótulo). */
  descricao: string;
};

function rotuloMarco(tipo: string): string | null {
  if (tipo === 'inicio') {
    return 'Início de jogo';
  }
  if (tipo === 'intervalo') {
    return 'Intervalo';
  }
  if (tipo === 'segundo_tempo') {
    return '2º tempo';
  }
  if (tipo === 'fim') {
    return 'Fim de jogo';
  }
  return null;
}

function iconeDoTipo(tipo: string): {nome: IconeNome; cor: string} | null {
  if (tipo === 'gol') {
    return {nome: 'bola', cor: acentos.verde};
  }
  if (tipo === 'substituicao') {
    return {nome: 'substituicao', cor: acentos.azul};
  }
  if (tipo === 'lesao') {
    return {nome: 'lesao', cor: acentos.vermelho};
  }
  if (tipo === 'penalti') {
    return {nome: 'penalti', cor: acentos.laranja};
  }
  if (tipo === 'chance_perdida') {
    return {nome: 'chance', cor: cores.textoMuted};
  }
  return null;
}

export function LanceLimpo({
  minuto,
  tipo,
  lado,
  autor,
  detalhe,
  placarPill,
  descricao,
}: LanceLimpoProps): React.JSX.Element {
  // Marcos centrais (início/intervalo/2º tempo/fim de jogo).
  if (lado === 'neutro') {
    return (
      <View style={styles.marco}>
        <Text style={styles.marcoRotulo}>{rotuloMarco(tipo) ?? descricao}</Text>
        {placarPill ? (
          <View style={styles.marcoPlacar}>
            <Text style={styles.marcoPlacarTexto}>{placarPill}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const ehCasa = lado === 'casa';
  const cartao = tipo === 'cartao_amarelo' || tipo === 'cartao_vermelho';
  const icone = iconeDoTipo(tipo);

  return (
    <View style={[styles.linha, ehCasa ? styles.linhaCasa : styles.linhaFora]}>
      <View style={[styles.lance, !ehCasa && styles.lanceInvertido]}>
        <Text style={styles.minuto}>{minuto}'</Text>
        {cartao ? (
          <View
            style={[
              styles.cartao,
              {
                backgroundColor:
                  tipo === 'cartao_amarelo' ? acentos.amarelo : acentos.vermelho,
              },
            ]}
          />
        ) : icone ? (
          <Icone nome={icone.nome} tamanho={15} cor={icone.cor} />
        ) : null}
        {placarPill ? (
          <View style={styles.pill}>
            <Text style={styles.pillTexto}>{placarPill}</Text>
          </View>
        ) : null}
        <Text style={styles.autor} numberOfLines={1}>
          {autor ?? descricao}
        </Text>
      </View>
      {detalhe ? (
        <Text
          style={[
            styles.detalhe,
            ehCasa ? styles.detalheCasa : styles.detalheFora,
          ]}
          numberOfLines={1}>
          {detalhe}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: espaco.sm,
  },
  marcoRotulo: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  marcoPlacar: {
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 2,
  },
  marcoPlacarTexto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '900',
  },
  linha: {
    paddingVertical: 5,
  },
  linhaCasa: {
    alignItems: 'flex-start',
  },
  linhaFora: {
    alignItems: 'flex-end',
  },
  lance: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
    maxWidth: '82%',
  },
  lanceInvertido: {
    flexDirection: 'row-reverse',
  },
  minuto: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 26,
    textAlign: 'center',
  },
  cartao: {
    borderRadius: 2,
    height: 14,
    width: 10,
  },
  pill: {
    backgroundColor: cores.superficie,
    borderColor: acentos.verde,
    borderRadius: raio.sm,
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  pillTexto: {
    color: cores.texto,
    fontSize: 11,
    fontWeight: '900',
  },
  autor: {
    color: cores.texto,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  detalhe: {
    color: cores.textoSecundario,
    fontSize: 11,
    marginTop: 1,
  },
  detalheCasa: {
    paddingLeft: 30 + espaco.xs * 2 + 15,
  },
  detalheFora: {
    paddingRight: 30 + espaco.xs * 2 + 15,
    textAlign: 'right',
  },
});

export default LanceLimpo;
