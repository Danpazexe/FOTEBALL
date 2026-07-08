/**
 * Disputa de pênaltis INTERATIVA (T11) — fiel ao Mini Cup do Google: o usuário
 * SÓ bate (arrasta a bola: mira + potência num gesto único) e o goleiro fica
 * mais difícil a cada gol. As cobranças do adversário (CPU) são resolvidas por
 * probabilidade e exibidas como resultado curto, sem input.
 *
 * Dois modos:
 *  • REAL: chamada pelo MatchSimulation quando o jogo de Copa do usuário empata.
 *    Ao fim, resolve o confronto (`avancarFaseCopa`) e volta para a Copa.
 *  • TESTE: aberta pelo Central do Técnico (`teste: true`) para experimentar o
 *    sistema isolado — ao fim, só oferece jogar de novo / voltar.
 *
 * A tela é a máquina de estados visível: reage à `fase` do `usePenaltiStore` e
 * agenda as transições (animar chute → CPU → próxima cobrança).
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Botao} from '../../components/ui';
import {tocarGol, tocarPenalti, tocarPenaltiPerdido} from '../../audio/sons';
import {hashString} from '../../engine/simulation/rng';
import {useAppNavigation, useAppRoute} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import {usePenaltiStore} from '../../store/usePenaltiStore';
import {cores, espaco, raio, tabular} from '../../theme';
import {nomeClube} from '../../utils/formatters';
import AlvoGol, {type Lance} from './components/AlvoGol';
import PlacarPenaltis from './components/PlacarPenaltis';

/** Tempo (ms) para animar o chute do usuário antes da resposta da CPU. */
const DURACAO_CHUTE = 1100;
/** Tempo (ms) exibindo o resultado da cobrança da CPU. */
const DURACAO_CPU = 1200;

function Penaltis(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useAppRoute<'Penaltis'>();
  const params = useMemo(() => route.params ?? {}, [route.params]);
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();

  const clubeUsuarioId = useGameStore(s => s.clubeUsuarioId);
  const clubes = useGameStore(s => s.clubes);
  const todosClubes = useGameStore(s => s.todosClubes);

  const fase = usePenaltiStore(s => s.fase);
  const cobrancas = usePenaltiStore(s => s.cobrancas);
  const marcadosUsuario = usePenaltiStore(s => s.marcadosUsuario);
  const marcadosCpu = usePenaltiStore(s => s.marcadosCpu);
  const cobradasUsuario = usePenaltiStore(s => s.cobradasUsuario);
  const nivelGoleiro = usePenaltiStore(s => s.nivelDificuldadeGoleiro);
  const vencedor = usePenaltiStore(s => s.vencedor);

  const [lance, setLance] = useState<Lance | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const ehTeste = params.teste === true || !params.fixtureId;
  const forcaAdversario = params.forcaAdversario ?? 72;
  const seedBase = params.fixtureId
    ? hashString(`${params.fixtureId}_pen`)
    : hashString('teste_penaltis');
  const seed = seedBase + tentativa;

  const nomeUsuario = clubeUsuarioId
    ? nomeClube(clubes, clubeUsuarioId)
    : 'Seu time';
  const nomeAdversario = ehTeste
    ? 'Sparring FC'
    : params.clubeAdversarioId
    ? nomeClube(todosClubes, params.clubeAdversarioId)
    : 'Adversário';

  // Início da disputa: monta os batedores (aptos, melhores finalizadores antes)
  // e semeia. Reinicia a cada nova tentativa (teste).
  useEffect(() => {
    const elenco = useGameStore
      .getState()
      .jogadores.filter(j => j.clubeId === clubeUsuarioId);
    const aptos = elenco.filter(j => !j.lesionado && !j.suspenso);
    const base = aptos.length > 0 ? aptos : elenco;
    const atributosBatedores = [...base]
      .sort((a, b) => b.atributos.finalizacao - a.atributos.finalizacao)
      .map(j => j.atributos);

    usePenaltiStore.getState().iniciar({forcaAdversario, atributosBatedores, seed});
    setLance(null);
    tocarPenalti();
    return () => usePenaltiStore.getState().encerrar();
  }, [seed, forcaAdversario, clubeUsuarioId]);

  // Agenda as transições da máquina de estados.
  useEffect(() => {
    if (fase === 'ANIMANDO') {
      const id = setTimeout(() => {
        const res = usePenaltiStore.getState().resolverCpu();
        if (res === 'GOL') {
          tocarGol(false);
        } else if (res === 'DEFESA') {
          tocarPenaltiPerdido(false);
        }
      }, DURACAO_CHUTE);
      return () => clearTimeout(id);
    }
    if (fase === 'RESULTADO_CPU') {
      const id = setTimeout(
        () => usePenaltiStore.getState().proximaCobranca(),
        DURACAO_CPU,
      );
      return () => clearTimeout(id);
    }
    return undefined;
  }, [fase]);

  const onChutar = useCallback((x: number, y: number, potencia: number) => {
    const detalhe = usePenaltiStore.getState().baterUsuario({x, y}, potencia);
    if (!detalhe) {
      return;
    }
    setLance({
      posicaoChute: {x, y},
      potencia,
      goleiroX: detalhe.goleiroX,
      goleiroY: detalhe.goleiroY,
      resultado: detalhe.resultado,
    });
    if (detalhe.resultado === 'GOL') {
      tocarGol(true);
    } else {
      tocarPenaltiPerdido(true);
    }
  }, []);

  const finalizarReal = useCallback(() => {
    const venceuUsuario = vencedor === 'USUARIO';
    const vencedorPenaltis = venceuUsuario
      ? clubeUsuarioId ?? undefined
      : params.clubeAdversarioId;
    usePenaltiStore.getState().encerrar();
    useGameStore.getState().avancarFaseCopa({
      golsUsuario: params.golsUsuario ?? 0,
      golsAdversario: params.golsAdversario ?? 0,
      vencedorPenaltis,
    });
    nav.navigate('Copa');
  }, [vencedor, clubeUsuarioId, params, nav]);

  const jogarDeNovo = useCallback(() => setTentativa(t => t + 1), []);
  const voltar = useCallback(() => {
    usePenaltiStore.getState().encerrar();
    nav.goBack();
  }, [nav]);

  const largura = Math.min(width - espaco.lg * 2, 420);
  const altura = Math.round(largura * 1.18);

  const ultimaCpu = useMemo(
    () => [...cobrancas].reverse().find(c => c.cobrador === 'CPU'),
    [cobrancas],
  );
  const ultimaUsuario = useMemo(
    () => [...cobrancas].reverse().find(c => c.cobrador === 'USUARIO'),
    [cobrancas],
  );

  const status = (() => {
    switch (fase) {
      case 'BATENDO_USUARIO':
        return `Cobrança ${cobradasUsuario + 1} — arraste a bola para mirar e chutar`;
      case 'ANIMANDO':
        return ultimaUsuario?.resultado === 'GOL' ? 'GOL! ⚽' : 'Defendeu! 🧤';
      case 'RESULTADO_CPU':
        return `${nomeAdversario}: ${
          ultimaCpu?.resultado === 'GOL' ? 'GOL' : 'perdeu!'
        }`;
      default:
        return '';
    }
  })();

  const venceuUsuario = vencedor === 'USUARIO';

  return (
    <View style={[styles.raiz, {paddingTop: insets.top + espaco.sm}]}>
      <Text style={styles.titulo}>Disputa de pênaltis</Text>
      <View style={styles.placarWrap}>
        <PlacarPenaltis
          cobrancas={cobrancas}
          marcadosUsuario={marcadosUsuario}
          marcadosCpu={marcadosCpu}
          nomeUsuario={nomeUsuario}
          nomeAdversario={nomeAdversario}
        />
      </View>

      <View style={styles.centro}>
        <AlvoGol
          largura={largura}
          altura={altura}
          podeChutar={fase === 'BATENDO_USUARIO'}
          lance={lance}
          onChutar={onChutar}
        />
      </View>

      <View style={styles.rodape}>
        <Text style={styles.status} numberOfLines={2}>
          {status}
        </Text>
        {nivelGoleiro >= 3 ? (
          <Text style={styles.dicaGoleiro}>
            O goleiro está mais atento (nível {nivelGoleiro})
          </Text>
        ) : null}
      </View>

      {fase === 'FIM' ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text
              style={[
                styles.overlayTitulo,
                {color: venceuUsuario ? cores.primaria : cores.perigo},
              ]}>
              {venceuUsuario ? 'Você venceu nos pênaltis!' : 'Você perdeu nos pênaltis'}
            </Text>
            <Text style={styles.overlayPlacar}>
              {marcadosUsuario} <Text style={styles.overlayX}>x</Text>{' '}
              {marcadosCpu}
            </Text>
            {ehTeste ? (
              <View style={styles.overlayAcoes}>
                <View style={styles.acaoFlex}>
                  <Botao
                    variante="ouro"
                    icone="jogar"
                    titulo="Jogar de novo"
                    onPress={jogarDeNovo}
                  />
                </View>
                <View style={styles.acaoFlex}>
                  <Botao
                    variante="secundaria"
                    icone="voltar"
                    titulo="Voltar"
                    onPress={voltar}
                  />
                </View>
              </View>
            ) : (
              <Botao
                variante="ouro"
                icone="jogar"
                titulo="Continuar"
                onPress={finalizarReal}
              />
            )}
          </View>
        </View>
      ) : null}

      {ehTeste ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair do teste"
          onPress={voltar}
          style={[styles.sair, {top: insets.top + espaco.sm}]}>
          <Text style={styles.sairTexto}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default Penaltis;

const styles = StyleSheet.create({
  raiz: {
    backgroundColor: cores.fundo,
    flex: 1,
    paddingHorizontal: espaco.lg,
  },
  titulo: {
    color: cores.texto,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  placarWrap: {
    marginTop: espaco.md,
  },
  centro: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  rodape: {
    alignItems: 'center',
    gap: 4,
    paddingBottom: espaco.lg,
  },
  status: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  dicaGoleiro: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '700',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(4, 20, 13, 0.82)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: espaco.lg,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlayCard: {
    alignItems: 'center',
    backgroundColor: cores.superficieElevada,
    borderColor: cores.bordaTransl,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: espaco.md,
    padding: espaco.xl,
    width: '100%',
  },
  overlayTitulo: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  overlayPlacar: {
    ...tabular,
    color: cores.texto,
    fontSize: 40,
    fontWeight: '900',
  },
  overlayX: {
    color: cores.textoSecundario,
    fontSize: 24,
  },
  overlayAcoes: {
    flexDirection: 'row',
    gap: espaco.sm,
    width: '100%',
  },
  acaoFlex: {
    flex: 1,
  },
  sair: {
    alignItems: 'center',
    backgroundColor: cores.superficie,
    borderColor: cores.borda,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: espaco.lg,
    width: 40,
  },
  sairTexto: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '900',
  },
});
