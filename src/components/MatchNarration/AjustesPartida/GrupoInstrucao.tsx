/** Grupo de instrução tática: título, dica opcional e chips de opção única. */
import React from 'react';
import {Pressable, Text, View} from 'react-native';

import {useEstilosDS} from '../../../design-system';
import {criarEstilos} from './estilos';

type GrupoInstrucaoProps = {
  titulo: string;
  valor: string;
  opcoes: readonly string[];
  dica?: string;
  onSelect: (valor: string) => void;
};

function GrupoInstrucao({
  titulo,
  valor,
  opcoes,
  dica,
  onSelect,
}: GrupoInstrucaoProps): React.JSX.Element {
  const styles = useEstilosDS(criarEstilos);
  return (
    <View style={styles.grupo}>
      <Text style={styles.grupoTitulo}>{titulo}</Text>
      {dica ? <Text style={styles.grupoDica}>{dica}</Text> : null}
      <View style={styles.grupoOpcoes}>
        {opcoes.map(opcao => {
          const ativo = valor === opcao;
          return (
            <Pressable
              accessibilityRole="button"
              key={opcao}
              onPress={() => onSelect(opcao)}
              style={[styles.opcao, ativo ? styles.opcaoAtiva : null]}>
              <Text
                style={[
                  styles.opcaoTexto,
                  ativo ? styles.opcaoTextoAtivo : null,
                ]}>
                {opcao}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default GrupoInstrucao;
