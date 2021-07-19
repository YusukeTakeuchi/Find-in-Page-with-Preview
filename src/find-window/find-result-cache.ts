type RectData = browser.find.RectData;

export class FindResultCache{
  private rectData: RectData[] | null;

  constructor(){
    this.rectData = null;
  }

  update(newRectData: RectData[]): boolean{
    const equal = (this.rectData != null) && this.isEqualRectData(this.rectData, newRectData);
    if (!equal){
      this.rectData = newRectData;
    }
    return !equal;
  }

  private isEqualRectData(rd1: RectData[], rd2: RectData[]): boolean{
    if (rd1.length !== rd2.length){
      return false;
    }
    return rd1.every((val1, i) => {
      const val2 = rd2[i];
      const rectList1 = val1.rectsAndTexts.rectList;
      const rectList2 = val2.rectsAndTexts.rectList;
      if (rectList1.length !== rectList2.length){
        return false;
      }
      return rectList1.every((rectItem1, j) => {
        const rectItem2 = rectList2[j];
        return rectItem1.top === rectItem2.top &&
          rectItem1.right === rectItem2.right &&
          rectItem1.bottom === rectItem2.bottom &&
          rectItem1.right === rectItem2.right;
      });
    });
  }
}