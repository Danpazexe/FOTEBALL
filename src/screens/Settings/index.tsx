/**
 * Aba "Ajustes": aparência, narração, áudio, dificuldade, geral, carreira e
 * sobre. Migrada ao Design System v2 (tela reativa ao tema claro/escuro).
 */

import React from 'react';
import {StyleSheet, Switch, View} from 'react-native';

import {
  AppBar,
  Button,
  Card,
  Chip,
  Screen,
  Text,
  espacamento,
  useModoTema,
  useTheme,
  type ModoTema,
} from '../../design-system';
import {useConfirm, useToast} from '../../components/feedback';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore, type VelocidadeNarracao} from '../../store/useGameStore';
import {DIFICULDADES} from '../../engine/carreira/dificuldade';
import {definirSomHabilitado, definirVolumeEfeitos} from '../../audio/sons';
import {FAIXAS_MUSICA} from '../../audio/musica';
import {VERSAO_APP} from '../../version';

const NIVEIS_VOLUME = [0, 0.25, 0.5, 0.75, 1] as const;

const DIFICULDADE_DESC: Record<string, string> = {
  Fácil: 'Meta folgada e diretoria paciente.',
  Normal: 'Cobrança equilibrada da diretoria.',
  Difícil: 'Meta exigente; falhar custa mais reputação.',
  Lendário: 'Meta durríssima; punição máxima por falhar.',
};

function SettingsSection({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        {titulo}
      </Text>
      {descricao ? (
        <Text variant="caption" color="textSecondary">
          {descricao}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function ChipGroup<T extends string>({
  opcoes,
  valorAtual,
  onSelect,
}: {
  opcoes: {valor: T; rotulo: string}[];
  valorAtual: T;
  onSelect: (valor: T) => void;
}): React.JSX.Element {
  return (
    <View style={styles.chipRow}>
      {opcoes.map(o => (
        <Chip
          key={o.valor}
          label={o.rotulo}
          selected={valorAtual === o.valor}
          onPress={() => onSelect(o.valor)}
          style={styles.flex}
        />
      ))}
    </View>
  );
}

function SeletorVolume({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (valor: number) => void;
}): React.JSX.Element {
  return (
    <View style={styles.chipRow}>
      {NIVEIS_VOLUME.map(nivel => (
        <Chip
          key={nivel}
          label={nivel === 0 ? 'Mudo' : `${Math.round(nivel * 100)}%`}
          selected={Math.abs(valor - nivel) < 0.01}
          onPress={() => onChange(nivel)}
          style={styles.flex}
        />
      ))}
    </View>
  );
}

function LinhaSwitch({
  rotulo,
  descricao,
  valor,
  onValueChange,
}: {
  rotulo: string;
  descricao: string;
  valor: boolean;
  onValueChange: (valor: boolean) => void;
}): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Card variante="outlined" style={styles.linhaSwitch}>
      <View style={styles.flex}>
        <Text variant="titleM">{rotulo}</Text>
        <Text variant="caption" color="textSecondary">
          {descricao}
        </Text>
      </View>
      <Switch
        value={valor}
        onValueChange={onValueChange}
        accessibilityLabel={rotulo}
        trackColor={{false: cores.border, true: cores.brand}}
        thumbColor="#FFFFFF"
      />
    </Card>
  );
}

function Settings(): React.JSX.Element {
  const nav = useAppNavigation();
  const confirm = useConfirm();
  const toast = useToast();

  const config = useGameStore(state => state.config);
  const atualizarConfig = useGameStore(state => state.atualizarConfig);
  const reiniciarCarreira = useGameStore(state => state.reiniciarCarreira);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const {modo, definirModo} = useModoTema();

  const opcoesVelocidade: {valor: VelocidadeNarracao; rotulo: string}[] = [
    {valor: 'normal', rotulo: 'Normal'},
    {valor: 'rapido', rotulo: 'Rápido'},
  ];
  const opcoesModo: {valor: ModoTema; rotulo: string}[] = [
    {valor: 'claro', rotulo: 'Claro'},
    {valor: 'escuro', rotulo: 'Escuro'},
    {valor: 'sistema', rotulo: 'Sistema'},
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
    <Screen
      scroll
      header={<AppBar title="Ajustes" onBack={() => nav.goBack()} />}>

      <SettingsSection
        titulo="Aparência"
        descricao='Tema do app. "Sistema" acompanha o seu aparelho.'>
        <ChipGroup opcoes={opcoesModo} valorAtual={modo} onSelect={definirModo} />
      </SettingsSection>

      <SettingsSection
        titulo="Narração da partida"
        descricao="Velocidade padrão da narração.">
        <ChipGroup
          opcoes={opcoesVelocidade}
          valorAtual={config.velocidadeNarracao}
          onSelect={valor => atualizarConfig({velocidadeNarracao: valor})}
        />
        <LinhaSwitch
          rotulo="Pausar no intervalo"
          descricao="A partida para aos 45' e só continua quando você apertar."
          valor={config.pausarNoIntervalo}
          onValueChange={valor => atualizarConfig({pausarNoIntervalo: valor})}
        />
      </SettingsSection>

      <SettingsSection titulo="Áudio">
        <LinhaSwitch
          rotulo="Música de fundo"
          descricao="Toca em todas as telas do jogo, menos durante a partida."
          valor={config.musicaHabilitada}
          onValueChange={valor => atualizarConfig({musicaHabilitada: valor})}
        />
        {config.musicaHabilitada ? (
          <>
            <Text variant="labelM">Faixa</Text>
            <View style={styles.chipRow}>
              {FAIXAS_MUSICA.map(faixa => (
                <Chip
                  key={faixa.id}
                  label={faixa.titulo}
                  selected={config.musicaSelecionada === faixa.id}
                  onPress={() => atualizarConfig({musicaSelecionada: faixa.id})}
                />
              ))}
            </View>
            <Text variant="labelM">Altura da música</Text>
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
            <Text variant="labelM">Volume dos efeitos</Text>
            <SeletorVolume
              valor={config.volumeEfeitos}
              onChange={valor => {
                atualizarConfig({volumeEfeitos: valor});
                definirVolumeEfeitos(valor);
              }}
            />
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection
        titulo="Dificuldade"
        descricao={DIFICULDADE_DESC[config.dificuldade]}>
        <View style={styles.chipRow}>
          {DIFICULDADES.map(nivel => (
            <Chip
              key={nivel}
              label={nivel}
              selected={config.dificuldade === nivel}
              onPress={() => atualizarConfig({dificuldade: nivel})}
              style={styles.flex}
            />
          ))}
        </View>
      </SettingsSection>

      <SettingsSection titulo="Geral">
        <LinhaSwitch
          rotulo="Confirmar ações"
          descricao="Pede confirmação ao comprar, vender ou avançar."
          valor={config.confirmarAcoes}
          onValueChange={valor => atualizarConfig({confirmarAcoes: valor})}
        />
      </SettingsSection>

      <SettingsSection titulo="Carreira">
        <Button
          titulo="Reiniciar carreira"
          variante="danger"
          onPress={handleReiniciar}
          fullWidth
        />
        {clubeUsuarioId === null ? (
          <Text variant="caption" color="textSecondary">
            Nenhuma carreira ativa.
          </Text>
        ) : null}
      </SettingsSection>

      <SettingsSection titulo="Sobre">
        <Text variant="titleM">Versão {VERSAO_APP}</Text>
        <Text variant="caption" color="textSecondary">
          FOTEBALL · protótipo jogável
        </Text>
        <Text variant="caption" color="textSecondary">
          Liga de 20 clubes, 38 rodadas, simulação determinística.
        </Text>
      </SettingsSection>
    </Screen>
  );
}

export default Settings;

const styles = StyleSheet.create({
  section: {gap: espacamento[2]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  flex: {flex: 1},
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[3],
  },
});
