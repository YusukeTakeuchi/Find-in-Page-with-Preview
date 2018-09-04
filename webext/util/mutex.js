class Mutex {
  constructor(){
    this.locked = false;
    this.queue = [];
  }

  async transact(exec){
    try{
      await this.lock();
      return (await exec()); // OK if exec is not an async function
    }finally{
      this.unlock();
    }
  }

  lock(){
    if (this.locked){
      return new Promise((resolve) => {
        this.queue.push(resolve);
      });
    }else{
      this.locked = true;
      return Promise.resolve();
    }
  }

  unlock(){
    if (this.queue.length == 0){
      this.locked = false;
    }else{
      //console.log(this.queue);
      this.queue.shift()();
    }
  }

}
