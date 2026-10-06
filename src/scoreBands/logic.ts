import type { IranMapColorBand } from '../interfaces.js'

export type ScoreBandScale = 'score' | 'numeric'
export type ScoreBandField = 'min' | 'max'
/** In-progress text of the min/max inputs, keyed `${bandIndex}:${field}`. */
export type ScoreBandDrafts = Record<string, string>

/** Defaults shared by every ScoreBands implementation. */
export const scoreBandsDefaults = {
  scale: 'score',
  min: 0,
  max: 100,
  metricLabel: 'Score',
  orientation: 'horizontal',
  showNoData: true,
  noDataColor: '#e6e6e6',
  noDataLabel: 'No data',
  newBandColor: '#75b9ad',
  newBandLabel: 'New band',
} as const

/** User-facing strings, shared so wrappers read identically. */
export const scoreBandsText = {
  invalidDomain: 'Use finite display endpoints with minimum below maximum. Score domains must stay within 0–100.',
  invalidBands:
    'Use finite bounds with minimum below maximum. Score bounds must be between 0 and 100. Invalid edits do not change the map.',
  noBands: 'No bands configured.',
  help: 'Blank bounds are unbounded. Bands are matched in order; the first matching band wins.',
  minimumLabel: 'Minimum (inclusive)',
  maximumLabel: 'Maximum (exclusive)',
  addBand: 'Add band',
  removeBand: 'Remove',
} as const

export const getScoreBandsLabel = (metricLabel: string) => metricLabel.trim() || scoreBandsDefaults.metricLabel

export const getScoreBandsHeading = (metricLabel: string) => `${getScoreBandsLabel(metricLabel)} bands`

/** A score domain must stay within 0–100; a numeric domain may be any finite `min < max`. */
export const isValidDomain = (min: number, max: number, scale: ScoreBandScale) =>
  Number.isFinite(min) && Number.isFinite(max) && min < max && (scale === 'numeric' || (min >= 0 && max <= 100))

export const getRangeLabel = (band: IranMapColorBand, formatValue: (value: number) => string = String) => {
  if (band.min === undefined && band.max === undefined) return 'All values'
  if (band.min === undefined) return `Below ${formatValue(band.max!)}`
  if (band.max === undefined) return `${formatValue(band.min)} and above`
  return `${formatValue(band.min)} ≤ value < ${formatValue(band.max)}`
}

export const getDomainLabel = (min: number, max: number, formatValue: (value: number) => string = String) =>
  `${formatValue(min)} – ${formatValue(max)}`

export interface ScoreBandLegendItem {
  color: string
  /** Band label, or its range text when it has none. */
  title: string
  /** Range text shown beneath a labelled band. */
  range?: string
}

export interface ScoreBandsLegendOptions {
  formatValue?: (value: number) => string
  showNoData?: boolean
  noDataColor?: string
  noDataLabel?: string
}

/** Legend rows: one per band, then an optional "No data" row. */
export const getLegendItems = (
  bands: IranMapColorBand[],
  {
    formatValue = String,
    showNoData = scoreBandsDefaults.showNoData,
    noDataColor = scoreBandsDefaults.noDataColor,
    noDataLabel = scoreBandsDefaults.noDataLabel,
  }: ScoreBandsLegendOptions = {},
): ScoreBandLegendItem[] => {
  const items = bands.map((band) => {
    const range = getRangeLabel(band, formatValue)
    return band.label ? { color: band.color, title: band.label, range } : { color: band.color, title: range }
  })
  return showNoData ? [...items, { color: noDataColor, title: noDataLabel }] : items
}

export const parseBound = (draft: string) => (draft.trim() === '' ? undefined : Number(draft))

export const getDraftKey = (index: number, field: ScoreBandField) => `${index}:${field}`

/** Applies any in-progress min/max input text on top of a band. */
export const applyDrafts = (band: IranMapColorBand, drafts: ScoreBandDrafts, index: number): IranMapColorBand => {
  const result = { ...band }
  for (const field of ['min', 'max'] as const) {
    const draft = drafts[getDraftKey(index, field)]
    if (draft !== undefined) result[field] = parseBound(draft)
  }
  return result
}

export const isValidBand = (band: IranMapColorBand, scale: ScoreBandScale = scoreBandsDefaults.scale) => {
  const bounds = [band.min, band.max].filter((value): value is number => value !== undefined)
  return (
    bounds.every((value) => Number.isFinite(value) && (scale === 'numeric' || (value >= 0 && value <= 100))) &&
    (band.min === undefined || band.max === undefined || band.min < band.max)
  )
}

/** True when any band, with its drafts applied, is invalid. */
export const hasInvalidBands = (bands: IranMapColorBand[], drafts: ScoreBandDrafts, scale: ScoreBandScale) =>
  bands.some((band, index) => !isValidBand(applyDrafts(band, drafts, index), scale))

export interface BoundEdit {
  drafts: ScoreBandDrafts
  /** The full replacement band list, or undefined when the edit is invalid and must not change the map. */
  bands?: IranMapColorBand[]
}

/**
 * Drafts hold what a person is typing, keyed by band index (`${index}:${field}`). They never change the committed
 * bands by themselves. Clear them (or use {@link removeBandWithDrafts}) whenever bands are removed or reordered,
 * because the keys are positions, not band identities.
 */
export const setDraft = (
  drafts: ScoreBandDrafts,
  index: number,
  field: ScoreBandField,
  text: string,
): ScoreBandDrafts => ({ ...drafts, [getDraftKey(index, field)]: text })

/**
 * Commits the in-progress text of a band (call it on blur or Enter, not on every keystroke). A blank bound means
 * "unbounded" and is committed deliberately here. Returns `bands: undefined` (and unchanged drafts) when there is
 * no such band, nothing was typed, or the result is invalid; on success the band's drafts are cleared.
 */
export const commitDraft = (
  bands: IranMapColorBand[],
  drafts: ScoreBandDrafts,
  index: number,
  scale: ScoreBandScale = scoreBandsDefaults.scale,
): BoundEdit => {
  const band = bands[index]
  const hasDraft = (['min', 'max'] as const).some((field) => drafts[getDraftKey(index, field)] !== undefined)
  if (!band || !hasDraft) return { drafts }
  const next = applyDrafts(band, drafts, index)
  if (!isValidBand(next, scale)) return { drafts }
  const remaining = { ...drafts }
  delete remaining[getDraftKey(index, 'min')]
  delete remaining[getDraftKey(index, 'max')]
  return { drafts: remaining, bands: bands.map((item, position) => (position === index ? next : item)) }
}

/**
 * Records a min/max input edit and commits the new band list at once, when the edited band stays valid. This commits
 * on every call, so intermediate text (for example a cleared field) changes the map while typing; prefer
 * {@link setDraft} on input and {@link commitDraft} on blur. An out-of-range `index` commits nothing.
 */
export const editBound = (
  bands: IranMapColorBand[],
  drafts: ScoreBandDrafts,
  index: number,
  field: ScoreBandField,
  text: string,
  scale: ScoreBandScale,
): BoundEdit => {
  if (!bands[index]) return { drafts }
  const nextDrafts = setDraft(drafts, index, field, text)
  const band = { ...applyDrafts(bands[index], drafts, index), [field]: parseBound(text) }
  return {
    drafts: nextDrafts,
    bands: isValidBand(band, scale) ? bands.map((item, position) => (position === index ? band : item)) : undefined,
  }
}

export const updateBand = (bands: IranMapColorBand[], index: number, patch: Partial<IranMapColorBand>) =>
  bands.map((item, position) => (position === index ? { ...item, ...patch } : item))

export const removeBand = (bands: IranMapColorBand[], index: number) =>
  bands.filter((_, position) => position !== index)

/** Removes a band and re-keys the drafts of the bands after it, so no draft lands on the wrong band. */
export const removeBandWithDrafts = (bands: IranMapColorBand[], drafts: ScoreBandDrafts, index: number) => {
  const next: ScoreBandDrafts = {}
  for (const [key, text] of Object.entries(drafts)) {
    const [position, field] = key.split(':')
    const at = Number(position)
    if (at === index) continue
    next[`${at > index ? at - 1 : at}:${field}`] = text
  }
  return { bands: removeBand(bands, index), drafts: next }
}

/**
 * Appends a band that starts at `min` and has no upper bound, so the top of the domain (for example a score of 100)
 * is included: `max` is exclusive, and a band ending at the domain's `max` would leave that value uncolored.
 * The third parameter is accepted for compatibility with 0.1.x callers and ignored.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const addBand = (bands: IranMapColorBand[], min: number, _max?: number): IranMapColorBand[] => [
  ...bands,
  { min, color: scoreBandsDefaults.newBandColor, label: scoreBandsDefaults.newBandLabel },
]

/** `<input type="color">` only accepts `#rrggbb`. */
export const getColorInputValue = (color: string) => (/^#[\da-f]{6}$/i.test(color) ? color : '#000000')

/** `min`/`max` attributes of the numeric inputs: 0–100 for score scales, unbounded for numeric ones. */
export const getBoundInputLimits = (scale: ScoreBandScale) =>
  scale === 'score' ? { min: 0, max: 100 } : { min: undefined, max: undefined }
