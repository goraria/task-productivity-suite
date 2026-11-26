export function hexToHSL(value: string): string {
  const hex = value.replace("#", "")
  const red = Number.parseInt(hex.substring(0, 2), 16) / 255
  const green = Number.parseInt(hex.substring(2, 4), 16) / 255
  const blue = Number.parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  let hue = 0
  let saturation = 0
  const lightness = (max + min) / 2

  if (max !== min) {
    const delta = max - min
    saturation =
      lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min)

    switch (max) {
      case red:
        hue = (green - blue) / delta + (green < blue ? 6 : 0)
        break
      case green:
        hue = (blue - red) / delta + 2
        break
      case blue:
        hue = (red - green) / delta + 4
        break
    }

    hue /= 6
  }

  const hueDegrees = Math.round(hue * 360)
  const saturationPercent = Math.round(saturation * 100)
  const lightnessPercent = Math.round(lightness * 100)

  return `${hueDegrees} ${saturationPercent}% ${lightnessPercent}%`
}

export function buildPlaylistHref(
  list: string,
  showUnavailable: boolean,
  hideWatched: boolean,
) {
  const query = new URLSearchParams({ list })

  if (showUnavailable) {
    query.set("showUnavailable", "1")
  }

  if (hideWatched) {
    query.set("hideWatched", "1")
  }

  return `/playlist?${query.toString()}`
}
