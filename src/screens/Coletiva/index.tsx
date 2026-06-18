/**
 * Coletiva de Imprensa (Módulo 5, redesenhada).
 *
 * Fluxo de 3 perguntas — uma sobre escalação, uma sobre um jogador-destaque e
 * uma sobre o adversário — respondidas uma a uma. O efeito de moral de cada
 * resposta é interno e NÃO é mostrado; o usuário só vê a reação qualitativa e,
 * ao final, um veredito da coletiva. Aplica a moral acumulada de uma vez (1x por
 * rodada) ao concluir.
 */

import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, Section, TextoVazio} from '../../components/ui';
import {useToast} from '../../components/feedback';
import {
  ROTULO_CATEGORIA,
  formatarImprensa,
  selecionarColetiva,
  veredictoColetiva,
  type ContextoImprensa,
  type OpcaoImprensa,
} from '../../data/imprensa';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {nomeClube} from '../../utils/formatters';

function Coletiva(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();

  const clubes = useGameStore(state => state.clubes);
  const rodadaAtual = useGameStore(state => state.rodadaAtual);
  const proximo = useGameStore(selecionarProximoJogo);
  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const jaConcedida = useGameStore(state => state.coletivaConcedida);
  const concederColetiva = useGameStore(state => state.concederColetiva);
  const elenco = useJogadoresUsuario();

  const perguntas = useMemo(() => selecionarColetiva(rodadaAtual), [rodadaAtual]);

  const contexto = useMemo<ContextoImprensa>(() => {
    const destaque = elenco[0];
    const adversarioId =
      proximo && clubeUsuario
        ? proximo.timeCasa === clubeUsuario.id
          ? proximo.timeFora
          : proximo.timeCasa
        : null;
    return {
      jogador: destaque ? destaque.apelido ?? destaque.nome : 'nosso craque',
      adversario: adversarioId ? nomeClube(clubes, adversarioId) : 'o adversário',
    };
  }, [elenco, proximo, clubeUsuario, clubes]);

  const [etapa, setEtapa] = useState(0);
  const [escolhas, setEscolhas] = useState<OpcaoImprensa[]>([]);

  if (!proximo || !clubeUsuario) {
    return (
      <ScreenContainer>
        <AppHeader titulo="Coletiva de imprensa" onBack={() => nav.goBack()} />
        <TextoVazio>Nenhum jogo agendado para a coletiva.</TextoVazio>
      </ScreenContainer>
    );
  }

  if (jaConcedida) {
    return (
      <ScreenContainer>
        <AppHeader
          titulo="Coletiva de imprensa"
          subtitulo={`Rodada ${proximo.rodada}`}
          onBack={() => nav.goBack()}
        />
        <Section titulo="Coletiva encerrada">
          <Text style={styles.encerradaTexto}>
            Você já falou com a imprensa antes deste jogo. A próxima coletiva
            abre depois da partida.
          </Text>
        </Section>
        <Botao titulo="Voltar ao pré-jogo" onPress={() => nav.goBack()} />
      </ScreenContainer>
    );
  }

  const escolher = (opcao: OpcaoImprensa) => {
    setEscolhas(atual => [...atual, opcao]);
    setEtapa(atual => atual + 1);
  };

  const concluir = () => {
    const total = escolhas.reduce((soma, opcao) => soma + opcao.delta, 0);
    concederColetiva(total);
    toast('Coletiva encerrada.', 'sucesso');
    nav.goBack();
  };

  // Etapas 0..2 = perguntas; etapa 3 = resumo.
  const noResumo = etapa >= perguntas.length;

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Coletiva de imprensa"
        subtitulo={`Rodada ${proximo.rodada} · vs ${contexto.adversario}`}
        onBack={() => nav.goBack()}
      />

      {/* Progresso */}
      <View style={styles.progresso}>
        {perguntas.map((pergunta, indice) => (
          <View
            key={pergunta.id}
            style={[
              styles.progressoPonto,
              indice < etapa
                ? styles.progressoFeito
                : indice === etapa && !noResumo
                ? styles.progressoAtual
                : null,
            ]}
          />
        ))}
      </View>

      {!noResumo ? (
        <PerguntaCard
          rotuloCategoria={ROTULO_CATEGORIA[perguntas[etapa].categoria]}
          indice={etapa}
          total={perguntas.length}
          pergunta={formatarImprensa(perguntas[etapa].pergunta, contexto)}
          opcoes={perguntas[etapa].opcoes}
          contexto={contexto}
          onEscolher={escolher}
        />
      ) : (
        <>
          <Section titulo="Resumo da coletiva">
            {perguntas.map((pergunta, indice) => (
              <View key={pergunta.id} style={styles.resumoItem}>
                <Text style={styles.resumoPergunta}>
                  {formatarImprensa(pergunta.pergunta, contexto)}
                </Text>
                <Text style={styles.resumoResposta}>
                  “{formatarImprensa(escolhas[indice].texto, contexto)}”
                </Text>
                <Text style={styles.resumoReacao}>
                  {formatarImprensa(escolhas[indice].reacao, contexto)}
                </Text>
              </View>
            ))}
          </Section>

          <View style={styles.veredito}>
            <Text style={styles.vereditoTexto}>
              {veredictoColetiva(
                escolhas.reduce((soma, opcao) => soma + opcao.delta, 0),
              )}
            </Text>
          </View>

          <Botao titulo="Encerrar coletiva" icone="check" onPress={concluir} />
        </>
      )}
    </ScreenContainer>
  );
}

function PerguntaCard({
  rotuloCategoria,
  indice,
  total,
  pergunta,
  opcoes,
  contexto,
  onEscolher,
}: {
  rotuloCategoria: string;
  indice: number;
  total: number;
  pergunta: string;
  opcoes: OpcaoImprensa[];
  contexto: ContextoImprensa;
  onEscolher: (opcao: OpcaoImprensa) => void;
}): React.JSX.Element {
  return (
    <Section titulo={`Pergunta ${indice + 1} de ${total}`}>
      <View style={styles.categoriaChip}>
        <Text style={styles.categoriaTexto}>{rotuloCategoria}</Text>
      </View>
      <Text style={styles.pergunta}>{pergunta}</Text>
      <View style={styles.opcoes}>
        {opcoes.map(opcao => (
          <Pressable
            accessibilityRole="button"
            key={opcao.texto}
            onPress={() => onEscolher(opcao)}
            style={styles.opcao}>
            <Text style={styles.opcaoTexto}>
              {formatarImprensa(opcao.texto, contexto)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

export default Coletiva;

const styles = StyleSheet.create({
  progresso: {
    flexDirection: 'row',
    gap: espaco.xs,
    justifyContent: 'center',
    marginBottom: espaco.md,
  },
  progressoPonto: {
    backgroundColor: cores.borda,
    borderRadius: 4,
    height: 8,
    width: 28,
  },
  progressoAtual: {
    backgroundColor: cores.secundaria,
  },
  progressoFeito: {
    backgroundColor: cores.primaria,
  },
  categoriaChip: {
    alignSelf: 'flex-start',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    marginBottom: espaco.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  categoriaTexto: {
    color: cores.secundaria,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pergunta: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: espaco.md,
  },
  opcoes: {
    gap: espaco.sm,
  },
  opcao: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    padding: espaco.md,
  },
  opcaoTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  resumoItem: {
    borderTopColor: cores.borda,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 3,
    paddingVertical: espaco.sm,
  },
  resumoPergunta: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  resumoResposta: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  resumoReacao: {
    color: cores.primaria,
    fontSize: 13,
    fontStyle: 'italic',
  },
  veredito: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    marginVertical: espaco.md,
    padding: espaco.md,
  },
  vereditoTexto: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  encerradaTexto: {
    color: cores.textoSecundario,
    fontSize: 14,
    lineHeight: 20,
  },
});
