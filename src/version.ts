/**
 * Versão do jogo (semver) — FONTE ÚNICA da versão mostrada no app.
 *
 * Padrão de mercado (pedido do usuário 2026-07-04), BUMPAR a cada ajuste:
 *   • Em TESTE: fica em 0.x.x (começou em 0.0.1).
 *   • patch  (0.0.1 → 0.0.2): correções / ajustes pequenos / tweaks visuais.
 *   • minor  (0.0.x → 0.1.0): feature nova / tela nova.
 *   • major  (→ 1.0.0): RESERVADO para o LANÇAMENTO — só quando o usuário mandar.
 *
 * Manter em sincronia com o `versionName` do Android (android/app/build.gradle).
 * O `versionCode` do Android é automático no CI (github.run_number).
 */
export const VERSAO_APP = '0.32.13';
