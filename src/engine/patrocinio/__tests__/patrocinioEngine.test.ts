/**
 * Testes da engine de patrocínios — cobre os 10 casos obrigatórios do briefing
 * (§17) mais os invariantes de valor/idempotência.
 */
import {
  aceitarPropostaPatrocinio,
  atualizarMetasPatrocinio,
  bonusVitoriaPatrocinio,
  calcularValorPropostaPatrocinio,
  gerarPropostasPatrocinio,
  pagarTemporadaPatrocinio,
  processarFimContratoPatrocinio,
  recusarPropostaPatrocinio,
  type ContextoMetasPatrocinio,
  type PerfilClubePatrocinio,
} from '../patrocinioEngine';
import {CATALOGO_PATROCINADORES, patrocinadorPorId} from '../catalogo';
import {
  criarEstadoPatrocinioVazio,
  type ContratoPatrocinio,
  type EstadoPatrocinio,
} from '../../../types/patrocinio';

function perfil(over: Partial<PerfilClubePatrocinio> = {}): PerfilClubePatrocinio {
  return {
    clubeId: 'clube_a',
    temporada: 2026,
    reputacao: 55,
    divisao: 'Série A',
    posicaoLiga: 10,
    totalClubesDivisao: 20,
    desempenhoRecente: 0.5,
    torcidaFator: 0.5,
    ...over,
  };
}

describe('catálogo dos 36', () => {
  it('tem exatamente 36 patrocinadores com ids únicos', () => {
    expect(CATALOGO_PATROCINADORES).toHaveLength(36);
    const ids = new Set(CATALOGO_PATROCINADORES.map(p => p.id));
    expect(ids.size).toBe(36);
  });
});

describe('geração de propostas — determinismo e regras', () => {
  it('1. mesma seed (clube+temporada) produz as mesmas propostas', () => {
    const p = perfil();
    expect(gerarPropostasPatrocinio(p, null)).toEqual(gerarPropostasPatrocinio(p, null));
  });

  it('2. não há patrocinador repetido entre as propostas', () => {
    const propostas = gerarPropostasPatrocinio(perfil(), null);
    const ids = propostas.map(x => x.patrocinadorId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gera no máximo 3 propostas', () => {
    expect(gerarPropostasPatrocinio(perfil(), null).length).toBeLessThanOrEqual(3);
  });

  it('3. clube de baixa reputação recebe principalmente propostas regionais', () => {
    const propostas = gerarPropostasPatrocinio(
      perfil({reputacao: 20, divisao: 'Série D', posicaoLiga: 15, desempenhoRecente: 0.3}),
      null,
    );
    expect(propostas.length).toBeGreaterThan(0);
    const regionais = propostas.filter(
      x => patrocinadorPorId(x.patrocinadorId)?.alcance === 'REGIONAL',
    );
    // Sem elegibilidade nacional/global, todas devem ser regionais.
    expect(regionais.length).toBe(propostas.length);
  });

  it('4. clube de alta reputação na Série A pode receber proposta global', () => {
    // Varre várias temporadas (seeds distintas) — ao menos uma traz global.
    let achouGlobal = false;
    for (let t = 2026; t < 2046; t += 1) {
      const propostas = gerarPropostasPatrocinio(
        perfil({reputacao: 85, divisao: 'Série A', posicaoLiga: 2, temporada: t, desempenhoRecente: 0.8}),
        null,
      );
      if (propostas.some(x => patrocinadorPorId(x.patrocinadorId)?.alcance === 'GLOBAL')) {
        achouGlobal = true;
        break;
      }
    }
    expect(achouGlobal).toBe(true);
  });

  it('5. nenhum contrato tem mais de duas metas', () => {
    for (let t = 2026; t < 2046; t += 1) {
      for (const prop of gerarPropostasPatrocinio(perfil({temporada: t}), null)) {
        expect(prop.metas.length).toBeLessThanOrEqual(2);
      }
    }
  });

  it('6. candidato ao rebaixamento nunca recebe meta de título', () => {
    for (let t = 2026; t < 2050; t += 1) {
      const propostas = gerarPropostasPatrocinio(
        perfil({reputacao: 30, posicaoLiga: 18, temporada: t, desempenhoRecente: 0.25}),
        null,
      );
      for (const prop of propostas) {
        expect(prop.metas.some(m => m.tipo === 'TITULO')).toBe(false);
      }
    }
  });

  it('a 1ª meta é obrigatória (bônus 0) e a 2ª é bônus (> 0)', () => {
    for (let t = 2026; t < 2060; t += 1) {
      for (const prop of gerarPropostasPatrocinio(perfil({temporada: t}), null)) {
        if (prop.metas.length >= 1) {
          expect(prop.metas[0]?.valorBonus).toBe(0);
        }
        if (prop.metas.length === 2) {
          expect(prop.metas[1]?.valorBonus).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('valor da proposta', () => {
  it('alcance global vale mais que regional; contrato longo tem total maior', () => {
    const p = perfil({reputacao: 80, divisao: 'Série A'});
    const reg = calcularValorPropostaPatrocinio(p, 'REGIONAL', 1);
    const glob = calcularValorPropostaPatrocinio(p, 'GLOBAL', 1);
    expect(glob.valorPorTemporada).toBeGreaterThan(reg.valorPorTemporada);
    const um = calcularValorPropostaPatrocinio(p, 'NACIONAL', 1);
    const tres = calcularValorPropostaPatrocinio(p, 'NACIONAL', 3);
    expect(tres.valorFixoTotal).toBeGreaterThan(um.valorFixoTotal);
    // Contrato longo paga um pouco MENOS por temporada.
    expect(tres.valorPorTemporada).toBeLessThan(um.valorPorTemporada);
  });
});

describe('aceitar / recusar', () => {
  it('aceitar cria contrato ativo e recusa as demais pendentes', () => {
    const propostas = gerarPropostasPatrocinio(perfil(), null);
    const estado = {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026};
    const alvo = propostas[0]!;
    const novo = aceitarPropostaPatrocinio(estado, alvo.id);
    expect(novo.contratoAtivo?.patrocinadorId).toBe(alvo.patrocinadorId);
    expect(novo.propostas.find(p => p.id === alvo.id)?.status).toBe('ACEITA');
    for (const p of novo.propostas) {
      if (p.id !== alvo.id) {
        expect(p.status).not.toBe('PENDENTE');
      }
    }
  });

  it('recusar marca só aquela proposta como RECUSADA', () => {
    const propostas = gerarPropostasPatrocinio(perfil(), null);
    const estado = {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026};
    const novo = recusarPropostaPatrocinio(estado, propostas[0]!.id);
    expect(novo.propostas[0]?.status).toBe('RECUSADA');
    expect(novo.contratoAtivo).toBeNull();
  });

  it('aceitar proposta inexistente não muda nada', () => {
    const estado = criarEstadoPatrocinioVazio();
    expect(aceitarPropostaPatrocinio(estado, 'nao_existe')).toBe(estado);
  });
});

describe('pagamento e bônus', () => {
  function estadoComContrato(): ReturnType<typeof aceitarPropostaPatrocinio> {
    const propostas = gerarPropostasPatrocinio(perfil({reputacao: 80}), null);
    const estado = {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026};
    return aceitarPropostaPatrocinio(estado, propostas[0]!.id);
  }

  it('7. pagamento não ultrapassa o valor fixo total (idempotente por temporada)', () => {
    let estado = estadoComContrato();
    const contrato = estado.contratoAtivo!;
    let totalCreditado = 0;
    // Paga mais vezes que a duração — o excedente é 0.
    for (let i = 0; i < contrato.temporadaFim - contrato.temporadaInicio + 3; i += 1) {
      const r = pagarTemporadaPatrocinio(estado);
      estado = r.estado;
      totalCreditado += r.credito;
    }
    expect(totalCreditado).toBe(contrato.valorFixoTotal);
    expect(estado.contratoAtivo?.valorPago).toBe(contrato.valorFixoTotal);
  });

  it('bônus por vitória reflete o contrato ativo (0 sem contrato)', () => {
    expect(bonusVitoriaPatrocinio(criarEstadoPatrocinioVazio())).toBe(0);
    const estado = estadoComContrato();
    expect(bonusVitoriaPatrocinio(estado)).toBe(estado.contratoAtivo?.bonusPorVitoria);
  });

  it('8. meta concluída credita o bônus uma única vez', () => {
    // Monta um contrato com uma meta bônus de VITÓRIAS.
    const contrato: ContratoPatrocinio = {
      id: 'c1', propostaOrigemId: 'p1', patrocinadorId: 'colacoca', clubeId: 'clube_a',
      temporadaInicio: 2026, temporadaFim: 2026, valorFixoTotal: 5_000_000,
      valorPorTemporada: 5_000_000, bonusPorVitoria: 25_000, valorPago: 0,
      metas: [
        {id: 'm_obrig', tipo: 'POSICAO_LIGA', descricao: '', alvo: 10, progresso: 0, valorBonus: 0, concluida: false, bonusPago: false},
        {id: 'm_bonus', tipo: 'VITORIAS', descricao: '', alvo: 12, progresso: 0, valorBonus: 1_000_000, concluida: false, bonusPago: false},
      ],
      status: 'ATIVO',
    };
    let estado: EstadoPatrocinio = {
      ...criarEstadoPatrocinioVazio(),
      contratoAtivo: contrato,
    };
    const ctx = (vit: number): ContextoMetasPatrocinio => ({
      posicaoLiga: 8, vitoriasTemporada: vit, sequenciaInvicto: 0,
      acessoConquistado: false, rebaixado: false, faseCopaAlcancada: 0,
      titulosTemporada: 0, jogosComBase: 0,
    });
    let r = atualizarMetasPatrocinio(estado, ctx(11));
    expect(r.bonus).toBe(0); // ainda não cumpriu (11 < 12)
    estado = r.estado;
    r = atualizarMetasPatrocinio(estado, ctx(12));
    expect(r.bonus).toBe(1_000_000); // cumpriu → paga
    estado = r.estado;
    r = atualizarMetasPatrocinio(estado, ctx(15));
    expect(r.bonus).toBe(0); // não paga de novo (idempotente)
  });
});

describe('fim de contrato e renovação', () => {
  it('9. contrato expira na temporada correta (vira histórico CONCLUIDO)', () => {
    const propostas = gerarPropostasPatrocinio(perfil({reputacao: 80}), null);
    let estado: EstadoPatrocinio = aceitarPropostaPatrocinio(
      {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026},
      propostas[0]!.id,
    );
    const fim = estado.contratoAtivo!.temporadaFim;
    // Na última temporada ainda está ativo.
    estado = processarFimContratoPatrocinio(estado, fim);
    expect(estado.contratoAtivo).not.toBeNull();
    // Na temporada seguinte, encerra.
    estado = processarFimContratoPatrocinio(estado, fim + 1);
    expect(estado.contratoAtivo).toBeNull();
    expect(estado.historico[0]?.status).toBe('CONCLUIDO');
  });

  it('10. renovação só é gerada quando elegível (último ano do contrato)', () => {
    const propostas = gerarPropostasPatrocinio(perfil({reputacao: 80}), null);
    const estado = aceitarPropostaPatrocinio(
      {...criarEstadoPatrocinioVazio(), propostas, temporadaPropostas: 2026},
      propostas.find(p => p.duracaoTemporadas >= 2)?.id ?? propostas[0]!.id,
    );
    const contrato = estado.contratoAtivo!;
    // Meio do contrato (não é o último ano) → sem renovação.
    if (contrato.temporadaFim > contrato.temporadaInicio) {
      const semRenov = gerarPropostasPatrocinio(
        perfil({temporada: contrato.temporadaInicio, reputacao: 80}),
        contrato,
      );
      expect(semRenov.some(p => p.ehRenovacao)).toBe(false);
    }
    // Último ano → o patrocinador atual oferece renovação.
    const comRenov = gerarPropostasPatrocinio(
      perfil({temporada: contrato.temporadaFim, reputacao: 80}),
      contrato,
    );
    const renov = comRenov.find(p => p.ehRenovacao);
    expect(renov?.patrocinadorId).toBe(contrato.patrocinadorId);
  });
});
