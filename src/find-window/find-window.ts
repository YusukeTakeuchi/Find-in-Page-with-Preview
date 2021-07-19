import computeScrollIntoView from 'compute-scroll-into-view';

import { Size2d, Rect, ScreenshotResult, RectWithValue, ClusterRange } from '../types';
import { SimpleEvent } from '../util/events';
//import { Messaging } from '../util/messaging';
import { Messages,MessagesFindWindow } from '../messages/messages';
import { CancellableDelay } from '../util/cancellable-delay';
import { Timestamp } from '../util/timestamp';
import { Mutex } from '../util/mutex';

import { PageFinder } from './finder';
import { FindResultCache } from './find-result-cache';
import { OptionObject, OptionStore } from '../options/store';
import { Clusterer } from './clustering';
import { InputHistory } from './history';
import { QueryData, QueryStore } from './query-store';

type SearchResultsUIOptions = {
  imageSize: Size2d,
  smoothScroll: boolean,
  imageSizeFitToWindow: boolean,
};

type ExtraFindOptions = {
  delay: number,
  useCache: boolean,
};

class TextRangeError extends Error {
  constructor(message: string){
    super(message);
    this.name = "TextRangeError";
  }
}

class SearchResultsUI{
  private containerElt: HTMLElement;
  private imageSize: Size2d;
  private smoothScroll: boolean;
  private imageSizeFitToWindow: boolean;

  private flagWillClear: boolean;
  private focusedResultElt: HTMLElement | null;
  private selectedResultElt: HTMLElement | null;
  private noPreviewImageURL: string | null;
  private tabId: number | null;
  onSelected: SimpleEvent<void>;

  constructor(containerElt: HTMLElement, {imageSize, smoothScroll, imageSizeFitToWindow}: SearchResultsUIOptions){
    this.containerElt = containerElt;
    this.imageSize = imageSize;
    this.smoothScroll = smoothScroll;
    this.imageSizeFitToWindow = imageSizeFitToWindow;

    this.flagWillClear = false; // whether clear() when add() is called

    this.focusedResultElt = null;
    this.selectedResultElt = null;
    this.noPreviewImageURL = null;

    this.tabId = null;

    this.onSelected = new SimpleEvent<void>();

    this.setupKeyboardEvents();
  }

  setupKeyboardEvents(): void{
    document.body.addEventListener("keydown", this.keyPressed.bind(this), false);
  }

  keyPressed(e: KeyboardEvent): void{
    switch (e.key){
      case "Enter":
        if (this.focusedResultElt){
          this.focusedResultElt.click(); // TODO: make better
        }
        break;

      case "ArrowUp":
        doFocus(this, e, this.focusedResultElt == null
            ? this.containerElt.lastElementChild
            : this.focusedResultElt.previousSibling
        );
        break;

      case "ArrowDown":
        doFocus(this, e, this.focusedResultElt == null
              ? this.containerElt.firstElementChild
              : this.focusedResultElt.nextSibling
        );
        break;
    }

    function doFocus(_this: SearchResultsUI, e: KeyboardEvent, elt: Node | null){
      e.preventDefault();
      e.stopPropagation();

      if (elt == null){
        return;
      }
      _this.setFocusedResult(elt as HTMLElement);
      doScroll(elt as HTMLElement);
    }

    function doScroll(aElt: HTMLElement){
      const actions = computeScrollIntoView(aElt, {
        scrollMode: "if-needed",
        block: "nearest",
      });
      for (const {el, top} of actions){
        el.scrollTop = top;
        // ignore horizontal scroll
      }
    }
  }

  setTabId(tabId: number): void{
    this.tabId = tabId;
  }

  add(previewRect: Rect, imgURL: string | null, gotoID: number): void{
    if (this.flagWillClear){
      this.flagWillClear = false;
      this.clear();
    }

    const imgElt = this.createPreviewImage(
      imgURL || this.getNoPreviewImageURL(),
      previewRect
    );

    const aElt = document.createElement("A");
    aElt.className = "search-result-item-a";
    aElt.appendChild(imgElt);
    aElt.addEventListener("click", () => {
      this.onSearchResutClicked(aElt, gotoID);
    });

    this.containerElt.appendChild(aElt);
  }

  async onSearchResutClicked(aElt: HTMLElement, gotoID: number): Promise<void>{
    if (this.tabId == null){
      // should not happen
      throw "tabId is null";
    }

    this.setSelectedResult(aElt);
    try{
      await browser.tabs.update(this.tabId, {
        active: true
      });
      await Messages.sendToTab(this.tabId, "GotoID", {
        id: gotoID,
        smoothScroll: this.smoothScroll
      });
    }catch(e){
      this.showMessage("Page is no longer available");
      console.error(e);
      return;
    }
    this.onSelected.dispatch();
  }

  clear(): void{
    this.containerElt.innerHTML = "";
    this.focusedResultElt = null;
    this.selectedResultElt = null;
  }

  /** clear() when next add() is called
   *  This method can be used to avoid flickering.
   **/
  willClear(): void{
    this.flagWillClear = true;
  }

  async clearAll(): Promise<void>{
    this.clear();
    if (this.tabId == null){
      return;
    }
    if (this.tabId !== (await getActiveTabId())){
      return;
    }
    const result = await Messages.sendToTab(this.tabId, "Reset");
    if (!result){
      return;
    }
    if (result.success){
      browser.find.removeHighlighting();
    }
  }

  setFocusedResult(aElt: HTMLElement): void{
    if (this.focusedResultElt){
      this.focusedResultElt.classList.remove("search-result-item-focused");
    }
    aElt.classList.add("search-result-item-focused");
    this.focusedResultElt = aElt;
  }

  setSelectedResult(aElt: HTMLElement): void{
    this.setFocusedResult(aElt);
    if (this.selectedResultElt){
      this.selectedResultElt.classList.remove("search-result-item-selected");
    }
    aElt.classList.add("search-result-item-selected");
    this.selectedResultElt = aElt;
  }

  private createPreviewImage(imgURL: string, previewRect: Rect): HTMLElement{
    const imgElt = document.createElement("img");
    imgElt.className = "search-result-item-img";
    imgElt.src = imgURL;
    imgElt.style.width = `${this.imageSize.width}px`
    imgElt.style.height = `${this.imageSize.height}px`;
    if (this.imageSizeFitToWindow){
      imgElt.style.maxWidth = '100%';
    }
    //imgElt.title = JSON.stringify(previewRect) + this.containerElt.childNodes.length.toString();
    return imgElt;
  }

  private getNoPreviewImageURL(): string{
    if (this.noPreviewImageURL){
      return this.noPreviewImageURL;
    }
    const canvas = document.createElement("canvas");
    canvas.width = this.imageSize.width;
    canvas.height = this.imageSize.height;
    const ctx = canvas.getContext("2d")!;
    ctx.textBaseline = "top";
    ctx.font = "24px serif";
    ctx.fillText("No preview available", 10, 10);
    this.noPreviewImageURL = canvas.toDataURL("image/png");
    return this.noPreviewImageURL;
  }

  showMessage(text: string){
    const elt = document.getElementById("message-container")!;
    elt.textContent = text;
    elt.classList.add("message-show");
    elt.addEventListener("animationend", () => {
      elt.classList.remove("message-show");
    }, {once: true});
  }
}

type AppOptions = OptionObject & { popupMode: boolean };

class App{
  private popupMode: boolean;

  private previewSize: Size2d;
  private imageSize: Size2d;
  private useSmoothScroll: boolean;
  private useIncrementalSearch: boolean;
  private imageSizeFitToWindow: boolean;
  private delayAfterMutation: number;

  private delay: CancellableDelay;
  private pageChangeDelay: CancellableDelay;
  private pageFinder: PageFinder;
  private searchResultsUI: SearchResultsUI;
  private lastSearchQuery: string | null;
  private lastSearchTimestamp: Timestamp;
  private lastFindStartTimestamp: Timestamp;
  private camouflageMutex: Mutex;
  private inputHistory: InputHistory;
  private findResultCache: FindResultCache;

  constructor(options: AppOptions){
    this.popupMode = options.popupMode;

    this.previewSize = {
      width: Math.max(options.previewWidth, 100),
      height: Math.max(options.previewHeight, 40),
    };

    this.imageSize = options.imageSizeSameAsPreview ?
      this.previewSize : {
        width: Math.max(options.imageWidth, 100),
        height: Math.max(options.imageHeight, 40),
      };

    this.useSmoothScroll = options.useSmoothScroll;
    this.useIncrementalSearch = options.useIncrementalSearch;
    this.imageSizeFitToWindow = options.imageSizeFitToWindow;
    this.delayAfterMutation = 5000; // TODO: make configurable

    if (options.popupMode){
      document.body.style.width = `${this.imageSize.width+40}px`;
    }

    // BG detects when this window has closed
    browser.runtime.connect();

    this.delay = new CancellableDelay;
    this.pageChangeDelay = new CancellableDelay;
    this.pageFinder = new PageFinder;
    this.searchResultsUI = this.createSearchResultsUI({
      imageSize: this.imageSize,
      smoothScroll: this.useSmoothScroll,
      imageSizeFitToWindow: this.imageSizeFitToWindow,
    });
    this.lastSearchQuery = null;
    this.lastSearchTimestamp = new Timestamp;
    this.lastFindStartTimestamp = new Timestamp;
    this.findResultCache = new FindResultCache;
    this.setupSearchInput();
    this.setupSearchOptions();

    this.camouflageMutex = new Mutex;

    this.inputHistory = new InputHistory(
      document.getElementById("search-text-datalist")!,
      {
        storageKey: "history",
        maxHistory: options.maxHistory,
      }
    );

    this.restoreQuery();

    this.receivePageChangeMessages();
  }

  private receivePageChangeMessages(): void{
    const app = this;
    MessagesFindWindow.receive({
      async NotifyMutation(isonload: boolean, { sender } : { sender: browser.runtime.MessageSender }){
        console.log({ s: "mutation occured", isonload, sender });
        if (sender.tab != null && sender.frameId === 0 && sender.tab.id === await getActiveTabId()){
          app.pageChanged(isonload);
        }
      },
    });
    browser.tabs.onUpdated.addListener(async (tabId: number, { status } : { status?: string }) => {
      if (status === "complete" && tabId === await getActiveTabId()){
        app.pageChanged(true);
      }
      // @ts-ignore
    }, { properties: ["status"] });
    browser.tabs.onActivated.addListener(async ({ tabId }) => {
      if (tabId === await getActiveTabId()){
        app.pageChanged(true);
      }
    });
  }

  private async pageChanged(isonload: boolean): Promise<void>{
    switch (this.getAutoSearchOption()){
      case "none":
        return;
      case "on-page-load":
        if (!isonload){
          return;
        }
        break;
    }

    if (!isonload){
      if (this.pageChangeDelay.isExecuting()){
        return;
      }
      const delayMs = Math.max(0, this.delayAfterMutation - this.lastFindStartTimestamp.elapsedMillisecond());
      if (!this.pageChangeDelay.cancelAndExecute(delayMs)){
        return;
      }
    }
    this.submit({ delay: 0, useCache: !isonload });
  }

  private createSearchResultsUI(options: SearchResultsUIOptions): SearchResultsUI{
    const ui = new SearchResultsUI(
      document.getElementById("search-results-container")!,
      options
    );
    ui.onSelected.addListener( () => {
      if (this.lastSearchQuery != null){
        this.inputHistory.add(this.lastSearchQuery);
      }
    });
    return ui;
  }

  private setupSearchInput(): void{
    const inputElt = document.getElementById("search-text-input")!;
    document.addEventListener("load", () => { inputElt.focus() });
    inputElt.addEventListener("input", (e) => {
      if ((e as InputEvent).isComposing){
        return;
      }
      if (this.useIncrementalSearch){
        this.submit();
      }
    });
    inputElt.addEventListener("keydown", (e) => {
      switch (e.key){
        case "ArrowUp":
        case "ArrowDown":
          inputElt.blur();
          break;
        case "Enter":
          this.submit();
          break;
      }
    });
  }

  private setupSearchOptions(): void{
    const containerElt = document.getElementById("search-options-container")!;
    containerElt.addEventListener("change", (e) => {
      this.searchOptionChanged(e);
    });
    document.getElementById("search-options-toggle-show")!.addEventListener("change", (e) => {
      document.getElementById("search-options-container")!.style.display = (e.target as HTMLInputElement).checked ? "block" : "none";
    });

    document.getElementById("find-again-button")!.addEventListener("click", () => this.submit());
    document.getElementById("reset-button")!.addEventListener("click", this.reset.bind(this));
  }

  showResultCountMessage({q, count}: {q: string, count: number}){
    (document.getElementById("count-output") as HTMLOutputElement).value = q === "" ? "" : `${count} matches`;
  }

  setQuery(q: string): void{
    this.getInputElement("search-text-input").value = q;
    this.submit();
  }

  private async restoreQuery(): Promise<void>{
    const result = await QueryStore.load();
    if (result != null){
      this.getInputElement("search-text-input").value = result.query;
      this.getInputElement("case-sensitive-checkbox").checked = result.caseSensitive;
      this.getInputElement("entire-word-checkbox").checked = result.entireWord;
      this.getInputElement("restore-last-query-checkbox").checked = true;
      this.submit();
    }
  }

  async getWindowId(): Promise<number | undefined>{
    return (await browser.windows.getCurrent()).id;
  }

  private searchOptionChanged(e: Event): void{
    if ((e.target as HTMLElement).dataset.noSubmit != null){
      this.saveQueryMaybe();
    }else{
      this.submit();
    }
  }

  private getAutoSearchOption(): "none" | "on-page-load" | "on-page-modify" {
    return (document.getElementById("auto-search-select") as HTMLSelectElement).value as
      "none" | "on-page-load" | "on-page-modify";
  }

  private getQuery(): QueryData{
    const query = this.getInputElement("search-text-input").value
    const findOptions = {
      caseSensitive: this.getInputElement("case-sensitive-checkbox").checked,
      entireWord: this.getInputElement("entire-word-checkbox").checked,
    };
    return {
      query,
      ...findOptions,
    };
  }

  private saveQueryMaybe(): void{
    const saveQuery = this.getInputElement("restore-last-query-checkbox").checked;
    if (saveQuery){
      QueryStore.save(this.getQuery());
    }else{
      QueryStore.save(null);
    }
  }

  submit(options?: Partial<ExtraFindOptions>): void{
    this.saveQueryMaybe();
    const query = this.getQuery();
    this.findWithRetry(query.query, {
      caseSensitive: query.caseSensitive,
      entireWord: query.entireWord,
    }, options);
  }

  getInputElement(id: string): HTMLInputElement{
    return document.getElementById(id) as HTMLInputElement;
  }

  /**
   * @param q string to search
   * @param options pass to browser.find.find()
   **/
  async findWithRetry(q: string,
    findOptions: Partial<browser.find.FindOptions>,
    extraFindOptions: Partial<ExtraFindOptions> = {}): Promise<void>{

    const delay = extraFindOptions.delay == null ? this.getDelayForQuery(q) : extraFindOptions.delay;
    if (!await this.delay.cancelAndExecute(delay)){
      return;
    }

    const localDelay = new CancellableDelay;
    const findStartTime = this.lastFindStartTimestamp.update();

    let retryCount = 3;
    while (retryCount > 0 && !this.lastFindStartTimestamp.isUpdatedSince(findStartTime)){
      try{
        return await this.findStart(q, findOptions, extraFindOptions);
      }catch(e){
        if (e instanceof TextRangeError){
          console.log(`text range error: retry(${retryCount})`);
          retryCount--;
          await localDelay.cancelAndExecute(500);
          continue;
        }
      }
      break;
    }
  }

  /**
   * @param q string to search
   * @param options pass to browser.find.find()
   **/
  private async findStart(q: string,
    findOptions: Partial<browser.find.FindOptions>,
    extraFindOptions: Partial<ExtraFindOptions> = {}): Promise<void>{

    const tabId = await getActiveTabId();
    if (tabId == null){
      console.log("Cannot get an active tab");
      return;
    }

    const findResultPromise = this.findWithCamouflage(q, tabId, findOptions);

    if (!await this.delay.cancelAndExecute(300)){
      return;
    }

    const findResult = await findResultPromise;
    const count = findResult == null ? 0 : findResult.count;

    this.showResultCountMessage({q, count});

    if (findResult == null || count === 0){ // not found or query is empty
      this.searchResultsUI.clear();
      this.lastSearchTimestamp.update(); // finish existing preview listing
      return;
    }

    this.lastSearchQuery = q;

    const { rectData, rangeData } = findResult;
    if (typeof rectData == "undefined"){
      throw "rectData is undefined (shoud be a bug)";
    }
    if (typeof rangeData == "undefined"){
      throw "rangeData is undefined (shoud be a bug)";
    }
    const findResultUpdated = this.findResultCache.update(rectData);
    if (findResultUpdated || (extraFindOptions.useCache == null || !extraFindOptions.useCache)){
      await this.showPreviews(tabId, {rectData, rangeData});
    }else{
      console.log({ msg: "using cache for preview images", findResultUpdated });
    }
  }

  private async findWithCamouflage(q: string, tabId: number, findOptions: Partial<browser.find.FindOptions>){
    return this.camouflageMutex.transact( async () => {
      try{
        await Messages.sendToTab(tabId, "CamouflageInputs", q);
        return await this.pageFinder.find(q, {tabId, ...findOptions});
      }finally{
        await Messages.sendToTab(tabId, "UncamouflageInputs");
      }
    });
  }

  async showPreviews(tabId: number, {rectData, rangeData}: {
    rectData: browser.find.RectData[],
    rangeData: browser.find.RangeData[],
  }): Promise<void>{
    await Messages.sendToTab(tabId, "Start");

    const startTime = Date.now();

    const timestamp = this.lastSearchTimestamp.update(),
          clusterRanges = makeClusterRanges(rectData, rangeData, this.getClusterSize());

    this.searchResultsUI.setTabId(tabId);
    this.searchResultsUI.willClear();

    for (const clusterRange of clusterRanges){
      console.debug("clusterRange", clusterRange);
      const {rect, url, gotoID} = await this.takeScreenshotForCluster(tabId, clusterRange);

      if (this.lastSearchTimestamp.isUpdatedSince(timestamp)){
        console.log("last search timestamp updated while taking screenshots, exit");
        break;
      }

      this.searchResultsUI.add(rect, url, gotoID);
    }

    const finishTime = Date.now();

    console.log(`All preview images created in ${(finishTime-startTime)/1000} sec`);
  }

  getClusterSize(): Size2d{
    return {
      width : Math.max(this.previewSize.width - 40, 0),
      height: Math.max(this.previewSize.height - 20, 0),
    };
  }

  async takeScreenshotForCluster(tabId: number, clusterRange: ClusterRange): Promise<ScreenshotResult>{
    try{
      const result = await Messages.sendToTab(tabId, "Screenshot", {
        clusterRect: clusterRange.rect,
        ranges: clusterRange.ranges,
        ssSize: this.previewSize,
      });
      if (result == null){
        throw "Cannot take screenshot";
      }
      if ('error' in result){
        throw new TextRangeError(result.error);
      }
      return result;
    }catch(e){
      console.log({s: "takeScreenshotForCluster", e});
      throw e;
    }
  }

  getDelayForQuery(q: string): number{
    if (!this.useIncrementalSearch){
      return 0;
    }

    switch (q.length){
      case 1: return 800;
      case 2: return 400;
      case 3: return 200;
      default: return 100;
    }
  }

  reset(): void{
    (document.getElementById("search-text-input") as HTMLInputElement).value = "";
    this.searchResultsUI.clearAll();
    this.lastSearchTimestamp.update();
    (document.getElementById("count-output") as HTMLInputElement).value = "";
  }
}

async function startApp(): Promise<void>{
  const options = await OptionStore.load(),
        searchParams = new URLSearchParams(location.search);

  setStyles(options)

  //@ts-ignore
  window["App"] = new App({
    ...options,
    popupMode: parseInt(searchParams.get("popup") || "") > 0,
  });
}

startApp();

function setStyles(options: OptionObject){
  const keys = {
    "fgColorInput": true,
    "bgColorInput": true,
    "fgColorSearchForm": true,
    "bgColorSearchForm": true,
    "bgColorSearchFormHover": true,
    "bgColorSearchResult": true,
    "borderColor": true,
    "borderColorSelected": true,
  };
  for (const propName of (Object.keys(keys) as (keyof typeof keys)[])){
    document.documentElement.style.setProperty("--" + propName, options[propName]);
  }
}

function makeClusterRanges(rectData: browser.find.RectData[], rangeData: browser.find.RangeData[], clusterSize: Size2d): ClusterRange[]{
  const yesRects: RectWithValue<number>[] = [],
        noRectIndices: number[] = [];

  rectData.forEach( (rdElt,i) => {
    if (rangeData[i].framePos !== 0){
      return; // ignore inline frames
    }
    const rdPos = rdElt.rectsAndTexts.rectList[0];
    if (rdPos == null){ // maybe rect is out of window? (FF61)
      noRectIndices.push(i);
    }else{
      yesRects.push({
        x: rdPos.left,
        y: rdPos.top,
        w: rdPos.right - rdPos.left,
        h: rdPos.bottom - rdPos.top,
        value: i
      });
    }
  });

  return Clusterer.execute(yesRects, clusterSize).map<ClusterRange>( (cluster) => (
    {
      indices: cluster.values,
      rect: cluster,
      containedRects: cluster.indices.map( (i) => yesRects[i] ),
      ranges: cluster.values.map( (i) => rangeData[i] ),
    }
  )).concat(noRectIndices.map( (i) => (
    {
      indices: [i],
      rect: null,
      containedRects: null,
      ranges: [rangeData[i]]
    }
  ))).sort( ({ranges: [range1]}, {ranges: [range2]}) =>
    range1.startTextNodePos - range2.startTextNodePos ||
    range1.startOffset - range2.startOffset
  );
}

async function getActiveTabId(): Promise<number | null>{
  const [tab, ...rest] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  console.assert(rest.length === 0, "multiple active tabs");
  if (tab && tab.id != null){
    return tab.id;
  }else{
    return null;
  }
}