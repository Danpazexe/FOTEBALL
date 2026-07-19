/**
 * Engine de DISCIPLINA (cartões/suspensão por competição). Puro e determinístico.
 * A lesão continua no motor físico (dias); aqui só entram os cartões.
 */
export {
  disponibilidadeInicial,
  disciplinaDaCompeticao,
  comDisciplina,
  estaSuspensoNaCompeticao,
  calcularElegibilidadeJogador,
  sincronizarEspelhoLegado,
  comDisponibilidade,
  type Elegibilidade,
  type MotivoInelegivel,
} from './disponibilidade';
export {aplicarDisciplinaPartida, type PartidaDisciplina} from './processarCartoes';
