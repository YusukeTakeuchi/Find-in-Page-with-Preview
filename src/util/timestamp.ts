export class Timestamp{
  private lastUpdate: number;

  constructor(){
    this.lastUpdate = Date.now();
  }

  update(): number{
    this.lastUpdate = Date.now();
    return this.lastUpdate;
  }

  isUpdatedSince(time: number): boolean{
    return this.lastUpdate > time;
  }
}
