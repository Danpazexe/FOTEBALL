export type {
  AlteracaoCondicaoCore,
  AlteracaoMoralCore,
  EscalacaoCore,
  EstatisticasPartidaCore,
  EventoPartidaCore,
  EventoPartidaCoreTipo,
  ForcaTimeCore,
  GravidadeLesao,
  JogadorEscaladoCore,
  LesaoGeradaCore,
  NotaJogadorCore,
  PenalidadeEscalacao,
  RegistroTabelaCore,
  ResultadoParaTabelaCore,
  ResultadoValidacaoEscalacao,
  Setor,
  SimularPartidaCoreInput,
  SimularPartidaCoreOutput,
  SuspensaoGeradaCore,
  TimeEmPartidaCore,
} from './domain';
export {criarRngCore} from './rng';
export type {RngCore} from './rng';
export {
  calcularPenalidadePosicaoCore,
  detectarFormacaoCore,
  setorPorPosicaoCore,
  validarEscalacaoCore,
} from './escalacao';
export {calcularForcaTimeCore} from './forcaTime';
export {simularPartidaCore} from './partida';
export {atualizarTabelaCore, ordenarTabelaCore} from './campeonato';
