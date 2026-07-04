/**
 * Aba "Ajustes": preferências do jogo (velocidade da narração, pausa no
 * intervalo, confirmações) e ações de carreira (reiniciar). Persistência fica
 * no store em memória — coerente com o escopo atual do projeto.
 */

import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';

import {Botao, ScreenContainer, Section} from '../../components/ui';
import {useConfirm, useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore, type VelocidadeNarracao} from '../../store/useGameStore';
import {cores, espaco, raio, sombra} from '../../theme';
import {VERSAO_APP} from '../../version';

function Settings(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const config = useGameStore(state => state.config);
  const atualizarConfig = useGameStore(state => state.atualizarConfig);
  const reiniciarCarreira = useGameStore(state => state.reiniciarCarreira);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);

  const opcoesVelocidade: {valor: VelocidadeNarracao; rotulo: string}[] = [
    {valor: 'normal', rotulo: 'Normal'},
    {valor: 'rapido', rotulo: 'Rápido'},
  ];

  const handleReiniciar = async () => {
    const ok = await confirm({
      titulo: 'Reiniciar carreira?',
      mensagem:
        'Você volta ao menu inicial e todo o progresso da carreira atual é perdido. Os elencos voltam ao estado inicial.',
      confirmarLabel: 'Reiniciar',
      perigo: true,
    });
    if (!ok) {
      return;
    }
    reiniciarCarreira();
    toast('Carreira reiniciada.', 'sucesso');
    nav.navigate('MainMenu');
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.titulo}>Ajustes</Text>

      <Section titulo="Narração da partida">
        <Text style={styles.descricao}>Velocidade padrão da narração.</Text>
        <View style={styles.chipRow}>
          {opcoesVelocidade.map(opcao => {
            const ativo = config.velocidadeNarracao === opcao.valor;
            return (
              <View key={opcao.valor} style={styles.chipWrap}>
                <Botao
                  titulo={opcao.rotulo}
                  variante={ativo ? 'primaria' : 'secundaria'}
                  onPress={() =>
                    atualizarConfig({velocidadeNarracao: opcao.valor})
                  }
                />
              </View>
            );
          })}
        </View>

        <LinhaSwitch
          rotulo="Pausar no intervalo"
          descricao="A partida para aos 45' e só continua quando você apertar."
          valor={config.pausarNoIntervalo}
          onValueChange={valor => atualizarConfig({pausarNoIntervalo: valor})}
        />

        <LinhaSwitch
          rotulo="Efeitos sonoros"
          descricao="Som de gol e de apito final durante a narração."
          valor={config.som}
          onValueChange={valor => atualizarConfig({som: valor})}
        />
      </Section>

      <Section titulo="Geral">
        <LinhaSwitch
          rotulo="Confirmar ações"
          descricao="Pede confirmação ao comprar, vender ou avançar."
          valor={config.confirmarAcoes}
          onValueChange={valor => atualizarConfig({confirmarAcoes: valor})}
        />
      </Section>

      <Section titulo="Carreira">
        <Botao
          titulo="Reiniciar carreira"
          variante="perigo"
          onPress={handleReiniciar}
        />
        {clubeUsuarioId === null ? (
          <Text style={styles.descricao}>Nenhuma carreira ativa.</Text>
        ) : null}
      </Section>

      <Section titulo="Sobre">
        <Text style={styles.versao}>Versão {VERSAO_APP}</Text>
        <Text style={styles.descricao}>FOTEBALL · protótipo jogável</Text>
        <Text style={styles.descricao}>
          Liga de 20 clubes, 38 rodadas, simulação determinística.
        </Text>
      </Section>
    </ScreenContainer>
  );
}

type LinhaSwitchProps = {
  rotulo: string;
  descricao: string;
  valor: boolean;
  onValueChange: (valor: boolean) => void;
};

function LinhaSwitch({
  rotulo,
  descricao,
  valor,
  onValueChange,
}: LinhaSwitchProps): React.JSX.Element {
  return (
    <View style={styles.linhaSwitch}>
      <View style={styles.linhaSwitchTexto}>
        <Text style={styles.linhaSwitchRotulo}>{rotulo}</Text>
        <Text style={styles.descricao}>{descricao}</Text>
      </View>
      <Switch
        value={valor}
        onValueChange={onValueChange}
        trackColor={{false: cores.borda, true: cores.primaria}}
        // Polegar branco (padrão de switch no tema claro) — cores.texto agora é
        // azul-marinho e deixaria o polegar escuro demais.
        thumbColor={cores.contrastePrimaria}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    color: cores.texto,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: espaco.lg,
  },
  descricao: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  versao: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  chipWrap: {
    flex: 1,
  },
  linhaSwitch: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.md,
    justifyContent: 'space-between',
    padding: espaco.md,
    ...sombra.card,
  },
  linhaSwitchTexto: {
    flex: 1,
    gap: espaco.xs,
  },
  linhaSwitchRotulo: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default Settings;
