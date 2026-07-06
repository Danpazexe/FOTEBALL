/**
 * Rótulo do minuto na súmula. Os minutos de acréscimo do 2º tempo (91–96)
 * aparecem como "90+X", ao estilo das transmissões. Prorrogação de mata-mata
 * (>96) fica com o número cru.
 */
export function rotuloMinuto(minuto: number): string {
  if (minuto > 90 && minuto <= 96) {
    return `90+${minuto - 90}`;
  }
  return String(minuto);
}
