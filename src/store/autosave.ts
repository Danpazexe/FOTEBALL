/**
 * Save FORÇADO e imediato, para pontos de commit críticos (fim de partida,
 * avanço de rodada/temporada) onde não dá para depender só do autosave com
 * debounce do App.tsx — se o app fechar/crashar na janela do debounce, o
 * progresso se perderia. Fire-and-forget tolerante a falha (o autosave normal
 * segue como rede de segurança).
 */
import {useGameStore} from './useGameStore';
import {
  conquistasParaSalvar,
  useAchievementsStore,
} from './useAchievementsStore';
import {salvarJogo} from './persistence';

export function salvarAgora(): void {
  const estado = useGameStore.getState();
  // Sem carreira ativa não há o que salvar (evita gravar o estado "limpo").
  if (!estado.clubeUsuarioId) {
    return;
  }
  const conquistas = conquistasParaSalvar(
    useAchievementsStore.getState().conquistas,
  );
  salvarJogo(estado, conquistas).catch(erro =>
    console.warn('[save] falha ao gravar imediato:', erro),
  );
}
