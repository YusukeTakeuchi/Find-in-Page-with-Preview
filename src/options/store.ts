const DefaultValues = {
  useIncrementalSearch: true,

  useSmoothScroll: true,

  previewWidth: 400,
  previewHeight: 150,

  imageSizeSameAsPreview: true,
  imageSizeFitToWindow: true,

  imageWidth: 400,
  imageHeight : 150,

  fgColorInput: "#000000",
  bgColorInput: "#ffffff",

  fgColorSearchForm: "#000000",
  bgColorSearchForm: "#ffffff",
  bgColorSearchFormHover: "#ddddff",

  bgColorSearchResult: "#ffeeee",

  borderColor: "#000000",
  borderColorSelected: "#FF0000",

  maxHistory: 20,

  shortcutPopupEnabled: false,
  shortcutPopupModifier: "",
  shortcutPopupModifier2: "",
  shortcutPopupKey: "",

  shortcutSidebarEnabled: false,
  shortcutSidebarModifier: "",
  shortcutSidebarModifier2: "",
  shortcutSidebarKey: "",

  showContextMenuPopup: true,
  showContextMenuSidebar: false,
};

type OptionObject = typeof DefaultValues;

const OptionStore = {
  async load(): Promise<OptionObject>{
    const obj = await browser.storage.local.get({
      [this.storageKey]: DefaultValues,
    });
    return {
      ...DefaultValues,
      ...obj[this.storageKey],
    }
  },

  async save(obj: {}): Promise<void>{
    this.checkValues(obj);
    await browser.storage.local.set({
      [this.storageKey]: obj
    });
  },

  checkValues(obj: {}): void{
    const errors = [];
    for (const [key,val] of Object.entries(obj)){
      if (!(key in DefaultValues)){
        errors.push(`Unknown key: ${key}`);
        continue;
      }
      // @ts-ignore
      const dv = DefaultValues[key];
      if (dv != null && typeof dv !== typeof val){
        errors.push(`Value for ${key} should have type ${typeof dv} (actual: ${JSON.stringify(val)})`);
      }
    }
    if (errors.length !== 0){
      console.error("Error saving options", errors);
      throw new Error("Invalid option values");
    }
  },

  storageKey: "options"
};

export {
  DefaultValues,
  OptionObject,
  OptionStore,
};