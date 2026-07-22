import {desenvolverFoco, sugerirPlanosElenco} from '../treinoIndividual';
import {criarPlayer} from '../../../testing/fixtures';
import type {Player} from '../../../types';

const passa = () => 0; // < 0.6 → evolui
const falha = () => 0.9; // >= 0.6 → não evolui

function atacante(over: Partial<Player> = {}): Player {
  return criarPlayer({
    id: 'p',
    posicaoPrincipal: 'CA',
    overall: 75,
    potencial: 90,
    atributos: {
      finalizacao: 70,
      passe: 65,
      marcacao: 40,
      desarme: 40,
      velocidade: 75,
      resistencia: 70,
      forca: 70,
      reflexos: 30,
      posicionamento: 72,
      drible: 74,
      cabeceio: 68,
      cruzamento: 66,
    },
    ...over,
  });
}

describe('desenvolverFoco', () => {
  it('sem foco → jogador inalterado', () => {
    const j = atacante();
    expect(desenvolverFoco(j, passa)).toBe(j);
  });

  it('com foco e margem + rng favorável → sobe 1 ponto do atributo focado', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    const evoluido = desenvolverFoco(j, passa);
    expect(evoluido.atributos.finalizacao).toBe(71);
    // Só o atributo focado muda.
    expect(evoluido.atributos.drible).toBe(j.atributos.drible);
  });

  it('rng desfavorável → não evolui', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    expect(desenvolverFoco(j, falha).atributos.finalizacao).toBe(70);
  });

  it('o foco não leva o overall além do potencial', () => {
    const j = atacante({focoTreino: 'finalizacao', overall: 90, potencial: 90});
    expect(desenvolverFoco(j, passa)).toBe(j);
  });

  it('atributo no teto (99) não sobe', () => {
    const j = atacante({
      focoTreino: 'finalizacao',
      atributos: {...atacante().atributos, finalizacao: 99},
    });
    expect(desenvolverFoco(j, passa).atributos.finalizacao).toBe(99);
  });

  it('recalcula o overall após evoluir o foco', () => {
    const j = atacante({focoTreino: 'finalizacao'});
    const evoluido = desenvolverFoco(j, passa);
    // finalização tem peso alto para atacante → overall não diminui.
    expect(evoluido.overall).toBeGreaterThanOrEqual(j.overall);
  });

  it('é determinística para a mesma entrada e rng', () => {
    const j = atacante({focoTreino: 'passe'});
    expect(desenvolverFoco(j, passa)).toEqual(desenvolverFoco(j, passa));
  });

  it('plano por função desenvolve o CONJUNTO (sobe o atributo mais baixo)', () => {
    // Falso 9 (ata_falso9): passe(65), drible(74), finalização(70) → sobe passe.
    const j = atacante({planoDesenvolvimento: 'ata_falso9'});
    const ev = desenvolverFoco(j, passa);
    expect(ev.atributos.passe).toBe(66);
    expect(ev.atributos.finalizacao).toBe(70);
    expect(ev.atributos.drible).toBe(74);
  });

  it('plano por função tem PRIORIDADE sobre o foco de atributo único', () => {
    // Finalizador (ata_finalizador): finalização(70) < posicionamento(72) → sobe finalização;
    // o foco em velocidade é ignorado enquanto há plano.
    const j = atacante({
      focoTreino: 'velocidade',
      planoDesenvolvimento: 'ata_finalizador',
    });
    const ev = desenvolverFoco(j, passa);
    expect(ev.atributos.finalizacao).toBe(71);
    expect(ev.atributos.velocidade).toBe(j.atributos.velocidade);
  });
});

describe('sugerirPlanosElenco', () => {
  it('escolhe o plano de MAIOR afinidade dentro do grupo posicional', () => {
    // Atacante do fixture: finalização 70 · posicionamento 72 · drible 74 →
    // "Finalizador de ponta" (pon_finalizador, média 72) vence ata_finalizador
    // (71), ata_falso9 (69.7), ata_homem_alvo (69.3) e ata_pressionante (61.7).
    const sugestoes = sugerirPlanosElenco([atacante()]);
    expect(sugestoes.get('p')).toBe('pon_finalizador');
  });

  it('a seleção segue o PERFIL do jogador (mesmo grupo, planos diferentes)', () => {
    const base = atacante().atributos;
    const goleiroReativo = atacante({
      id: 'g1',
      posicaoPrincipal: 'GOL',
      atributos: {...base, reflexos: 80, posicionamento: 75, passe: 60},
    });
    const goleiroLibero = atacante({
      id: 'g2',
      posicaoPrincipal: 'GOL',
      atributos: {...base, reflexos: 60, posicionamento: 70, passe: 85},
    });
    const sugestoes = sugerirPlanosElenco([goleiroReativo, goleiroLibero]);
    expect(sugestoes.get('g1')).toBe('gol_reativo');
    expect(sugestoes.get('g2')).toBe('gol_libero');
  });

  it('não sugere para quem está SEM margem de potencial', () => {
    const noTeto = atacante({id: 'teto', overall: 90, potencial: 90});
    const comMargem = atacante({id: 'margem'});
    const sugestoes = sugerirPlanosElenco([noTeto, comMargem]);
    expect(sugestoes.has('teto')).toBe(false);
    expect(sugestoes.has('margem')).toBe(true);
  });

  it('empate de afinidade mantém a ordem de PLANOS_FUNCAO (determinístico)', () => {
    // criarPlayer padrão: todos os atributos 70 e posição MC → mc_box e
    // mc_maestro empatam em 70; vence o primeiro da lista (mc_box).
    const meia = criarPlayer({id: 'mc'});
    expect(sugerirPlanosElenco([meia]).get('mc')).toBe('mc_box');
  });

  it('é pura e determinística para a mesma entrada', () => {
    const elenco = [atacante(), criarPlayer({id: 'mc'})];
    expect(sugerirPlanosElenco(elenco)).toEqual(sugerirPlanosElenco(elenco));
    // Não muta os jogadores.
    expect(elenco[0]).toEqual(atacante());
  });
});
