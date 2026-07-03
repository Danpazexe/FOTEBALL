/**
 * Primitivos de UI compartilhados do FOTEBALL.
 * Portados do App.tsx monolítico, trocando cores hardcoded pelo theme.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {cores, espaco, raio, sombra, tipografia} from '../../theme';
import GradienteFundo from '../GradienteFundo';
import Icone, {type IconeNome} from '../Icone';
import Painel from '../Painel';

type ScreenContainerProps = {
  children?: React.ReactNode;
  scroll?: boolean;
};

export function ScreenContainer({children, scroll}: ScreenContainerProps) {
  return (
    <View style={styles.screen}>
      <GradienteFundo />
      <SafeAreaView style={styles.safe}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    </View>
  );
}

type AppHeaderProps = {
  titulo: string;
  subtitulo?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function AppHeader({titulo, subtitulo, onBack, right}: AppHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      ) : null}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{titulo}</Text>
          {subtitulo ? (
            <Text style={styles.headerSubtitle}>{subtitulo}</Text>
          ) : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </View>
  );
}

type SectionProps = {
  titulo?: string;
  children: React.ReactNode;
};

export function Section({titulo, children}: SectionProps) {
  return (
    <View style={styles.section}>
      {titulo ? <Text style={styles.sectionTitle}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

type CardProps = {
  children: React.ReactNode;
  /** Realça a borda com a cor primária (ex.: carreira ativa, item em destaque). */
  destaque?: boolean;
};

/** Superfície premium reutilizável (gradiente + borda translúcida + sombra). */
export function Card({children, destaque}: CardProps) {
  return (
    <Painel destaque={destaque ? 'primaria' : undefined}>{children}</Painel>
  );
}

type MetricsRowProps = {
  children: React.ReactNode;
};

export function MetricsRow({children}: MetricsRowProps) {
  return <View style={styles.metricsRow}>{children}</View>;
}

type MetricProps = {
  label: string;
  valor: string;
};

export function Metric({label, valor}: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{valor}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

type OptionGroupProps = {
  titulo: string;
  valor: string;
  opcoes: string[];
  onSelect: (valor: string) => void;
};

export function OptionGroup({titulo, valor, opcoes, onSelect}: OptionGroupProps) {
  return (
    <Section titulo={titulo}>
      <View style={styles.optionRow}>
        {opcoes.map(opcao => {
          const ativo = valor === opcao;
          return (
            <Pressable
              accessibilityRole="button"
              key={opcao}
              onPress={() => onSelect(opcao)}
              style={[styles.option, ativo ? styles.optionActive : null]}>
              <Text
                style={[
                  styles.optionText,
                  ativo ? styles.optionTextActive : null,
                ]}>
                {opcao}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

type BotaoVariante =
  | 'primaria'
  | 'secundaria'
  | 'pequena'
  | 'grande'
  | 'ouro'
  | 'perigo';

type BotaoProps = {
  titulo: string;
  onPress: () => void;
  variante?: BotaoVariante;
  disabled?: boolean;
  icone?: IconeNome;
};

export function Botao({
  titulo,
  onPress,
  variante = 'primaria',
  disabled,
  icone,
}: BotaoProps) {
  const ehGrande = variante === 'grande' || variante === 'ouro';

  const estiloContainer: ViewStyle =
    variante === 'primaria'
      ? styles.botaoPrimaria
      : variante === 'secundaria'
      ? styles.botaoSecundaria
      : variante === 'grande'
      ? styles.botaoGrande
      : variante === 'ouro'
      ? styles.botaoOuro
      : variante === 'perigo'
      ? styles.botaoPerigo
      : styles.botaoPequena;

  const estiloTexto =
    variante === 'primaria'
      ? styles.botaoTextoPrimaria
      : variante === 'secundaria'
      ? styles.botaoTextoSecundaria
      : variante === 'grande' || variante === 'ouro'
      ? styles.botaoTextoGrande
      : variante === 'perigo'
      ? styles.botaoTextoPerigo
      : styles.botaoTextoPequena;

  const corConteudo = disabled
    ? cores.textoMuted
    : variante === 'secundaria'
    ? cores.texto
    : variante === 'pequena'
    ? cores.primaria
    : variante === 'perigo'
    ? '#FFFFFF'
    : cores.contrastePrimaria;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.botaoBase,
        estiloContainer,
        disabled ? styles.botaoDisabledGlass : null,
        pressed && !disabled ? styles.botaoPressed : null,
      ]}>
      <View style={styles.botaoConteudo}>
        {icone ? (
          <Icone nome={icone} tamanho={ehGrande ? 20 : 17} cor={corConteudo} />
        ) : null}
        <Text style={[estiloTexto, disabled ? styles.botaoTextoDisabled : null]}>
          {titulo}
        </Text>
      </View>
    </Pressable>
  );
}

type TextoVazioProps = {
  children: React.ReactNode;
};

export function TextoVazio({children}: TextoVazioProps) {
  return <Text style={styles.textoVazio}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: cores.fundoBase,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    padding: espaco.lg,
    paddingBottom: espaco.xl * 2,
  },
  headerWrap: {
    gap: espaco.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: espaco.md,
  },
  backButtonText: {
    color: cores.texto,
    fontSize: 12,
    fontWeight: '800',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: espaco.md,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    color: cores.texto,
    ...tipografia.titulo,
  },
  headerSubtitle: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: espaco.xs,
    textTransform: 'uppercase',
  },
  section: {
    gap: espaco.md,
    marginBottom: espaco.lg,
  },
  sectionTitle: {
    color: cores.textoSecundario,
    ...tipografia.secao,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: espaco.md,
    marginBottom: espaco.lg,
  },
  metric: {
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 74,
    padding: espaco.md,
  },
  metricValue: {
    color: cores.texto,
    ...tipografia.numero,
  },
  metricLabel: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: espaco.xs,
    textTransform: 'uppercase',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  option: {
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: espaco.md,
  },
  optionActive: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  optionText: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextActive: {
    color: cores.contrastePrimaria,
  },
  botaoBase: {
    alignItems: 'center',
    borderRadius: raio.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  botaoConteudo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
    justifyContent: 'center',
  },
  botaoPrimaria: {
    backgroundColor: cores.primaria,
    minHeight: 46,
    paddingHorizontal: espaco.lg,
    ...sombra.glow,
  },
  botaoGrande: {
    backgroundColor: cores.primaria,
    minHeight: 54,
    paddingHorizontal: espaco.xl,
    ...sombra.glow,
  },
  botaoOuro: {
    backgroundColor: cores.secundaria,
    minHeight: 54,
    paddingHorizontal: espaco.xl,
    ...sombra.ouro,
  },
  botaoPerigo: {
    backgroundColor: cores.perigo,
    minHeight: 46,
    paddingHorizontal: espaco.lg,
  },
  botaoSecundaria: {
    backgroundColor: cores.superficie,
    borderColor: cores.bordaClara,
    borderWidth: 1,
    minHeight: 46,
    paddingHorizontal: espaco.lg,
  },
  botaoPequena: {
    borderColor: cores.primaria,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: espaco.md,
  },
  botaoPressed: {
    opacity: 0.92,
    transform: [{scale: 0.975}],
  },
  // Estado desabilitado "glass": sem cor de ação, sem glow (dourado/verde).
  botaoDisabledGlass: {
    backgroundColor: cores.glass,
    borderColor: cores.bordaTransl,
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  botaoTextoPrimaria: {
    color: cores.contrastePrimaria,
    fontSize: 15,
    fontWeight: '800',
  },
  botaoTextoGrande: {
    color: cores.contrastePrimaria,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  botaoTextoSecundaria: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  botaoTextoPerigo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  botaoTextoPequena: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoTextoDisabled: {
    color: cores.textoMuted,
  },
  textoVazio: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
});
