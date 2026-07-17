/**
 * CONTRATOS DA ONDA 1 (épico Overall Dinâmico): compatibilidade de save,
 * defaults honestos do plano de treino e categorização dos atributos.
 * O critério de saída da Fase 1 do briefing: contratos compilam e têm testes.
 */
import {
  atributosDaCategoria,
  CATEGORIA_POR_ATRIBUTO,
} from '../../engine/progression/categoriasAtributos';
import type {AtributoChave, PlanoTreino} from '../../types';
import {aplicarSnapshot, montarSnapshot} from '../persistence';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();

describe('Onda 1 — contratos do épico Overall Dinâmico', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('carreira NOVA começa com treino não configurado (nunca finge escolha)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    expect(estado().planoTreino).toBeNull();
    expect(estado().planoTreinoStatus).toBe('nao_configurado');
    // Onda 3: a carreira nasce com a pendência de treino na Central (mockup).
    expect(estado().pendencias.map(p => p.tipo)).toEqual([
      'definir_plano_treino',
    ]);
  });

  it('save ANTIGO (sem os campos novos) carrega com defaults honestos', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const snapshot = montarSnapshot(estado());

    // Simula um save gravado ANTES da Onda 1: os campos novos não existem.
    delete snapshot.planoTreino;
    delete snapshot.planoTreinoStatus;
    delete snapshot.pendencias;

    const aplicado = aplicarSnapshot(snapshot);
    // Save antigo JÁ treinava no automático → default é o plano do assistente.
    expect(aplicado.planoTreinoStatus).toBe('padrao_assistente');
    expect(aplicado.planoTreino).toBeNull();
    expect(aplicado.pendencias).toEqual([]);
  });

  it('round-trip: plano configurado sobrevive a salvar e recarregar', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const plano: PlanoTreino = {
      id: 'plano_teste',
      clubeId: usuario.id,
      nome: 'Semana equilibrada',
      status: 'ativo',
      recorrencia: {tipo: 'semanal'},
      semanas: [
        {
          dias: [
            {treinoId: 'hab_passe', intensidade: 'normal'},
            null,
            {treinoId: 'hab_fisico', intensidade: 'leve'},
            null,
            {treinoId: 'hab_finalizacao', intensidade: 'normal'},
            null,
            null,
          ],
        },
      ],
      autoAjustePartidas: true,
      criadoPor: 'usuario',
      criadoEm: '2026-04-06',
    };
    useGameStore.setState({
      planoTreino: plano,
      planoTreinoStatus: 'configurado_usuario',
    });

    const aplicado = aplicarSnapshot(montarSnapshot(estado()));
    expect(aplicado.planoTreino).toEqual(plano);
    expect(aplicado.planoTreinoStatus).toBe('configurado_usuario');
  });

  it('migração é idempotente: aplicar o snapshot duas vezes dá o mesmo estado', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const snapshot = montarSnapshot(estado());
    delete snapshot.planoTreinoStatus;

    const primeira = aplicarSnapshot(snapshot);
    // Segunda passagem parte do resultado da primeira (novo snapshot).
    useGameStore.setState(primeira);
    const segunda = aplicarSnapshot(montarSnapshot(estado()));

    expect(segunda.planoTreinoStatus).toBe(primeira.planoTreinoStatus);
    expect(segunda.planoTreino).toEqual(primeira.planoTreino);
    expect(segunda.pendencias).toEqual(primeira.pendencias);
  });

  it('trocar de clube (pós-demissão) zera o plano — ele era do clube anterior', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    useGameStore.setState({planoTreinoStatus: 'configurado_usuario'});

    const outro = estado().clubes.find(c => c.id !== usuario.id)!;
    estado().assumirClube(outro.id);

    expect(estado().planoTreino).toBeNull();
    expect(estado().planoTreinoStatus).toBe('nao_configurado');
  });

  it('todos os 12 atributos têm categoria e os grupos são coerentes', () => {
    const chaves = Object.keys(CATEGORIA_POR_ATRIBUTO) as AtributoChave[];
    expect(chaves).toHaveLength(12);

    expect(atributosDaCategoria('fisico').sort()).toEqual(
      ['forca', 'resistencia', 'velocidade'].sort(),
    );
    expect(atributosDaCategoria('goleiro')).toEqual(['reflexos']);
    expect(atributosDaCategoria('mental')).toEqual(['posicionamento']);
    // Técnico cobre o restante (7): nenhuma chave fica sem grupo.
    expect(atributosDaCategoria('tecnico')).toHaveLength(7);
    const total =
      atributosDaCategoria('fisico').length +
      atributosDaCategoria('tecnico').length +
      atributosDaCategoria('mental').length +
      atributosDaCategoria('goleiro').length;
    expect(total).toBe(12);
  });
});
