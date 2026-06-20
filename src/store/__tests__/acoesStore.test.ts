/**
 * Testes de regressão das ações do store que a auditoria de correção apontou.
 * Dirigem o store real de forma determinística (injetando estado quando preciso)
 * para travar os 4 consertos: conservação de dinheiro, presença fantasma,
 * arquivamento de estatísticas de agente livre e prazo das propostas da IA.
 */
import type {PropostaTransferencia} from '../../engine/transfers/negociacaoEngine';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const somaSaldos = () =>
  estado().clubes.reduce((total, c) => total + c.financas.saldo, 0);
const saldoDe = (id: string) =>
  estado().clubes.find(c => c.id === id)?.financas.saldo ?? 0;

describe('ações do store (regressões da auditoria)', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('aceitar proposta da IA debita o comprador (dinheiro é conservado)', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const meuJogador = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    const comprador = estado().clubes.find(c => c.id !== usuario.id)!;
    const valor = 5_000_000;

    const proposta: PropostaTransferencia = {
      id: 'prop_teste',
      jogadorId: meuJogador.id,
      clubeOfertante: comprador.id,
      valorProposto: valor,
      status: 'pendente',
      expiracaoRodada: estado().rodadaAtual + 2,
    };
    useGameStore.setState({propostasRecebidas: [proposta]});

    const totalAntes = somaSaldos();
    const saldoUsuarioAntes = saldoDe(usuario.id);
    const saldoCompradorAntes = saldoDe(comprador.id);

    estado().responderPropostaVenda('prop_teste', true);

    // Usuário recebe, comprador paga, total do sistema não muda.
    expect(saldoDe(usuario.id)).toBe(saldoUsuarioAntes + valor);
    expect(saldoDe(comprador.id)).toBe(saldoCompradorAntes - valor);
    expect(somaSaldos()).toBe(totalAntes);
    expect(estado().jogadores.find(j => j.id === meuJogador.id)?.clubeId).toBe(
      comprador.id,
    );
    expect(estado().propostasRecebidas).toHaveLength(0);
  });

  it('assumirClube após demissão mantém a reputação e limpa a demissão', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    // Simula um técnico demitido com reputação acumulada.
    useGameStore.setState({
      reputacaoTecnico: 64,
      demissao: 'DERROTAS_CONSECUTIVAS',
      derrotasConsecutivas: 5,
      rodadasNoVermelho: 4,
    });

    const novoClube = estado().todosClubes.find(c => c.id !== usuario.id)!;
    estado().assumirClube(novoClube.id);

    expect(estado().clubeUsuarioId).toBe(novoClube.id);
    expect(estado().demissao).toBeNull();
    expect(estado().reputacaoTecnico).toBe(64); // reputação carrega na carreira
    expect(estado().derrotasConsecutivas).toBe(0);
    expect(estado().rodadasNoVermelho).toBe(0);
    expect(estado().rodadaAtual).toBe(1);
  });

  it('emprestar/pegar emprestado move o jogador e conserva o caixa', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);
    const uid = estado().clubeUsuarioId!;

    // OUT: um jogador do usuário é cedido a outro clube.
    const meu = estado().jogadores.find(j => j.clubeId === uid)!;
    const destino = estado().clubes.find(c => c.id !== uid)!;
    estado().emprestarJogador(meu.id, destino.id);
    const apos = estado().jogadores.find(j => j.id === meu.id)!;
    expect(apos.clubeId).toBe(destino.id);
    expect(apos.emprestimo?.clubeDonoId).toBe(uid);
    expect(estado().clubes.find(c => c.id === uid)!.elenco).not.toContain(meu.id);
    expect(estado().clubes.find(c => c.id === destino.id)!.elenco).toContain(
      meu.id,
    );

    // IN: um jogador de outro clube vem emprestado, conservando o caixa total.
    const alvo = estado().jogadores.find(
      j => j.clubeId && j.clubeId !== uid && !j.emprestimo,
    )!;
    const donoId = alvo.clubeId!;
    const totalAntes = somaSaldos();
    estado().pegarEmprestado(alvo.id);
    const aposIn = estado().jogadores.find(j => j.id === alvo.id)!;
    expect(aposIn.clubeId).toBe(uid);
    expect(aposIn.emprestimo?.clubeDonoId).toBe(donoId);
    expect(estado().clubes.find(c => c.id === uid)!.elenco).toContain(alvo.id);
    expect(somaSaldos()).toBe(totalAntes);
  });

  it('titular suspenso não ganha presença fantasma ao avançar a rodada', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const adversario = estado().clubes.find(c => c.id !== usuario.id)!;
    const titulares = adversario.formacaoAtual!.titulares;
    const suspensoId = titulares[0].jogadorId;
    const disponivelId = titulares[1].jogadorId;

    // Suspende um titular do adversário mantendo-o na escalação default da IA.
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === suspensoId ? {...j, suspenso: true, jogosSuspensao: 1} : j,
      ),
    });

    expect(jogosDe(suspensoId)).toBe(0);
    estado().avancarRodada();

    // O suspenso não estava em campo (o motor o ignora) — sem jogo/condição/nota.
    expect(jogosDe(suspensoId)).toBe(0);
    // Sanidade: um titular disponível do mesmo time realmente disputou a rodada.
    expect(jogosDe(disponivelId)).toBe(1);
  });

  it('vira a temporada arquivando as estatísticas de um agente livre', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const alvo = estado().jogadores.find(j => j.clubeId === usuario.id)!;
    useGameStore.setState({
      rodadaAtual: 39, // pré-condição de finalizarTemporada
      jogadores: estado().jogadores.map(j =>
        j.id === alvo.id
          ? {
              ...j,
              clubeId: null, // agente livre
              estatisticasTemporada: {...j.estatisticasTemporada, jogos: 5},
              historicoTemporadas: [],
            }
          : j,
      ),
    });

    estado().finalizarTemporada();

    const depois = estado().jogadores.find(j => j.id === alvo.id)!;
    expect(depois.historicoTemporadas).toHaveLength(1);
    expect(depois.historicoTemporadas[0].jogos).toBe(5);
    expect(depois.estatisticasTemporada.jogos).toBe(0);
  });

  it('processarPropostasIA mantém ofertas no prazo e descarta as vencidas', () => {
    const usuario = estado().clubes[3];
    estado().iniciarNovaCarreira(usuario.id);

    const meus = estado().jogadores.filter(j => j.clubeId === usuario.id);
    const comprador = estado().clubes.find(c => c.id !== usuario.id)!;
    const rodada = estado().rodadaAtual;

    const base = (
      id: string,
      jogadorId: string,
      expiracaoRodada: number,
    ): PropostaTransferencia => ({
      id,
      jogadorId,
      clubeOfertante: comprador.id,
      valorProposto: 1_000_000,
      status: 'pendente',
      expiracaoRodada,
    });

    useGameStore.setState({
      propostasRecebidas: [
        base('valida', meus[0].id, rodada + 2),
        base('vencida', meus[1].id, rodada - 1),
      ],
    });

    estado().processarPropostasIA();

    const ids = estado().propostasRecebidas.map(p => p.id);
    expect(ids).toContain('valida');
    expect(ids).not.toContain('vencida');
  });
});

function jogosDe(jogadorId: string): number {
  return (
    useGameStore
      .getState()
      .jogadores.find(j => j.id === jogadorId)?.estatisticasTemporada.jogos ?? -1
  );
}
