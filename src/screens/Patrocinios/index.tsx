/**
 * Patrocínios (aba Clube) — sistema de contratos. Três abas: Propostas (comparar
 * e aceitar/recusar até 3), Contrato (patrocinador atual, próximo pagamento,
 * metas com progresso) e Histórico. Deriva tudo de `state.patrocinio` (engine
 * pura); os valores em dinheiro seguem o formato do resto do jogo.
 */
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Dialog,
  Divider,
  EmptyState,
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedTabs,
  Text,
  espacamento,
  useTheme,
} from '../../design-system';
import {LogoPatrocinador} from '../../components/Patrocinio/LogoPatrocinador';
import {nomePatrocinador, patrocinadorPorId} from '../../engine/patrocinio/catalogo';
import type {
  ContratoPatrocinio,
  MetaPatrocinio,
  PropostaPatrocinio,
} from '../../types/patrocinio';
import {useGameStore} from '../../store/useGameStore';
import {useVoltarOu} from '../../navigation/types';
import {moeda} from '../../utils/formatters';

type AbaPatrocinio = 'propostas' | 'contrato' | 'historico';

const ROTULO_ALCANCE: Record<string, string> = {
  REGIONAL: 'Regional',
  NACIONAL: 'Nacional',
  GLOBAL: 'Global',
};

function Patrocinios(): React.JSX.Element {
  const patrocinio = useGameStore(state => state.patrocinio);
  const aceitar = useGameStore(state => state.aceitarPropostaPatrocinioUsuario);
  const recusar = useGameStore(state => state.recusarPropostaPatrocinioUsuario);

  const [aba, setAba] = useState<AbaPatrocinio>(
    patrocinio.contratoAtivo ? 'contrato' : 'propostas',
  );
  // Confirma o aceite antes de trocar o estado (aceitar substitui o contrato).
  const [aceitando, setAceitando] = useState<PropostaPatrocinio | null>(null);

  const voltar = useVoltarOu('CentralClube');

  const propostas = useMemo(
    () => patrocinio.propostas.filter(p => p.status === 'PENDENTE'),
    [patrocinio.propostas],
  );

  const confirmarAceite = () => {
    if (aceitando) {
      aceitar(aceitando.id);
      setAba('contrato');
      setAceitando(null);
    }
  };

  return (
    <Screen scroll header={<AppHeader title="Patrocínios" onBack={voltar} />}>
      <SegmentedTabs
        abas={[
          {chave: 'propostas', rotulo: `Propostas${propostas.length ? ` (${propostas.length})` : ''}`},
          {chave: 'contrato', rotulo: 'Contrato'},
          {chave: 'historico', rotulo: 'Histórico'},
        ]}
        ativa={aba}
        onSelect={c => setAba(c as AbaPatrocinio)}
      />

      {aba === 'propostas' ? (
        <AbaPropostas
          propostas={propostas}
          temContrato={patrocinio.contratoAtivo !== null}
          onAceitar={setAceitando}
          onRecusar={recusar}
        />
      ) : aba === 'contrato' ? (
        <AbaContrato contrato={patrocinio.contratoAtivo} />
      ) : (
        <AbaHistorico historico={patrocinio.historico} />
      )}

      <Dialog
        visible={aceitando !== null}
        title="Assinar patrocínio?"
        message={
          aceitando
            ? `${nomePatrocinador(aceitando.patrocinadorId)} · ${moeda(aceitando.valorPorTemporada)}/temporada${
                patrocinio.contratoAtivo
                  ? '. Isto encerra seu contrato atual.'
                  : '.'
              }`
            : undefined
        }
        confirmLabel="Assinar"
        cancelLabel="Cancelar"
        onConfirm={confirmarAceite}
        onCancel={() => setAceitando(null)}
      />
    </Screen>
  );
}

// ── Aba Propostas ────────────────────────────────────────────────────────────

function AbaPropostas({
  propostas,
  temContrato,
  onAceitar,
  onRecusar,
}: {
  propostas: PropostaPatrocinio[];
  temContrato: boolean;
  onAceitar: (proposta: PropostaPatrocinio) => void;
  onRecusar: (id: string) => void;
}): React.JSX.Element {
  if (propostas.length === 0) {
    return (
      <View style={estilos.vazio}>
        <EmptyState
          icone="dinheiro"
          title="Sem propostas no momento"
          description="Novas propostas de patrocínio chegam no início de cada temporada."
        />
      </View>
    );
  }
  return (
    <View style={estilos.gap}>
      <Text variant="caption" color="textSecondary">
        {temContrato
          ? 'Aceitar uma proposta encerra seu contrato atual.'
          : 'Compare e escolha um patrocinador máster.'}
      </Text>
      {propostas.map(proposta => (
        <CardProposta
          key={proposta.id}
          proposta={proposta}
          onAceitar={() => onAceitar(proposta)}
          onRecusar={() => onRecusar(proposta.id)}
        />
      ))}
    </View>
  );
}

function CardProposta({
  proposta,
  onAceitar,
  onRecusar,
}: {
  proposta: PropostaPatrocinio;
  onAceitar: () => void;
  onRecusar: () => void;
}): React.JSX.Element {
  const patrocinador = patrocinadorPorId(proposta.patrocinadorId);
  return (
    <Card variante="outlined" style={estilos.cardGap}>
      <View style={estilos.topo}>
        <LogoPatrocinador patrocinadorId={proposta.patrocinadorId} tamanho={52} />
        <View style={estilos.flex}>
          <View style={estilos.tituloLinha}>
            <Text variant="titleM" numberOfLines={1} style={estilos.flex}>
              {nomePatrocinador(proposta.patrocinadorId)}
            </Text>
            {proposta.ehRenovacao ? (
              <Badge label="Renovação" tom="brand" />
            ) : null}
          </View>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {patrocinador?.categoria ?? ''}
            {patrocinador ? ` · ${ROTULO_ALCANCE[patrocinador.alcance]}` : ''}
          </Text>
        </View>
      </View>

      <Divider />
      <LinhaValor label="Por temporada" valor={moeda(proposta.valorPorTemporada)} destaque />
      <LinhaValor
        label="Duração"
        valor={`${proposta.duracaoTemporadas} ${proposta.duracaoTemporadas > 1 ? 'temporadas' : 'temporada'}`}
      />
      <LinhaValor label="Total do contrato" valor={moeda(proposta.valorFixoTotal)} />
      <LinhaValor label="Bônus por vitória" valor={moeda(proposta.bonusPorVitoria)} />

      {proposta.metas.length > 0 ? (
        <>
          <Divider />
          <Text variant="labelM" color="textSecondary" style={estilos.caps}>
            Metas
          </Text>
          {proposta.metas.map(meta => (
            <MetaResumo key={meta.id} meta={meta} />
          ))}
        </>
      ) : null}

      <View style={estilos.acoes}>
        <Button
          titulo="Recusar"
          variante="ghost"
          onPress={onRecusar}
          style={estilos.flex}
        />
        <Button
          titulo="Aceitar"
          variante="primary"
          icone="check"
          onPress={onAceitar}
          style={estilos.flex}
        />
      </View>
    </Card>
  );
}

function MetaResumo({meta}: {meta: MetaPatrocinio}): React.JSX.Element {
  return (
    <View style={estilos.metaLinha}>
      <Text variant="bodyM" style={estilos.flex} numberOfLines={2}>
        {meta.descricao}
      </Text>
      {meta.valorBonus > 0 ? (
        <Text variant="labelM" color="success" tabular>
          +{moeda(meta.valorBonus)}
        </Text>
      ) : (
        <Badge label="Obrigatória" tom="neutral" />
      )}
    </View>
  );
}

// ── Aba Contrato ─────────────────────────────────────────────────────────────

function AbaContrato({
  contrato,
}: {
  contrato: ContratoPatrocinio | null;
}): React.JSX.Element {
  const {cores} = useTheme();
  if (!contrato) {
    return (
      <View style={estilos.vazio}>
        <EmptyState
          icone="dinheiro"
          title="Sem patrocinador máster"
          description="Aceite uma proposta na aba Propostas para assinar um contrato."
        />
      </View>
    );
  }
  const restante = Math.max(0, contrato.valorFixoTotal - contrato.valorPago);
  const pctPago =
    contrato.valorFixoTotal > 0
      ? (contrato.valorPago / contrato.valorFixoTotal) * 100
      : 0;
  return (
    <View style={estilos.gap}>
      <Card style={estilos.cardGap}>
        <View style={estilos.topo}>
          <LogoPatrocinador patrocinadorId={contrato.patrocinadorId} tamanho={64} />
          <View style={estilos.flex}>
            <Text variant="titleL" numberOfLines={1}>
              {nomePatrocinador(contrato.patrocinadorId)}
            </Text>
            <Text variant="caption" color="textSecondary">
              Patrocínio máster · {contrato.temporadaInicio}–{contrato.temporadaFim}
            </Text>
          </View>
        </View>

        <Divider />
        <LinhaValor label="Por temporada" valor={moeda(contrato.valorPorTemporada)} destaque />
        <LinhaValor label="Bônus por vitória" valor={moeda(contrato.bonusPorVitoria)} />
        <LinhaValor label="Já recebido" valor={moeda(contrato.valorPago)} />
        <LinhaValor label="A receber" valor={moeda(restante)} />
        <ProgressBar valor={pctPago} cor={cores.brand} style={estilos.barra} />
      </Card>

      {contrato.metas.length > 0 ? (
        <Card variante="outlined" style={estilos.cardGap}>
          <SectionHeader titulo="Metas do contrato" />
          {contrato.metas.map(meta => (
            <MetaProgresso key={meta.id} meta={meta} />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

function MetaProgresso({meta}: {meta: MetaPatrocinio}): React.JSX.Element {
  const {cores, esporte} = useTheme();
  const pct =
    meta.alvo > 0 ? Math.min(100, (meta.progresso / meta.alvo) * 100) : meta.concluida ? 100 : 0;
  return (
    <View style={estilos.metaBloco}>
      <View style={estilos.metaLinha}>
        <Text variant="bodyM" style={estilos.flex} numberOfLines={2}>
          {meta.descricao}
        </Text>
        {meta.concluida ? (
          <Badge label="Cumprida" tom="success" />
        ) : meta.valorBonus > 0 ? (
          <Text variant="labelM" color="success" tabular>
            +{moeda(meta.valorBonus)}
          </Text>
        ) : (
          <Badge label="Obrigatória" tom="neutral" />
        )}
      </View>
      <ProgressBar
        valor={pct}
        cor={meta.concluida ? esporte.fitness.high : cores.brand}
        style={estilos.barraMeta}
      />
    </View>
  );
}

// ── Aba Histórico ────────────────────────────────────────────────────────────

function AbaHistorico({
  historico,
}: {
  historico: readonly ContratoPatrocinio[];
}): React.JSX.Element {
  if (historico.length === 0) {
    return (
      <View style={estilos.vazio}>
        <EmptyState
          icone="dinheiro"
          title="Sem histórico"
          description="Contratos de patrocínio já encerrados aparecem aqui."
        />
      </View>
    );
  }
  return (
    <Card variante="outlined" padding={0} style={estilos.lista}>
      {historico.map((contrato, i) => (
        <React.Fragment key={contrato.id}>
          {i > 0 ? <Divider /> : null}
          <View style={estilos.linhaHist}>
            <LogoPatrocinador patrocinadorId={contrato.patrocinadorId} tamanho={40} />
            <View style={estilos.flex}>
              <Text variant="labelL" numberOfLines={1}>
                {nomePatrocinador(contrato.patrocinadorId)}
              </Text>
              <Text variant="caption" color="textMuted">
                {contrato.temporadaInicio}–{contrato.temporadaFim} ·{' '}
                {contrato.status === 'CONCLUIDO' ? 'Concluído' : 'Rescindido'}
              </Text>
            </View>
            <Text variant="labelM" color="textSecondary" tabular>
              {moeda(contrato.valorPago)}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </Card>
  );
}

// ── Compartilhado ────────────────────────────────────────────────────────────

function LinhaValor({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}): React.JSX.Element {
  return (
    <View style={estilos.linhaVal}>
      <Text variant="bodyM" color="textSecondary" style={estilos.flex}>
        {label}
      </Text>
      <Text
        variant={destaque ? 'titleM' : 'labelL'}
        color={destaque ? 'brand' : 'textPrimary'}
        tabular
        numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

export default Patrocinios;

const estilos = StyleSheet.create({
  flex: {flex: 1},
  gap: {gap: espacamento[3]},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  cardGap: {gap: espacamento[2]},
  topo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  tituloLinha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[2]},
  linhaVal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 32,
  },
  acoes: {flexDirection: 'row', gap: espacamento[2], marginTop: espacamento[1]},
  metaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 28,
  },
  metaBloco: {gap: espacamento[1], paddingVertical: espacamento[1]},
  barra: {marginTop: espacamento[1]},
  barraMeta: {height: 5},
  lista: {paddingHorizontal: espacamento[3]},
  linhaHist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[3],
    minHeight: 56,
    paddingVertical: espacamento[1],
  },
});
