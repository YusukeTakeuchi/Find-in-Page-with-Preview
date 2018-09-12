class InputHistory{
  constructor(datasetElt, {storageKey, maxHistory}){
    this.datasetElt = datasetElt;
    this.storageKey = storageKey;
    this.maxHistory = maxHistory;

    this.loadHistory();
  }

  async add(q){
    await this.loadHistory()

    let optionEltToPrepend;
    for (const option of Array.from(this.datasetElt.children)){
      if (option.value === q){
        option.remove();
        optionEltToPrepend = option;
        break;
      }
    }
    if (optionEltToPrepend == null){
      optionEltToPrepend = document.createElement("option");
      optionEltToPrepend.value = q;
    }
    this.datasetElt.insertAdjacentElement("afterbegin", optionEltToPrepend);
    while (this.datasetElt.children.length > this.maxHistory){
      this.datasetElt.lastElementChild.remove();
    }

    await this.saveHistory();
  }

  async saveHistory(){
    const items = Array.from(this.datasetElt.children).map( (optionElt) =>
      optionElt.value
    ).slice(0, this.maxHistory);
    await browser.storage.local.set({
      [this.storageKey]: items,
    });
  }

  async loadHistory(){
    const {[this.storageKey]: rawItems} = await browser.storage.local.get({
      [this.storageKey]: []
    });

    const items = rawItems.slice(0, this.maxHistory);

    this.datasetElt.innerHTML = "";
    for (const item of items){
      const optionElt = document.createElement("option");
      optionElt.value = item;
      this.datasetElt.appendChild(optionElt);
    }
  }
}
