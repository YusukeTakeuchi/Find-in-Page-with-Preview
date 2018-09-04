class Timestamp{
  constructor(){
    this.lastUpdate = Date.now();
  }

  update(){
    this.lastUpdate = Date.now();
    return this.lastUpdate;
  }

  isUpdatedSince(time){
    return this.lastUpdate > time;
  }
}
