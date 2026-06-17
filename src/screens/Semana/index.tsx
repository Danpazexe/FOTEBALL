/**
 * Treino da Semana. O técnico escolhe O QUE treinar (rotina por posição ou foco
 * num atributo) e COM QUE intensidade (leve → muito forte). A tela mostra os
 * atributos que cada treino desenvolve, a prévia de impacto (condição/forma,
 * risco de lesão) e quais jogadores têm afinidade com a rotina escolhida.
 *
 * O efeito real (evolução de atributos por acúmulo de progresso, cansaço, moral
 * e lesões) vive em `treinoAtributos`; aqui só montamos a UI e disparamos a ação.
 */

import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, Section} from '../../components/ui';
import Icone, {type IconeNome} from '../../components/Icone';
import {useToast} from '../../components/feedback';
import {calcularEfeitoTreino} from '../../engine/progression/treinoAtributos';
import {
  CATALOGO_TREINOS,
  INTENSIDADES,
  INTENSIDADES_ORDEM,
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

const ICONE_INTENSIDADE: Record<IntensidadeTreino, IconeNome> = {
  leve: 'casa',
  normal: 'jogar',
  forte: 'simular',
  muito_forte: 'lesao',
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

function Semana(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const elenco = useJogadoresUsuario();
  const clube = useGameStore(selecionarClubeUsuario);
  const aplicarTreino = useGameStore(state => state.aplicarTreino);

  const [categoria, setCategoria] = useState<CategoriaTreino>('posicao');
  const [treinoId, setTreinoId] = useState<string>('zag_marcacao');
  const [intensidade, setIntensidade] = useState<IntensidadeTreino>('normal');

  const treino = buscarTreino(treinoId);
  const nivelInfra = clube?.estadio.nivelInfraestrutura ?? 3;

  const porPosicao = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'posicao'),
    [],
  );
  const porHabilidade = useMemo(
    () => CATALOGO_TREINOS.filter(t => t.categoria === 'habilidade'),
    [],
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

      {/* Categoria: por posição x por habilidade */}
      <View style={styles.segment}>
        {(['posicao', 'habilidade'] as CategoriaTreino[]).map(cat => {
          const ativo = categoria === cat;
          return (
            <Pressable
              accessibilityRole="button"
              key={cat}
              onPress={() => setCategoria(cat)}
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
        SECOES_POSICAO.map(secao => (
          <Section key={secao} titulo={secao}>
            <View style={styles.chipRow}>
              {porPosicao
                .filter(t => t.secao === secao)
                .map(t => (
                  <ChipTreino
                    key={t.id}
                    treino={t}
                    ativo={t.id === treinoId}
                    onPress={() => setTreinoId(t.id)}
                  />
                ))}
            </View>
          </Section>
        ))
      ) : (
        <Section titulo="Foco em atributo">
          <View style={styles.chipRow}>
            {porHabilidade.map(t => (
              <ChipTreino
                key={t.id}
                treino={t}
                ativo={t.id === treinoId}
                onPress={() => setTreinoId(t.id)}
              />
            ))}
          </View>
        </Section>
      )}

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
                <Icone
                  nome={ICONE_INTENSIDADE[valor]}
                  tamanho={18}
                  cor={ativo ? cores.contrastePrimaria : cores.texto}
                />
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

      {/* Detalhe do treino selecionado */}
      {treino ? (
        <Section titulo={`Treino de ${treino.nome}`}>
          <View style={styles.efeitos}>
            {treino.efeitos.map(efeito => (
              <View key={efeito} style={styles.efeitoLinha}>
                <Icone nome="seta-cima" tamanho={14} cor={cores.primaria} />
                <Text style={styles.efeitoTexto}>{efeito}</Text>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* Impacto estimado */}
      {preview ? (
        <Section titulo="Impacto estimado">
          <View style={styles.impactoLinha}>
            <Text style={styles.impactoLabel}>Condição média</Text>
            <Text style={styles.impactoValor}>
              {preview.condAtual.toFixed(0)}%{' '}
              <Text style={{color: corCondicao(preview.condNova)}}>
                → {preview.condNova.toFixed(0)}%
              </Text>
            </Text>
          </View>
          <View style={styles.impactoLinha}>
            <Text style={styles.impactoLabel}>Forma média</Text>
            <Text style={styles.impactoValor}>
              {preview.formaAtual.toFixed(1)}{' '}
              <Text style={styles.impactoDestaque}>
                → {preview.formaNova.toFixed(1)}
              </Text>
            </Text>
          </View>
          <View style={styles.impactoLinha}>
            <Text style={styles.impactoLabel}>Risco de lesão</Text>
            <Text style={[styles.impactoValor, {color: risco.cor}]}>
              {risco.texto}
            </Text>
          </View>
          <View style={styles.impactoLinha}>
            <Text style={styles.impactoLabel}>Com afinidade</Text>
            <Text style={styles.impactoValor}>
              {preview.comAfinidade} de {elenco.length}
            </Text>
          </View>
          <Text style={styles.dica}>
            Jovens, com moral alta e bem descansados evoluem mais rápido.
            Lesionados fazem apenas recuperação leve.
          </Text>
        </Section>
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
  segment: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    flexDirection: 'row',
    marginBottom: espaco.md,
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
    flexDirection: 'row',
    gap: espaco.xs,
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
  impactoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  impactoLabel: {
    color: cores.textoSecundario,
    fontSize: 13,
  },
  impactoValor: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  impactoDestaque: {
    color: cores.primaria,
  },
  dica: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: espaco.xs,
  },
});
