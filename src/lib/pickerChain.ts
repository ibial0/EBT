/**
 * Which chain the token picker starts on.
 *
 * The chain chosen on the page is the source of truth: opening the picker must never show a
 * different network than the one printed outside it. The remembered filter is only a fallback
 * for pickers that have no chain selected yet.
 */
export function initialPickerChain(
  valueChainId: number | undefined,
  availableChainIds: number[],
  remembered: number | 'all',
): number | 'all' {
  if (valueChainId != null && availableChainIds.includes(valueChainId)) return valueChainId
  return remembered
}
