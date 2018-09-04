/** A simple wrapper for browser.find with basic mutual exclusion
 **/
class PageFinder{
  constructor({outputLog=false}={}){
    this.mutex = new Mutex;
    this.lastFindStartTime = null;
    this.outputLog = outputLog;
  }

  /**
   * @param {string} q string to search for
   * @param {Object} options options pass to browser.find.find()
   * @return {count: number, rectData: RectData, rangeData: RangeData}
   **/
  async find(q, options){
    if (!q){ // reject empty string
      browser.find.removeHighlighting();
      return;
    }

    const time = Date.now();
    this.lastFindStartTime = time;

    const result = await this.mutex.transact( async () => {
      this.log("find start", time);
      const result = await browser.find.find(q, {
        includeRectData: true,
        includeRangeData: true,
        ...options
      });
      this.log("find finish", time);
      return result;
    });

    if (time !== this.lastFindStartTime){
      // Skip highlighting because there is another method execution.
      return result;
    }

    if (result.count === 0){
      browser.find.removeHighlighting();
      return;
    }

    this.log("highlight start", time);

    // do not await to run highlighting asynchronously
    browser.find.highlightResults();

    return result;
  }

  /**
   * @private
   **/
  log(...args){
    if (this.outputLog){
      console.log(...args);
    }
  }
}
