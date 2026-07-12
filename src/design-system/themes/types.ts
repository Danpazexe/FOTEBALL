/**
 * Tipos do tema do Design System v2.
 *
 * MAPA DE COMPATIBILIDADE (tema antigo `PaletaCores` → semântico) — guia da
 * migração das telas; não é executável:
 *   fundo→canvas · superficie→surface · superficieAlt→surfaceSubtle ·
 *   borda→border · bordaClara→borderStrong · texto→textPrimary ·
 *   textoSecundario→textSecondary · textoMuted→textMuted · primaria→brand ·
 *   primariaEscura→brandStrong · secundaria→accent · perigo→danger ·
 *   sucesso→success · aviso→warning · contrastePrimaria→onBrand.
 */
import type {CoresEsporte, CoresSemanticas} from '../tokens/colors';

/** Esquema efetivamente aplicado. */
export type Esquema = 'claro' | 'escuro';

/** Preferência do usuário (o `sistema` acompanha o SO). */
export type ModoTema = 'claro' | 'escuro' | 'sistema';

/** Tema ativo entregue por `useTheme()`. Tokens fixos (espaço/raio/tipografia/
 * motion/tamanhos) vêm direto de `tokens/`, pois não mudam com o esquema. */
export type TemaDS = {
  esquema: Esquema;
  cores: CoresSemanticas;
  esporte: CoresEsporte;
};
