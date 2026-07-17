/**
 * Calibração atributos ↔ overall (Onda 2, PR-01): exatidão no seed INTEIRO,
 * idempotência e o passo-alvo com viés por categoria/idade.
 */
import {loadSeedData} from '../../../api/database/seed/loadSeed';
import {criarPlayer} from '../../../testing/fixtures';
import {
  aplicarAlvoDeOverall,
  calibrarAtributosParaOverall,
  comAtributosCalibrados,
} from '../calibracaoAtributos';
import {calcularOverall} from '../overall';

describe('calibracaoAtributos (PR-01)', () => {
  it('SEED INTEIRO: após o load, calcularOverall(atributos) === overall para todos', () => {
    const {jogadores} = loadSeedData();
    expect(jogadores.length).toBeGreaterThan(5000);
    const divergentes = jogadores.filter(
      j => calcularOverall(j.atributos, j.posicaoPrincipal) !== j.overall,
    );
    expect(divergentes.map(j => `${j.nome} (${j.id})`)).toEqual([]);
  });

  it('preserva o overall CURADO: a migração nunca altera o campo overall', () => {
    const {jogadores} = loadSeedData();
    // Neymar continua com o overall autoral do seed (craque preservado).
    const neymar = jogadores.find(j => j.nome === 'Neymar')!;
    expect(neymar.overall).toBe(86);
  });

  it('é idempotente: calibrar um jogador já calibrado é no-op (mesma referência)', () => {
    const jogador = comAtributosCalibrados(criarPlayer({id: 'p1', overall: 75}));
    const denovo = comAtributosCalibrados(jogador);
    expect(denovo).toBe(jogador);
  });

  it('atinge o alvo exato e respeita os limites 1-99', () => {
    const base = criarPlayer({id: 'p2', overall: 70}).atributos;
    for (const alvo of [40, 55, 70, 85, 95]) {
      const calibrados = calibrarAtributosParaOverall(base, 'MEI', alvo);
      expect(calcularOverall(calibrados, 'MEI')).toBe(alvo);
      for (const valor of Object.values(calibrados)) {
        expect(valor).toBeGreaterThanOrEqual(1);
        expect(valor).toBeLessThanOrEqual(99);
      }
    }
  });

  it('crescimento JOVEM prioriza o físico; declínio VETERANO derruba o físico primeiro', () => {
    const jovem = comAtributosCalibrados(criarPlayer({id: 'p3', idade: 18, overall: 70, posicaoPrincipal: 'PD'}));
    const sobe = aplicarAlvoDeOverall(jovem, 73);
    expect(sobe.overall).toBe(73);
    const ganhoFisico =
      sobe.atributos.velocidade - jovem.atributos.velocidade;
    expect(ganhoFisico).toBeGreaterThan(0);

    const veterano = comAtributosCalibrados(
      criarPlayer({id: 'p4', idade: 34, overall: 80, posicaoPrincipal: 'PD'}),
    );
    const cai = aplicarAlvoDeOverall(veterano, 78);
    expect(cai.overall).toBe(78);
    // Físico do perfil caiu…
    expect(cai.atributos.velocidade).toBeLessThan(veterano.atributos.velocidade);
    // …e o overall final é SEMPRE derivado dos atributos (nunca editado à mão).
    expect(calcularOverall(cai.atributos, 'PD')).toBe(78);
  });
});
