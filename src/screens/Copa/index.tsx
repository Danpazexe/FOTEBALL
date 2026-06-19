/**
 * Copa do Brasil — tela de chaveamento (bracket).
 *
 * Mostra todas as fases e confrontos (com escudo, placar e vencedor), destacando
 * o clube do usuário. Quando o usuário tem um confronto em aberto na fase atual,
 * oferece jogar ao vivo ou simular; eliminado, pode só avançar a chave (IA).
 */

import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';

import {AppHeader, Botao, ScreenContainer, Section, TextoVazio} from '../../components/ui';
import Escudo from '../../components/Escudo';
import Icone from '../../components/Icone';
import {LOGO_COPA} from '../../assets/escudos';
import {useToast} from '../../components/feedback';
import {
  confrontoDoClube,
  type ConfrontoCopa,
} from '../../engine/season/copaEngine';
import {useAppNavigation} from '../../navigation/types';
import {selecionarCopaNaVez, useGameStore} from '../../store/useGameStore';
import {cores, espaco, raio} from '../../theme';
import {formatarDataCurta} from '../../utils/datas';
import {nomeClube, siglaClube} from '../../utils/formatters';
import type {Clube} from '../../types';

function Copa(): React.JSX.Element {
  const nav = useAppNavigation();
  const toast = useToast();
  const copa = useGameStore(state => state.copa);
  const todosClubes = useGameStore(state => state.todosClubes);
  const clubeUsuarioId = useGameStore(state => state.clubeUsuarioId);
  const avancarFaseCopa = useGameStore(state => state.avancarFaseCopa);
  const avancarParaData = useGameStore(state => state.avancarParaData);
  const copaNaVez = useGameStore(selecionarCopaNaVez);

  if (!copa) {
    return (
      <ScreenContainer>
        <AppHeader titulo="Copa do Brasil" onBack={() => nav.goBack()} />
        <TextoVazio>Nenhuma Copa em andamento.</TextoVazio>
      </ScreenContainer>
    );
  }

  const meuConfronto = confrontoDoClube(copa, clubeUsuarioId);
  const faseAtual = copa.fases[copa.faseAtual];
  const eliminado = !copa.campeao && !meuConfronto;

  // Avança o calendário até o dia do confronto (joga-se na data certa).
  const irParaODiaDoJogo = () => {
    if (faseAtual.data) {
      avancarParaData(faseAtual.data);
    }
  };
  const jogarAoVivo = () => {
    irParaODiaDoJogo();
    nav.navigate('MatchSimulation', {copa: true});
  };
  const simularConfronto = () => {
    irParaODiaDoJogo();
    avancarFaseCopa();
    toast('Confronto da Copa disputado.', 'sucesso');
  };
  // Quando eliminado, o usuário só acompanha — pode avançar a chave da IA.
  const avancarChave = () => {
    avancarFaseCopa();
    toast('Fase da Copa disputada.', 'sucesso');
  };

  return (
    <ScreenContainer scroll>
      <AppHeader
        titulo="Copa do Brasil"
        subtitulo={
          copa.campeao
            ? 'Competição encerrada'
            : `${faseAtual.nome} · ${copa.temporada}`
        }
        onBack={() => nav.goBack()}
      />

      <Image source={LOGO_COPA} style={styles.logo} resizeMode="contain" />

      {copa.campeao ? (
        <View style={styles.campeaoCard}>
          <Icone nome="trofeu" tamanho={28} cor={cores.secundaria} />
          <Text style={styles.campeaoTexto}>
            Campeão: {nomeClube(todosClubes, copa.campeao)}
          </Text>
        </View>
      ) : meuConfronto ? (
        <Section titulo={`Seu confronto · ${faseAtual.nome}`}>
          <Text style={styles.confrontoDestaque}>
            {nomeClube(todosClubes, meuConfronto.timeA)} x{' '}
            {nomeClube(todosClubes, meuConfronto.timeB)}
          </Text>
          {copaNaVez ? (
            <View style={styles.acoes}>
              <View style={styles.acaoFlex}>
                <Botao icone="jogar" titulo="Jogar ao vivo" onPress={jogarAoVivo} />
              </View>
              <View style={styles.acaoFlex}>
                <Botao
                  variante="secundaria"
                  icone="simular"
                  titulo="Simular"
                  onPress={simularConfronto}
                />
              </View>
            </View>
          ) : (
            <View style={styles.aguardando}>
              <Icone nome="relogio" tamanho={15} cor={cores.secundaria} />
              <Text style={styles.aguardandoTexto}>
                Disponível em {formatarDataCurta(faseAtual.data)} — dispute as
                rodadas da liga até a data do jogo.
              </Text>
            </View>
          )}
        </Section>
      ) : eliminado ? (
        <Section titulo="Você está fora">
          <Text style={styles.eliminadoTexto}>
            Seu clube foi eliminado. Acompanhe o restante da chave.
          </Text>
          <Botao
            variante="secundaria"
            icone="simular"
            titulo="Avançar fase"
            onPress={avancarChave}
          />
        </Section>
      ) : null}

      {[...copa.fases].reverse().map(fase => (
        <Section key={fase.nome} titulo={fase.nome}>
          <View style={styles.lista}>
            {fase.confrontos.map(confronto => (
              <ConfrontoRow
                key={confronto.id}
                confronto={confronto}
                clubes={todosClubes}
                clubeUsuarioId={clubeUsuarioId}
              />
            ))}
          </View>
        </Section>
      ))}
    </ScreenContainer>
  );
}

function LadoConfronto({
  clubeId,
  clubes,
  gols,
  vencedor,
  destaque,
}: {
  clubeId: string;
  clubes: Clube[];
  gols?: number;
  vencedor: boolean;
  destaque: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.lado}>
      <Escudo clubeId={clubeId} sigla={siglaClube(clubes, clubeId)} tamanho={20} />
      <Text
        style={[
          styles.ladoNome,
          vencedor ? styles.vencedor : null,
          destaque ? styles.destaque : null,
        ]}
        numberOfLines={1}>
        {nomeClube(clubes, clubeId)}
      </Text>
      <Text style={[styles.gols, vencedor ? styles.vencedor : null]}>
        {gols ?? '–'}
      </Text>
    </View>
  );
}

function ConfrontoRow({
  confronto,
  clubes,
  clubeUsuarioId,
}: {
  confronto: ConfrontoCopa;
  clubes: Clube[];
  clubeUsuarioId: string | null;
}): React.JSX.Element {
  const envolveUsuario =
    !!clubeUsuarioId &&
    (confronto.timeA === clubeUsuarioId || confronto.timeB === clubeUsuarioId);
  return (
    <View style={[styles.confronto, envolveUsuario ? styles.confrontoUsuario : null]}>
      <LadoConfronto
        clubeId={confronto.timeA}
        clubes={clubes}
        gols={confronto.golsA}
        vencedor={confronto.vencedor === confronto.timeA}
        destaque={confronto.timeA === clubeUsuarioId}
      />
      <LadoConfronto
        clubeId={confronto.timeB}
        clubes={clubes}
        gols={confronto.golsB}
        vencedor={confronto.vencedor === confronto.timeB}
        destaque={confronto.timeB === clubeUsuarioId}
      />
      {confronto.vencedorPenaltis ? (
        <Text style={styles.penaltis}>
          Pênaltis: {siglaClube(clubes, confronto.vencedorPenaltis)}
        </Text>
      ) : null}
    </View>
  );
}

export default Copa;

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
    height: 90,
    marginBottom: espaco.md,
    width: '70%',
  },
  campeaoCard: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.md,
    flexDirection: 'row',
    gap: espaco.sm,
    justifyContent: 'center',
    marginBottom: espaco.lg,
    padding: espaco.lg,
  },
  campeaoTexto: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '900',
  },
  confrontoDestaque: {
    color: cores.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: espaco.sm,
  },
  acoes: {
    flexDirection: 'row',
    gap: espaco.sm,
  },
  acaoFlex: {
    flex: 1,
  },
  aguardando: {
    alignItems: 'center',
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    flexDirection: 'row',
    gap: espaco.sm,
    padding: espaco.md,
  },
  aguardandoTexto: {
    color: cores.textoSecundario,
    flex: 1,
    fontSize: 13,
  },
  eliminadoTexto: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginBottom: espaco.md,
  },
  lista: {
    gap: espaco.sm,
  },
  confronto: {
    backgroundColor: cores.superficieAlt,
    borderRadius: raio.sm,
    gap: 4,
    padding: espaco.sm,
  },
  confrontoUsuario: {
    borderColor: cores.primaria,
    borderWidth: 1,
  },
  lado: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.sm,
  },
  ladoNome: {
    color: cores.texto,
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  gols: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 18,
    textAlign: 'right',
  },
  vencedor: {
    color: cores.primaria,
    fontWeight: '900',
  },
  destaque: {
    fontWeight: '900',
  },
  penaltis: {
    color: cores.textoSecundario,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
