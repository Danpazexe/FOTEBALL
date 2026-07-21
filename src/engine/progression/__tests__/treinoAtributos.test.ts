import {criarPlayer} from '../../../testing/fixtures';
import {buscarTreino} from '../treinoTipos';
import {
  calcularEfeitoTreino,
  aplicarEfeitoTreino,
  type ContextoTreino,
} from '../treinoAtributos';
import {criarRNGComSeed, type RandomGenerator} from '../../simulation/rng';

/**
 * Testes do motor de treino por acúmulo de progresso. RNG sempre injetado para
 * controlar (e descartar) o sorteio de lesão e garantir determinismo total.
 */

// rng que nunca dispara lesão (risco < 1) — finaliza sempre o treino.
const semLesao: RandomGenerator = () => 0.99;

const treinoFinalizacao = buscarTreino('hab_finalizacao')!;
const contexto: ContextoTreino = {nivelInfra: 3, jogosNaTemporada: 10};

describe('treinoAtributos', () => {
  it('acumula progresso em finalização sem subir atributo numa sessão', () => {
    const jovem = criarPlayer({
      id: 'jovem',
      idade: 18,
      posicaoPrincipal: 'CA',
      overall: 70,
      potencial: 90,
    });

    const efeito = calcularEfeitoTreino(
      jovem,
      treinoFinalizacao,
      'normal',
      contexto,
      semLesao,
    );

    expect(efeito.lesionou).toBe(false);
    expect(efeito.progressoAtributos.finalizacao).toBeGreaterThan(0);
    // Numa única sessão não há ganho de ponto (progresso < 100).
    expect(efeito.ganhoAtributos.finalizacao).toBeUndefined();
    expect(efeito.atributosFinais.finalizacao).toBe(jovem.atributos.finalizacao);
  });

  it('repetir o treino sobe o atributo +1 e reduz/zera o progresso', () => {
    let jogador = criarPlayer({
      id: 'jovem',
      idade: 18,
      posicaoPrincipal: 'CA',
      overall: 70,
      potencial: 90,
    });
    const finalizacaoInicial = jogador.atributos.finalizacao;

    let subiu = false;
    for (let i = 0; i < 30 && !subiu; i += 1) {
      const efeito = calcularEfeitoTreino(
        jogador,
        treinoFinalizacao,
        'forte',
        contexto,
        semLesao,
      );
      jogador = aplicarEfeitoTreino(jogador, efeito);
      if ((efeito.ganhoAtributos.finalizacao ?? 0) > 0) {
        subiu = true;
        // Ao subir, o progresso residual fica abaixo de 100 (zerou/reduziu).
        expect(jogador.progressoAtributos?.finalizacao ?? 0).toBeLessThan(100);
      }
    }

    expect(subiu).toBe(true);
    expect(jogador.atributos.finalizacao).toBeGreaterThan(finalizacaoInicial);
  });

  it('é determinístico: mesma seed produz efeito idêntico por jogador', () => {
    const elenco = [
      criarPlayer({id: 'a', idade: 19, posicaoPrincipal: 'CA'}),
      criarPlayer({id: 'b', idade: 24, posicaoPrincipal: 'MEI'}),
      criarPlayer({id: 'c', idade: 31, posicaoPrincipal: 'ZAG'}),
    ];

    const treinar = (seed: number) =>
      elenco.map(jogador =>
        aplicarEfeitoTreino(
          jogador,
          calcularEfeitoTreino(
            jogador,
            treinoFinalizacao,
            'forte',
            contexto,
            criarRNGComSeed(seed),
          ),
        ),
      );

    expect(treinar(42)).toEqual(treinar(42));
  });

  it('lesionado recebe efeito leve sem ganho de atributo', () => {
    const lesionado = criarPlayer({
      id: 'machucado',
      idade: 20,
      posicaoPrincipal: 'CA',
      condicaoFisica: 70,
      lesionado: true,
    });

    // rng baixo dispararia lesão num saudável; lesionado ignora o sorteio.
    const efeito = calcularEfeitoTreino(
      lesionado,
      treinoFinalizacao,
      'muito_forte',
      contexto,
      () => 0,
    );

    expect(efeito.lesionou).toBe(false);
    expect(efeito.ganhoAtributos).toEqual({});
    expect(efeito.progressoAtributos).toEqual({});
    expect(efeito.atributosFinais).toEqual(lesionado.atributos);
    expect(efeito.novoOverall).toBe(lesionado.overall);
    // Reabilitação leve recupera condição (+8 bruto da intensidade leve).
    expect(efeito.deltaCondicao).toBeGreaterThan(0);
  });

  it('descanso: recupera condição e NÃO treina atributo (ganho zero)', () => {
    const jogador = criarPlayer({
      id: 'cansado',
      idade: 22,
      posicaoPrincipal: 'CA',
      condicaoFisica: 60,
    });

    const descanso = calcularEfeitoTreino(
      jogador,
      treinoFinalizacao,
      'descanso',
      contexto,
      semLesao,
    );
    const leve = calcularEfeitoTreino(
      jogador,
      treinoFinalizacao,
      'leve',
      contexto,
      semLesao,
    );

    // Recuperação pura: sem progresso/ganho de atributo.
    expect(descanso.progressoAtributos.finalizacao ?? 0).toBe(0);
    expect(descanso.ganhoAtributos).toEqual({});
    expect(descanso.atributosFinais.finalizacao).toBe(jogador.atributos.finalizacao);
    // Recupera condição — e mais que o treino leve.
    expect(descanso.deltaCondicao).toBeGreaterThan(0);
    expect(descanso.deltaCondicao).toBeGreaterThan(leve.deltaCondicao);
  });

  it('veterano ganha bem menos progresso que jovem no mesmo treino', () => {
    const jovem = criarPlayer({
      id: 'jovem',
      idade: 18,
      posicaoPrincipal: 'CA',
      overall: 70,
      potencial: 90,
    });
    const veterano = criarPlayer({
      id: 'veterano',
      idade: 35,
      posicaoPrincipal: 'CA',
      overall: 70,
      potencial: 90,
    });

    const efeitoJovem = calcularEfeitoTreino(
      jovem,
      treinoFinalizacao,
      'normal',
      contexto,
      semLesao,
    );
    const efeitoVeterano = calcularEfeitoTreino(
      veterano,
      treinoFinalizacao,
      'normal',
      contexto,
      semLesao,
    );

    expect(efeitoVeterano.progressoAtributos.finalizacao!).toBeLessThan(
      efeitoJovem.progressoAtributos.finalizacao!,
    );
  });

  it('novoOverall nunca passa do potencial', () => {
    // Jogador já no teto de overall = potencial; muitas sessões não devem
    // empurrar o overall além do potencial.
    let jogador = criarPlayer({
      id: 'craque',
      idade: 18,
      posicaoPrincipal: 'CA',
      overall: 80,
      potencial: 80,
      atributos: {
        finalizacao: 80,
        passe: 80,
        marcacao: 80,
        desarme: 80,
        velocidade: 80,
        resistencia: 80,
        forca: 80,
        reflexos: 80,
        posicionamento: 80,
        drible: 80,
        cabeceio: 80,
        cruzamento: 80,
      },
    });

    for (let i = 0; i < 200; i += 1) {
      const efeito = calcularEfeitoTreino(
        jogador,
        treinoFinalizacao,
        'muito_forte',
        contexto,
        semLesao,
      );
      expect(efeito.novoOverall).toBeLessThanOrEqual(jogador.potencial);
      jogador = aplicarEfeitoTreino(jogador, efeito);
      expect(jogador.overall).toBeLessThanOrEqual(jogador.potencial);
    }
  });

  it('treino inexistente não resolve no catálogo (guarda dos orquestradores)', () => {
    // A store (aplicarSessaoAoClube) devolve o elenco inalterado quando o
    // treinoId não existe — a guarda é o buscarTreino retornar undefined.
    expect(buscarTreino('nao_existe')).toBeUndefined();
  });
});
