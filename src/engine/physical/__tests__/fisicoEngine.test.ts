/**
 * Engine física (Onda 5): carga/ritmo por partida, recuperação diária,
 * prontidão (ritmo ≠ condição), risco por fadiga/idade, retorno progressivo e
 * descanso. Puro e determinístico.
 */
import {criarPlayer} from '../../../testing/fixtures';
import type {ParticipacaoPartida} from '../../progression/condicao';
import {
  aplicarCargaPosPartida,
  aoRetornarDeLesao,
  comEstadoFisico,
  descansarJogador,
  estadoFisicoInicial,
  fadiga,
  minutosRecomendados,
  nivelRisco,
  pesoLesaoPartida,
  probabilidadeLesao,
  prontidao,
  recuperarDiaFisico,
} from '../fisicoEngine';

const TITULAR: ParticipacaoPartida = {ehTitular: true, participou: true};
const FORA: ParticipacaoPartida = {ehTitular: false, participou: false};

describe('fisicoEngine', () => {
  it('comEstadoFisico é idempotente e preenche default seguro', () => {
    const cru = criarPlayer({id: 'a'});
    expect(cru.fisico).toBeUndefined();
    const com = comEstadoFisico(cru);
    expect(com.fisico).toEqual(estadoFisicoInicial(cru));
    expect(comEstadoFisico(com)).toBe(com); // já tem: mesma referência
  });

  it('jogar aumenta carga aguda e ritmo; ficar de fora perde ritmo', () => {
    const jogador = comEstadoFisico(criarPlayer({id: 'b'}));
    const jogou = aplicarCargaPosPartida(jogador, TITULAR);
    expect(jogou.cargaAguda).toBeGreaterThan(jogador.fisico!.cargaAguda);
    expect(jogou.ritmo).toBeGreaterThan(jogador.fisico!.ritmo);

    const descansou = aplicarCargaPosPartida(jogador, FORA);
    expect(descansou.ritmo).toBeLessThan(jogador.fisico!.ritmo);
  });

  it('recuperação diária dissipa a carga aguda ao longo dos dias', () => {
    let fisico = aplicarCargaPosPartida(
      comEstadoFisico(criarPlayer({id: 'c'})),
      TITULAR,
    );
    const cargaInicial = fisico.cargaAguda;
    for (let i = 0; i < 5; i += 1) {
      fisico = recuperarDiaFisico(fisico);
    }
    expect(fisico.cargaAguda).toBeLessThan(cargaInicial * 0.5);
  });

  it('prontidão separa ritmo de condição: descansado sem ritmo não é 100%', () => {
    const descansadoSemRitmo = comEstadoFisico(
      criarPlayer({id: 'd', condicaoFisica: 100}),
    );
    // Sem jogos → ritmo baixo → prontidão longe de 100 mesmo com condição cheia.
    expect(prontidao(descansadoSemRitmo)).toBeLessThan(85);

    const emRitmo = {
      ...descansadoSemRitmo,
      fisico: {...descansadoSemRitmo.fisico!, ritmo: 95},
    };
    expect(prontidao(emRitmo)).toBeGreaterThan(prontidao(descansadoSemRitmo));
  });

  it('risco de lesão cresce com fadiga e idade', () => {
    const novoFresco = comEstadoFisico(
      criarPlayer({id: 'e', idade: 24, condicaoFisica: 100}),
    );
    const veteranoFadigado = {
      ...comEstadoFisico(criarPlayer({id: 'f', idade: 35, condicaoFisica: 45})),
      fisico: {cargaAguda: 90, cargaCronica: 40, ritmo: 30},
    };
    expect(probabilidadeLesao(veteranoFadigado)).toBeGreaterThan(
      probabilidadeLesao(novoFresco),
    );
    expect(nivelRisco(novoFresco)).toBe('baixo');
    expect(['elevado', 'muito_elevado']).toContain(nivelRisco(veteranoFadigado));
    expect(pesoLesaoPartida(veteranoFadigado)).toBeGreaterThan(
      pesoLesaoPartida(novoFresco),
    );
    expect(fadiga(veteranoFadigado)).toBeGreaterThan(fadiga(novoFresco));
  });

  it('retorno de lesão é progressivo: volta com condição/ritmo parciais', () => {
    const recuperado = comEstadoFisico(
      criarPlayer({id: 'g', condicaoFisica: 100, lesionado: true, diasLesao: 1}),
    );
    const voltou = aoRetornarDeLesao(recuperado);
    expect(voltou.lesionado).toBe(false);
    expect(voltou.condicaoFisica).toBeLessThanOrEqual(60);
    expect(voltou.fisico!.ritmo).toBeLessThanOrEqual(30);
    // Baixa prontidão ⇒ minutos recomendados reduzidos.
    expect(minutosRecomendados(voltou)).toBeLessThan(90);
  });

  it('descanso recupera condição e dissipa carga (ao custo de ritmo)', () => {
    const cansado = {
      ...comEstadoFisico(criarPlayer({id: 'h', condicaoFisica: 50})),
      fisico: {cargaAguda: 80, cargaCronica: 60, ritmo: 70},
    };
    const descansado = descansarJogador(cansado);
    expect(descansado.condicaoFisica).toBeGreaterThan(cansado.condicaoFisica);
    expect(descansado.fisico!.cargaAguda).toBeLessThan(cansado.fisico.cargaAguda);
    expect(descansado.fisico!.ritmo).toBeLessThanOrEqual(cansado.fisico.ritmo);
  });
});
