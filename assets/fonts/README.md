# Fontes do FOTEBALL

Coloque aqui os arquivos de fonte usados pelo app.

## Família recomendada

Use fontes com licença aberta, como as famílias do Google Fonts abaixo:

- `Rajdhani-Regular.ttf`
- `Rajdhani-Medium.ttf`
- `Rajdhani-SemiBold.ttf`
- `Rajdhani-Bold.ttf`
- `Oswald-SemiBold.ttf`
- `Oswald-Bold.ttf`

## Uso no React Native CLI

Depois de adicionar ou remover arquivos `.ttf`/`.otf`, rode na raiz do projeto:

```bash
yarn link:fonts
```

Em seguida, recompile o app:

```bash
yarn android
# ou
yarn ios
```

## Convenção

Os nomes usados no código ficam em `src/theme/fonts.ts`. No Android, normalmente o `fontFamily` usa o nome do arquivo sem extensão. No iOS, o nome precisa bater com o nome interno/PostScript da fonte.
