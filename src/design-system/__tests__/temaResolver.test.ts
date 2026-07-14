import {useTemaStore} from '../../store/useTemaStore';
import {temaClaroDS} from '../themes/light';
import {temaEscuroDS} from '../themes/dark';
import {resolverEsquema} from '../themes/useTheme';

describe('resolverEsquema', () => {
  it('modo fixo ignora o esquema do sistema', () => {
    expect(resolverEsquema('claro', 'escuro')).toBe('claro');
    expect(resolverEsquema('escuro', 'claro')).toBe('escuro');
  });

  it('modo sistema segue o esquema do sistema', () => {
    expect(resolverEsquema('sistema', 'claro')).toBe('claro');
    expect(resolverEsquema('sistema', 'escuro')).toBe('escuro');
  });
});

describe('temas do design system', () => {
  it('declaram o esquema correto', () => {
    expect(temaClaroDS.esquema).toBe('claro');
    expect(temaEscuroDS.esquema).toBe('escuro');
  });

  it('expõem cores e cores esportivas', () => {
    expect(temaClaroDS.cores.brand).toBeDefined();
    expect(temaEscuroDS.esporte.match.goal).toBeDefined();
  });
});

describe('useTemaStore', () => {
  afterEach(() => {
    useTemaStore.setState({modo: 'escuro', esquemaSistema: 'escuro'});
  });

  it('padrão é claro (tema default do North Star)', () => {
    expect(useTemaStore.getState().modo).toBe('claro');
  });

  it('definirModo troca a preferência', () => {
    useTemaStore.getState().definirModo('claro');
    expect(useTemaStore.getState().modo).toBe('claro');
    useTemaStore.getState().definirModo('sistema');
    expect(useTemaStore.getState().modo).toBe('sistema');
  });

  it('definirEsquemaSistema atualiza o esquema do sistema', () => {
    useTemaStore.getState().definirEsquemaSistema('claro');
    expect(useTemaStore.getState().esquemaSistema).toBe('claro');
  });

  it('mantém a ponte do tema antigo (escuro) p/ telas não migradas', () => {
    const {tema} = useTemaStore.getState();
    expect(tema).toBeDefined();
    expect(tema.cores.fundo).toBeDefined();
  });
});
