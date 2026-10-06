import type { IranMapArea, MapBoundary, RenderableMapArea, selectedProvinceType } from '../interfaces.js'
import { toPublicArea } from './mappers.js'
import { isProvinceId } from './values.js'

/** Payload of the legacy `selectProvinceHandler` when a province is deselected. */
export const NO_PROVINCE_SELECTION: selectedProvinceType = { name: undefined, faName: undefined }

export type AreaSelection =
  | { action: 'deselect' }
  | {
      action: 'select'
      selectedId: string
      /** Argument for `onSelect`. */
      area: IranMapArea
      /** Argument for the legacy `selectProvinceHandler`; only present for provinces. */
      province?: selectedProvinceType
    }

/**
 * Decides what a click/activation on `area` does. With `toggle`, activating the already-selected area deselects it;
 * islands pass `toggle = false` so they never deselect their owner.
 */
export const resolveAreaSelection = (
  selectedAreaId: string | undefined,
  area: RenderableMapArea,
  toggle = true,
): AreaSelection => {
  if (toggle && area.id === selectedAreaId) return { action: 'deselect' }
  return {
    action: 'select',
    selectedId: area.id,
    area: toPublicArea(area),
    province: area.type === 'province' ? { name: area.id, faName: area.faName } : undefined,
  }
}

/**
 * The legacy `selectProvinceHandler` argument to emit when `selectedAreaId` is cleared,
 * or undefined when the cleared selection was not a province.
 */
export const getDeselectProvince = (provinces: MapBoundary[], selectedAreaId: string | undefined) =>
  isProvinceId(provinces, selectedAreaId) ? NO_PROVINCE_SELECTION : undefined
