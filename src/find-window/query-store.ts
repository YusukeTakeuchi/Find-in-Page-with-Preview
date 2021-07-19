
type QueryData = {
  query: string,
  caseSensitive: boolean,
  entireWord: boolean,
}

const QueryStore = {

  save(qd: QueryData | null): Promise<void>{
    return browser.storage.local.set({
      [this.storageKey]: qd,
    });
  },

  async load(): Promise<QueryData | null> {
    const val = await browser.storage.local.get({
      [this.storageKey]: null
    });
    if (val == null){
      return null;
    }else{
      return val[this.storageKey];
    }
  },

  storageKey: "query-store",
}

export {
  QueryData,
  QueryStore,
}