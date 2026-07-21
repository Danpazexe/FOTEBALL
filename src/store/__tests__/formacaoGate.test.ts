/**
 * Portão de escalação em `atualizarFormacaoUsuario`: uma alteração que INTRODUZ
 * uma escalação inválida é bloqueada, mas o bloqueio é NÃO-REGRESSIVO — erros
 * que já existiam (ex.: titular que ficou indisponível e ainda não foi trocado)
 * não podem travar substituições/edições legítimas, inclusive durante a partida.
 */
import {trocarTitular} from '../../engine/tactics/escalacao';
import {useGameStore} from '../useGameStore';

const estado = () => useGameStore.getState();
const clubeUsuario = (id: string) =>
  estado().clubes.find(c => c.id === id)!;

describe('atualizarFormacaoUsuario — portão de escalação', () => {
  beforeEach(() => {
    estado().reiniciarCarreira();
  });

  it('bloqueia uma alteração que introduz erro novo (dois goleiros)', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const original = clubeUsuario(usuario.id).formacaoAtual!;

    // Transforma um titular de linha (slot 5) num segundo goleiro.
    const invalida = {
      ...original,
      titulares: original.titulares.map((t, i) =>
        i === 5 ? {...t, posicao: 'GOL' as const} : t,
      ),
    };
    estado().atualizarFormacaoUsuario(invalida);

    // A formação oficial permanece a original e há aviso de inválida.
    expect(clubeUsuario(usuario.id).formacaoAtual).toEqual(original);
    expect(estado().mensagens[0]?.texto).toContain('inválida');
  });

  it('permite uma substituição válida', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const original = clubeUsuario(usuario.id).formacaoAtual!;
    const titularIds = new Set(original.titulares.map(t => t.jogadorId));
    const reserva = estado().jogadores.find(
      j =>
        j.clubeId === usuario.id &&
        !titularIds.has(j.id) &&
        !j.lesionado &&
        !j.suspenso,
    )!;

    estado().atualizarFormacaoUsuario(trocarTitular(original, 9, reserva.id));

    expect(clubeUsuario(usuario.id).formacaoAtual!.titulares[9].jogadorId).toBe(
      reserva.id,
    );
  });

  it('não trava a substituição quando um titular indisponível permanece no XI', () => {
    const usuario = estado().clubes[7];
    estado().iniciarNovaCarreira(usuario.id);
    const original = clubeUsuario(usuario.id).formacaoAtual!;

    // Marca um titular (slot 6) como lesionado direto no estado: ele continua no
    // XI (o jogo não remove fantasmas sozinho) — a formação atual já é "inválida".
    const idFantasma = original.titulares[6].jogadorId;
    useGameStore.setState({
      jogadores: estado().jogadores.map(j =>
        j.id === idFantasma ? {...j, lesionado: true, diasLesao: 10} : j,
      ),
    });

    const titularIds = new Set(original.titulares.map(t => t.jogadorId));
    const reserva = estado().jogadores.find(
      j =>
        j.clubeId === usuario.id &&
        !titularIds.has(j.id) &&
        !j.lesionado &&
        !j.suspenso,
    )!;

    // Substitui o slot 9 (saudável). O lesionado do slot 6 segue no XI, mas isso
    // é um erro PRÉ-EXISTENTE — a substituição não deve ser bloqueada.
    estado().atualizarFormacaoUsuario(trocarTitular(original, 9, reserva.id));

    expect(clubeUsuario(usuario.id).formacaoAtual!.titulares[9].jogadorId).toBe(
      reserva.id,
    );
  });
});
