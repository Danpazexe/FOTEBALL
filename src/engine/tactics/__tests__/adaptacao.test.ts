import type {Position} from '../../../types';
import {criarPlayer} from '../../../testing/fixtures';

import {fatorAdaptacao, nivelAdaptacao} from '../adaptacao';

/**
 * Testes da penalidade por jogar fora de posição. Cobrem a matriz da spec
 * (ZAG em várias posições, override de goleiro, override de terço oposto e o
 * uso de posições secundárias) além da classificação em níveis/rótulos.
 */

describe('fatorAdaptacao', () => {
  it('posição igual à principal rende 1.0', () => {
    expect(fatorAdaptacao('ZAG', [], 'ZAG')).toBe(1.0);
  });

  it('posição entre as secundárias rende 0.95', () => {
    expect(fatorAdaptacao('CA', ['PD', 'SA'], 'PD')).toBe(0.95);
  });

  it('secundária tem prioridade mesmo quando seria terço oposto', () => {
    // ZAG (defesa) escalado no ataque seria 0.6 por terço oposto, mas como CA
    // está nas secundárias o fator é 0.95.
    expect(fatorAdaptacao('ZAG', ['CA'], 'CA')).toBe(0.95);
  });

  describe('matriz a partir de ZAG (zagueiro)', () => {
    it('ZAG como LD ~ 0.9 (lateral, distância 1)', () => {
      expect(fatorAdaptacao('ZAG', [], 'LD')).toBeCloseTo(0.9, 5);
    });

    it('ZAG como LE ~ 0.9 (lateral, distância 1)', () => {
      expect(fatorAdaptacao('ZAG', [], 'LE')).toBeCloseTo(0.9, 5);
    });

    it('ZAG como VOL ~ 0.85 (volante, distância 2)', () => {
      expect(fatorAdaptacao('ZAG', [], 'VOL')).toBeCloseTo(0.85, 5);
    });

    it('ZAG como CA = 0.6 (terço oposto)', () => {
      expect(fatorAdaptacao('ZAG', [], 'CA')).toBeCloseTo(0.6, 5);
    });

    it('ZAG como PD = 0.6 (terço oposto: defesa -> ataque)', () => {
      expect(fatorAdaptacao('ZAG', [], 'PD')).toBeCloseTo(0.6, 5);
    });
  });

  describe('override de goleiro', () => {
    it('GOL como ZAG = 0.5', () => {
      expect(fatorAdaptacao('GOL', [], 'ZAG')).toBe(0.5);
    });

    it('ZAG como GOL = 0.5 (vice-versa)', () => {
      expect(fatorAdaptacao('ZAG', [], 'GOL')).toBe(0.5);
    });

    it('GOL como CA = 0.5 (goleiro vence terço oposto)', () => {
      // Goleiro é checado antes do terço oposto.
      expect(fatorAdaptacao('GOL', [], 'CA')).toBe(0.5);
    });
  });

  describe('override de terço oposto (defesa <-> ataque)', () => {
    it('CA como LD = 0.6 (ataque -> defesa)', () => {
      expect(fatorAdaptacao('CA', [], 'LD')).toBeCloseTo(0.6, 5);
    });

    it('PE como ZAG = 0.6 (ataque -> defesa)', () => {
      expect(fatorAdaptacao('PE', [], 'ZAG')).toBeCloseTo(0.6, 5);
    });
  });

  describe('tabela por distância sem overrides (meio-campo)', () => {
    it('VOL como MC ~ 0.9 (distância 1)', () => {
      expect(fatorAdaptacao('VOL', [], 'MC')).toBeCloseTo(0.9, 5);
    });

    it('VOL como MEI ~ 0.85 (distância 2)', () => {
      expect(fatorAdaptacao('VOL', [], 'MEI')).toBeCloseTo(0.85, 5);
    });

    it('ZAG como MC ~ 0.78 (distância 3: ZAG->LAT->VOL->MC, defesa->meio)', () => {
      // ZAGUEIRO -> LATERAL -> VOLANTE -> MEIA_CENTRAL = 3 arestas; linha
      // defesa -> meio não dispara o override de terço oposto.
      expect(fatorAdaptacao('ZAG', [], 'MC')).toBeCloseTo(0.78, 5);
    });
  });

  it('mesmo grupo, posição diferente, rende 0.92 (distância 0)', () => {
    // LD e LE são ambos do grupo LATERAL.
    expect(fatorAdaptacao('LD', [], 'LE')).toBeCloseTo(0.92, 5);
  });
});

describe('nivelAdaptacao', () => {
  function jogador(principal: Position, secundarias: Position[] = []) {
    return criarPlayer({
      id: 'p1',
      posicaoPrincipal: principal,
      posicoesSecundarias: secundarias,
    });
  }

  it('ZAG como ZAG = natural', () => {
    const r = nivelAdaptacao(jogador('ZAG'), 'ZAG');
    expect(r.fator).toBe(1.0);
    expect(r.nivel).toBe('natural');
    expect(r.rotulo).toBe('Posição natural');
  });

  it('ZAG como LD = similar', () => {
    const r = nivelAdaptacao(jogador('ZAG'), 'LD');
    expect(r.fator).toBeCloseTo(0.9, 5);
    expect(r.nivel).toBe('similar');
    expect(r.rotulo).toBe('Posição similar');
  });

  it('ZAG como VOL = similar', () => {
    const r = nivelAdaptacao(jogador('ZAG'), 'VOL');
    expect(r.fator).toBeCloseTo(0.85, 5);
    expect(r.nivel).toBe('similar');
  });

  it('ZAG como CA = improvisado (terço oposto)', () => {
    const r = nivelAdaptacao(jogador('ZAG'), 'CA');
    expect(r.fator).toBeCloseTo(0.6, 5);
    expect(r.nivel).toBe('improvisado');
    expect(r.rotulo).toBe('Improvisado');
  });

  it('GOL como ZAG = improvisado', () => {
    const r = nivelAdaptacao(jogador('GOL'), 'ZAG');
    expect(r.fator).toBe(0.5);
    expect(r.nivel).toBe('improvisado');
  });

  it('jogador com PD nas secundárias escalado como PD = 0.95', () => {
    const r = nivelAdaptacao(jogador('CA', ['PD']), 'PD');
    expect(r.fator).toBe(0.95);
    expect(r.nivel).toBe('natural');
    expect(r.rotulo).toBe('Posição natural');
  });

  it('fator 0.78 cai em adaptado', () => {
    const r = nivelAdaptacao(jogador('ZAG'), 'MC');
    expect(r.fator).toBeCloseTo(0.78, 5);
    expect(r.nivel).toBe('adaptado');
    expect(r.rotulo).toBe('Adaptado');
  });

  it('usa posicaoPrincipal e posicoesSecundarias do jogador', () => {
    const p = jogador('VOL', ['MC']);
    expect(nivelAdaptacao(p, 'MC').fator).toBe(0.95);
    expect(nivelAdaptacao(p, 'VOL').fator).toBe(1.0);
  });
});
