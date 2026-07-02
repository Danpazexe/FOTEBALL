import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Escudo from '../Escudo';
import Icone, {type IconeNome} from '../Icone';
import {
  acentos,
  contrasteTexto,
  cores,
  espaco,
  raio,
  sombra,
  suaves,
} from '../../theme';

export type LadoEvento = 'casa' | 'fora' | 'neutro';

type EventItemProps = {
  minuto: number;
  tipo: string;
  descricao: string;
  lado: LadoEvento;
  sigla?: string;
  corTime?: string;
  clubeId?: string;
};

/**
 * Item de evento da narração, no estilo "balão de conversa":
 * eventos do mandante encostam à esquerda, do visitante à direita, cada um
 * com badge da sigla e a cor do time — fica claro de quem é o lance. Os marcos
 * especiais ('inicio' | 'segundo_tempo' | 'fim' | 'intervalo') ficam centrados.
 */
export function EventItem({
  minuto,
  tipo,
  descricao,
  lado,
  sigla,
  corTime = cores.primaria,
  clubeId,
}: EventItemProps): React.JSX.Element {
  if (tipo === 'inicio' || tipo === 'segundo_tempo' || tipo === 'fim') {
    const destaque = tipo === 'fim';
    return (
      <View style={styles.centro}>
        <View style={[styles.marco, destaque ? styles.marcoFim : null]}>
          <Icone
            nome="apito"
            tamanho={14}
            cor={destaque ? cores.primaria : cores.textoSecundario}
          />
          <Text style={[styles.textoMarco, destaque ? styles.textoMarcoFim : null]}>
            {descricao}
          </Text>
        </View>
      </View>
    );
  }

  if (tipo === 'intervalo') {
    return (
      <View style={styles.centro}>
        <View style={styles.intervalo}>
          <Icone nome="relogio" tamanho={14} cor={cores.secundaria} />
          <Text style={styles.textoIntervalo}>{descricao}</Text>
        </View>
      </View>
    );
  }

  const ehGol = tipo === 'gol';
  const ehVisitante = lado === 'fora';

  return (
    <View
      style={[
        styles.bolhaWrap,
        {alignItems: ehVisitante ? 'flex-end' : 'flex-start'},
      ]}>
      <View
        style={[
          styles.bolha,
          ehVisitante ? styles.bolhaFora : styles.bolhaCasa,
          ehVisitante
            ? {borderRightColor: corTime, borderRightWidth: 3}
            : {borderLeftColor: corTime, borderLeftWidth: 3},
          ehGol ? styles.bolhaGol : null,
        ]}>
        <View
          style={[
            styles.cabecalho,
            ehVisitante ? styles.cabecalhoFora : null,
          ]}>
          {clubeId ? (
            <Escudo clubeId={clubeId} sigla={sigla ?? ''} tamanho={22} />
          ) : sigla ? (
            <View style={[styles.badge, {backgroundColor: corTime}]}>
              <Text style={[styles.badgeTexto, {color: contrasteTexto(corTime)}]}>
                {sigla}
              </Text>
            </View>
          ) : null}
          <Text style={styles.minuto}>{minuto}&apos;</Text>
          <Icone
            nome={iconePorTipo(tipo)}
            tamanho={ehGol ? 18 : 15}
            cor={corIconePorTipo(tipo, corTime)}
          />
        </View>
        <Text
          style={[
            styles.descricao,
            ehVisitante ? styles.descricaoFora : null,
            ehGol ? styles.descricaoGol : null,
          ]}
          numberOfLines={3}>
          {descricao}
        </Text>
      </View>
    </View>
  );
}

function iconePorTipo(tipo: string): IconeNome {
  switch (tipo) {
    case 'gol':
      return 'bola';
    case 'cartao_amarelo':
    case 'cartao_vermelho':
      return 'cartao';
    case 'lesao':
      return 'lesao';
    case 'substituicao':
      return 'substituicao';
    case 'chance_perdida':
      return 'chance';
    case 'penalti':
    case 'falta_cobranca':
      return 'penalti';
    default:
      return 'apito';
  }
}

function corIconePorTipo(tipo: string, corTime: string): string {
  switch (tipo) {
    case 'gol':
      return corTime;
    case 'cartao_amarelo':
      return cores.secundaria;
    case 'cartao_vermelho':
    case 'lesao':
      return cores.perigo;
    case 'substituicao':
      return cores.primaria;
    case 'penalti':
    case 'falta_cobranca':
      return cores.secundaria;
    default:
      return cores.textoSecundario;
  }
}

const styles = StyleSheet.create({
  centro: {
    alignItems: 'center',
    paddingVertical: espaco.xs,
  },
  marco: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: espaco.xs,
  },
  marcoFim: {
    backgroundColor: suaves.verde,
    borderRadius: raio.md,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  textoMarco: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textoMarcoFim: {
    color: cores.primaria,
    fontSize: 14,
  },
  intervalo: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.secundaria,
    borderRadius: raio.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  textoIntervalo: {
    color: cores.secundaria,
    fontSize: 13,
    fontWeight: '800',
  },
  bolhaWrap: {
    width: '100%',
  },
  bolha: {
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderWidth: 1,
    gap: espaco.xs,
    maxWidth: '86%',
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
    ...sombra.suave,
  },
  bolhaGol: {
    backgroundColor: suaves.amarelo,
  },
  bolhaCasa: {
    borderBottomRightRadius: raio.md,
    borderTopLeftRadius: raio.sm,
    borderTopRightRadius: raio.md,
  },
  bolhaFora: {
    borderBottomLeftRadius: raio.md,
    borderTopLeftRadius: raio.md,
    borderTopRightRadius: raio.sm,
  },
  cabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  cabecalhoFora: {
    flexDirection: 'row-reverse',
  },
  badge: {
    borderRadius: raio.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeTexto: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  minuto: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '800',
  },
  descricao: {
    color: cores.texto,
    fontSize: 13,
    lineHeight: 19,
  },
  descricaoFora: {
    textAlign: 'right',
  },
  descricaoGol: {
    // Acento âmbar legível sobre o fundo suave amarelo da bolha de gol.
    color: acentos.amarelo,
    fontSize: 14,
    fontWeight: '900',
  },
});
