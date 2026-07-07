/**
 * Escapa TODO caractere não-ASCII (>= 128) de uma string para `\uXXXX`.
 *
 * MOTIVO: o op-sqlite TRUNCA a string no primeiro caractere não-ASCII ao gravar
 * (bug de binding UTF-8) — "Brasileirão" virava "Brasileir" e o JSON do save
 * quebrava (causa do save "sumir": todo save tem acento — São Paulo, Série A,
 * Brasileirão...). Gravando só ASCII, contornamos a truncagem.
 *
 * O resultado continua sendo JSON VÁLIDO quando a entrada é JSON: `JSON.parse`
 * reconstrói os acentos a partir de `\uXXXX`, então a leitura não precisa
 * "des-escapar" nada. O JSON de `JSON.stringify` não tem caractere de controle
 * cru (já viram \n, \t, \uXXXX), então todo ASCII < 128 passa direto e seguro.
 */
export function paraAscii(texto: string): string {
  let saida = '';
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i);
    saida +=
      codigo < 128 ? texto[i] : '\\u' + codigo.toString(16).padStart(4, '0');
  }
  return saida;
}
