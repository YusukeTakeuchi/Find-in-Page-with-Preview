class CancellableDelay{
  constructor(){
    this.timer = null;
    this.lastExecutionReject = null;
  }

  cancel(){
    if (this.timer != null){
      clearTimeout(this.timer);
      this.lastExecutionReject(CancellableDelay.Cancelled);
      this.timer = null;
      this.lastExecutionReject = null;
    }
  }

  /** Cancel the previous execution and run new one
   *  @param {number} ms milliseconds to be delayed
   *  @return {Promise.<boolean>} A Promise resolved ms milliseconds later,
   *      populated with false if canceled, true otherwise.
   **/
  async cancelAndExecute(ms){
    this.cancel();

    try{
      await new Promise((resolve,reject) => {
        this.lastExecutionReject = reject;
        this.timer = setTimeout(() => {
          resolve();
        }, ms);
      });
      this.lastExecutionReject = null;
      this.timer = null;
      return true;
    }catch(e){
      if (e === CancellableDelay.Cancelled){
        return false;
      }else{
        // this should not happen
        throw e;
      }
    }
  }
}

CancellableDelay.Cancelled = Symbol("Cancelled");
