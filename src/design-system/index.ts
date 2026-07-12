/**
 * Design System v2 — API pública. Telas e componentes consomem daqui:
 * tokens, temas/hooks e primitives. Regra de dependência: tokens → primitives →
 * (Fase 2) components → sports; telas compõem, não recriam.
 */
export * from './tokens';
export type {Esquema, ModoTema, TemaDS} from './themes/types';
export {temaClaroDS} from './themes/light';
export {temaEscuroDS} from './themes/dark';
export {
  useTheme,
  useModoTema,
  useEstilosDS,
  resolverEsquema,
} from './themes/useTheme';
export {ThemeProvider} from './themes/ThemeProvider';
export * from './primitives';
export * from './components';
export * from './sports';
