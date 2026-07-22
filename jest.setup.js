/* eslint-env jest */
/**
 * Setup global do Jest.
 *
 * safe-area-context: usa o MOCK OFICIAL da lib. Sem ele, useSafeAreaInsets
 * (agora usado pelo Screen do DS em todas as telas) lança "No safe area value
 * available" ao montar telas sem <SafeAreaProvider> nos testes. O mock devolve
 * insets zerados — o layout dos testes fica idêntico ao anterior.
 */
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
