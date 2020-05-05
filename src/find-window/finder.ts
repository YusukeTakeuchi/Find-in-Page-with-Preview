/** A simple wrapper for browser.find with basic mutual exclusion
 **/

import { Mutex } from '../util/mutex';

export class PageFinder{
  private readonly mutex: Mutex;
  private lastFindStartTime: number | null;
  private readonly outputLog: boolean;

  constructor({outputLog=false}={}){
    this.mutex = new Mutex;
    this.lastFindStartTime = null;
    this.outputLog = outputLog;
  }

  /**
   * @param q string to search for
   * @param options options pass to browser.find.find() (tabId is required)
   * @return the result of browser.find.find
   **/
  async find(q: string, options: Partial<browser.find.FindOptions> & { tabId: number }): Promise<browser.find.FindResults | null>{
    if (!q){ // reject empty string
      browser.find.removeHighlighting();
      return null;
    }

    const time = Date.now();
    this.lastFindStartTime = time;

    const result = await this.mutex.transact( async () => {
      this.log("find start", time);
      // @ts-ignore (the type definition of browser.find.find requires all of the options to be specified)
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
      return null;
    }

    this.log("highlight start", time);

    // do not await to run highlighting asynchronously
    // @ts-ignore (highlightResults requires tabId but type definitions miss it)
    browser.find.highlightResults({tabId: options.tabId});

    return result;
  }

  private log(...args: any[]){
    if (this.outputLog){
      console.log(...args);
    }
  }
}
