OptionStore = {
  async load(){
    const obj = await browser.storage.local.get({
      [this.storageKey]: this.defaultValues,
    });
    return {
      ...this.defaultValues,
      ...obj[this.storageKey],
    }
  },

  async save(obj){
    this.checkValues(obj);
    await browser.storage.local.set({
      [this.storageKey]: obj
    });
  },

  checkValues(obj){
    const errors = [];
    for (const [key,val] of Object.entries(obj)){
      if (!(key in this.defaultValues)){
        errors.push(`Unknown key: ${key}`);
        continue;
      }
      const dv = this.defaultValues[key];
      if (dv != null && typeof dv !== typeof val){
        errors.push(`Value for ${key} should have type ${typeof dv} (actual: ${JSON.stringify(val)})`);
      }
    }
    if (errors.length !== 0){
      console.error("Error saving options", errors);
      throw new Error("Invalid option values");
    }
  },

  defaultValues  : {
    useSmoothScroll: true,

    previewWidth: 400,
    previewHeight: 150,

    imageSizeSameAsPreview: true,

    imageWidth: 400,
    imageHeight : 150,

    fgColorInput: "#000000",
    bgColorInput: "#ffffff",

    fgColorSearchForm: "#000000",
    bgColorSearchForm: "#ffffff",
    bgColorSearchFormHover: "#ddddff",

    bgColorSearchResult: "#ffeeee",

    maxHistory: 20,

    shortcutPopupEnabled: false,
    shortcutPopupModifier: "",
    shortcutPopupModifier2: "",
    shortcutPopupKey: "",

    shortcutSidebarEnabled: false,
    shortcutSidebarModifier: "",
    shortcutSidebarModifier2: "",
    shortcutSidebarKey: "",
  },

  storageKey: "options"
};
