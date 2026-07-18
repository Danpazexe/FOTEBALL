/**
 * SMOKE das duas telas novas pedidas depois da Onda 8:
 *  - Calendário do mockup (semana, próximo jogo, agenda do dia, pipeline diário,
 *    "AVANÇAR ATÉ O PRÓXIMO JOGO");
 *  - Elenco de um clube qualquer (ficha do adversário aberta pela Classificação).
 * Monta com a STORE REAL (carreira iniciada) e navegação/rota mockadas, provando
 * que renderizam sem crash e mostram o conteúdo esperado.
 */
import React from 'react';
import {Text as RNText} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useGameStore} from '../store/useGameStore';

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
  useAppRoute: () => mockRota,
}));

// Rota com clubeId (ElencoClube) — variável `mock`-prefixada permitida no factory.
const mockRota: {params: {clubeId?: string; jogadorId?: string}} = {params: {}};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRota,
}));

import Calendario from '../screens/Calendario';
import ElencoClube from '../screens/ElencoClube';

const estado = () => useGameStore.getState();

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

describe('Calendário + Elenco do clube — smoke de runtime', () => {
  beforeEach(() => {
    act(() => {
      estado().reiniciarCarreira();
      estado().iniciarNovaCarreira(estado().clubes[3].id);
    });
  });

  it('Calendário mostra próximo jogo, agenda do dia, pipeline e o CTA de avançar', () => {
    const {textos} = render(<Calendario />);
    expect(textos).toContain('Calendário');
    expect(textos).toContain('Próximo jogo');
    expect(textos).toContain('Agenda do dia');
    expect(textos).toContain('Pipeline diário');
    // A ação principal do mockup.
    expect(textos).toContain('AVANÇAR ATÉ O PRÓXIMO JOGO');
    // A tira da semana traz os dias abreviados.
    expect(textos).toMatch(/Seg|Ter|Qua|Qui|Sex|Sáb|Dom/);
  });

  it('Elenco do clube renderiza a ficha do adversário (header + setores + overalls)', () => {
    const usuarioId = estado().clubeUsuarioId;
    const adversario = estado().clubes.find(c => c.id !== usuarioId)!;
    mockRota.params = {clubeId: adversario.id};
    const {textos} = render(<ElencoClube />);
    expect(textos).toContain(adversario.nome);
    // Setores por posição.
    expect(textos).toMatch(/Goleiros|Defesa|Meio-campo|Ataque/);
    // A força do time (anel "TIME").
    expect(textos).toContain('TIME');
  });

  it('Elenco do clube não crasha com clubeId inexistente (estado de borda)', () => {
    mockRota.params = {clubeId: 'clube_que_nao_existe'};
    const {textos} = render(<ElencoClube />);
    expect(textos).toContain('Clube não encontrado');
  });

  it('Elenco de clube inglês mostra os valores em libra (£, sem câmbio)', () => {
    const ingles = estado().todosClubes.find(c => c.id === 'club_man_city');
    if (ingles) {
      mockRota.params = {clubeId: ingles.id};
      const {textos} = render(<ElencoClube />);
      expect(textos).toContain('£');
    }
  });
});
