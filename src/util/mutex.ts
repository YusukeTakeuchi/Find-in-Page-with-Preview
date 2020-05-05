type ResolveType = () => void;

export class Mutex {
  private locked: boolean;

  private queue: ResolveType[];

  constructor(){
    this.locked = false;
    this.queue = [];
  }

  async transact<T>(exec: () => (T | Promise<T>)): Promise<T>{
    try{
      await this.lock();
      return (await exec()); // OK if exec is not an async function
    }finally{
      this.unlock();
    }
  }

  lock(): Promise<void>{
    if (this.locked){
      return new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }else{
      this.locked = true;
      return Promise.resolve();
    }
  }

  unlock(): void{
    if (this.queue.length == 0){
      this.locked = false;
    }else{
      //console.log(this.queue);
      this.queue.shift()!();
    }
  }

}
