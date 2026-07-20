/**
 * Engine do plano de treino recorrente (Onda 4): presets válidos, sessão do
 * ciclo determinística com folga/pausa e o assistente escolhendo por contexto.
 */
import {
  PRESETS_TREINO,
  definirDiaNoPlano,
  planoDePreset,
  recomendarPlano,
  SESSAO_PROVISORIA,
  sessaoDoCiclo,
  type ContextoAssistente,
} from '../planoTreinoEngine';
import {buscarTreino} from '../treinoTipos';

const contextoBase: ContextoAssistente = {
  clubeId: 'meu',
  criadoEm: '2026-04-06',
  fracaoDesgastada: 0.1,
  idadeMedia: 27,
  jogosProximos: 1,
  preTemporada: false,
};

describe('planoTreinoEngine', () => {
  it('todo treino referenciado nos presets existe no catálogo', () => {
    for (const preset of Object.values(PRESETS_TREINO)) {
      for (const dia of preset.dias) {
        if (dia) {
          expect(buscarTreino(dia.treinoId)).toBeDefined();
        }
      }
      expect(preset.dias).toHaveLength(7);
    }
  });

  it('sem plano (ou pausado) cai na sessão provisória leve', () => {
    expect(sessaoDoCiclo(null, 0)).toEqual(SESSAO_PROVISORIA);
    const plano = planoDePreset('equilibrado', 'meu', '2026-04-06');
    expect(sessaoDoCiclo({...plano, status: 'pausado'}, 0)).toEqual(
      SESSAO_PROVISORIA,
    );
  });

  it('sessão do ciclo é determinística e ignora dias de folga', () => {
    const plano = planoDePreset('equilibrado', 'meu', '2026-04-06');
    const s1 = sessaoDoCiclo(plano, 3);
    const s2 = sessaoDoCiclo(plano, 3);
    expect(s1).toEqual(s2);
    // Nunca devolve um slot null (folga vira provisória, nunca "sem treino").
    expect(s1).not.toBeNull();
    expect(buscarTreino(s1.treinoId)).toBeDefined();
  });

  it('assistente: pré-temporada > congestionamento > desgaste > jovens > equilíbrio', () => {
    expect(recomendarPlano({...contextoBase, preTemporada: true}).presetId).toBe(
      'pre_temporada',
    );
    expect(recomendarPlano({...contextoBase, jogosProximos: 2}).presetId).toBe(
      'dois_jogos',
    );
    expect(
      recomendarPlano({...contextoBase, fracaoDesgastada: 0.5}).presetId,
    ).toBe('recuperacao');
    expect(recomendarPlano({...contextoBase, idadeMedia: 22}).presetId).toBe(
      'jovens',
    );
    expect(recomendarPlano(contextoBase).presetId).toBe('equilibrado');
  });

  it('recomendação vem com plano do assistente e motivos explicáveis', () => {
    const rec = recomendarPlano({...contextoBase, jogosProximos: 3});
    expect(rec.plano.criadoPor).toBe('assistente');
    expect(rec.plano.status).toBe('ativo');
    expect(rec.motivos.length).toBeGreaterThan(0);
    expect(rec.motivos[0]).toContain('3 jogos');
  });

  describe('definirDiaNoPlano (agenda dia-a-dia)', () => {
    const sessao = {treinoId: 'hab_tecnica', intensidade: 'normal' as const};

    it('cria plano "Personalizado" do zero e define o dia (7 slots)', () => {
      const p = definirDiaNoPlano(null, 'meu', '2026-04-06', 1, sessao);
      expect(p.semanas[0].dias).toHaveLength(7);
      expect(p.semanas[0].dias[1]).toEqual(sessao);
      expect(p.criadoPor).toBe('usuario');
      expect(p.status).toBe('ativo');
    });

    it('edita 1 dia preservando os demais; folga = null', () => {
      const base = planoDePreset('equilibrado', 'meu', '2026-04-06');
      const intacto = base.semanas[0].dias[2];
      const p = definirDiaNoPlano(base, 'meu', '2026-04-06', 0, null);
      expect(p.semanas[0].dias[0]).toBeNull(); // virou folga
      expect(p.semanas[0].dias[2]).toEqual(intacto); // resto preservado
      expect(p.nome).toBe('Personalizado');
    });

    it('índice inválido não altera o plano base', () => {
      const base = planoDePreset('equilibrado', 'meu', '2026-04-06');
      expect(definirDiaNoPlano(base, 'meu', '2026-04-06', 9, null)).toEqual(base);
    });
  });
});
