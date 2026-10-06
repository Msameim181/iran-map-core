import type { IranMapWrapperProps } from '../interfaces.js'

/** Default values shared by every framework wrapper so they cannot drift apart. */
export const iranMapDefaults = {
  width: 500,
  colorRange: '30, 70, 181',
  mode: 'province',
  focusPadding: 28,
  regionAggregation: 'sum',
  textColor: '#000',
  deactiveProvinceColor: '#e6e6e6',
  tooltipTitle: '',
  strokeColor: '#ffffff',
  strokeWidth: 0.35,
  className: '',
  ariaLabel: 'Interactive map of Iran',
  capitalMarkers: 'none',
  capitalMarkerColor: '#123f4b',
  capitalMarkerSize: 4,
  showCapitalLabels: false,
  showWater: true,
  waterColor: '#dcebed',
  seaLabelColor: '#477983',
  showSeaLabels: true,
  showIslands: true,
  showIslandLabels: true,
} as const satisfies Partial<IranMapWrapperProps>

/** `selectedAreaColor` wins over the legacy `selectedProvinceColor`. */
export const resolveSelectedAreaColor = (
  props: Pick<IranMapWrapperProps, 'selectedAreaColor' | 'selectedProvinceColor'>,
) => props.selectedAreaColor || props.selectedProvinceColor

/** `defaultSelectedArea` wins over the legacy `defaultSelectedProvince`. */
export const resolveDefaultSelectedArea = (
  props: Pick<IranMapWrapperProps, 'defaultSelectedArea' | 'defaultSelectedProvince'>,
) => props.defaultSelectedArea || props.defaultSelectedProvince
