/**
 * @typedef {Object} Size2d
 * @property {number} width
 * @property {number} height
 **/

/** RTree's rect
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 **/

/**
 * @typedef {Object} RTreeLeaf
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 * @property {*} leaf
 **/

/**
 * @typedef {Object} ClusterRange
 * @property {Array.<number>} indices
 * @property {?Rect} rect
 * @property {?Array.<Rect>} containedRects
 * @property {Array.<RangeDataElement}> ranges
 **/

/**
 * @typedef {Object} ScreenshotResult
 * @property {number} gotoID
 * @property {Rect} rect
 * @property {?string} url
 **/


/* Types of objects used by WebExtensions */

/** The type of `browser.find.find().rectData
 * @typedef {Array.<RectDataElement>} RectData
 *
 * @typedef {Object} RectDataElement
 * @property {Object} rectsAndTexts
 * @property {Array.<RectDataPosition>} rectsAndTexts.rectList
 * @property {Array.<string>} rectsAndTexts.textList
 * @property {string} text
 *
 * @typedef {Object} RectDataPosition
 * @property {number} top
 * @property {number} left
 * @property {number} bottom
 * @property {number} right
 **/

/**
 * @typedef {Array.<RangeDataElement>} RangeData
 *
 * @typedef {Object} RangeDataElement
 * @property {number} framePos
 * @property {number} startTextNodePos
 * @property {number} endTextNodePos
 * @property {number} startOffset
 * @property {number} endOffset
 **/
