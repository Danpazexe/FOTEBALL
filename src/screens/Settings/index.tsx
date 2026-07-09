/**
 * Aba "Ajustes": preferências do jogo (velocidade da narração, pausa no
 * intervalo, confirmações) e ações de carreira (reiniciar). Persistência fica
 * no store em memória — coerente com o escopo atual do projeto.
 */

import React from 'react';
import {Pressable, StyleSheet, Switch, Text, View} from 'react-native';

import {Botao, ScreenContainer, Section} from '../../components/ui';
import {useConfirm, useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore, type VelocidadeNarracao} from '../../store/useGameStore';
import {DIFICULDADES} from '../../engine/carreira/dificuldade';
import {definirSomHabilitado, definirVolumeEfeitos} from '../../audio/sons';
import {FAIXAS_MUSICA} from '../../audio/musica';
import {espaco, raio, type Tema} from '../../theme';
import {useEstilos, useTema} from '../../theme/useTema';
import {VERSAO_APP} from '../../version';

/** Níveis de volume oferecidos (sem lib de slider — controle em degraus). */
const NIVEIS_VOLUME = [0, 0.25, 0.5, 0.75, 1] as const;

/** Resumo do efeito de cada dificuldade (cobrança da diretoria). */
const DIFICULDADE_DESC: Record<string, string> = {
  Fácil: 'Meta folgada e diretoria paciente.',
  Normal: 'Cobrança equilibrada da diretoria.',
  Difícil: 'Meta exigente; falhar custa mais reputação.',
  Lendário: 'Meta durríssima; punição máxima por falhar.',
};

function Settings(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();
  const styles = useEstilos(criarEstilos);

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
      </Section>

      <Section titulo="Áudio">
        <LinhaSwitch
          rotulo="Música de fundo"
          descricao="Toca em todas as telas do jogo, menos durante a partida."
          valor={config.musicaHabilitada}
          onValueChange={valor => atualizarConfig({musicaHabilitada: valor})}
        />

        {config.musicaHabilitada ? (
          <>
            <Text style={styles.rotuloControle}>Faixa</Text>
            <View style={styles.chipRow}>
              {FAIXAS_MUSICA.map(faixa => {
                const ativo = config.musicaSelecionada === faixa.id;
                return (
                  <View key={faixa.id} style={styles.chipWrap}>
                    <Botao
                      titulo={faixa.titulo}
                      variante={ativo ? 'primaria' : 'secundaria'}
                      onPress={() =>
                        atualizarConfig({musicaSelecionada: faixa.id})
                      }
                    />
                  </View>
                );
              })}
            </View>

            <Text style={styles.rotuloControle}>Altura da música</Text>
            <SeletorVolume
              valor={config.volumeMusica}
              onChange={valor => atualizarConfig({volumeMusica: valor})}
            />
          </>
        ) : null}

        <LinhaSwitch
          rotulo="Efeitos sonoros"
          descricao="Narração, gols, apitos e ambiente do estádio na partida."
          valor={config.som}
          onValueChange={valor => {
            atualizarConfig({som: valor});
            definirSomHabilitado(valor);
          }}
        />

        {config.som ? (
          <>
            <Text style={styles.rotuloControle}>Volume dos efeitos</Text>
            <SeletorVolume
              valor={config.volumeEfeitos}
              onChange={valor => {
                atualizarConfig({volumeEfeitos: valor});
                definirVolumeEfeitos(valor);
              }}
            />
          </>
        ) : null}
      </Section>

      <Section titulo="Dificuldade">
        <Text style={styles.descricao}>
          {DIFICULDADE_DESC[config.dificuldade]}
        </Text>
        <View style={styles.chipRow}>
          {DIFICULDADES.map(nivel => {
            const ativo = config.dificuldade === nivel;
            return (
              <View key={nivel} style={styles.chipWrap}>
                <Botao
                  titulo={nivel}
                  variante={ativo ? 'primaria' : 'secundaria'}
                  onPress={() => atualizarConfig({dificuldade: nivel})}
                />
              </View>
            );
          })}
        </View>
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

/** Controle de volume em degraus (mudo a 100%) — sem lib de slider. */
function SeletorVolume({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (valor: number) => void;
}): React.JSX.Element {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={styles.volumeRow}>
      {NIVEIS_VOLUME.map(nivel => {
        const ativo = Math.abs(valor - nivel) < 0.01;
        return (
          <Pressable
            key={nivel}
            onPress={() => onChange(nivel)}
            accessibilityRole="button"
            accessibilityLabel={
              nivel === 0 ? 'Mudo' : `${Math.round(nivel * 100)} por cento`
            }
            style={[styles.volumeChip, ativo && styles.volumeChipAtivo]}
          >
            <Text
              style={[styles.volumeChipTxt, ativo && styles.volumeChipTxtAtivo]}
            >
              {nivel === 0 ? 'Mudo' : `${Math.round(nivel * 100)}%`}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  const {cores} = useTema();
  const styles = useEstilos(criarEstilos);
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
        // Polegar branco em ambos os temas: cores.texto/contrastePrimaria ficam
        // escuros demais e sumiriam no trilho (claro OU escuro).
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const criarEstilos = (t: Tema) =>
  StyleSheet.create({
    titulo: {
      color: t.cores.texto,
      fontSize: 26,
      fontWeight: '800',
      marginBottom: espaco.lg,
    },
    descricao: {
      color: t.cores.textoSecundario,
      fontSize: 13,
    },
    versao: {
      color: t.cores.texto,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 2,
    },
    rotuloControle: {
      color: t.cores.texto,
      fontSize: 13,
      fontWeight: '800',
      marginTop: espaco.xs,
    },
    chipRow: {
      flexDirection: 'row',
      gap: espaco.sm,
    },
    chipWrap: {
      flex: 1,
    },
    volumeRow: {
      flexDirection: 'row',
      gap: espaco.xs,
      marginTop: espaco.xs,
    },
    volumeChip: {
      alignItems: 'center',
      backgroundColor: t.cores.superficieElevada,
      borderColor: t.cores.bordaClara,
      borderRadius: raio.md,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 36,
      paddingHorizontal: 2,
    },
    volumeChipAtivo: {
      backgroundColor: t.cores.primaria,
      borderColor: t.cores.primaria,
    },
    volumeChipTxt: {
      color: t.cores.textoSecundario,
      fontSize: 12,
      fontWeight: '800',
    },
    volumeChipTxtAtivo: {
      color: t.cores.contrastePrimaria,
    },
    linhaSwitch: {
      alignItems: 'center',
      backgroundColor: t.cores.superficieElevada,
      borderColor: t.cores.bordaTransl,
      borderRadius: raio.lg,
      borderWidth: 1,
      flexDirection: 'row',
      gap: espaco.md,
      justifyContent: 'space-between',
      padding: espaco.md,
      ...t.sombra.card,
    },
    linhaSwitchTexto: {
      flex: 1,
      gap: espaco.xs,
    },
    linhaSwitchRotulo: {
      color: t.cores.texto,
      fontSize: 15,
      fontWeight: '800',
    },
  });

export default Settings;
