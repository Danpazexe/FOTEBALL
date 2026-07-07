module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Honra a convenção `_` do projeto (vars intencionalmente não usadas, ex.:
    // destructuring que omite chaves via rest) — antes só args `^_` eram ignorados.
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
  },
};
