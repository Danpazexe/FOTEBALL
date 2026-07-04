/**
 * Detalhe do jogador: carta (estilo FIFA) + status (lesão/suspensão),
 * evolução (overall→potencial + tendência por idade), finanças, disciplina
 * (cartões), estatísticas da temporada e atributos completos.
 */

import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import {
  AppHeader,
  Botao,
  Metric,
  MetricsRow,
  ScreenContainer,
  Section,
  TextoVazio,
} from '../../components/ui';
import CartaJogador from '../../components/CartaJogador';
import AttributeRadar from '../../components/AttributeRadar';
import Icone, {type IconeNome} from '../../components/Icone';
import OverallBadge from '../../components/OverallBadge';
import Painel from '../../components/Painel';
import StatBar from '../../components/StatBar';
import {useConfirm, useToast} from '../../components/feedback';
import {cores, corOverall, espaco, raio} from '../../theme';
import {moeda, nomeClube} from '../../utils/formatters';
import {HABILIDADES} from '../../engine/progression/habilidades';
import {precoVenda, useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import type {Player, PlayerAttributes, TipoJogador} from '../../types';

const TIPO_LABEL: Partial<Record<TipoJogador, {rotulo: string; cor: string}>> = {
  NOVATO: {rotulo: 'Novato', cor: cores.secundaria},
  VETERANO: {rotulo: 'Veterano', cor: cores.textoSecundario},
};

const ATRIBUTOS: {chave: keyof PlayerAttributes; label: string}[] = [
  {chave: 'velocidade', label: 'Velocidade'},
  {chave: 'finalizacao', label: 'Finalização'},
  {chave: 'passe', label: 'Passe'},
  {chave: 'drible', label: 'Drible'},
  {chave: 'marcacao', label: 'Marcação'},
  {chave: 'desarme', label: 'Desarme'},
  {chave: 'forca', label: 'Força'},
  {chave: 'resistencia', label: 'Resistência'},
  {chave: 'cabeceio', label: 'Cabeceio'},
  {chave: 'cruzamento', label: 'Cruzamento'},
  {chave: 'reflexos', label: 'Reflexos'},
  {chave: 'posicionamento', label: 'Posição'},
];

type StatusJogador = {rotulo: string; cor: string; icone: IconeNome};

function statusJogador(j: Player): StatusJogador {
  if (j.lesionado) {
    return {
      rotulo: `Lesionado · ${j.diasLesao} dia(s)`,
      cor: cores.perigo,
      icone: 'lesao',
    };
  }
  if (j.suspenso) {
    return {
      rotulo: `Suspenso · ${j.jogosSuspensao} jogo(s)`,
      cor: cores.perigo,
      icone: 'cartao',
    };
  }
  return {rotulo: 'Disponível', cor: cores.primaria, icone: 'check'};
}

function tendenciaJogador(j: Player): {rotulo: string; cor: string} {
  const margem = j.potencial - j.overall;
  if (j.idade <= 21 && margem >= 1) {
    return {rotulo: 'Jovem promessa', cor: cores.primaria};
  }
  if (margem >= 3 && j.idade <= 28) {
    return {rotulo: 'Em evolução', cor: cores.primaria};
  }
  if (j.idade >= 32) {
    return {rotulo: 'Veterano', cor: cores.secundaria};
  }
  if (margem <= 0) {
    return {rotulo: 'No auge', cor: cores.secundaria};
  }
  return {rotulo: 'Estável', cor: cores.textoSecundario};
}

function PlayerDetail(): React.JSX.Element {
  const nav = useAppNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PlayerDetail'>>();
  const {jogadorId} = route.params;

  const jogador = useGameStore(state =>
    state.jogadores.find(item => item.id === jogadorId),
  );
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const clubes = useGameStore(state => state.clubes);
  const venderJogador = useGameStore(state => state.venderJogador);
  const emprestarJogador = useGameStore(state => state.emprestarJogador);
  const definirFocoTreino = useGameStore(state => state.definirFocoTreino);
  const confirmarAcoes = useGameStore(state => state.config.confirmarAcoes);
  const confirm = useConfirm();
  const toast = useToast();

  if (!jogador) {
    return (
      <ScreenContainer scroll>
        <AppHeader titulo="Jogador" onBack={() => nav.goBack()} />
        <TextoVazio>Jogador não encontrado.</TextoVazio>
      </ScreenContainer>
    );
  }

  const est = jogador.estatisticasTemporada;
  const status = statusJogador(jogador);
  const tendencia = tendenciaJogador(jogador);
  const tipoInfo = jogador.tipo ? TIPO_LABEL[jogador.tipo] : undefined;
  const doClubeUsuario =
    clubeUsuarioId !== null && jogador.clubeId === clubeUsuarioId;

  const handleVender = async () => {
    const ok = !confirmarAcoes
      ? true
      : await confirm({
          titulo: `Vender ${jogador.nome}?`,
          mensagem: `${jogador.posicaoPrincipal} · ${jogador.idade} anos · Overall ${jogador.overall}`,
          detalhes: [{rotulo: 'Clube recebe', valor: moeda(precoVenda(jogador))}],
          confirmarLabel: 'Vender',
          perigo: true,
        });
    if (!ok) {
      return;
    }
    const resultado = venderJogador(jogador.id);
    toast(resultado.mensagem, resultado.ok ? 'sucesso' : 'erro');
    if (resultado.ok) {
      nav.goBack();
    }
  };

  // Destino do empréstimo: clube de menor reputação da liga (dá minutos ao jovem).
  const destinoEmprestimo = clubes
    .filter(clube => clube.id !== clubeUsuarioId)
    .sort((a, b) => a.reputacao - b.reputacao)[0];

  const handleEmprestar = async () => {
    if (!destinoEmprestimo) {
      return;
    }
    const ok = !confirmarAcoes
      ? true
      : await confirm({
          titulo: `Emprestar ${jogador.nome}?`,
          mensagem: `Cedido ao ${destinoEmprestimo.nome} até a próxima temporada. Eles pagam o salário e ele volta no fim do empréstimo.`,
          confirmarLabel: 'Emprestar',
        });
    if (!ok) {
      return;
    }
    emprestarJogador(jogador.id, destinoEmprestimo.id);
    toast(`${jogador.nome} emprestado ao ${destinoEmprestimo.nome}.`, 'sucesso');
    nav.goBack();
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo={jogador.nome}
        subtitulo={`${jogador.posicaoPrincipal} · ${jogador.idade} anos · ${jogador.nacionalidade}`}
        onBack={() => nav.goBack()}
        right={<OverallBadge overall={jogador.overall} />}
      />

      <View style={styles.cartaWrap}>
        <CartaJogador jogador={jogador} />
      </View>

      {/* Status (lesão / suspensão / disponível) */}
      <View style={[styles.statusChip, {borderColor: status.cor}]}>
        <Icone nome={status.icone} tamanho={16} cor={status.cor} />
        <Text style={[styles.statusTexto, {color: status.cor}]}>
          {status.rotulo}
        </Text>
      </View>

      {jogador.emprestimo ? (
        <View style={[styles.statusChip, {borderColor: cores.secundaria}]}>
          <Icone nome="troca" tamanho={16} cor={cores.secundaria} />
          <Text style={[styles.statusTexto, {color: cores.secundaria}]}>
            {jogador.emprestimo.clubeDonoId === clubeUsuarioId
              ? `Emprestado a ${nomeClube(clubes, jogador.clubeId ?? '')} · volta ${jogador.emprestimo.retornaEmTemporada}`
              : `Emprestado de ${nomeClube(clubes, jogador.emprestimo.clubeDonoId)} · volta ${jogador.emprestimo.retornaEmTemporada}`}
          </Text>
        </View>
      ) : null}

      {/* Evolução: overall -> potencial + tendência */}
      <Section titulo="Evolução">
        <Painel>
          <View style={styles.evoConteudo}>
            <View style={styles.evoLinha}>
              <Text style={styles.evoTexto}>
                Overall <Text style={styles.evoForte}>{jogador.overall}</Text> ·
                Potencial{' '}
                <Text style={styles.evoForte}>{jogador.potencial}</Text>
              </Text>
              <View style={styles.chipsRow}>
                {tipoInfo ? (
                  <View
                    style={[
                      styles.tendenciaChip,
                      {
                        backgroundColor: `${tipoInfo.cor}1F`,
                        borderColor: `${tipoInfo.cor}66`,
                      },
                    ]}>
                    <Text style={[styles.tendenciaTexto, {color: tipoInfo.cor}]}>
                      {tipoInfo.rotulo}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.tendenciaChip,
                    {
                      backgroundColor: `${tendencia.cor}1F`,
                      borderColor: `${tendencia.cor}66`,
                    },
                  ]}>
                  <Text style={[styles.tendenciaTexto, {color: tendencia.cor}]}>
                    {tendencia.rotulo}
                  </Text>
                </View>
              </View>
            </View>
            <StatBar
              valor={jogador.overall}
              max={jogador.potencial}
              cor={corOverall(jogador.overall)}
              mostrarValor={false}
            />
            <Text style={styles.evoLegenda}>
              {jogador.potencial > jogador.overall
                ? `Pode evoluir até ${jogador.potencial}.`
                : 'Já atingiu o teto de evolução.'}
            </Text>
          </View>
        </Painel>
      </Section>

      {(jogador.habilidades ?? []).length > 0 ? (
        <Section titulo="Habilidades">
          <Painel>
            <View style={styles.habilidadesWrap}>
              {(jogador.habilidades ?? []).map(hab => (
                <View key={hab} style={styles.habilidadeItem}>
                  <Text style={styles.habilidadeRotulo}>
                    {HABILIDADES[hab].rotulo}
                  </Text>
                  <Text style={styles.habilidadeDescricao}>
                    {HABILIDADES[hab].descricao}
                  </Text>
                </View>
              ))}
            </View>
          </Painel>
        </Section>
      ) : null}

      <MetricsRow>
        <Metric label="Valor" valor={moeda(jogador.valorMercado)} />
        <Metric label="Salário" valor={moeda(jogador.salario)} />
      </MetricsRow>

      <MetricsRow>
        <Metric label="Condição" valor={`${jogador.condicaoFisica}%`} />
        <Metric label="Moral" valor={`${jogador.moral}`} />
        <Metric label="Forma" valor={`${jogador.forma}`} />
      </MetricsRow>

      <Section titulo="Temporada">
        <MetricsRow>
          <Metric label="Jogos" valor={`${est.jogos}`} />
          <Metric label="Gols" valor={`${est.gols}`} />
          <Metric label="Assist." valor={`${est.assistencias}`} />
          <Metric label="Nota" valor={est.notaMedia.toFixed(1)} />
        </MetricsRow>
        <View style={styles.disciplina}>
          <View style={styles.disciplinaItem}>
            <Icone nome="cartao" tamanho={15} cor={cores.secundaria} />
            <Text style={styles.disciplinaTexto}>
              {est.cartoesAmarelos} amarelo(s)
            </Text>
          </View>
          <View style={styles.disciplinaItem}>
            <Icone nome="cartao" tamanho={15} cor={cores.perigo} />
            <Text style={styles.disciplinaTexto}>
              {est.cartoesVermelhos} vermelho(s)
            </Text>
          </View>
        </View>
        <Text style={styles.contratoTexto}>
          Contrato até {jogador.contratoAte} · Perna {jogador.pernaDominante}
        </Text>
      </Section>

      <Section titulo="Radar de atributos">
        <Painel>
          <View style={styles.radarWrap}>
            <AttributeRadar jogador={jogador} />
          </View>
        </Painel>
      </Section>

      <Section titulo="Atributos">
        <Painel>
          <View style={styles.atributosGrid}>
            {ATRIBUTOS.map(attr => (
              <AtributoLinha
                key={attr.chave}
                label={attr.label}
                valor={jogador.atributos[attr.chave]}
                progresso={jogador.progressoAtributos?.[attr.chave] ?? 0}
              />
            ))}
          </View>
          <Text style={styles.atributosNota}>
            A barra fina mostra o progresso no treino rumo ao próximo ponto.
          </Text>
        </Painel>
      </Section>

      {doClubeUsuario ? (
        <Section titulo="Foco de treino">
          <Painel>
            <Text style={styles.atributosNota}>
              O atributo em foco evolui mais rápido nos treinos (limitado ao
              potencial).
            </Text>
            <View style={styles.focoChips}>
              <Pressable
                onPress={() => definirFocoTreino(jogador.id, null)}
                style={[
                  styles.focoChip,
                  !jogador.focoTreino && styles.focoChipAtivo,
                ]}>
                <Text
                  style={[
                    styles.focoChipTxt,
                    !jogador.focoTreino && styles.focoChipTxtAtivo,
                  ]}>
                  Nenhum
                </Text>
              </Pressable>
              {ATRIBUTOS.map(attr => {
                const ativo = jogador.focoTreino === attr.chave;
                return (
                  <Pressable
                    key={attr.chave}
                    onPress={() => definirFocoTreino(jogador.id, attr.chave)}
                    style={[styles.focoChip, ativo && styles.focoChipAtivo]}>
                    <Text
                      style={[
                        styles.focoChipTxt,
                        ativo && styles.focoChipTxtAtivo,
                      ]}>
                      {attr.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Painel>
        </Section>
      ) : null}

      {doClubeUsuario && !jogador.emprestimo ? (
        <View style={styles.acoes}>
          <Botao
            variante="perigo"
            icone="dinheiro"
            titulo="Vender jogador"
            onPress={handleVender}
          />
          <Botao
            variante="secundaria"
            icone="troca"
            titulo="Emprestar a outro clube"
            onPress={handleEmprestar}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function AtributoLinha({
  label,
  valor,
  progresso,
}: {
  label: string;
  valor: number;
  progresso: number;
}): React.JSX.Element {
  const cor = corOverall(valor);
  const pctProgresso = Math.max(0, Math.min(100, progresso));
  return (
    <View style={styles.atributoItem}>
      <View style={styles.atributoTopo}>
        <Text style={styles.atributoLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.atributoValorWrap}>
          {pctProgresso > 0 ? (
            <Text style={styles.atributoProgresso}>
              {pctProgresso.toFixed(0)}%
            </Text>
          ) : null}
          <Text style={[styles.atributoValor, {color: cor}]}>{valor}</Text>
        </View>
      </View>
      <View style={styles.atributoBarraFundo}>
        <View
          style={[
            styles.atributoBarra,
            {width: `${Math.min(100, valor)}%`, backgroundColor: cor},
          ]}
        />
      </View>
      {/* Barra fina de progresso de treino rumo ao próximo ponto. */}
      <View style={styles.atributoProgressoFundo}>
        <View
          style={[
            styles.atributoProgressoBarra,
            {width: `${pctProgresso}%`},
          ]}
        />
      </View>
    </View>
  );
}

export default PlayerDetail;

const styles = StyleSheet.create({
  cartaWrap: {
    alignItems: 'center',
    marginVertical: espaco.md,
  },
  radarWrap: {
    alignItems: 'center',
    paddingVertical: espaco.sm,
  },
  statusChip: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: raio.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.sm,
    marginBottom: espaco.lg,
    paddingHorizontal: espaco.lg,
    paddingVertical: espaco.sm,
  },
  statusTexto: {
    fontSize: 14,
    fontWeight: '800',
  },
  evoConteudo: {
    gap: espaco.md,
  },
  evoLinha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  evoTexto: {
    color: cores.textoSecundario,
    fontSize: 14,
  },
  evoForte: {
    color: cores.texto,
    fontWeight: '800',
  },
  tendenciaChip: {
    borderRadius: raio.pill,
    borderWidth: 1,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.xs,
  },
  tendenciaTexto: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: espaco.xs,
  },
  acoes: {
    gap: espaco.sm,
  },
  habilidadesWrap: {
    gap: espaco.sm,
  },
  habilidadeItem: {
    borderLeftWidth: 3,
    borderLeftColor: cores.primaria,
    borderRadius: raio.sm,
    backgroundColor: cores.superficieAlt,
    paddingHorizontal: espaco.md,
    paddingVertical: espaco.sm,
  },
  habilidadeRotulo: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  habilidadeDescricao: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  evoLegenda: {
    color: cores.textoSecundario,
    fontSize: 12,
  },
  disciplina: {
    flexDirection: 'row',
    gap: espaco.lg,
  },
  disciplinaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  disciplinaTexto: {
    color: cores.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  contratoTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: espaco.xs,
  },
  atributosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  atributoItem: {
    gap: espaco.xs,
    marginBottom: espaco.md,
    width: '48%',
  },
  atributoTopo: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  atributoLabel: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 13,
  },
  atributoValorWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.xs,
  },
  atributoProgresso: {
    color: cores.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
  },
  atributoValor: {
    fontSize: 14,
    fontWeight: '800',
  },
  atributosNota: {
    color: cores.textoSecundario,
    fontSize: 11,
    marginTop: espaco.xs,
  },
  focoChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.xs,
    marginTop: espaco.sm,
  },
  focoChip: {
    backgroundColor: cores.superficieAlt,
    borderColor: cores.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    paddingHorizontal: espaco.sm,
    paddingVertical: 6,
  },
  focoChipAtivo: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  focoChipTxt: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  focoChipTxtAtivo: {
    color: cores.superficie,
  },
  atributoProgressoFundo: {
    backgroundColor: cores.superficieAlt,
    borderRadius: 2,
    height: 3,
    marginTop: 2,
    overflow: 'hidden',
    width: '100%',
  },
  atributoProgressoBarra: {
    backgroundColor: cores.primaria,
    borderRadius: 2,
    height: '100%',
  },
  atributoBarraFundo: {
    backgroundColor: cores.superficieAlt,
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  atributoBarra: {
    borderRadius: 3,
    height: '100%',
  },
});
