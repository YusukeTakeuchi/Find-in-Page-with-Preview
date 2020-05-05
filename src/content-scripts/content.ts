import { Rect, Size2d, ScreenshotResult } from '../types';
import { Messages } from "../messages/messages"

type Box = {
  left: number,
  top: number,
  right: number,
  bottom: number
};

type NodeAndOffset = [Node, number];

const PreviewMargin = {
  width: 20,
  height : 10
};

/** Take the screenshot for the specified range.
 *
 * @param x
 * @param y
 * @param w
 * @param h
 * @return Data URL of the image
 **/
function screenshot({x,y,w,h}: Rect): string{
  const canvas = document.createElement("canvas");

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  // @ts-ignore
  ctx.drawWindow(window, x, y, w, h, "rgb(255,255,255)");
  return canvas.toDataURL("image/png");
}

class FindResultContext{

  private documentTextNodes: Text[];

  private resultRanges: Range[];

  private targetElements: Element[];

  constructor(){
    this.documentTextNodes = this.collectTextNodes();
    this.resultRanges = [];
    this.targetElements = [];
  }

  private collectTextNodes(): Text[]{
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false);
    let node: Node | null;
    while(node = walker.nextNode()){
      textNodes.push(node as Text);
    }
    return textNodes;
  }

  /** Register result range and return ID
   * @param range
   **/
  registerRange(range: Range): number{
    this.resultRanges.push(range);
    return this.resultRanges.length - 1;
  }

  /**
   * @param id
   * @return
   **/
  getRange(id: number): Range{
    return this.resultRanges[id];
  }


  /**
   * @param ranges
   * @return
   **/
  createRangeFromFindRanges(ranges: browser.find.RangeData[]): Range{
    const domRange = document.createRange();
    let initialized = false;

    for (const range of ranges){
      const startPoint: NodeAndOffset = [this.documentTextNodes[range.startTextNodePos], range.startOffset],
            endPoint: NodeAndOffset = [this.documentTextNodes[range.endTextNodePos], range.endOffset];
      if (!initialized || domRange.comparePoint(...startPoint) < 0){
        domRange.setStart(...startPoint);
      }
      if (!initialized || domRange.comparePoint(...endPoint) > 0){
        domRange.setEnd(...endPoint);
      }
      initialized = true;
    }

    return domRange;
  }

  /**
   * @param id
   * @param smoothScroll
   **/
  gotoResult(id: number, {smoothScroll=true}): void{
    if (this.targetElements[id] == null){
      this.targetElements[id] = this.createTargetElement(id);
    }
    this.targetElements[id].scrollIntoView({
      // @ts-ignore
      behavior: smoothScroll ? "smooth" : "instant",
      block: "center",
      inline: "end"
    });
  }

  private createTargetElement(id: number): HTMLElement{
    const targetElt = document.createElement("SPAN"),
          range = this.getRange(id);
    if (range == null){
      throw new Error("Invalid result id");
    }
    targetElt.className = "fipwp-goto-target-element";
    targetElt.style.visibility = "hidden";
    targetElt.style.width = "0";
    targetElt.style.borderWidth = "0";
    targetElt.style.padding = "0";
    targetElt.style.margin = "0";

    const newRange = range.cloneRange();
    newRange.collapse(false);
    newRange.insertNode(targetElt);
    return targetElt;
  }

  /**
   * Basic idea:
   *   First find the element E such that:
   *     - E is a parent of the found ranges
   *     - E's width is smaller than SS width
   *     - E's parent's width is bigger than SS width
   *   Second decide SS range R so that:
   *     - R contains E's horizontal range
   *     - R is contained by E's parent's horizontal range
   *     - The distance between R's center pos and the center pos of the found ranges is minimized
   *
   * Do the same for y.
   **/
  private computeScreenshotStartPosForClusterCommon(
      xory: "x" | "y",
      clusterRect: Rect,
      ranges: browser.find.RangeData[],
      ssSize: Size2d
  ): number{
    const horizontal = (xory == "x");

    const x = horizontal ? "x" : "y",
         w = horizontal ? "w" : "h",
         left = horizontal ? "left" : "top",
         right = horizontal ? "right" : "bottom",
         width = horizontal ? "width" : "height",
         scrollWidth = horizontal ? "scrollWidth" : "scrollHeight";

    const clusterCenter: number = clusterRect[x] + clusterRect[w]/2;

    let xRangeContained = { // SS contains this
          [left]: Math.max(0, clusterRect[x] - PreviewMargin[width]),
          [right]: Math.min(document.documentElement[scrollWidth],
                            clusterRect[x] + clusterRect[w] + PreviewMargin[width]),
        },
        xRangeContaining = null; // SS is contained by this

    const baseElt = commonAncestorElement(this.createRangeFromFindRanges(ranges));

    for (let currentElement: Node | null = baseElt;
          currentElement != null && currentElement.nodeType === Node.ELEMENT_NODE;
          currentElement = currentElement.parentNode
    ){
      const eltBox = getElementBox(currentElement as HTMLElement),
            newLeft = Math.min(xRangeContained[left], eltBox[left]),
            newRight = Math.max(xRangeContained[right], eltBox[right]),
            newWidth = newRight - newLeft;

      if (newWidth >= ssSize[width]){
        xRangeContaining = {
          [left]: Math.min(newLeft, xRangeContained[left]),
          [right]: Math.max(newRight, xRangeContained[right]),
        };
        break;
      }else{
        xRangeContained = {
          [left]: newLeft,
          [right]: newRight
        };
        xRangeContaining = null;
      }
    }
    if (xRangeContaining == null){ // not element big enough
      xRangeContaining = {
        [left]: 0,
        [right]: Infinity
      };
    }

    // find cx such that:
    //   - xRangeContaining.left <= cx-ssSize.width/2 <= xRangeContained.left
    //   - xRangeContained.right <= cx+ssSize.width/2 <= xRangeContaining.right
    //   - minimize the distance between cx and clusterCenter

    const cxMin = Math.max(xRangeContaining[left] + ssSize[width]/2,
                           xRangeContained[right] - ssSize[width]/2),
          cxMax = Math.min(xRangeContained[left] + ssSize[width]/2,
                           xRangeContaining[right] - ssSize[width]/2);
    const cx = clamp(clusterCenter, cxMin, cxMax);

    return cx - ssSize[width]/2;

    function clamp(val: number, min: number, max: number): number{
      return Math.max(min, Math.min(val, max));
    }
  }

  computeScreenshotRectForClusterRect(clusterRect: Rect, ranges: browser.find.RangeData[], ssSize: Size2d): Rect{
    return {
      x: this.computeScreenshotStartPosForClusterCommon("x", clusterRect, ranges, ssSize),
      y: this.computeScreenshotStartPosForClusterCommon("y", clusterRect, ranges, ssSize),
      w: ssSize.width,
      h: ssSize.height,
    };
  }
}

let context: FindResultContext | null = null;

/**
 * @param range
 * @return 
 **/
function commonAncestorElement(range: Range): HTMLElement {
  const node = range.commonAncestorContainer;
  return (node.nodeType === Node.TEXT_NODE ? node.parentNode : node) as HTMLElement;
}

/**
 * @see {@link http://uhyo.hatenablog.com/entry/2017/03/15/130825}
 *
 * @param elt
 **/
function getElementBox(elt: HTMLElement): Box{
  return getPageBox(elt.getBoundingClientRect());
}

/**
 * @param domRect value returned by getClientRects()[] or getBoundingClientRect()
 **/
function getPageBox(domRect: DOMRect): Box{
  const {left, top, width, height} = domRect,
        {left: bleft, top: btop} = document.body.getBoundingClientRect();
  return {
    left: left - bleft,
    top: top - btop,
    right: left -bleft + width,
    bottom: top - btop + height,
  };
}

function boxToRect(box: Box): Rect{
  return {
    x: box.left,
    y: box.top,
    w: box.right - box.left,
    h: box.bottom - box.top
  };
}

let camouflageMap: Map<HTMLElement, string> | null = null;

const receiver = {
  /** Extremely dirty hack to work around FF's bug
   * @see {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1448564}
   **/
  CamouflageInputs(q: string){
    if (camouflageMap != null){
      return;
    }

    camouflageMap = new Map;

    if (q.length === 0){
      return;
    }

    const inputElts: NodeListOf<HTMLInputElement | HTMLTextAreaElement> = document.querySelectorAll(`input, textarea`);
    for (const elt of inputElts){
      if (typeof elt.value === "string"){
        camouflageMap.set(elt, elt.style.visibility);
        elt.style.visibility = "hidden";
      }
    }
  },

  UncamouflageInputs(){
    if (camouflageMap == null){
      return;
    }

    for (const [elt,visibility] of camouflageMap){
      elt.style.visibility = visibility;
    }
    camouflageMap = null;
  },

  Start(){
    context = new FindResultContext;
  },

  async Screenshot( {clusterRect, ranges, ssSize} :{
    clusterRect: Rect | null,
    ranges: browser.find.RangeData[],
    ssSize: Size2d,
  } ): Promise<ScreenshotResult>{
    if (context == null){
      return Promise.reject("not searched");
    }

    if (clusterRect == null){
      return this.registerRanges(context, {ranges, ssSize} );
    }else{
      return this.screenshotClusterRect(context, {clusterRect, ranges, ssSize} );
    }
  },

  async registerRanges(context: FindResultContext, {ranges, ssSize}: {ranges: browser.find.RangeData[], ssSize: Size2d}): Promise<ScreenshotResult>{
    const domRange = context.createRangeFromFindRanges(ranges),
          gotoID = context.registerRange(domRange),
          cRect = boxToRect(getPageBox(domRange.getClientRects()[0])),
          rect = context.computeScreenshotRectForClusterRect(cRect, ranges, ssSize);
    return {
      gotoID,
      rect,
      url: null,
    };
  },

  async screenshotClusterRect(context: FindResultContext, {clusterRect, ranges, ssSize}: {clusterRect: Rect, ranges: browser.find.RangeData[], ssSize: Size2d} ): Promise<ScreenshotResult>{
    const gotoID = context.registerRange(context.createRangeFromFindRanges(ranges));
    const rect = context.computeScreenshotRectForClusterRect(clusterRect, ranges, ssSize);
    return {
      gotoID,
      rect,
      url: screenshot(rect),
    };
  },

  async GotoID( {id, smoothScroll}: {id: number, smoothScroll: boolean} ){
    if (context == null){
      throw new Error("No match");
    }
    context.gotoResult(id, {smoothScroll});
  },

  async Reset(): Promise<{success: boolean}>{
    let success;
    if (context){
      context = null;
      success = true;
    }else{
      success = false;
    }
    return {success};
  },

  /** Check whether this page has been searched **/
  async Ping(): Promise<{result: boolean}>{
    return {
      result: context ? true: false,
    };
  },
};

Messages.receive(receiver);