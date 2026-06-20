/**
 * Treino da Semana. O técnico escolhe O QUE treinar (rotina por posição ou foco
 * num atributo) e COM QUE intensidade (leve → muito forte), vê um resumo do
 * impacto e confirma.
 *
 * UI por disclosure progressivo: em "Por posição" o usuário primeiro escolhe a
 * posição (seletor compacto) e só então vê os treinos daquela função — em vez de
 * exibir o catálogo inteiro de uma vez. O efeito real (evolução por acúmulo de
 * progresso, cansaço, moral e lesões) vive em `treinoAtributos`.
 */

import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, Section} from '../../components/ui';
import Icone from '../../components/Icone';
import {useToast} from '../../components/feedback';
import {calcularEfeitoTreino} from '../../engine/progression/treinoAtributos';
import {
  CATALOGO_TREINOS,
  INTENSIDADES,
  INTENSIDADES_ORDEM,
  TREINO_PADRAO_ID,
  buscarTreino,
  type CategoriaTreino,
  type IntensidadeTreino,
  type SecaoPosicao,
  type TreinoTipo,
} from '../../engine/progression/treinoTipos';
import {grupoDaPosicao} from '../../engine/tactics/posicoes';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {cores, corCondicao, espaco, raio} from '../../theme';

const SECOES_POSICAO: SecaoPosicao[] = [
  'Goleiros',
  'Zagueiros',
  'Laterais',
  'Meio-campistas',
  'Atacantes',
];

/** Rótulo curto de cada seção para o seletor de posição. */
const SECAO_CURTA: Record<SecaoPosicao, string> = {
  Goleiros: 'GOL',
  Zagueiros: 'ZAG',
  Laterais: 'LAT',
  'Meio-campistas': 'MEI',
  Atacantes: 'ATA',
};

/** Rótulo de risco de lesão a partir do risco-base da intensidade. */
function rotuloRisco(risco: number): {texto: string; cor: string} {
  if (risco <= 0.005) {
    return {texto: 'Muito baixo', cor: cores.primaria};
  }
  if (risco <= 0.015) {
    return {texto: 'Baixo', cor: cores.primaria};
  }
  if (risco <= 0.035) {
    return {texto: 'Médio', cor: cores.secundaria};
  }
  return {texto: 'Alto', cor: cores.perigo};
}

function media(valores: number[]): number {
  if (valores.length === 0) {
    return 0;
  }
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

/** Cor da moral: alta (verde), média (amarelo), baixa (vermelho). */
function corMoral(moral: number): string {
  if (moral >= 75) {
    return cores.primaria;
  }
  if (moral >= 50) {
    return cores.secundaria;
  }
  return cores.perigo;
}

function Semana(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const elenco = useJogadoresUsuario();
  const clube = useGameStore(selecionarClubeUsuario);
  const aplicarTreino = useGameStore(state => state.aplicarTreino);
  const conversarComGrupo = useGameStore(state => state.conversarComGrupo);
  const jaConversou = useGameStore(state => state.conversouComGrupo);

  const [categoria, setCategoria] = useState<CategoriaTreino>('posicao');
  const [secao, setSecao] = useState<SecaoPosicao>('Zagueiros');
  const [treinoId, setTreinoId] = useState<string>('zag_marcacao');
  const [intensidade, setIntensidade] = useState<IntensidadeTreino>('normal');

  const treino = buscarTreino(treinoId);
  const nivelInfra = clube?.estadio.nivelInfraestrutura ?? 3;
  const moralMedia = useMemo(() => media(elenco.map(j => j.moral)), [elenco]);

  const porPosicao = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'posicao'),
    [],
  );
  const porHabilidade = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'habilidade'),
    [],
  );

  // Apenas os treinos relevantes para a escolha atual ficam visíveis.
  const treinosVisiveis = useMemo(
    () =>
      categoria === 'posicao'
        ? porPosicao.filter(t => t.secao === secao)
        : porHabilidade,
    [categoria, secao, porPosicao, porHabilidade],
  );

  // Prévia determinística (rng "sem lesão" => sempre 1) do impacto médio.
  const preview = useMemo(() => {
    if (!treino) {
      return null;
    }
    const semLesao = () => 1;
    const efeitos = elenco.map(jogador =>
      calcularEfeitoTreino(
        jogador,
        treino,
        intensidade,
        {nivelInfra, jogosNaTemporada: jogador.estatisticasTemporada.jogos},
        semLesao,
      ),
    );
    const condAtual = media(elenco.map(j => j.condicaoFisica));
    const condNova = media(
      elenco.map((j, i) => j.condicaoFisica + efeitos[i].deltaCondicao),
    );
    const formaAtual = media(elenco.map(j => j.forma));
    const formaNova = media(
      elenco.map((j, i) => j.forma + efeitos[i].deltaForma),
    );
    const comAfinidade = elenco.filter(j =>
      treino.gruposIdeais.includes(grupoDaPosicao(j.posicaoPrincipal)),
    ).length;
    return {condAtual, condNova, formaAtual, formaNova, comAfinidade};
  }, [treino, elenco, intensidade, nivelInfra]);

  const risco = rotuloRisco(INTENSIDADES[intensidade].riscoLesaoBase);

  const aoConversar = () => {
    const ok = conversarComGrupo();
    toast(
      ok ? 'Discurso motivacional feito. Moral em alta!' : 'Grupo já reunido esta semana.',
      ok ? 'sucesso' : 'erro',
    );
  };

  // Trocar de categoria/posição re-seleciona um treino válido p/ o novo contexto.
  const trocarCategoria = (cat: CategoriaTreino) => {
    setCategoria(cat);
    if (cat === 'habilidade') {
      setTreinoId(porHabilidade[0]?.id ?? TREINO_PADRAO_ID);
    } else {
      setTreinoId(porPosicao.find(t => t.secao === secao)?.id ?? treinoId);
    }
  };

  const selecionarSecao = (nova: SecaoPosicao) => {
    setSecao(nova);
    const primeiro = porPosicao.find(t => t.secao === nova);
    if (primeiro) {
      setTreinoId(primeiro.id);
    }
  };

  const confirmar = () => {
    if (!treino) {
      return;
    }
    aplicarTreino(treino.id, intensidade);
    toast('Treino realizado.', 'sucesso');
    nav.goBack();
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Treino da Semana"
        subtitulo="Desenvolva os atributos do elenco"
        onBack={() => nav.goBack()}
      />

      {/* Moral do elenco (card compacto) */}
      <View style={styles.moralCard}>
        <View style={styles.moralTopo}>
          <View style={styles.moralLabelWrap}>
            <Icone nome="conversa" tamanho={18} cor={cores.textoSecundario} />
            <Text style={styles.moralLabel}>Moral do elenco</Text>
          </View>
          <Text style={[styles.moralValor, {color: corMoral(moralMedia)}]}>
            {moralMedia.toFixed(0)}
          </Text>
        </View>
        <Botao
          titulo={jaConversou ? 'Grupo já reunido' : 'Conversar com o grupo'}
          variante="secundaria"
          disabled={jaConversou}
          onPress={aoConversar}
        />
      </View>

      {/* O QUE treinar: categoria → (posição) → treino */}
      <Section titulo="O que treinar">
        <View style={styles.segment}>
          {(['posicao', 'habilidade'] as CategoriaTreino[]).map(cat => {
            const ativo = categoria === cat;
            return (
              <Pressable
                accessibilityRole="button"
                key={cat}
                onPress={() => trocarCategoria(cat)}
                style={[styles.segmentBtn, ativo ? styles.segmentBtnAtivo : null]}>
                <Text
                  style={[
                    styles.segmentTexto,
                    ativo ? styles.segmentTextoAtivo : null,
                  ]}>
                  {cat === 'posicao' ? 'Por posição' : 'Por habilidade'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {categoria === 'posicao' ? (
          <View style={styles.posPicker}>
            {SECOES_POSICAO.map(s => {
              const ativo = s === secao;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={s}
                  onPress={() => selecionarSecao(s)}
                  style={[styles.posPill, ativo ? styles.posPillAtivo : null]}>
                  <Text
                    style={[
                      styles.posPillTexto,
                      ativo ? styles.posPillTextoAtivo : null,
                    ]}>
                    {SECAO_CURTA[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.chipRow}>
          {treinosVisiveis.map(t => (
            <ChipTreino
              key={t.id}
              treino={t}
              ativo={t.id === treinoId}
              onPress={() => setTreinoId(t.id)}
            />
          ))}
        </View>
      </Section>

      {/* Intensidade */}
      <Section titulo="Intensidade">
        <View style={styles.chipRow}>
          {INTENSIDADES_ORDEM.map(valor => {
            const ativo = intensidade === valor;
            return (
              <Pressable
                accessibilityRole="button"
                key={valor}
                onPress={() => setIntensidade(valor)}
                style={[styles.intensChip, ativo ? styles.intensChipAtivo : null]}>
                <Text
                  style={[
                    styles.intensTexto,
                    ativo ? styles.intensTextoAtivo : null,
                  ]}>
                  {INTENSIDADES[valor].rotulo}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* Resumo do treino selecionado (detalhe + impacto num só card) */}
      {treino && preview ? (
        <View style={styles.resumoCard}>
          <View style={styles.resumoHeader}>
            <Text style={styles.resumoTitulo}>Treino de {treino.nome}</Text>
            <View style={styles.afinidadeBadge}>
              <Text style={styles.afinidadeTexto}>
                {preview.comAfinidade}/{elenco.length} ideais
              </Text>
            </View>
          </View>

          <View style={styles.efeitos}>
            {treino.efeitos.map(efeito => (
              <View key={efeito} style={styles.efeitoLinha}>
                <Icone nome="seta-cima" tamanho={14} cor={cores.primaria} />
                <Text style={styles.efeitoTexto}>{efeito}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divisor} />

          <View style={styles.metricaLinha}>
            <Text style={styles.metricaLabel}>Condição média</Text>
            <Text style={styles.metricaValor}>
              {preview.condAtual.toFixed(0)}%{' '}
              <Text style={{color: corCondicao(preview.condNova)}}>
                → {preview.condNova.toFixed(0)}%
              </Text>
            </Text>
          </View>
          <View style={styles.metricaLinha}>
            <Text style={styles.metricaLabel}>Forma média</Text>
            <Text style={styles.metricaValor}>
              {preview.formaAtual.toFixed(1)}{' '}
              <Text style={{color: cores.primaria}}>
                → {preview.formaNova.toFixed(1)}
              </Text>
            </Text>
          </View>
          <View style={styles.metricaLinha}>
            <Text style={styles.metricaLabel}>Risco de lesão</Text>
            <Text style={[styles.metricaValor, {color: risco.cor}]}>
              {risco.texto}
            </Text>
          </View>
        </View>
      ) : null}

      <Botao titulo="Confirmar treino" onPress={confirmar} />
    </ScreenContainer>
  );
}

function ChipTreino({
  treino,
  ativo,
  onPress,
}: {
  treino: TreinoTipo;
  ativo: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, ativo ? styles.chipAtivo : null]}>
      <Text style={[styles.chipTexto, ativo ? styles.chipTextoAtivo : null]}>
        {treino.nome}
      </Text>
    </Pressable>
  );
}

export default Semana;

const styles = StyleSheet.create({
  moralCard: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    gap: espaco.sm,
    marginBottom: espaco.lg,
    padding: espaco.md,
  },
  moralTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moralLabelWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  moralLabel: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  moralValor: {
    fontSize: 22,
    fontWeight: '900',
  },
  segment: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    flexDirection: 'row',
    padding: 3,
  },
  segmentBtn: {
    alignItems: 'center',
    borderRadius: raio.sm,
    flex: 1,
    paddingVertical: espaco.sm,
  },
  segmentBtnAtivo: {
    backgroundColor: cores.primaria,
  },
  segmentTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  posPicker: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  posPill: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flex: 1,
    paddingVertical: espaco.sm,
  },
  posPillAtivo: {
    backgroundColor: cores.secundaria,
  },
  posPillTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    fontWeight: '800',
  },
  posPillTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.sm,
  },
  chip: {
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: espaco.md,
  },
  chipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  chipTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  intensChip: {
    alignItems: 'center',
    borderColor: cores.borda,
    borderRadius: raio.md,
    borderWidth: 1,
    flexGrow: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  intensChipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  intensTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '800',
  },
  intensTextoAtivo: {
    color: cores.contrastePrimaria,
  },
  resumoCard: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    gap: espaco.sm,
    marginBottom: espaco.lg,
    padding: espaco.md,
  },
  resumoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resumoTitulo: {
    color: cores.texto,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  afinidadeBadge: {
    backgroundColor: cores.superficie,
    borderRadius: raio.sm,
    paddingHorizontal: espaco.sm,
    paddingVertical: 3,
  },
  afinidadeTexto: {
    color: cores.secundaria,
    fontSize: 12,
    fontWeight: '800',
  },
  efeitos: {
    gap: espaco.xs,
  },
  efeitoLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  efeitoTexto: {
    color: cores.texto,
    fontSize: 14,
  },
  divisor: {
    backgroundColor: cores.borda,
    height: StyleSheet.hairlineWidth,
    marginVertical: espaco.xs,
  },
  metricaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricaLabel: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  metricaValor: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
});
