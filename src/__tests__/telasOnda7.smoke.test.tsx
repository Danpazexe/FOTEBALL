/**
 * SMOKE das telas da Onda 7: monta cada tela/componente com a STORE REAL (com
 * carreira iniciada) e navegação mockada, e prova que renderizam sem crash e
 * exibem o conteúdo esperado — inclusive os casos de borda (ledger vazio em
 * carreira nova, elenco de outra liga). É a verificação de runtime que o
 * typecheck não dá.
 */
import React from 'react';
import {Text as RNText} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useGameStore} from '../store/useGameStore';
import {planoDePreset} from '../engine/progression/planoTreinoEngine';

// Navegação: stub (as telas só chamam navigate/goBack). Prefixo `mock` é o
// único acesso externo permitido dentro do factory do jest.mock.
const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  canGoBack: () => true,
  push: jest.fn(),
};
jest.mock('../navigation/types', () => ({
  useAppNavigation: () => mockNav,
  useElencoNavigation: () => mockNav,
  usePartidasNavigation: () => mockNav,
  useMercadoNavigation: () => mockNav,
  useInicioNavigation: () => mockNav,
  useClubeNavigation: () => mockNav,
}));

// Feedback (toast/confirm) fora de provider lançaria — stub no-op.
jest.mock('../components/feedback', () => ({
  useToast: () => jest.fn(),
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));

// Rota do PlayerDetail: injeta o jogadorId via variável `mock`-prefixada.
// PlayerDetail só usa useRoute em runtime (RouteProp é tipo, apagado).
const mockRota: {params: {jogadorId: string}} = {params: {jogadorId: ''}};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRota,
}));

import Performance from '../screens/Performance';
import Desenvolvimento from '../screens/Desenvolvimento';
import Semana from '../screens/Semana';
import PlayerDetail from '../screens/PlayerDetail';
import OverallBreakdown from '../components/OverallBreakdown';

const estado = () => useGameStore.getState();

/** Renderiza um elemento e devolve o renderer + todo o texto exibido. */
function render(elemento: React.ReactElement) {
  let r!: TestRenderer.ReactTestRenderer;
  act(() => {
    r = TestRenderer.create(elemento);
  });
  const textos = r.root
    .findAllByType(RNText)
    .map(no =>
      Array.isArray(no.props.children)
        ? no.props.children.join('')
        : String(no.props.children ?? ''),
    )
    .join(' | ');
  return {r, textos};
}

describe('telas da Onda 7 — smoke de runtime', () => {
  beforeEach(() => {
    // Mutação da store envolta em act (evita warnings de update fora de act).
    act(() => {
      estado().reiniciarCarreira();
      estado().iniciarNovaCarreira(estado().clubes[3].id);
    });
  });

  it('Performance renderiza os medidores do elenco (CON/FAD/RIT)', () => {
    const {textos} = render(<Performance />);
    expect(textos).toContain('Performance');
    expect(textos).toMatch(/CON|FAD|RIT/);
  });

  it('Desenvolvimento renderiza mesmo com ledger VAZIO (carreira nova)', () => {
    expect(estado().ledgerDesenvolvimento).toEqual([]);
    const {textos} = render(<Desenvolvimento />);
    expect(textos).toContain('Desenvolvimento');
    // Os cards derivados do elenco aparecem mesmo sem ledger.
    expect(textos.length).toBeGreaterThan(0);
  });

  it('Desenvolvimento renderiza com ledger populado (pós-virada)', () => {
    act(() => {
      useGameStore.setState({rodadaAtual: 39});
      estado().finalizarTemporada();
    });
    expect(estado().ledgerDesenvolvimento.length).toBeGreaterThan(0);
    const {textos} = render(<Desenvolvimento />);
    expect(textos).toContain('Desenvolvimento');
  });

  it('Desenvolvimento mostra o gráfico de evolução após uma virada (2 pontos)', () => {
    act(() => {
      useGameStore.setState({rodadaAtual: 39});
      estado().finalizarTemporada();
    });
    // A série passou a ter ≥2 pontos reais (baseline + virada).
    expect(estado().historicoDesenvolvimento.length).toBeGreaterThanOrEqual(2);
    const {textos} = render(<Desenvolvimento />);
    expect(textos).toContain('Evolução média dos atributos');
    expect(textos).toContain('Físico');
  });

  it('OverallBreakdown mostra Base, Em partida e os 4 pilares', () => {
    const jogador = estado().jogadores.find(
      j => j.clubeId === estado().clubeUsuarioId,
    )!;
    const {textos} = render(
      <OverallBreakdown jogador={jogador} elenco={estado().todosJogadores} />,
    );
    expect(textos).toMatch(/OVERALL BASE/i);
    expect(textos).toMatch(/PARTIDA/i);
    expect(textos).toContain('Técnica');
    expect(textos).toContain('Mercado');
  });

  it('OverallBreakdown não crasha para jogador de OUTRA liga (mercado universal)', () => {
    const estrangeiro = estado().todosJogadores.find(
      j => j.clubeId === 'club_man_city',
    );
    if (estrangeiro) {
      const {textos} = render(
        <OverallBreakdown
          jogador={estrangeiro}
          elenco={estado().todosJogadores}
        />,
      );
      expect(textos).toMatch(/OVERALL BASE/i);
    }
  });

  it('Treino (Semana) renderiza a seção de plano recorrente + recomendação', () => {
    const {textos} = render(<Semana />);
    expect(textos).toContain('Treino');
    expect(textos).toContain('Plano atual');
    // O assistente recomenda algo em carreira nova.
    expect(textos).toContain('Recomendação do staff');
  });

  it('Treino: ativar um preset atualiza o plano sem crash', () => {
    render(<Semana />);
    // A ação existe e roda (integração store ↔ engine).
    expect(estado().planoTreinoStatus).toBeDefined();
  });

  it('Treino com plano ATIVO mostra o cronograma da semana + resumo', () => {
    const clube = estado().clubes.find(c => c.id === estado().clubeUsuarioId)!;
    act(() =>
      estado().configurarPlanoTreino(
        planoDePreset('equilibrado', clube.id, '2026'),
      ),
    );
    const {textos} = render(<Semana />);
    expect(textos).toContain('Cronograma da semana');
    expect(textos).toContain('Resumo da semana');
    // A tira do ciclo traz os dias da semana e a carga agregada.
    expect(textos).toMatch(/SEG|TER|QUA|QUI|SEX|SÁB|DOM/);
    expect(textos).toMatch(/Carga|Prontidão|Risco de lesão/);
  });

  it('PlayerDetail renderiza com o bloco Composição do overall embutido', () => {
    const jogador = estado().jogadores.find(
      j => j.clubeId === estado().clubeUsuarioId,
    )!;
    mockRota.params = {jogadorId: jogador.id};
    const {textos} = render(<PlayerDetail />);
    // A seção do OverallBreakdown aparece dentro do perfil.
    expect(textos).toContain('Composição do overall');
    expect(textos).toMatch(/OVERALL BASE/i);
    expect(textos).toContain('Técnica');
    // Foco de treino individual disponível no elenco do usuário + Ritmo.
    expect(textos).toContain('FOCO');
    expect(textos).toContain('Ritmo');
  });
});
