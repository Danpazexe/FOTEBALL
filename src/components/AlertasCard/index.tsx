import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {cores, espaco, raio} from '../../theme';
import Icone, {type IconeNome} from '../Icone';

export type TipoAlerta = 'lesao' | 'suspensao' | 'saldo';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  texto: string;
  jogadorId?: string;
}

type AlertasCardProps = {
  alertas: Alerta[];
  onAbrirJogador?: (jogadorId: string) => void;
};

const ICONE_POR_TIPO: Record<TipoAlerta, IconeNome> = {
  lesao: 'lesao',
  suspensao: 'cartao',
  saldo: 'dinheiro',
};

/** Card de avisos (lesões, suspensões, saldo negativo). Só renderiza se houver. */
function AlertasCard({
  alertas,
  onAbrirJogador,
}: AlertasCardProps): React.JSX.Element | null {
  if (alertas.length === 0) {
    return null;
  }
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icone nome="apito" tamanho={16} cor={cores.secundaria} />
        <Text style={styles.titulo}>Avisos</Text>
      </View>
      {alertas.map(alerta => {
        const conteudo = (
          <View style={styles.linha}>
            <Icone nome={ICONE_POR_TIPO[alerta.tipo]} tamanho={16} cor={cores.perigo} />
            <Text style={styles.texto}>{alerta.texto}</Text>
          </View>
        );
        if (alerta.jogadorId && onAbrirJogador) {
          const jogadorId = alerta.jogadorId;
          return (
            <Pressable
              key={alerta.id}
              accessibilityRole="button"
              onPress={() => onAbrirJogador(jogadorId)}>
              {conteudo}
            </Pressable>
          );
        }
        return <View key={alerta.id}>{conteudo}</View>;
      })}
    </View>
  );
}

export default AlertasCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.superficie,
    borderColor: cores.perigo,
    borderRadius: raio.md,
    borderWidth: 1,
    gap: espaco.sm,
    padding: espaco.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  titulo: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    paddingVertical: 3,
  },
  texto: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
  },
});
