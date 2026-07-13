/**
 * Central de PRÉ-JOGO. Uma tela de decisão: primeiro o CONFRONTO, depois "quem
 * vai ganhar?" (previsão coerente com o modelo de gols da engine), a escalação no
 * campo, o ajuste de tática e, por fim, o gate Simular / Jogar ao vivo.
 *
 * A escalação e a tática são persistidas na hora (mesmas actions da tela de
 * Tática); o MatchSimulation tira um retrato antes do jogo, então mexer aqui
 * não vaza para a escalação oficial se a partida for abandonada.
 *
 * O scroll trava enquanto há um arraste no campo (o gesto não disputa com a
 * rolagem), como na tela de Tática. Migrado ao Design System v2.
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';

import CampoFUT from '../../components/CampoFUT';
import Escudo from '../../components/Escudo';
import {useConfirm, useToast} from '../../components/feedback';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {
  FORMACOES_DISPONIVEIS,
  montarFormacao,
} from '../../api/database/seed/defaults';
import {taticaProvavelIA} from '../../engine/tactics/preview';
import {validarEscalacao} from '../../engine/tactics/validacao';
import {calcularMando} from '../../engine/simulation/probabilityCalc';
import {preverResultado} from '../../engine/simulation/probabilidadeResultado';
import {useAppNavigation} from '../../navigation/types';
import {
  selecionarClubeUsuario,
  selecionarProximoJogo,
  useGameStore,
  useJogadoresUsuario,
} from '../../store/useGameStore';
import {forcaDoClube} from '../../utils/forca';
import type {Tatica} from '../../types';

const OPCOES_ESTILO: Tatica['estiloOfensivo'][] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Ataque direto',
];
const OPCOES_MARCACAO: Tatica['marcacao'][] = [
  'Zona',
  'Individual',
  'Pressão alta',
];
const OPCOES_LINHA: Tatica['linhaDefensiva'][] = [
  'Recuada',
  'Normal',
  'Adiantada',
];
const OPCOES_RITMO: Tatica['ritmo'][] = ['Lento', 'Normal', 'Intenso'];

/** Bloco com rótulo em caixa-alta + conteúdo (substitui o Section antigo). */
function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.grupo}>
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Instrução tática: rótulo + linha de chips (seleção única). */
function GrupoInstrucao({
  titulo,
  valor,
  opcoes,
  onSelect,
}: {
  titulo: string;
  valor: string;
  opcoes: readonly string[];
  onSelect: (valor: string) => void;
}): React.JSX.Element {
  return (
    <Grupo titulo={titulo}>
      <View style={styles.chipRow}>
        {opcoes.map(opcao => (
          <Chip
            key={opcao}
            label={opcao}
            selected={valor === opcao}
            onPress={() => onSelect(opcao)}
          />
        ))}
      </View>
    </Grupo>
  );
}

function PreJogo(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const confirm = useConfirm();
  const {cores} = useTheme();

  const clubeUsuario = useGameStore(selecionarClubeUsuario);
  const clubes = useGameStore(state => state.clubes);
  const jogadores = useGameStore(state => state.jogadores);
  const jogadoresUsuario = useJogadoresUsuario();
  const proximo = useGameStore(selecionarProximoJogo);
  const avancarRodada = useGameStore(state => state.avancarRodada);
  const atualizarFormacaoUsuario = useGameStore(
    state => state.atualizarFormacaoUsuario,
  );
  const atualizarTaticaUsuario = useGameStore(
    state => state.atualizarTaticaUsuario,
  );
  const definirTaticaAdversario = useGameStore(
    state => state.definirTaticaAdversario,
  );
  const reputacaoTecnico = useGameStore(state => state.reputacaoTecnico);

  const [arrastando, setArrastando] = useState(false);

  const largura = Math.min(
    Dimensions.get('window').width - espacamento[4] * 2,
    360,
  );

  const confronto = useMemo(() => {
    if (!proximo) {
      return null;
    }
    const casa = clubes.find(c => c.id === proximo.timeCasa);
    const fora = clubes.find(c => c.id === proximo.timeFora);
    if (!casa || !fora) {
      return null;
    }
    return {
      casa,
      fora,
      forcaCasa: forcaDoClube(casa, jogadores),
      forcaFora: forcaDoClube(fora, jogadores),
    };
  }, [proximo, clubes, jogadores]);

  // Tática PROVÁVEL do adversário (IA), pela força relativa + mando.
  const advInfo = useMemo(() => {
    if (!confronto || !clubeUsuario || !proximo) {
      return null;
    }
    const mando = proximo.timeCasa === clubeUsuario.id;
    const eu = mando ? confronto.forcaCasa : confronto.forcaFora;
    const ele = mando ? confronto.forcaFora : confronto.forcaCasa;
    const adversario = mando ? confronto.fora : confronto.casa;
    return {
      id: adversario.id,
      tatica: taticaProvavelIA({
        overallAdversario: ele.overall,
        overallUsuario: eu.overall,
        adversarioMandante: !mando,
      }),
    };
  }, [confronto, clubeUsuario, proximo]);

  // Fixa a tática do adversário no estado UMA vez por confronto. Cuidado: definir
  // a tática muda a FORÇA do clube (calcularForcaTime usa a tática), o que
  // recalcularia `confronto`→`advInfo` e re-dispararia este efeito com uma nova
  // recomendação — um loop de feedback ("Maximum update depth exceeded"). O guard
  // por id do adversário corta o loop (a tela remonta a cada nova partida).
  const advFixadoRef = useRef<string | null>(null);
  useEffect(() => {
    if (advInfo && advFixadoRef.current !== advInfo.id) {
      advFixadoRef.current = advInfo.id;
      definirTaticaAdversario(advInfo.id, advInfo.tatica);
    }
  }, [advInfo, definirTaticaAdversario]);

  const formacao = clubeUsuario?.formacaoAtual ?? null;
  const taticaAtual = clubeUsuario?.taticaAtual ?? null;

  const validacao = useMemo(
    () => (formacao ? validarEscalacao(formacao, jogadoresUsuario) : null),
    [formacao, jogadoresUsuario],
  );

  if (!proximo || !confronto || !clubeUsuario || !formacao || !taticaAtual) {
    return (
      <Screen>
        <AppBar title="Pré-jogo" onBack={() => nav.goBack()} />
        <View style={styles.vazio}>
          <Text variant="bodyM" color="textSecondary">
            Nenhum jogo agendado.
          </Text>
        </View>
      </Screen>
    );
  }

  const mandoCasa = proximo.timeCasa === clubeUsuario.id;
  const forcaMinha = mandoCasa ? confronto.forcaCasa : confronto.forcaFora;
  const forcaDele = mandoCasa ? confronto.forcaFora : confronto.forcaCasa;
  const adversario = mandoCasa ? confronto.fora : confronto.casa;
  const advTatica = advInfo?.tatica ?? null;
  const diff = forcaMinha.overall + (mandoCasa ? 3 : 0) - forcaDele.overall;

  // "Quem vai ganhar?" — coerente com a simulação (mesmo modelo de gols).
  const mandoFator = calcularMando(
    confronto.casa.estadio.capacidade,
    confronto.casa.reputacao,
  );
  const previsao = preverResultado(
    confronto.forcaCasa,
    confronto.forcaFora,
    mandoCasa ? taticaAtual : advTatica ?? taticaAtual,
    mandoCasa ? advTatica ?? taticaAtual : taticaAtual,
    mandoFator,
  );
  const probVoce = mandoCasa ? previsao.vitoriaCasa : previsao.vitoriaFora;
  const pctVoce = Math.round(probVoce * 100);
  const pctEmpate = Math.round(previsao.empate * 100);
  const pctAdv = Math.max(0, 100 - pctVoce - pctEmpate);
  const favoritismo =
    Math.abs(diff) < 2
      ? 'Equilíbrio'
      : `${diff > 0 ? 'Favorito' : 'Azarão'}${
          Math.abs(diff) >= 6 ? '' : ' leve'
        }`;
  const favTom = diff >= 2 ? 'success' : diff <= -2 ? 'danger' : 'neutral';

  const podeJogar = validacao?.valido ?? false;
  const formacaoTipo = formacao.tipo;

  // Trocar de esquema remonta a escalação (desfaz o arraste manual) — confirma.
  async function trocarFormacao(
    tipo: (typeof FORMACOES_DISPONIVEIS)[number],
  ): Promise<void> {
    if (tipo === formacaoTipo) {
      return;
    }
    const ok = await confirm({
      titulo: `Trocar para ${tipo}?`,
      mensagem:
        'Remonta a escalação a partir do novo esquema, desfazendo ajustes manuais de posição.',
      confirmarLabel: 'Trocar',
    });
    if (!ok) {
      return;
    }
    atualizarFormacaoUsuario(montarFormacao(jogadoresUsuario, tipo));
  }

  // Preenche o XI com os melhores jogadores disponíveis para a formação atual.
  async function escalarMelhores(): Promise<void> {
    const ok = await confirm({
      titulo: 'Escalar os 11 melhores?',
      mensagem:
        'Preenche a escalação automaticamente com os melhores jogadores disponíveis para a formação atual, desfazendo ajustes manuais de posição.',
      confirmarLabel: 'Escalar',
    });
    if (!ok) {
      return;
    }
    const preset = formacaoTipo === 'Personalizada' ? '4-3-3' : formacaoTipo;
    atualizarFormacaoUsuario(montarFormacao(jogadoresUsuario, preset));
    toast('Escalados os 11 melhores.', 'sucesso');
  }

  return (
    <Screen scroll scrollEnabled={!arrastando}>
      <AppBar
        title={`Rodada ${proximo.rodada}`}
        subtitle={`Brasileirão ${clubeUsuario.divisao ?? 'Série A'}`}
        onBack={() => nav.goBack()}
      />

      {/* CONFRONTO — hero */}
      <Card variante="elevated">
        <View style={styles.heroConfronto}>
          <View style={styles.heroTime}>
            <Escudo
              clubeId={confronto.casa.id}
              sigla={confronto.casa.sigla}
              tamanho={54}
            />
            <Text variant="bodyM" weight="700" align="center" numberOfLines={1}>
              {confronto.casa.nome}
            </Text>
            <Text variant="scoreXL" color="brand" tabular>
              {Math.round(confronto.forcaCasa.overall)}
            </Text>
            <Text
              variant="caption"
              color={mandoCasa ? 'accent' : 'textMuted'}
              style={styles.caps}>
              {mandoCasa ? 'VOCÊ · CASA' : 'CASA'}
            </Text>
          </View>

          <View style={styles.heroCentro}>
            <Text variant="titleM" color="textSecondary" weight="900">
              VS
            </Text>
            <Badge label={favoritismo} tom={favTom} />
          </View>

          <View style={styles.heroTime}>
            <Escudo
              clubeId={confronto.fora.id}
              sigla={confronto.fora.sigla}
              tamanho={54}
            />
            <Text variant="bodyM" weight="700" align="center" numberOfLines={1}>
              {confronto.fora.nome}
            </Text>
            <Text variant="scoreXL" color="brand" tabular>
              {Math.round(confronto.forcaFora.overall)}
            </Text>
            <Text
              variant="caption"
              color={!mandoCasa ? 'accent' : 'textMuted'}
              style={styles.caps}>
              {!mandoCasa ? 'VOCÊ · FORA' : 'FORA'}
            </Text>
          </View>
        </View>
      </Card>

      {/* QUEM VAI GANHAR? — previsão coerente com o modelo de gols da engine */}
      <Grupo titulo="Quem vai ganhar?">
        <View style={styles.previsaoBarra}>
          <View
            style={[
              styles.previsaoSeg,
              {flex: Math.max(1, pctVoce), backgroundColor: cores.brand},
            ]}
          />
          <View
            style={[
              styles.previsaoSeg,
              {flex: Math.max(1, pctEmpate), backgroundColor: cores.border},
            ]}
          />
          <View
            style={[
              styles.previsaoSeg,
              {flex: Math.max(1, pctAdv), backgroundColor: cores.danger},
            ]}
          />
        </View>
        <View style={styles.previsaoLegenda}>
          <View style={styles.previsaoItem}>
            <Text variant="titleM" weight="900" color="brand" tabular>
              {pctVoce}%
            </Text>
            <Text variant="caption" color="textSecondary">
              Você
            </Text>
          </View>
          <View style={styles.previsaoItemCentro}>
            <Text variant="titleM" weight="900" color="textSecondary" tabular>
              {pctEmpate}%
            </Text>
            <Text variant="caption" color="textSecondary">
              Empate
            </Text>
          </View>
          <View style={styles.previsaoItemDir}>
            <Text variant="titleM" weight="900" color="danger" tabular>
              {pctAdv}%
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {adversario.sigla}
            </Text>
          </View>
        </View>
      </Grupo>

      {/* ESCALAÇÃO */}
      <Grupo titulo="Escalação">
        <CampoFUT
          clube={clubeUsuario}
          formacao={formacao}
          jogadores={jogadoresUsuario}
          tatica={taticaAtual}
          forca={forcaMinha}
          reputacaoTecnico={reputacaoTecnico}
          largura={largura}
          onAtualizarFormacao={atualizarFormacaoUsuario}
          onArrastandoChange={setArrastando}
          onAbrirJogador={jogadorId => nav.navigate('PlayerDetail', {jogadorId})}
        />

        <Button
          titulo="Escalar os 11 melhores"
          variante="secondary"
          icone="tatica"
          onPress={escalarMelhores}
          fullWidth
        />

        <Text variant="labelM" color="textSecondary" style={styles.caps}>
          Trocar formação
        </Text>
        <View style={styles.chipRow}>
          {FORMACOES_DISPONIVEIS.map(tipo => (
            <Chip
              key={tipo}
              label={tipo}
              selected={formacaoTipo === tipo}
              onPress={() => trocarFormacao(tipo)}
            />
          ))}
        </View>
      </Grupo>

      {/* TÁTICA */}
      <Grupo titulo="Tática">
        <View style={styles.instrucoes}>
          <GrupoInstrucao
            titulo="Estilo ofensivo"
            valor={taticaAtual.estiloOfensivo}
            opcoes={OPCOES_ESTILO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                estiloOfensivo: valor as Tatica['estiloOfensivo'],
              })
            }
          />
          <GrupoInstrucao
            titulo="Marcação"
            valor={taticaAtual.marcacao}
            opcoes={OPCOES_MARCACAO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                marcacao: valor as Tatica['marcacao'],
              })
            }
          />
          <GrupoInstrucao
            titulo="Linha defensiva"
            valor={taticaAtual.linhaDefensiva}
            opcoes={OPCOES_LINHA}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                linhaDefensiva: valor as Tatica['linhaDefensiva'],
              })
            }
          />
          <GrupoInstrucao
            titulo="Ritmo"
            valor={taticaAtual.ritmo}
            opcoes={OPCOES_RITMO}
            onSelect={valor =>
              atualizarTaticaUsuario({
                ...taticaAtual,
                ritmo: valor as Tatica['ritmo'],
              })
            }
          />
        </View>
      </Grupo>

      {/* CONFIRMAR INÍCIO */}
      <View style={styles.acoes}>
        <View style={styles.acaoSimular}>
          <Button
            variante="secondary"
            icone="simular"
            titulo="Simular"
            tamanho="lg"
            disabled={!podeJogar}
            fullWidth
            onPress={() => {
              avancarRodada();
              toast('Rodada simulada.', 'sucesso');
              nav.navigate('MainTabs');
            }}
          />
        </View>
        <View style={styles.acaoJogar}>
          <Button
            variante="primary"
            icone="jogar"
            titulo="Jogar ao vivo"
            tamanho="lg"
            disabled={!podeJogar}
            fullWidth
            onPress={() => nav.navigate('MatchSimulation')}
          />
        </View>
      </View>
    </Screen>
  );
}

export default PreJogo;

const styles = StyleSheet.create({
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[2]},
  grupo: {gap: espacamento[2]},
  instrucoes: {gap: espacamento[4]},
  vazio: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacamento[6],
  },
  // CONFRONTO — hero
  heroConfronto: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTime: {
    alignItems: 'center',
    flex: 1,
    gap: espacamento[1],
  },
  heroCentro: {
    alignItems: 'center',
    gap: espacamento[2],
    paddingTop: espacamento[5],
  },
  // QUEM VAI GANHAR?
  previsaoBarra: {
    flexDirection: 'row',
    gap: 3,
    height: 14,
  },
  previsaoSeg: {
    borderRadius: raios.full,
    height: '100%',
  },
  previsaoLegenda: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espacamento[2],
  },
  previsaoItem: {
    alignItems: 'flex-start',
    flex: 1,
  },
  previsaoItemCentro: {
    alignItems: 'center',
    flex: 1,
  },
  previsaoItemDir: {
    alignItems: 'flex-end',
    flex: 1,
  },
  // CONFIRMAR
  acoes: {
    flexDirection: 'row',
    gap: espacamento[2],
  },
  acaoSimular: {
    flex: 1,
  },
  acaoJogar: {
    flex: 2,
  },
});
