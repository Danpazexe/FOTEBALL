/**
 * Pendências do clube — hub de tarefas pendentes da carreira. Filtro por
 * prioridade (chips com contagem), lista ordenada alta>média>baixa e um CTA
 * "RESOLVER AGORA" que leva à pendência mais urgente visível. Dado REAL da
 * store (s.pendencias); nada é inventado. DS v2, cor por token.
 */
import React, {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Icon,
  Screen,
  Text,
  espacamento,
  raios,
  useTheme,
  type CorTexto,
} from '../../design-system';
import type {IconeNome} from '../../components/Icone';
import {useAppNavigation} from '../../navigation/types';
import {useGameStore} from '../../store/useGameStore';
import type {PendenciaCarreira, TipoPendencia} from '../../types';

// ─── Tipos locais ────────────────────────────────────────────────────────────
type Prioridade = PendenciaCarreira['prioridade'];
type Filtro = 'todas' | Prioridade;
type BadgeTom = 'neutral' | 'brand' | 'accent' | 'info' | 'success' | 'danger';
type ChipTom = 'neutral' | 'brand' | 'accent' | 'info' | 'danger';

// Ordem de urgência (menor = mais urgente).
const ORDEM: Record<Prioridade, number> = {alta: 0, media: 1, baixa: 2};

// Ícone semântico por tipo de pendência (fallback: sino).
function iconeDoTipo(tipo: TipoPendencia): IconeNome {
  switch (tipo) {
    case 'definir_plano_treino':
      return 'ficha';
    case 'proposta_expirando':
      return 'dinheiro';
    case 'retorno_lesao':
      return 'lesao';
    case 'contrato_critico':
      return 'ficha';
    case 'escalacao_invalida':
      return 'tabela';
    case 'risco_medico':
      return 'lesao';
    case 'decisao_diretoria':
      return 'conversa';
    default:
      return 'sino';
  }
}

// Chips de filtro (rótulo + tom de cor).
const CHIPS: ReadonlyArray<{chave: Filtro; rotulo: string; tom: ChipTom}> = [
  {chave: 'todas', rotulo: 'Todas', tom: 'brand'},
  {chave: 'alta', rotulo: 'Alta', tom: 'danger'},
  {chave: 'media', rotulo: 'Média', tom: 'accent'},
  {chave: 'baixa', rotulo: 'Baixa', tom: 'neutral'},
];

export default function PendenciasClube(): React.JSX.Element {
  const {cores} = useTheme();
  const nav = useAppNavigation();
  const pendencias = useGameStore(s => s.pendencias);
  const [filtro, setFiltro] = useState<Filtro>('todas');

  // Aparência por prioridade (badge, filete do card e tinta do ícone).
  const META: Record<
    Prioridade,
    {rotulo: string; badge: BadgeTom; texto: CorTexto; status: CorTexto; soft: string}
  > = {
    alta: {rotulo: 'Alta', badge: 'danger', texto: 'danger', status: 'danger', soft: cores.dangerSoft},
    media: {rotulo: 'Média', badge: 'accent', texto: 'accent', status: 'warning', soft: cores.accentSoft},
    baixa: {rotulo: 'Baixa', badge: 'neutral', texto: 'textMuted', status: 'border', soft: cores.surfaceSubtle},
  };

  // Contagem por prioridade (para os chips).
  const contagem = useMemo(
    () => ({
      todas: pendencias.length,
      alta: pendencias.filter(p => p.prioridade === 'alta').length,
      media: pendencias.filter(p => p.prioridade === 'media').length,
      baixa: pendencias.filter(p => p.prioridade === 'baixa').length,
    }),
    [pendencias],
  );

  // Lista filtrada + ordenada por urgência (não muta a store).
  const ordenadas = useMemo(() => {
    const base =
      filtro === 'todas' ? pendencias : pendencias.filter(p => p.prioridade === filtro);
    return [...base].sort((a, b) => ORDEM[a.prioridade] - ORDEM[b.prioridade]);
  }, [pendencias, filtro]);

  const prioritaria = ordenadas[0];

  // Mapeia o tipo para a rota. Defensivo: rota indisponível não quebra a tela.
  const resolver = useCallback(
    (tipo: TipoPendencia) => {
      try {
        switch (tipo) {
          case 'definir_plano_treino':
            nav.navigate('Semana');
            break;
          case 'proposta_expirando':
            nav.navigate('MainTabs', {screen: 'TransferMarket'});
            break;
          case 'retorno_lesao':
          case 'risco_medico':
            nav.navigate('MainTabs', {
              screen: 'Elenco',
              params: {screen: 'DepartamentoMedico'},
            });
            break;
          default:
            // contrato_critico / escalacao_invalida / decisao_diretoria: sem rota mapeada.
            break;
        }
      } catch {
        // Rota exige contexto ausente — mantém o usuário na tela (fallback seguro).
      }
    },
    [nav],
  );

  return (
    <Screen header={<AppHeader title="Pendências do clube" onBack={() => nav.goBack()} />}>
      <View style={estilos.corpo}>
        {/* Filtros por prioridade com contagem */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.filtros}>
          {/* Só mostra um filtro de prioridade se houver pendências nele; "Todas"
              é sempre visível. Evita o beco sem saída do chip "Baixa 0". */}
          {CHIPS.filter(
            c => c.chave === 'todas' || contagem[c.chave] > 0,
          ).map(c => (
            <Chip
              key={c.chave}
              label={`${c.rotulo} ${contagem[c.chave]}`}
              tom={c.tom}
              selected={filtro === c.chave}
              onPress={() => setFiltro(c.chave)}
            />
          ))}
        </ScrollView>

        {/* Lista de pendências ou estado vazio */}
        {ordenadas.length === 0 ? (
          <View style={estilos.vazio}>
            {pendencias.length === 0 ? (
              <EmptyState
                title="Tudo em dia"
                description="Nenhuma pendência do clube no momento."
                icone="check"
              />
            ) : (
              <EmptyState
                title="Nada neste filtro"
                description="Ajuste o filtro para ver outras pendências."
                icone="olho"
                actionLabel="Ver todas"
                onAction={() => setFiltro('todas')}
              />
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={estilos.lista} showsVerticalScrollIndicator={false}>
            {ordenadas.map(p => {
              const meta = META[p.prioridade];
              return (
                <Card
                  key={p.id}
                  variante="interactive"
                  onPress={() => resolver(p.tipo)}
                  accessibilityLabel={`${meta.rotulo}: ${p.titulo}`}
                  style={[estilos.card, {borderLeftColor: cores[meta.status]}]}>
                  <View style={estilos.linha}>
                    <View style={[estilos.iconeWrap, {backgroundColor: meta.soft}]}>
                      <Icon nome={iconeDoTipo(p.tipo)} size="md" color={meta.texto} />
                    </View>

                    <View style={estilos.texto}>
                      <Text variant="labelL" numberOfLines={1}>
                        {p.titulo}
                      </Text>
                      {p.descricao ? (
                        <Text variant="bodyM" color="textSecondary" numberOfLines={2}>
                          {p.descricao}
                        </Text>
                      ) : null}
                    </View>

                    <Badge label={meta.rotulo} tom={meta.badge} />
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* CTA para a pendência mais urgente visível */}
      {prioritaria ? (
        <View style={[estilos.rodape, {borderTopColor: cores.border, backgroundColor: cores.surface}]}>
          <Button
            titulo="RESOLVER AGORA"
            onPress={() => resolver(prioritaria.tipo)}
            fullWidth
            tamanho="lg"
            icone="avancar"
          />
        </View>
      ) : null}
    </Screen>
  );
}

const estilos = StyleSheet.create({
  corpo: {flex: 1, gap: espacamento[3]},
  filtros: {gap: espacamento[2], paddingRight: espacamento[2]},
  lista: {gap: espacamento[3], paddingBottom: espacamento[4]},
  vazio: {flex: 1, justifyContent: 'center'},
  card: {borderLeftWidth: 3},
  linha: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  iconeWrap: {
    width: 40,
    height: 40,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {flex: 1, gap: espacamento[1]},
  rodape: {
    paddingHorizontal: espacamento[4],
    paddingTop: espacamento[3],
    paddingBottom: espacamento[4],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
