/**
 * Categorização dos 12 atributos por GRUPO (épico Overall Dinâmico, Onda 1).
 *
 * É a base para curvas de idade por grupo (físico evolui/decai cedo; técnico
 * dura mais; mental amadurece tarde) e para os modificadores do Overall de
 * Partida por categoria (condição pesa no físico; moral no mental; forma no
 * técnico). O `Record` completo garante em COMPILAÇÃO que nenhum atributo
 * fica sem grupo — adicionar um atributo novo exige categorizá-lo aqui.
 */
import type {AtributoChave, CategoriaAtributo} from '../../types';

export const CATEGORIA_POR_ATRIBUTO: Record<AtributoChave, CategoriaAtributo> = {
  velocidade: 'fisico',
  resistencia: 'fisico',
  forca: 'fisico',
  finalizacao: 'tecnico',
  passe: 'tecnico',
  drible: 'tecnico',
  cruzamento: 'tecnico',
  cabeceio: 'tecnico',
  desarme: 'tecnico',
  marcacao: 'tecnico',
  posicionamento: 'mental',
  reflexos: 'goleiro',
};

export function categoriaDoAtributo(
  atributo: AtributoChave,
): CategoriaAtributo {
  return CATEGORIA_POR_ATRIBUTO[atributo];
}

/** Atributos de uma categoria (ordem estável do contrato PlayerAttributes). */
export function atributosDaCategoria(
  categoria: CategoriaAtributo,
): AtributoChave[] {
  return (Object.keys(CATEGORIA_POR_ATRIBUTO) as AtributoChave[]).filter(
    chave => CATEGORIA_POR_ATRIBUTO[chave] === categoria,
  );
}
