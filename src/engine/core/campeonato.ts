import type {RegistroTabelaCore, ResultadoParaTabelaCore} from './domain';

const criarRegistroVazio = (clubeId: string): RegistroTabelaCore => ({
  clubeId,
  jogos: 0,
  vitorias: 0,
  empates: 0,
  derrotas: 0,
  golsPro: 0,
  golsContra: 0,
  saldoGols: 0,
  pontos: 0,
});

const atualizarRegistro = (
  registro: RegistroTabelaCore,
  golsPro: number,
  golsContra: number,
): RegistroTabelaCore => {
  const vitoria = golsPro > golsContra;
  const empate = golsPro === golsContra;
  const derrota = golsPro < golsContra;

  return {
    clubeId: registro.clubeId,
    jogos: registro.jogos + 1,
    vitorias: registro.vitorias + (vitoria ? 1 : 0),
    empates: registro.empates + (empate ? 1 : 0),
    derrotas: registro.derrotas + (derrota ? 1 : 0),
    golsPro: registro.golsPro + golsPro,
    golsContra: registro.golsContra + golsContra,
    saldoGols: registro.saldoGols + golsPro - golsContra,
    pontos: registro.pontos + (vitoria ? 3 : empate ? 1 : 0),
  };
};

export const atualizarTabelaCore = (
  tabela: RegistroTabelaCore[],
  resultado: ResultadoParaTabelaCore,
): RegistroTabelaCore[] => {
  const porClube = new Map(tabela.map(registro => [registro.clubeId, registro]));
  const casa = porClube.get(resultado.casaId) ?? criarRegistroVazio(resultado.casaId);
  const fora = porClube.get(resultado.foraId) ?? criarRegistroVazio(resultado.foraId);

  porClube.set(
    resultado.casaId,
    atualizarRegistro(casa, resultado.golsCasa, resultado.golsFora),
  );
  porClube.set(
    resultado.foraId,
    atualizarRegistro(fora, resultado.golsFora, resultado.golsCasa),
  );

  return ordenarTabelaCore([...porClube.values()]);
};

export const ordenarTabelaCore = (
  tabela: RegistroTabelaCore[],
): RegistroTabelaCore[] =>
  [...tabela].sort((a, b) => {
    if (b.pontos !== a.pontos) {
      return b.pontos - a.pontos;
    }

    if (b.vitorias !== a.vitorias) {
      return b.vitorias - a.vitorias;
    }

    if (b.saldoGols !== a.saldoGols) {
      return b.saldoGols - a.saldoGols;
    }

    if (b.golsPro !== a.golsPro) {
      return b.golsPro - a.golsPro;
    }

    return a.clubeId.localeCompare(b.clubeId);
  });
