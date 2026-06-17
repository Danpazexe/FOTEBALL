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

import {cores, espaco, raio, sombra} from '../../theme';
import GradienteFundo from '../GradienteFundo';
import Icone, {type IconeNome} from '../Icone';

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

/** Superfície elevada padrão (sombra + borda) reutilizável pelas telas. */
export function Card({children, destaque}: CardProps) {
  return (
    <View style={[styles.cardBase, destaque ? styles.cardDestaque : null]}>
      {children}
    </View>
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

type BotaoVariante = 'primaria' | 'secundaria' | 'pequena' | 'grande';

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
  const ehGrande = variante === 'grande';

  const estiloContainer: ViewStyle =
    variante === 'primaria'
      ? styles.botaoPrimaria
      : variante === 'secundaria'
      ? styles.botaoSecundaria
      : variante === 'grande'
      ? styles.botaoGrande
      : styles.botaoPequena;

  const estiloTexto =
    variante === 'primaria'
      ? styles.botaoTextoPrimaria
      : variante === 'secundaria'
      ? styles.botaoTextoSecundaria
      : variante === 'grande'
      ? styles.botaoTextoGrande
      : styles.botaoTextoPequena;

  const corConteudo = disabled
    ? cores.textoSecundario
    : variante === 'secundaria'
    ? cores.texto
    : variante === 'pequena'
    ? cores.primaria
    : cores.contrastePrimaria;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.botaoBase,
        estiloContainer,
        disabled ? styles.botaoDisabled : null,
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
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: cores.textoSecundario,
    fontSize: 14,
    marginTop: espaco.xs,
  },
  section: {
    gap: espaco.md,
    marginBottom: espaco.lg,
  },
  sectionTitle: {
    color: cores.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  cardBase: {
    backgroundColor: cores.superficie,
    borderColor: cores.bordaClara,
    borderRadius: raio.lg,
    borderWidth: 1,
    padding: espaco.lg,
    ...sombra.card,
  },
  cardDestaque: {
    borderColor: cores.primaria,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: espaco.md,
    marginBottom: espaco.lg,
  },
  metric: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.bordaClara,
    borderRadius: raio.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 72,
    padding: espaco.md,
    ...sombra.suave,
  },
  metricValue: {
    color: cores.texto,
    fontSize: 19,
    fontWeight: '800',
  },
  metricLabel: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: espaco.xs,
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
    opacity: 0.9,
    transform: [{scale: 0.985}],
  },
  botaoDisabled: {
    opacity: 0.45,
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
  botaoTextoPequena: {
    color: cores.primaria,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoTextoDisabled: {
    color: cores.textoSecundario,
  },
  textoVazio: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
});
