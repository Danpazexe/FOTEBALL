import {criarRNGComSeed} from '../../../simulation/rng';
import type {PlayerAttributes} from '../../../../types';
import {
  avancarDificuldadeGoleiro,
  COBRANCAS_REGULARES,
  deveIrParaDisputaInterativa,
  disputaDecidida,
  NIVEL_MAX_GOLEIRO,
  probabilidadeCobranca,
  resolverCobrancaCpu,
  resolverCobrancaUsuario,
} from '../penaltisInterativos';

function atributos(finalizacao: number): PlayerAttributes {
  return {
    finalizacao,
    passe: 60,
    marcacao: 60,
    desarme: 60,
    velocidade: 60,
    resistencia: 60,
    forca: 60,
    reflexos: 60,
    posicionamento: 60,
    drible: 60,
    cabeceio: 60,
    cruzamento: 60,
  };
}

describe('resolverCobrancaUsuario', () => {
  it('produz resultado idêntico para a mesma seed e o mesmo gesto (determinismo)', () => {
    const args = {
      posicaoChute: {x: 0.4, y: 0.5},
      potencia: 0.8,
      nivelDificuldadeGoleiro: 3,
      atributosBatedor: atributos(70),
    };
    const a = resolverCobrancaUsuario({...args, rng: criarRNGComSeed(42)});
    const b = resolverCobrancaUsuario({...args, rng: criarRNGComSeed(42)});
    expect(a).toEqual(b);
  });

  it('chute no ângulo perfeito (canto alto) é sempre GOL, mesmo no nível máximo', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const det = resolverCobrancaUsuario({
        posicaoChute: {x: 0.95, y: 0.95},
        potencia: 1,
        nivelDificuldadeGoleiro: NIVEL_MAX_GOLEIRO,
        atributosBatedor: atributos(50),
        rng: criarRNGComSeed(seed),
      });
      expect(det.resultado).toBe('GOL');
      expect(det.perfeito).toBe(true);
    }
  });

  it('consome sempre 3 saídas do RNG (perfeito ou não) — não desalinha a sequência', () => {
    const rngPerfeito = criarRNGComSeed(777);
    resolverCobrancaUsuario({
      posicaoChute: {x: 0.95, y: 0.95}, // perfeito → retorno antecipado
      potencia: 1,
      nivelDificuldadeGoleiro: 2,
      atributosBatedor: atributos(60),
      rng: rngPerfeito,
    });
    const rngNormal = criarRNGComSeed(777);
    resolverCobrancaUsuario({
      posicaoChute: {x: 0, y: 0}, // caminho completo
      potencia: 1,
      nivelDificuldadeGoleiro: 2,
      atributosBatedor: atributos(60),
      rng: rngNormal,
    });
    // Se ambos consumiram exatamente 3 valores, o próximo saque coincide.
    expect(rngPerfeito()).toBeCloseTo(rngNormal());
  });

  it('goleiro mais difícil defende mais (mesma seed, chute central)', () => {
    let golsFacil = 0;
    let golsDificil = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const base = {
        posicaoChute: {x: 0.25, y: 0.3},
        potencia: 0.7,
        atributosBatedor: atributos(60),
      } as const;
      if (
        resolverCobrancaUsuario({
          ...base,
          nivelDificuldadeGoleiro: 0,
          rng: criarRNGComSeed(seed),
        }).resultado === 'GOL'
      ) {
        golsFacil += 1;
      }
      if (
        resolverCobrancaUsuario({
          ...base,
          nivelDificuldadeGoleiro: NIVEL_MAX_GOLEIRO,
          rng: criarRNGComSeed(seed),
        }).resultado === 'GOL'
      ) {
        golsDificil += 1;
      }
    }
    expect(golsFacil).toBeGreaterThan(golsDificil);
  });

  it('finalizador converte mais que perna-de-pau (mesma seed e gesto)', () => {
    let golsBom = 0;
    let golsRuim = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const base = {
        posicaoChute: {x: 0.55, y: 0.45},
        potencia: 0.7,
        nivelDificuldadeGoleiro: 3,
      } as const;
      if (
        resolverCobrancaUsuario({
          ...base,
          atributosBatedor: atributos(95),
          rng: criarRNGComSeed(seed),
        }).resultado === 'GOL'
      ) {
        golsBom += 1;
      }
      if (
        resolverCobrancaUsuario({
          ...base,
          atributosBatedor: atributos(25),
          rng: criarRNGComSeed(seed),
        }).resultado === 'GOL'
      ) {
        golsRuim += 1;
      }
    }
    expect(golsBom).toBeGreaterThan(golsRuim);
  });

  it('mira no centro raso com goleiro forte tende à defesa', () => {
    // Não é garantia absoluta (há ruído), mas no nível máximo o centro raso é
    // majoritariamente defendido — sanidade do modelo.
    let defesas = 0;
    for (let seed = 0; seed < 100; seed += 1) {
      if (
        resolverCobrancaUsuario({
          posicaoChute: {x: 0, y: 0.1},
          potencia: 0.5,
          nivelDificuldadeGoleiro: NIVEL_MAX_GOLEIRO,
          atributosBatedor: atributos(60),
          rng: criarRNGComSeed(seed),
        }).resultado === 'DEFESA'
      ) {
        defesas += 1;
      }
    }
    expect(defesas).toBeGreaterThan(60);
  });
});

describe('avancarDificuldadeGoleiro', () => {
  it('sobe um nível a cada gol', () => {
    expect(avancarDificuldadeGoleiro(0)).toBe(1);
    expect(avancarDificuldadeGoleiro(4)).toBe(5);
  });

  it('satura no teto (não fica impossível na morte súbita)', () => {
    expect(avancarDificuldadeGoleiro(NIVEL_MAX_GOLEIRO)).toBe(NIVEL_MAX_GOLEIRO);
    expect(avancarDificuldadeGoleiro(NIVEL_MAX_GOLEIRO + 5)).toBe(
      NIVEL_MAX_GOLEIRO,
    );
  });
});

describe('probabilidadeCobranca', () => {
  it('cresce com a força, dentro dos limites [0.6, 0.85]', () => {
    expect(probabilidadeCobranca(0)).toBeCloseTo(0.6);
    expect(probabilidadeCobranca(100)).toBeCloseTo(0.85);
    expect(probabilidadeCobranca(50)).toBeGreaterThan(probabilidadeCobranca(20));
  });
});

describe('resolverCobrancaCpu', () => {
  it('prob 1 sempre marca; prob 0 sempre defende (determinístico)', () => {
    const rng = criarRNGComSeed(9);
    for (let i = 0; i < 20; i += 1) {
      expect(resolverCobrancaCpu(1, rng)).toBe('GOL');
    }
    for (let i = 0; i < 20; i += 1) {
      expect(resolverCobrancaCpu(0, rng)).toBe('DEFESA');
    }
  });

  it('mesma seed → mesma sequência de desfechos', () => {
    const a = criarRNGComSeed(5);
    const b = criarRNGComSeed(5);
    for (let i = 0; i < 30; i += 1) {
      expect(resolverCobrancaCpu(0.7, a)).toBe(resolverCobrancaCpu(0.7, b));
    }
  });
});

describe('disputaDecidida', () => {
  it('placar inicial não está decidido', () => {
    expect(disputaDecidida(0, 0, 0, 0).decidido).toBe(false);
  });

  it('encerra a fase regular quando o resto não muda o resultado', () => {
    // Usuário 3 x 0, faltando 2 cobranças da CPU (3 > 0 + 2).
    expect(disputaDecidida(3, 0, 3, 3)).toEqual({
      decidido: true,
      vencedor: 'USUARIO',
    });
    // CPU 3 x 0, faltando 2 do usuário.
    expect(disputaDecidida(0, 3, 3, 3)).toEqual({
      decidido: true,
      vencedor: 'CPU',
    });
  });

  it('não decide enquanto ainda é matematicamente possível empatar', () => {
    expect(disputaDecidida(3, 2, 4, 3).decidido).toBe(false);
  });

  it('fim da fase regular com diferença decide', () => {
    expect(disputaDecidida(5, 3, COBRANCAS_REGULARES, COBRANCAS_REGULARES)).toEqual(
      {decidido: true, vencedor: 'USUARIO'},
    );
  });

  it('morte súbita: empate após 5 cada continua', () => {
    expect(disputaDecidida(4, 4, 5, 5).decidido).toBe(false);
  });

  it('morte súbita: só decide quando os dois bateram o mesmo número', () => {
    // Usuário marcou a 6ª, CPU ainda não bateu → aguarda.
    expect(disputaDecidida(5, 4, 6, 5).decidido).toBe(false);
    // CPU perdeu a 6ª → usuário vence.
    expect(disputaDecidida(5, 4, 6, 6)).toEqual({
      decidido: true,
      vencedor: 'USUARIO',
    });
  });
});

describe('deveIrParaDisputaInterativa', () => {
  it('empate manda para a disputa; vitória/derrota, não', () => {
    expect(deveIrParaDisputaInterativa({golsUsuario: 2, golsAdversario: 2})).toBe(
      true,
    );
    expect(deveIrParaDisputaInterativa({golsUsuario: 3, golsAdversario: 1})).toBe(
      false,
    );
    expect(deveIrParaDisputaInterativa({golsUsuario: 0, golsAdversario: 1})).toBe(
      false,
    );
  });
});
