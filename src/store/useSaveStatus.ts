/**
 * Status transitório do save para dar FEEDBACK visual ("Salvando… / Salvo ✓").
 * Store separado do jogo de propósito: é UI efêmera, não entra no snapshot.
 * Alimentado por salvarAgora (src/store/autosave.ts) nos pontos de commit.
 */
import {create} from 'zustand';

export type StatusSave = 'oculto' | 'salvando' | 'salvo';

interface SaveStatusState {
  status: StatusSave;
  marcarSalvando: () => void;
  marcarSalvo: () => void;
  ocultar: () => void;
}

export const useSaveStatus = create<SaveStatusState>(set => ({
  status: 'oculto',
  marcarSalvando: () => set({status: 'salvando'}),
  marcarSalvo: () => set({status: 'salvo'}),
  ocultar: () => set({status: 'oculto'}),
}));
