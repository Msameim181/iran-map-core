import type { IranMapCapital, RenderableMapArea, RenderableMapIsland } from '../interfaces.js'

export const getAreaTooltip = (area: RenderableMapArea, title: string) => {
  const value = area.value === undefined ? 'No data' : String(area.value)
  return `${area.faName || area.name} — ${title ? `${title} ` : ''}${value}`
}

export const getCapitalTooltip = (capital: IranMapCapital) => {
  const type = capital.areaType === 'province' ? 'Province capital' : 'County center'
  return `${type}: ${capital.faName} (${capital.name}) — ${capital.latitude.toFixed(5)}, ${capital.longitude.toFixed(
    5,
  )}`
}

export const getIslandTooltip = (island: RenderableMapIsland) =>
  `Island: ${island.faName} (${island.name}) — ${island.area.faName} (${island.area.name})`
