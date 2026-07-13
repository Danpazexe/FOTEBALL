/**
 * Patrocínios (aba Clube). Mostra os patrocinadores REAIS do clube
 * (`financas.patrocinadores`): pagamento mensal, bônus por vitória e validade do
 * contrato. O primeiro é o principal. DS v2.
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {
  AppHeader,
  Card,
  Divider,
  EmptyState,
  Icon,
  Screen,
  SectionHeader,
  Text,
  espacamento,
  raios,
  useTheme,
} from '../../design-system';
import {selecionarClubeUsuario, useGameStore} from '../../store/useGameStore';
import {useClubeNavigation} from '../../navigation/types';
import {moeda} from '../../utils/formatters';
import type {Patrocinio} from '../../types';

function Patrocinios(): React.JSX.Element {
  const nav = useClubeNavigation();
  const clube = useGameStore(selecionarClubeUsuario);

  const voltar = () =>
    nav.canGoBack() ? nav.goBack() : nav.navigate('CentralClube');

  const patrocinadores = clube?.financas.patrocinadores ?? [];
  const [principal, ...demais] = patrocinadores;

  return (
    <Screen scroll header={<AppHeader title="Patrocínios" onBack={voltar} />}>
      {patrocinadores.length === 0 ? (
        <View style={styles.vazio}>
          <EmptyState
            icone="dinheiro"
            title="Nenhum patrocinador"
            description="Os contratos de patrocínio do clube aparecem aqui."
          />
        </View>
      ) : (
        <>
          <Text variant="labelM" color="textSecondary" style={styles.caps}>
            Patrocinador principal
          </Text>
          {principal ? (
            <CardPatrocinio patrocinio={principal} principal />
          ) : null}

          {demais.length > 0 ? (
            <>
              <SectionHeader titulo="Outros patrocinadores" />
              <Card variante="outlined" padding={0} style={styles.lista}>
                {demais.map((p, i) => (
                  <React.Fragment key={p.nome}>
                    {i > 0 ? <Divider /> : null}
                    <View style={styles.linha}>
                      <Text variant="labelL" style={styles.flex} numberOfLines={1}>
                        {p.nome}
                      </Text>
                      <Text variant="labelL" color="brand" tabular>
                        {moeda(p.valorMensal)}
                        <Text variant="caption" color="textMuted">
                          {' '}
                          /mês
                        </Text>
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function CardPatrocinio({
  patrocinio,
  principal,
}: {
  patrocinio: Patrocinio;
  principal?: boolean;
}): React.JSX.Element {
  const {cores} = useTheme();
  return (
    <Card variante="outlined" style={styles.cardGap}>
      <View style={styles.topo}>
        <View style={[styles.logo, {backgroundColor: cores.brandSoft}]}>
          <Icon nome="dinheiro" size="md" color="brand" />
        </View>
        <View style={styles.flex}>
          <Text variant="titleL" numberOfLines={1}>
            {patrocinio.nome}
          </Text>
          {principal ? (
            <Text variant="caption" color="textSecondary">
              Patrocínio máster
            </Text>
          ) : null}
        </View>
      </View>
      <Divider />
      <Linha label="Pagamento fixo" valor={`${moeda(patrocinio.valorMensal)}/mês`} />
      <Linha
        label="Bônus por vitória"
        valor={moeda(patrocinio.bonusPorVitoria)}
      />
      <Linha label="Contrato até" valor={patrocinio.ativoAte} />
    </Card>
  );
}

function Linha({label, valor}: {label: string; valor: string}): React.JSX.Element {
  return (
    <View style={styles.linhaVal}>
      <Text variant="bodyM" color="textSecondary" style={styles.flex}>
        {label}
      </Text>
      <Text variant="labelL" tabular numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

export default Patrocinios;

const styles = StyleSheet.create({
  flex: {flex: 1},
  vazio: {flex: 1, justifyContent: 'center', paddingVertical: espacamento[8]},
  caps: {textTransform: 'uppercase', letterSpacing: 1},
  cardGap: {gap: espacamento[2]},
  topo: {flexDirection: 'row', alignItems: 'center', gap: espacamento[3]},
  logo: {
    width: 44,
    height: 44,
    borderRadius: raios.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaVal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 32,
  },
  lista: {paddingHorizontal: espacamento[3]},
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacamento[2],
    minHeight: 48,
  },
});
