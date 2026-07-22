/**
 * TESTES UNITÁRIOS DA CADEIA CAUSAL V2 (bloco "Testes obrigatórios" do doc):
 * xG monotônico e limitado, resolução contra goleiro, posse determinística e
 * sensível a estilo/urgência, Momentum com decaimento e sem dupla contagem,
 * e invariantes estruturais dos chutes gerados num minuto.
 */
import type {Player} from '../../../../types';

import {
  criarClubeLab,
  criarJogadoresLab,
  TATICA_NEUTRA_LAB,
} from '../../../lab/fixtures';
import {simularPartida} from '../../matchSimulator';
import {criarRNGComSeed} from '../../rng';
import type {ForcaTime} from '../../teamStrength';
import {gerarChancesMinutoLado, type EntradaChancesMinuto} from '../chanceEngine';
import {XG_CAUSAL} from '../matchModelConfig';
import {
  amostrarMomentoMinuto,
  calcularAmeacaMinuto,
  criarEstadoMomento,
  type AcoesMinutoLado,
} from '../momentumEngine';
import {disputarPosseMinutoCausal} from '../posseEngine';
import {
  ajusteFinalizador,
  ajusteGoleiro,
  calcularBaseXG,
  probConversaoChute,
  type PerfilChute,
} from '../xgModel';

const PERFIL_BASE: PerfilChute = {
  situacao: 'jogo_aberto',
  corpo: 'pe_direito',
  deFora: false,
  areaCurta: false,
  pressao: 0.5,
};

function forca(ataque: number, meio: number, defesa: number, goleiro = 70): ForcaTime {
  return {ataque, meio, defesa, forcaGoleiro: goleiro, overall: (ataque + meio + defesa) / 3};
}

describe('xgModel — qualidade objetiva da chance', () => {
  it('zona pesa: cara do gol > área > fora, mantendo o resto igual', () => {
    const curta = calcularBaseXG({...PERFIL_BASE, areaCurta: true});
    const area = calcularBaseXG(PERFIL_BASE);
    const fora = calcularBaseXG({...PERFIL_BASE, deFora: true});
    expect(curta).toBeGreaterThan(area);
    expect(area).toBeGreaterThan(fora);
  });

  it('mais pressão defensiva nunca aumenta o xG', () => {
    const livre = calcularBaseXG({...PERFIL_BASE, pressao: 0.1});
    const pressionado = calcularBaseXG({...PERFIL_BASE, pressao: 0.9});
    expect(pressionado).toBeLessThan(livre);
  });

  it('cabeceio vale menos que chute limpo na mesma zona', () => {
    const pe = calcularBaseXG(PERFIL_BASE);
    const cabeca = calcularBaseXG({...PERFIL_BASE, corpo: 'cabeca'});
    expect(cabeca).toBeLessThan(pe);
  });

  it('contra-ataque melhora a chance; escanteio piora levemente', () => {
    const aberto = calcularBaseXG(PERFIL_BASE);
    expect(calcularBaseXG({...PERFIL_BASE, situacao: 'contra_ataque'})).toBeGreaterThan(aberto);
    expect(calcularBaseXG({...PERFIL_BASE, situacao: 'escanteio'})).toBeLessThan(aberto);
  });

  it('pênalti e falta direta usam valores fixos calibrados', () => {
    expect(calcularBaseXG({...PERFIL_BASE, situacao: 'penalti'})).toBe(XG_CAUSAL.xgPenalti);
    expect(calcularBaseXG({...PERFIL_BASE, situacao: 'falta'})).toBe(XG_CAUSAL.xgFaltaDireta);
  });

  it('xG de jogo corrido fica sempre nos limites válidos', () => {
    const extremos: PerfilChute[] = [
      {...PERFIL_BASE, areaCurta: true, pressao: 0, situacao: 'rebote'},
      {...PERFIL_BASE, deFora: true, pressao: 1, corpo: 'cabeca'},
    ];
    for (const perfil of extremos) {
      const xg = calcularBaseXG(perfil);
      expect(xg).toBeGreaterThanOrEqual(XG_CAUSAL.minimo);
      expect(xg).toBeLessThanOrEqual(XG_CAUSAL.maximo);
    }
  });

  it('finalizador melhor e goleiro pior aumentam a conversão (com teto/piso)', () => {
    expect(ajusteFinalizador(90)).toBeGreaterThan(ajusteFinalizador(50));
    expect(ajusteGoleiro(90)).toBeLessThan(ajusteGoleiro(55));
    // Pontos neutros centrados em 1.0 (balanceamento agregado estável).
    expect(ajusteFinalizador(72)).toBeCloseTo(1, 5);
    expect(ajusteGoleiro(70)).toBeCloseTo(1, 5);
    const conversao = probConversaoChute(0.95, 99, 1);
    expect(conversao).toBeLessThanOrEqual(0.9);
    expect(probConversaoChute(0.001, 1, 99)).toBeGreaterThanOrEqual(0.01);
  });
});

describe('posseEngine — controle causal do minuto', () => {
  const base = {
    taticaCasa: TATICA_NEUTRA_LAB,
    taticaFora: TATICA_NEUTRA_LAB,
    diferencaPlacar: 0,
    minuto: 30,
  };

  it('é determinística: mesma seed, mesma fração', () => {
    const a = disputarPosseMinutoCausal({
      ...base,
      forcaCasa: forca(75, 75, 75),
      forcaFora: forca(75, 75, 75),
      rngPosse: criarRNGComSeed(42),
    });
    const b = disputarPosseMinutoCausal({
      ...base,
      forcaCasa: forca(75, 75, 75),
      forcaFora: forca(75, 75, 75),
      rngPosse: criarRNGComSeed(42),
    });
    expect(a).toBe(b);
  });

  it('meio-campo melhor puxa a posse (na média)', () => {
    const medias = (meioCasa: number) => {
      let soma = 0;
      for (let seed = 1; seed <= 200; seed += 1) {
        soma += disputarPosseMinutoCausal({
          ...base,
          forcaCasa: forca(75, meioCasa, 75),
          forcaFora: forca(75, 75, 75),
          rngPosse: criarRNGComSeed(seed),
        });
      }
      return soma / 200;
    };
    expect(medias(85)).toBeGreaterThan(medias(75) + 0.02);
  });

  it('estilo "Posse de bola" retém; "Contra-ataque" abre mão dela', () => {
    const comEstilo = (estilo: 'Posse de bola' | 'Contra-ataque') =>
      disputarPosseMinutoCausal({
        ...base,
        taticaCasa: {...TATICA_NEUTRA_LAB, estiloOfensivo: estilo},
        forcaCasa: forca(75, 75, 75),
        forcaFora: forca(75, 75, 75),
        rngPosse: criarRNGComSeed(7),
      });
    expect(comEstilo('Posse de bola')).toBeGreaterThan(comEstilo('Contra-ataque'));
  });

  it('quem perde na reta final vai atrás da bola (urgência é causa)', () => {
    const comPlacar = (diferencaPlacar: number) =>
      disputarPosseMinutoCausal({
        ...base,
        minuto: 85,
        diferencaPlacar,
        forcaCasa: forca(75, 75, 75),
        forcaFora: forca(75, 75, 75),
        rngPosse: criarRNGComSeed(9),
      });
    expect(comPlacar(-2)).toBeGreaterThan(comPlacar(2));
  });

  it('fração sempre dentro dos limites', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const fracao = disputarPosseMinutoCausal({
        ...base,
        forcaCasa: forca(99, 99, 99),
        forcaFora: forca(40, 40, 40),
        rngPosse: criarRNGComSeed(seed),
      });
      expect(fracao).toBeGreaterThanOrEqual(0.18);
      expect(fracao).toBeLessThanOrEqual(0.82);
    }
  });
});

describe('momentumEngine — pressão ofensiva recente', () => {
  const minutoVazio: AcoesMinutoLado = {
    chutes: [],
    escanteios: 0,
    fracaoPosse: 0.5,
  };
  const chute = (xg: number, resultado: 'gol' | 'defesa' | 'fora') => ({
    id: 'c1',
    timeId: 'casa',
    jogadorId: 'j1',
    minuto: 10,
    posseId: 'p1',
    situacao: 'jogo_aberto' as const,
    corpo: 'pe_direito' as const,
    x: 0.5,
    y: 0.2,
    xg,
    xgot: 0,
    resultado,
    grandeChance: xg >= 0.24,
    deFora: false,
  });

  it('minutos neutros geram valor baixo; pressão real cresce e satura', () => {
    const estado = criarEstadoMomento();
    const neutro = amostrarMomentoMinuto(estado, minutoVazio, minutoVazio);
    expect(Math.abs(neutro)).toBeLessThan(0.15);
    let ultimo = neutro;
    for (let i = 0; i < 3; i += 1) {
      ultimo = amostrarMomentoMinuto(
        estado,
        {...minutoVazio, chutes: [chute(0.3, 'defesa')], escanteios: 1},
        minutoVazio,
      );
    }
    expect(ultimo).toBeGreaterThan(0.8);
    expect(ultimo).toBeLessThanOrEqual(1);
  });

  it('pressão antiga decai quando o ataque para', () => {
    const estado = criarEstadoMomento();
    // Um minuto de ataque cria o pico; sem novos lances, a pressão decai.
    const pico = amostrarMomentoMinuto(
      estado,
      {...minutoVazio, chutes: [chute(0.4, 'defesa')]},
      minutoVazio,
    );
    // Janela do documento (~120–240s): em 5 minutos sem ataque a barra esvazia.
    let atual = pico;
    for (let i = 0; i < 5; i += 1) {
      atual = amostrarMomentoMinuto(estado, minutoVazio, minutoVazio);
    }
    expect(atual).toBeLessThan(pico * 0.5);
  });

  it('CA-07: o GOL não recebe bônus além do próprio chute (sem dupla contagem)', () => {
    const comGol = calcularAmeacaMinuto({...minutoVazio, chutes: [chute(0.3, 'gol')]});
    const comDefesa = calcularAmeacaMinuto({...minutoVazio, chutes: [chute(0.3, 'defesa')]});
    expect(comGol).toBe(comDefesa);
  });

  it('amostras sempre em [−1, 1]', () => {
    const estado = criarEstadoMomento();
    for (let i = 0; i < 10; i += 1) {
      const amostra = amostrarMomentoMinuto(
        estado,
        {...minutoVazio, chutes: [chute(0.6, 'gol'), chute(0.78, 'gol')]},
        minutoVazio,
      );
      expect(amostra).toBeGreaterThanOrEqual(-1);
      expect(amostra).toBeLessThanOrEqual(1);
    }
  });
});

describe('chanceEngine — chutes factuais do minuto', () => {
  function entrada(seed: number, xgAlvoMinuto = 0.4): EntradaChancesMinuto {
    const emCampo = criarJogadoresLab('casa', 75);
    const emCampoAdversario = criarJogadoresLab('fora', 75);
    let sequencial = 0;
    return {
      minuto: 30,
      timeId: 'casa',
      emCampo,
      emCampoAdversario,
      goleiroAdversario: emCampoAdversario[0],
      tatica: TATICA_NEUTRA_LAB,
      taticaAdversario: TATICA_NEUTRA_LAB,
      forca: forca(75, 75, 75),
      forcaAdversario: forca(75, 75, 75),
      xgAlvoMinuto,
      fracaoPosse: 0.5,
      // Arbitragem neutra no laboratório: rigor médio e VAR presente.
      fatorRigor: 1,
      varDisponivel: true,
      rng: criarRNGComSeed(seed),
      proximoSequencial: () => {
        sequencial += 1;
        return sequencial;
      },
    };
  }

  it('é determinístico e estruturalmente válido em 300 minutos simulados', () => {
    const ids = new Set<string>();
    for (let seed = 1; seed <= 300; seed += 1) {
      const a = gerarChancesMinutoLado(entrada(seed));
      const b = gerarChancesMinutoLado(entrada(seed));
      expect(a).toEqual(b);
      for (const c of a.chutes) {
        // Coordenadas persistidas válidas, xG na faixa, vínculo de origem.
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThanOrEqual(1);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThanOrEqual(1);
        expect(c.xg).toBeGreaterThanOrEqual(0.02);
        expect(c.xg).toBeLessThanOrEqual(0.97);
        expect(c.posseId.length).toBeGreaterThan(0);
        // Autor em campo (gol contra credita defensor ADVERSÁRIO).
        const elenco = c.golContra === true ? 'fora' : 'casa';
        expect(c.jogadorId.startsWith(elenco)).toBe(true);
        // Garçom nunca é o próprio autor.
        expect(c.assistenciaId === c.jogadorId).toBe(false);
        // Ids únicos no lote (seed compõe o teste — reinicia por seed).
        const chave = `${seed}|${c.id}`;
        expect(ids.has(chave)).toBe(false);
        ids.add(chave);
      }
      // Placar do minuto = chutes com resultado gol.
      expect(a.gols).toBe(a.chutes.filter(c => c.resultado === 'gol').length);
    }
  });

  it('sem ninguém em campo não nasce chance', () => {
    const semTime = {...entrada(1), emCampo: [] as Player[]};
    expect(gerarChancesMinutoLado(semTime).chutes).toHaveLength(0);
  });

  it('alvo de gols maior gera mais chutes (monotonicidade da criação)', () => {
    const contar = (xgAlvo: number) => {
      let total = 0;
      for (let seed = 1; seed <= 400; seed += 1) {
        total += gerarChancesMinutoLado(entrada(seed, xgAlvo)).chutes.length;
      }
      return total;
    };
    expect(contar(0.03)).toBeGreaterThan(contar(0.01) * 1.5);
  });
});

describe('CA-12/CA-01 — determinismo profundo da partida completa', () => {
  function jogo(seed: number) {
    const jc = criarJogadoresLab('casa', 76);
    const jf = criarJogadoresLab('fora', 73);
    return simularPartida({
      timeCasa: criarClubeLab('casa', jc, TATICA_NEUTRA_LAB),
      timeFora: criarClubeLab('fora', jf, TATICA_NEUTRA_LAB),
      jogadoresCasa: jc,
      jogadoresFora: jf,
      seed,
    });
  }

  it('mesma seed ⇒ partida IDÊNTICA (placar, eventos, chutes, estatísticas, momentum)', () => {
    for (const seed of [1, 7, 42, 99, 256]) {
      expect(jogo(seed)).toEqual(jogo(seed));
    }
  });

  it('todo gol tem chuteId e o placar == gols do ledger, em toda a amostra', () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      const p = jogo(seed);
      const chutes = p.chutes ?? [];
      const golsCasaLedger = chutes.filter(
        c => c.resultado === 'gol' && c.timeId === p.timeCasa,
      ).length;
      const golsForaLedger = chutes.filter(
        c => c.resultado === 'gol' && c.timeId === p.timeFora,
      ).length;
      expect(golsCasaLedger).toBe(p.placarCasa ?? 0);
      expect(golsForaLedger).toBe(p.placarFora ?? 0);
      // Todo evento de gol carrega o vínculo com o chute (RF-01).
      for (const ev of p.eventos) {
        if (ev.tipo === 'gol' || ev.tipo === 'gol_contra') {
          expect(ev.chuteId).toBeDefined();
        }
      }
      // xG do time == soma do ledger válido (CA-04); posse soma 100 (CA-06).
      const xgCasa = chutes
        .filter(c => c.timeId === p.timeCasa && c.resultado !== 'gol_anulado')
        .reduce((s, c) => s + c.xg, 0);
      expect(p.estatisticas?.casa.golsEsperados).toBeCloseTo(xgCasa, 1);
      expect((p.posseCasa ?? 0) + (p.posseFora ?? 0)).toBe(100);
    }
  });
});
