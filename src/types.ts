 type Size2d = {
   width : number,
   height: number,
 }

// RTree's rect
type Rect = {
  x: number,
  y: number,
  w: number,
  h: number,
}

 type RectWithValue<T> = Rect & {
   value: T,
 }

type RTreeLeaf = Rect & {
  leaf: any,
}

type ClusterRange = {
  indices: number[],
  rect: Rect | null,
  containedRects: Rect[] | null,
  ranges: browser.find.RangeData[],
}

type ScreenshotResult = {
  gotoID: number,
  rect: Rect,
  url: string | null,
}

export {
  Size2d,
  Rect,
  RectWithValue,
  RTreeLeaf,
  ClusterRange,
  ScreenshotResult,
 };