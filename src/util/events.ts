type SimpleEventListener<T> = (data: T) => void;

export class SimpleEvent<T> {
  private listeners: Set<SimpleEventListener<T>>;

  constructor(){
    this.listeners = new Set<SimpleEventListener<T>>();
  }

  addListener(listener: SimpleEventListener<T>){
    this.listeners.add(listener);
    return this;
  }

  hasListener(listener: SimpleEventListener<T>){
    return this.listeners.has(listener);
  }

  removeListener(listener: SimpleEventListener<T>){
    return this.listeners.delete(listener);
  }

  dispatch(data: T){
    for (const listener of this.listeners){
      listener(data);
    }
  }

}