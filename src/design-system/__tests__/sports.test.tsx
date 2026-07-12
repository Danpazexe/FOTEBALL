import React from 'react';
import {Text as RNText} from 'react-native';
import TestRenderer, {act} from 'react-test-renderer';

import {useTemaStore} from '../../store/useTemaStore';
import {MatchCard} from '../sports/MatchCard';
import {Score} from '../sports/Score';

type Renderizado = TestRenderer.ReactTestRenderer;

function conteudos(r: Renderizado): string[] {
  return r.root.findAllByType(RNText).map(no =>
    Array.isArray(no.props.children)
      ? no.props.children.join('')
      : String(no.props.children ?? ''),
  );
}

describe('sports', () => {
  afterEach(() => {
    act(() => {
      useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
    });
  });

  it('Score: travessão quando indefinido, números quando definido', () => {
    let indef!: Renderizado;
    let def!: Renderizado;
    act(() => {
      indef = TestRenderer.create(<Score />);
      def = TestRenderer.create(<Score casa={2} fora={1} />);
    });
    expect(conteudos(indef).filter(x => x === '–').length).toBeGreaterThanOrEqual(
      2,
    );
    const d = conteudos(def);
    expect(d).toContain('2');
    expect(d).toContain('1');
  });

  it('MatchCard renderiza siglas e competição', () => {
    let r!: Renderizado;
    act(() => {
      r = TestRenderer.create(
        <MatchCard
          status="encerrado"
          placarCasa={3}
          placarFora={0}
          casa={{clubeId: 'club_flamengo', sigla: 'FLA'}}
          fora={{clubeId: 'club_vasco', sigla: 'VAS'}}
          competicao="Brasileirão"
        />,
      );
    });
    const c = conteudos(r);
    expect(c).toContain('FLA');
    expect(c).toContain('VAS');
    expect(c).toContain('Brasileirão');
  });
});
