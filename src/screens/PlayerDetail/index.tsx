/**
 * Detalhe do jogador: carta (FIFA) + status, evolução, habilidades, finanças,
 * estatísticas, radar, atributos e ações. Migrado ao Design System v2.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useRoute, type RouteProp} from '@react-navigation/native';

import CartaJogador from '../../components/CartaJogador';
import AttributeRadar from '../../components/AttributeRadar';
import OverallBadge from '../../components/OverallBadge';
import StatBar from '../../components/StatBar';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  Icon,
  Screen,
  StatValue,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {useConfirm, useToast} from '../../components/feedback';
import {corOverall} from '../../theme';
import {moeda, nomeClube} from '../../utils/formatters';
import {HABILIDADES} from '../../engine/progression/habilidades';
import {precoVenda, useGameStore} from '../../store/useGameStore';
import {useAppNavigation, type RootStackParamList} from '../../navigation/types';
import type {Player, PlayerAttributes, TipoJogador} from '../../types';

type Tom = 'brand' | 'accent' | 'neutral' | 'success' | 'danger';

const TIPO_LABEL: Partial<Record<TipoJogador, {rotulo: string; tom: Tom}>> = {
  NOVATO: {rotulo: 'Novato', tom: 'accent'},
  VETERANO: {rotulo: 'Veterano', tom: 'neutral'},
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

function statusJogador(j: Player): {rotulo: string; tom: CorTexto; icone: IconeNome} {
  if (j.lesionado) {
    return {rotulo: `Lesionado · ${j.diasLesao} dia(s)`, tom: 'danger', icone: 'lesao'};
  }
  if (j.suspenso) {
    return {rotulo: `Suspenso · ${j.jogosSuspensao} jogo(s)`, tom: 'danger', icone: 'cartao'};
  }
  return {rotulo: 'Disponível', tom: 'success', icone: 'check'};
}

function tendenciaJogador(j: Player): {rotulo: string; tom: Tom} {
  const margem = j.potencial - j.overall;
  if (j.idade <= 21 && margem >= 1) {
    return {rotulo: 'Jovem promessa', tom: 'brand'};
  }
  if (margem >= 3 && j.idade <= 28) {
    return {rotulo: 'Em evolução', tom: 'brand'};
  }
  if (j.idade >= 32) {
    return {rotulo: 'Veterano', tom: 'accent'};
  }
  if (margem <= 0) {
    return {rotulo: 'No auge', tom: 'accent'};
  }
  return {rotulo: 'Estável', tom: 'neutral'};
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
  const definirCapitao = useGameStore(state => state.definirCapitao);
  const confirmarAcoes = useGameStore(state => state.config.confirmarAcoes);
  const confirm = useConfirm();
  const toast = useToast();

  if (!jogador) {
    return (
      <Screen scroll>
        <AppBar title="Jogador" onBack={() => nav.goBack()} />
        <Text variant="bodyM" color="textSecondary">
          Jogador não encontrado.
        </Text>
      </Screen>
    );
  }

  const est = jogador.estatisticasTemporada;
  const status = statusJogador(jogador);
  const tendencia = tendenciaJogador(jogador);
  const tipoInfo = jogador.tipo ? TIPO_LABEL[jogador.tipo] : undefined;
  const doClubeUsuario =
    clubeUsuarioId !== null && jogador.clubeId === clubeUsuarioId;
  const clubeDoUsuario = clubes.find(clube => clube.id === clubeUsuarioId);
  const ehCapitao = clubeDoUsuario?.capitaoId === jogador.id;

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
    <Screen scroll>
      <AppBar
        title={jogador.nome}
        subtitle={`${jogador.posicaoPrincipal} · ${jogador.idade} anos · ${jogador.nacionalidade}`}
        onBack={() => nav.goBack()}
        right={<OverallBadge overall={jogador.overall} />}
      />

      <View style={styles.cartaWrap}>
        <CartaJogador jogador={jogador} />
      </View>

      <StatusChip tom={status.tom} icone={status.icone} rotulo={status.rotulo} />
      {jogador.emprestimo ? (
        <StatusChip
          tom="accent"
          icone="troca"
          rotulo={
            jogador.emprestimo.clubeDonoId === clubeUsuarioId
              ? `Emprestado a ${nomeClube(clubes, jogador.clubeId ?? '')} · volta ${jogador.emprestimo.retornaEmTemporada}`
              : `Emprestado de ${nomeClube(clubes, jogador.emprestimo.clubeDonoId)} · volta ${jogador.emprestimo.retornaEmTemporada}`
          }
        />
      ) : null}

      <Secao titulo="Evolução">
        <Card variante="outlined" style={styles.cardGap}>
          <View style={styles.evoLinha}>
            <Text variant="bodyM" color="textSecondary">
              Overall{' '}
              <Text variant="bodyM" color="textPrimary" weight="800">
                {jogador.overall}
              </Text>{' '}
              · Potencial{' '}
              <Text variant="bodyM" color="textPrimary" weight="800">
                {jogador.potencial}
              </Text>
            </Text>
            <View style={styles.chipsRow}>
              {tipoInfo ? (
                <Badge label={tipoInfo.rotulo} tom={tipoInfo.tom} />
              ) : null}
              <Badge label={tendencia.rotulo} tom={tendencia.tom} />
            </View>
          </View>
          <StatBar
            valor={jogador.overall}
            max={jogador.potencial}
            cor={corOverall(jogador.overall)}
            mostrarValor={false}
          />
          <Text variant="caption" color="textSecondary">
            {jogador.potencial > jogador.overall
              ? `Pode evoluir até ${jogador.potencial}.`
              : 'Já atingiu o teto de evolução.'}
          </Text>
        </Card>
      </Secao>

      {(jogador.habilidades ?? []).length > 0 ? (
        <Secao titulo="Habilidades">
          <View style={styles.cardGap}>
            {(jogador.habilidades ?? []).map(hab => (
              <Card key={hab} variante="status" status="brand" padding={3}>
                <Text variant="titleM">{HABILIDADES[hab].rotulo}</Text>
                <Text variant="caption" color="textSecondary">
                  {HABILIDADES[hab].descricao}
                </Text>
              </Card>
            ))}
          </View>
        </Secao>
      ) : null}

      <View style={styles.metricsRow}>
        <StatValue label="Valor" value={moeda(jogador.valorMercado)} style={styles.flex} />
        <StatValue label="Salário" value={moeda(jogador.salario)} style={styles.flex} />
      </View>
      <View style={styles.metricsRow}>
        <StatValue label="Condição" value={`${jogador.condicaoFisica}%`} style={styles.flex} />
        <StatValue label="Moral" value={`${jogador.moral}`} style={styles.flex} />
        <StatValue label="Forma" value={`${jogador.forma}`} style={styles.flex} />
      </View>

      <Secao titulo="Temporada">
        <View style={styles.metricsRow}>
          <StatValue label="Jogos" value={`${est.jogos}`} style={styles.flex} />
          <StatValue label="Gols" value={`${est.gols}`} style={styles.flex} />
          <StatValue label="Assist." value={`${est.assistencias}`} style={styles.flex} />
          <StatValue label="Nota" value={est.notaMedia.toFixed(1)} style={styles.flex} />
        </View>
        <View style={styles.disciplina}>
          <View style={styles.disciplinaItem}>
            <Icon nome="cartao" size={15} color="accent" />
            <Text variant="bodyM">{est.cartoesAmarelos} amarelo(s)</Text>
          </View>
          <View style={styles.disciplinaItem}>
            <Icon nome="cartao" size={15} color="danger" />
            <Text variant="bodyM">{est.cartoesVermelhos} vermelho(s)</Text>
          </View>
        </View>
        <Text variant="caption" color="textSecondary">
          Contrato até {jogador.contratoAte} · Perna {jogador.pernaDominante}
        </Text>
      </Secao>

      <Secao titulo="Radar de atributos">
        <Card variante="outlined" style={styles.radarWrap}>
          <AttributeRadar jogador={jogador} />
        </Card>
      </Secao>

      <Secao titulo="Atributos">
        <Card variante="outlined">
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
          <Text variant="caption" color="textSecondary" style={styles.nota}>
            A barra fina mostra o progresso no treino rumo ao próximo ponto.
          </Text>
        </Card>
      </Secao>

      {doClubeUsuario ? (
        <Secao titulo="Liderança">
          <Card variante="outlined">
            {ehCapitao ? (
              <View style={styles.capitaoRow}>
                <Icon nome="medalha" size={18} color="accent" />
                <Text variant="titleM">Capitão do time</Text>
              </View>
            ) : (
              <Button
                variante="secondary"
                icone="medalha"
                titulo="Tornar capitão"
                onPress={() => {
                  definirCapitao(jogador.id);
                  toast(
                    `${jogador.apelido ?? jogador.nome} é o novo capitão.`,
                    'sucesso',
                  );
                }}
                fullWidth
              />
            )}
          </Card>
        </Secao>
      ) : null}

      {doClubeUsuario ? (
        <Secao titulo="Foco de treino">
          <Card variante="outlined" style={styles.cardGap}>
            <Text variant="caption" color="textSecondary">
              O atributo em foco evolui mais rápido nos treinos (limitado ao
              potencial).
            </Text>
            <View style={styles.focoChips}>
              <Chip
                label="Nenhum"
                selected={!jogador.focoTreino}
                onPress={() => definirFocoTreino(jogador.id, null)}
              />
              {ATRIBUTOS.map(attr => (
                <Chip
                  key={attr.chave}
                  label={attr.label}
                  selected={jogador.focoTreino === attr.chave}
                  onPress={() => definirFocoTreino(jogador.id, attr.chave)}
                />
              ))}
            </View>
          </Card>
        </Secao>
      ) : null}

      {doClubeUsuario && !jogador.emprestimo ? (
        <View style={styles.acoes}>
          <Button
            variante="danger"
            icone="dinheiro"
            titulo="Vender jogador"
            onPress={handleVender}
            fullWidth
          />
          <Button
            variante="secondary"
            icone="troca"
            titulo="Emprestar a outro clube"
            onPress={handleEmprestar}
            fullWidth
          />
        </View>
      ) : null}
    </Screen>
  );
}

function StatusChip({
  tom,
  icone,
  rotulo,
}: {
  tom: CorTexto;
  icone: IconeNome;
  rotulo: string;
}): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <View style={[styles.statusChip, {borderColor: cores[tom]}]}>
      <Icon nome={icone} size={16} color={tom} />
      <Text variant="labelL" color={tom}>
        {rotulo}
      </Text>
    </View>
  );
}

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.secao}>
      <Text variant="labelM" color="textSecondary" style={styles.caps}>
        {titulo}
      </Text>
      {children}
    </View>
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
  const {cores} = useTheme();
  const cor = corOverall(valor);
  const pctProgresso = Math.max(0, Math.min(100, progresso));
  return (
    <View style={styles.atributoItem}>
      <View style={styles.atributoTopo}>
        <Text variant="bodyM" color="textSecondary" numberOfLines={1} style={styles.flex}>
          {label}
        </Text>
        <View style={styles.atributoValorWrap}>
          {pctProgresso > 0 ? (
            <Text variant="caption" color="textSecondary">
              {pctProgresso.toFixed(0)}%
            </Text>
          ) : null}
          <Text variant="labelL" style={{color: cor}}>
            {valor}
          </Text>
        </View>
      </View>
      <View style={[styles.atributoBarraFundo, {backgroundColor: cores.surfaceSubtle}]}>
        <View
          style={[
            styles.atributoBarra,
            {width: `${Math.min(100, valor)}%`, backgroundColor: cor},
          ]}
        />
      </View>
      <View
        style={[styles.atributoProgressoFundo, {backgroundColor: cores.surfaceSubtle}]}>
        <View
          style={[
            styles.atributoProgressoBarra,
            {width: `${pctProgresso}%`, backgroundColor: cores.brand},
          ]}
        />
      </View>
    </View>
  );
}

export default PlayerDetail;

const styles = StyleSheet.create({
  flex: {flex: 1},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  cartaWrap: {alignItems: 'center', marginVertical: espacamento[2]},
  radarWrap: {alignItems: 'center'},
  statusChip: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    borderWidth: 1,
    borderRadius: raios.full,
    paddingHorizontal: espacamento[4],
    paddingVertical: espacamento[2],
  },
  secao: {gap: espacamento[2]},
  cardGap: {gap: espacamento[2]},
  evoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espacamento[2],
  },
  chipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[1]},
  metricsRow: {flexDirection: 'row', gap: espacamento[2]},
  disciplina: {flexDirection: 'row', gap: espacamento[4]},
  disciplinaItem: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  atributosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  atributoItem: {width: '48%', gap: espacamento[1], marginBottom: espacamento[2]},
  atributoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atributoValorWrap: {flexDirection: 'row', alignItems: 'center', gap: espacamento[1]},
  atributoBarraFundo: {height: 6, borderRadius: 3, overflow: 'hidden'},
  atributoBarra: {height: '100%', borderRadius: 3},
  atributoProgressoFundo: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  atributoProgressoBarra: {height: '100%', borderRadius: 2},
  nota: {marginTop: espacamento[1]},
  capitaoRow: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  focoChips: {flexDirection: 'row', flexWrap: 'wrap', gap: espacamento[1]},
  acoes: {gap: espacamento[2]},
});
