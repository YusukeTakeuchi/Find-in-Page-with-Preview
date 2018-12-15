/**
 * @typedef {Object} Box
 * @property {number} left
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 **/

PreviewMargin = {
  width: 20,
  height : 10
};

/** Take the screenshot for the specified range.
 *
 * @param {Rect} rect
 * @return {string} Data URL of the image
 **/
function screenshot({x,y,w,h}){
  const canvas = document.createElement("canvas");

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  ctx.drawWindow(window, x, y, w, h, "rgb(255,255,255)");
  return canvas.toDataURL("image/png");
}

class FindResultContext{
  constructor(){
    /** @type {Array.<Text>} **/
    this.documentTextNodes = this.collectTextNodes();

    /** @type {Array.<Range>} **/
    this.resultRanges = [];

    /** @type {Array.<Element>} **/
    this.targetElements = [];
  }

  /**
   * @return {Array.<Text>}
   * @private
   **/
  collectTextNodes(){
    const textNodes = [];
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walker.nextNode()){
      textNodes.push(node);
    }
    return textNodes;
  }

  /** Register result range and return ID
   * @param {Range} range
   * @param {number}
   **/
  registerRange(range){
    this.resultRanges.push(range);
    return this.resultRanges.length - 1;
  }

  /**
   * @param {number} id
   * @return {Range}
   **/
  getRange(id){
    return this.resultRanges[id];
  }

  /**
   * @param {Array.<RangeDataElement>} ranges
   * @return {Range}
   **/
  createRangeFromFindRanges(ranges){
    const domRange = document.createRange();
    let initialized = false;

    for (const range of ranges){
      const startPoint = [this.documentTextNodes[range.startTextNodePos], range.startOffset],
            endPoint = [this.documentTextNodes[range.endTextNodePos], range.endOffset];
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
   * @param {number} id
   * @param {boolean} smoothScroll
   **/
  gotoResult(id, {smoothScroll=true}){
    if (this.targetElements[id] == null){
      this.targetElements[id] = this.createTargetElement(id);
    }
    this.targetElements[id].scrollIntoView({
      behavior: smoothScroll ? "smooth" : "instant",
      block: "center",
      inline: "end"
    });
  }

  /**
   * @private
   **/
  createTargetElement(id){
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
   *
   * @private
   **/
  computeScreenshotStartPosForClusterCommon(xory, clusterRect, ranges, ssSize){
    const {x, w, left, right, width, scrollWidth} = {
      x: { x: "x", w: "w", left: "left", right: "right", width: "width", scrollWidth: "scrollWidth", },
      y: { x: "y", w: "h", left: "top", right: "bottom", width: "height", scrollWidth: "scrollHeight" }
    }[xory] || ( () => { throw "x or y" } )();

    const clusterCenter = clusterRect[x] + clusterRect[w]/2;

    let xRangeContained = { // SS contains this
          [left]: Math.max(0, clusterRect[x] - PreviewMargin[width]),
          [right]: Math.min(document.documentElement[scrollWidth],
                            clusterRect[x] + clusterRect[w] + PreviewMargin[width]),
        },
        xRangeContaining = null; // SS is contained by this

    const baseElt = commonAncestorElement(this.createRangeFromFindRanges(ranges));

    for (let currentElement = baseElt;
          currentElement && currentElement.nodeType === Node.ELEMENT_NODE;
          currentElement = currentElement.parentNode
    ){
      const eltBox = getElementBox(currentElement),
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

    function clamp(val, min, max){
      return Math.max(min, Math.min(val, max));
    }
  }

  /**
   * @param {Rect} clusterRect
   * @param {Array.<RangeDataElement>} ranges
   * @param {Size2d} ssSize
   * @return {Rect}
   **/
  computeScreenshotRectForClusterRect(clusterRect, ranges, ssSize){
    return {
      x: this.computeScreenshotStartPosForClusterCommon("x", clusterRect, ranges, ssSize),
      y: this.computeScreenshotStartPosForClusterCommon("y", clusterRect, ranges, ssSize),
      w: ssSize.width,
      h: ssSize.height,
    };
  }
}
let context = null;

/**
 * @param {Range} range
 * @return {Element}
 **/
function commonAncestorElement(range){
  const node = range.commonAncestorContainer;
  return node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
}



/**
 * @see {@link http://uhyo.hatenablog.com/entry/2017/03/15/130825}
 *
 * @param {Element} elt
 **/
function getElementBox(elt){
  return getPageBox(elt.getBoundingClientRect());
}

/**
 * @param {DOMRect} domRect value returned by getClientRects()[] or getBoundingClientRect()
 * @return {Box}
 **/
function getPageBox(domRect){
  const {left, top, width, height} = domRect,
        {left: bleft, top: btop} = document.body.getBoundingClientRect();
  return {
    left: left - bleft,
    top: top - btop,
    right: left -bleft + width,
    bottom: top - btop + height,
  };
}

/**
 * @param {Box} box
 * @return {Rect}
 **/
function boxToRect(box){
  return {
    x: box.left,
    y: box.top,
    w: box.right - box.left,
    h: box.bottom - box.top
  };
}

let camouflageMap;

Messaging.receive({
  /** Extremely dirty hack to work around FF's bug
   * @see {@link https://bugzilla.mozilla.org/show_bug.cgi?id=1448564}
   *
   * @param {string} q
   **/
  onCamouflageInputs(q){
    if (camouflageMap != null){
      return;
    }

    camouflageMap = new Map;

    if (q.length === 0){
      return;
    }

    const inputElts = document.querySelectorAll(`input, textarea`);
    for (const elt of inputElts){
      if (typeof elt.value === "string"){
        camouflageMap.set(elt, elt.style.visibility);
        elt.style.visibility = "hidden";
      }
    }
  },

  onUncamouflageInputs(){
    for (const [elt,visibility] of camouflageMap){
      elt.style.visibility = visibility;
    }
    camouflageMap = null;
  },

  onStart(){
    context = new FindResultContext;
  },

  /**
   * @param {?Rect} clusterRect
   * @param {Array.<RangeDataElement>} ranges
   * @param {Size2d} ssSize
   * @return {ScreenshotResult}
   **/
  async onScreenshot( {clusterRect, ranges, ssSize} ){
    if (clusterRect == null){
      return this.registerRanges( {ranges, ssSize} );
    }else{
      return this.screenshotClusterRect( {clusterRect, ranges, ssSize} );
    }
  },

  async registerRanges( {ranges, ssSize}){
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

  async screenshotClusterRect( {clusterRect, ranges, ssSize} ){
    const gotoID = context.registerRange(context.createRangeFromFindRanges(ranges));
    const rect = context.computeScreenshotRectForClusterRect(clusterRect, ranges, ssSize);
    return {
      gotoID,
      rect,
      url: screenshot(rect),
    };
  },

  async onGoto({ x, y, w, h }){
    const cx = x + w / 2,
          cy = y + h / 2;
    document.scrollingElement.scrollLeft = cx - window.innerWidth * 3 / 8;
    document.scrollingElement.scrollTop = cy - window.innerHeight * 3 / 8;
  },

  async onGotoID( {id, smoothScroll} ){
    if (context == null){
      throw new Error("No match");
    }
    context.gotoResult(id, {smoothScroll});
  },

  async onReset(){
    let success;
    if (context){
      this.context = null;
      success = true;
    }else{
      success = false;
    }
    return {success};
  },

  /** Check whether this page has been searched **/
  async onPing(){
    return {
      result: context ? true: false,
    };
  },
});
