module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Padrão do preset + react-native-safe-area-context: o mock oficial da lib
  // (jest/mock.tsx) é TSX e precisa passar pelo transform do Babel.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-safe-area-context)/)',
  ],
};
