class SimpleEvent {
  constructor(){
    this.listeners = new Set
  }

  addListener(listener){
    this.listeners.add(listener);
    return this;
  }

  hasListener(listener){
    return this.listeners.has(listener);
  }

  removeListener(listener){
    return this.listeners.delete(listener);
  }

  dispatch(data){
    for (const listener of this.listeners){
      listener(data);
    }
  }

}
