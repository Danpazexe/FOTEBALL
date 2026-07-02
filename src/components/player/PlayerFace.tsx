import React, {useEffect, useMemo, useState} from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import type {Position} from '../../types/player';

export interface PlayerFaceProps {
  nome: string;
  faceUrl?: string | null;
  posicao?: Position;
  overall?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  showOverallBadge?: boolean;
}

const POSITION_COLORS: Record<Position, string> = {
  GOL: '#46F2BE',
  ZAG: '#3B82F6',
  LD: '#3B82F6',
  LE: '#3B82F6',
  VOL: '#00E5A0',
  MC: '#00E5A0',
  MEI: '#FFD600',
  PD: '#FF8A3D',
  PE: '#FF8A3D',
  SA: '#FF8A3D',
  CA: '#FF3B5C',
};

const getInitials = (nome: string): string => {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) {
    return '?';
  }

  if (partes.length === 1) {
    return partes[0].slice(0, 2).toUpperCase();
  }

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
};

const normalizeFaceUrl = (faceUrl?: string | null): string | null => {
  const value = faceUrl?.trim();

  if (!value) {
    return null;
  }

  if (!value.startsWith('https://')) {
    return null;
  }

  return value;
};

export function PlayerFace({
  nome,
  faceUrl,
  posicao,
  overall,
  size = 56,
  style,
  showOverallBadge = true,
}: PlayerFaceProps) {
  const normalizedFaceUrl = useMemo(() => normalizeFaceUrl(faceUrl), [faceUrl]);
  const [hasImageError, setHasImageError] = useState(false);
  const initials = useMemo(() => getInitials(nome), [nome]);
  const accentColor = posicao ? POSITION_COLORS[posicao] : '#00E5A0';
  const shouldShowImage = Boolean(normalizedFaceUrl && !hasImageError);

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedFaceUrl]);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: accentColor,
        },
        style,
      ]}>
      {shouldShowImage ? (
        <Image
          source={{uri: normalizedFaceUrl ?? undefined}}
          style={{width: size, height: size, borderRadius: size / 2}}
          resizeMode="cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}>
          <Text style={[styles.initials, {fontSize: Math.max(13, size * 0.34)}]}>
            {initials}
          </Text>
        </View>
      )}

      {showOverallBadge && typeof overall === 'number' ? (
        <View style={[styles.overallBadge, {backgroundColor: accentColor}]}>
          <Text style={styles.overallText}>{overall}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: '#0A0E1A',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#182231',
  },
  initials: {
    color: '#F0F4FF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  overallBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 18,
  },
  overallText: {
    color: '#06100D',
    fontSize: 10,
    fontWeight: '900',
  },
});
