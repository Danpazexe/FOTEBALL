import {
  aplicarSnapshot,
  carregarJogo,
  definirArmazenamentoSave,
  existeSave,
  montarSnapshot,
  salvarJogo,
  VERSAO_SAVE,
  type ArmazenamentoSave,
} from '../persistence';
import {useGameStore} from '../useGameStore';

/** Armazenamento em memória que imita o backup-before-overwrite do SQLite. */
function armazenamentoMemoria(): ArmazenamentoSave & {
  bruto(): string | null;
  corromper(): void;
} {
  let atual: string | null = null;
  let backup: string | null = null;
  return {
    escrever(json) {
      if (atual !== null) {
        backup = atual;
      }
      atual = json;
      return Promise.resolve();
    },
    ler() {
      return Promise.resolve(atual);
    },
    lerBackup() {
      return Promise.resolve(backup);
    },
    limpar() {
      atual = null;
      backup = null;
      return Promise.resolve();
    },
    bruto() {
      return atual;
    },
    corromper() {
      atual = '{lixo corrompido';
    },
  };
}

describe('persistence', () => {
  it('montarSnapshot + aplicarSnapshot preserva os campos principais', () => {
    const estado = useGameStore.getState();
    const aplicado = aplicarSnapshot(montarSnapshot(estado));
    expect(aplicado.clubes).toHaveLength(estado.clubes.length);
    expect(aplicado.jogadores).toHaveLength(estado.jogadores.length);
    expect(aplicado.partidas).toHaveLength(estado.partidas.length);
    expect(aplicado.temporadaAtual).toBe(estado.temporadaAtual);
    expect(aplicado.rodadaAtual).toBe(estado.rodadaAtual);
  });

  it('engine V2: ledger de chutes e qualidade de dados sobrevivem ao save; legacy fica legacy', () => {
    const estado = useGameStore.getState();
    const [primeira] = estado.partidas;
    expect(primeira).toBeDefined();
    if (!primeira) {
      return;
    }
    const partidaV2 = {
      ...primeira,
      id: 'partida_v2_teste',
      jogada: true,
      placarCasa: 1,
      placarFora: 0,
      engineVersion: 2 as const,
      qualidadeDados: 'causal_full' as const,
      chutes: [
        {
          id: 'chute_10_1',
          timeId: primeira.timeCasa,
          jogadorId: 'j1',
          minuto: 10,
          posseId: 'seq_10_casa',
          situacao: 'jogo_aberto' as const,
          corpo: 'pe_direito' as const,
          x: 0.5,
          y: 0.12,
          golX: 0.3,
          golY: 0.2,
          xg: 0.31,
          xgot: 0.55,
          resultado: 'gol' as const,
          grandeChance: true,
          deFora: false,
        },
      ],
    };
    const comV2 = {
      ...estado,
      partidas: [...estado.partidas.slice(1), partidaV2],
    };
    const aplicado = aplicarSnapshot(montarSnapshot(comV2));
    const partidas = aplicado.partidas ?? [];
    const reidratada = partidas.find(p => p.id === 'partida_v2_teste');
    expect(reidratada?.engineVersion).toBe(2);
    expect(reidratada?.qualidadeDados).toBe('causal_full');
    expect(reidratada?.chutes).toHaveLength(1);
    expect(reidratada?.chutes?.[0]?.xg).toBe(0.31);
    // Partidas legacy (sem ledger) atravessam o save SEM dados fabricados.
    const legacy = partidas.find(p => p.id !== 'partida_v2_teste');
    expect(legacy?.chutes).toBeUndefined();
    expect(legacy?.engineVersion).toBeUndefined();
  });

  it('snapshot inclui config e propostas recebidas (não eram salvos antes)', () => {
    const estado = useGameStore.getState();
    const snap = montarSnapshot(estado, [{id: 'primeira_vitoria'}]);
    expect(snap.versao).toBe(VERSAO_SAVE);
    expect(snap.config).toEqual(estado.config);
    expect(snap.propostasRecebidas).toEqual(estado.propostasRecebidas);
    expect(snap.conquistas).toEqual([{id: 'primeira_vitoria'}]);

    const aplicado = aplicarSnapshot(snap);
    expect(aplicado.config).toEqual(estado.config);
    expect(aplicado.propostasRecebidas).toEqual(estado.propostasRecebidas);
  });

  it('salva e restaura o mundo mestre (todosClubes/todosJogadores)', () => {
    const estado = useGameStore.getState();
    // O mundo das outras divisões existe no estado inicial (seed completo).
    expect(estado.todosClubes.length).toBeGreaterThan(0);
    expect(estado.todosJogadores.length).toBeGreaterThan(0);

    const snap = montarSnapshot(estado);
    expect(snap.todosClubes).toHaveLength(estado.todosClubes.length);
    expect(snap.todosJogadores).toHaveLength(estado.todosJogadores.length);

    const aplicado = aplicarSnapshot(snap);
    expect(aplicado.todosClubes).toHaveLength(estado.todosClubes.length);
    expect(aplicado.todosJogadores).toHaveLength(estado.todosJogadores.length);
  });

  it('save antigo sem mundo mestre: NÃO sobrescreve (mantém o mundo do seed)', () => {
    const estado = useGameStore.getState();
    const snap = montarSnapshot(estado);
    // Simula um save anterior, sem os campos do mundo mestre (rest-omit).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {todosClubes: _c, todosJogadores: _j, ...semMundo} = snap;
    const aplicado = aplicarSnapshot(semMundo);
    // Ausentes no snapshot → omitidos do partial → setState mantém o seed
    // completo em vez de regredir para só a Série A.
    expect('todosClubes' in aplicado).toBe(false);
    expect('todosJogadores' in aplicado).toBe(false);
  });

  it('migra saves antigos: deriva habilidades e tipo ausentes no load', () => {
    const estado = useGameStore.getState();
    const snap = montarSnapshot(estado);
    // Simula um save anterior ao sistema: jogador sem habilidades/tipo.
    const jogadoresAntigos = snap.jogadores.map((jogador, indice) =>
      indice === 0 ? {...jogador, habilidades: undefined, tipo: undefined} : jogador,
    );
    const aplicado = aplicarSnapshot({...snap, jogadores: jogadoresAntigos});
    const alvo = aplicado.jogadores?.[0];
    expect(alvo?.habilidades).toBeDefined();
    expect(alvo?.tipo).toBeDefined();
  });

  it('existeSave retorna false em armazenamento vazio', async () => {
    definirArmazenamentoSave(armazenamentoMemoria());
    expect(await existeSave()).toBe(false);
  });

  it('carregarJogo devolve {tipo:"vazio"} quando não há save', async () => {
    definirArmazenamentoSave(armazenamentoMemoria());
    expect(await carregarJogo()).toEqual({tipo: 'vazio'});
  });

  it('carregarJogo devolve {tipo:"erro"} (não rejeita) se a LEITURA lançar', async () => {
    // Regressão do P0 "inicia como novo jogo": se o SQLite falhar ao abrir/ler no
    // device, carregarJogo NÃO pode propagar a exceção (o boot a engoliria e viraria
    // jogo novo silencioso). Tem que virar 'erro' tipado, distinto de 'vazio'.
    const arm = armazenamentoMemoria();
    arm.ler = () => Promise.reject(new Error('SQLite indisponível'));
    definirArmazenamentoSave(arm);
    const resultado = await carregarJogo();
    expect(resultado.tipo).toBe('erro');
  });

  it('salvarJogo + carregarJogo reidrata o estado e as conquistas', async () => {
    definirArmazenamentoSave(armazenamentoMemoria());
    const estado = useGameStore.getState();

    await salvarJogo(estado, [{id: 'goleada', dataDesbloqueio: '2026-05-01'}]);
    expect(await existeSave()).toBe(true);

    const resultado = await carregarJogo();
    expect(resultado.tipo).toBe('ok');
    if (resultado.tipo !== 'ok') {
      throw new Error('esperava tipo ok');
    }
    expect(resultado.origem).toBe('principal');
    expect(resultado.estado.clubes).toHaveLength(estado.clubes.length);
    expect(resultado.estado.jogadores).toHaveLength(estado.jogadores.length);
    expect(resultado.estado.rodadaAtual).toBe(estado.rodadaAtual);
    expect(resultado.conquistas).toEqual([
      {id: 'goleada', dataDesbloqueio: '2026-05-01'},
    ]);
  });

  it('cai para o backup quando o save principal está corrompido', async () => {
    const arm = armazenamentoMemoria();
    definirArmazenamentoSave(arm);
    const estado = useGameStore.getState();

    // 1º save vira backup ao 2º; depois corrompe o principal.
    await salvarJogo(estado);
    await salvarJogo(estado);
    arm.corromper();

    const resultado = await carregarJogo();
    expect(resultado.tipo).toBe('ok');
    if (resultado.tipo !== 'ok') {
      throw new Error('esperava recuperar do backup');
    }
    expect(resultado.origem).toBe('backup');
    expect(resultado.estado.clubes).toHaveLength(estado.clubes.length);
  });

  it('retorna erro (sem apagar) quando principal e backup são ilegíveis', async () => {
    const arm = armazenamentoMemoria();
    definirArmazenamentoSave(arm);
    arm.corromper(); // só há principal corrompido, sem backup
    // A mensagem carrega um diagnóstico rico anexado (0.31.2); basta conter a base.
    expect(await carregarJogo()).toEqual({
      tipo: 'erro',
      mensagem: expect.stringContaining('Save corrompido e sem backup recuperável.'),
    });
  });

  it('lê save legado v1 (sem config/propostas/conquistas) preenchendo padrões', async () => {
    const arm = armazenamentoMemoria();
    definirArmazenamentoSave(arm);
    const estado = useGameStore.getState();
    const legado = {
      versao: 1,
      clubeUsuarioId: estado.clubeUsuarioId,
      temporadaAtual: estado.temporadaAtual,
      rodadaAtual: estado.rodadaAtual,
      clubes: estado.clubes,
      jogadores: estado.jogadores,
      partidas: estado.partidas,
      tabela: estado.tabela,
      jovensDisponiveis: [],
    };
    await arm.escrever(JSON.stringify(legado));

    const resultado = await carregarJogo();
    expect(resultado.tipo).toBe('ok');
    if (resultado.tipo !== 'ok') {
      throw new Error('esperava migrar o save v1');
    }
    expect(resultado.estado.config).toEqual(estado.config);
    expect(resultado.estado.propostasRecebidas).toEqual([]);
    expect(resultado.conquistas).toEqual([]);
  });

  it('save é idempotente — múltiplos saves mantêm um único snapshot válido', async () => {
    const arm = armazenamentoMemoria();
    definirArmazenamentoSave(arm);
    const estado = useGameStore.getState();

    await salvarJogo(estado);
    await salvarJogo(estado);

    const bruto = arm.bruto();
    expect(bruto).not.toBeNull();
    expect(() => JSON.parse(bruto ?? '')).not.toThrow();
  });
});
