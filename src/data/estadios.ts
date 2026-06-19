/**
 * Estádios dos clubes. Os grandes têm estádio real (nome + capacidade); os
 * demais recebem uma capacidade variada e determinística (não mais o genérico
 * 30.000 uniforme). O nível de infraestrutura inicial deriva do porte do estádio
 * — e pode subir pelo sistema de melhorias (ver `melhorarEstadio` no store).
 */

import {hashString} from '../engine/simulation/rng';
import type {Estadio} from '../types';

interface EstadioBase {
  nome: string;
  capacidade: number;
  preco: number;
}

const ESTADIOS_REAIS: Record<string, EstadioBase> = {
  club_flamengo: {nome: 'Maracanã', capacidade: 78838, preco: 70},
  club_fluminense: {nome: 'Maracanã', capacidade: 78838, preco: 60},
  club_sao_paulo: {nome: 'MorumBIS', capacidade: 66795, preco: 65},
  club_fortaleza: {nome: 'Arena Castelão', capacidade: 63903, preco: 45},
  club_ceara: {nome: 'Arena Castelão', capacidade: 63903, preco: 40},
  club_cruzeiro: {nome: 'Mineirão', capacidade: 61846, preco: 55},
  club_gremio: {nome: 'Arena do Grêmio', capacidade: 55662, preco: 55},
  club_internacional: {nome: 'Beira-Rio', capacidade: 50128, preco: 55},
  club_corinthians: {nome: 'Neo Química Arena', capacidade: 49205, preco: 70},
  club_bahia: {nome: 'Arena Fonte Nova', capacidade: 47907, preco: 50},
  club_botafogo: {nome: 'Nilton Santos', capacidade: 46931, preco: 55},
  club_atletico_mg: {nome: 'Arena MRV', capacidade: 46000, preco: 60},
  club_cuiaba: {nome: 'Arena Pantanal', capacidade: 44000, preco: 40},
  club_palmeiras: {nome: 'Allianz Parque', capacidade: 43713, preco: 75},
  club_athletico_pr: {nome: 'Ligga Arena', capacidade: 42372, preco: 55},
  club_coritiba: {nome: 'Couto Pereira', capacidade: 40502, preco: 45},
  club_vitoria: {nome: 'Barradão', capacidade: 30618, preco: 45},
  club_sport: {nome: 'Ilha do Retiro', capacidade: 26000, preco: 40},
  club_nautico: {nome: 'Aflitos', capacidade: 22500, preco: 40},
  club_vasco: {nome: 'São Januário', capacidade: 21880, preco: 55},
  club_juventude: {nome: 'Alfredo Jaconi', capacidade: 19924, preco: 40},
  club_criciuma: {nome: 'Heriberto Hülse', capacidade: 19225, preco: 40},
  club_bragantino: {nome: 'Cícero de Souza Marques', capacidade: 17128, preco: 40},
  club_santos: {nome: 'Vila Belmiro', capacidade: 16068, preco: 55},
  club_goias: {nome: 'Serrinha', capacidade: 14525, preco: 40},
};

/** Infraestrutura inicial pelo porte do estádio (1–5). */
function infraPorCapacidade(capacidade: number): number {
  if (capacidade >= 50000) {
    return 4;
  }
  if (capacidade >= 25000) {
    return 3;
  }
  return 2;
}

/** Estádio do clube: real (curado) ou derivado de forma variada/determinística. */
export function estadioDoClube(clubeId: string, nomeClube: string): Estadio {
  const real = ESTADIOS_REAIS[clubeId];
  if (real) {
    return {
      nome: real.nome,
      capacidade: real.capacidade,
      precoMedioIngresso: real.preco,
      nivelInfraestrutura: infraPorCapacidade(real.capacidade),
    };
  }
  // Capacidade variada (12.000–40.000), estável por clube.
  const capacidade = 12000 + (Math.abs(hashString(clubeId)) % 29) * 1000;
  return {
    nome: `Estádio do ${nomeClube}`,
    capacidade,
    precoMedioIngresso: 40,
    nivelInfraestrutura: infraPorCapacidade(capacidade),
  };
}
