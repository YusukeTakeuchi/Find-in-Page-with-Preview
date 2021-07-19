const Cancelled = Symbol("Cancelled");

export class CancellableDelay{
  private timer: number | null;

  private lastExecutionReject: ((c: typeof Cancelled) => void) | null;

  constructor(){
    this.timer = null;
    this.lastExecutionReject = null;
  }

  isExecuting(){
    return this.timer != null && this.lastExecutionReject != null;
  }

  cancel(){
    if (this.timer != null && this.lastExecutionReject != null){
      clearTimeout(this.timer);
      this.lastExecutionReject(Cancelled);
      this.timer = null;
      this.lastExecutionReject = null;
    }
  }

  /** Cancel the previous execution and run new one
   *  @param ms milliseconds to be delayed
   *  @return A Promise resolved ms milliseconds later,
   *      populated with false if canceled, true otherwise.
   **/
  async cancelAndExecute(ms: number): Promise<boolean>{
    this.cancel();

    try{
      await new Promise((resolve,reject) => {
        this.lastExecutionReject = reject;
        this.timer = window.setTimeout(() => {
          resolve(null);
        }, ms);
      });
      this.lastExecutionReject = null;
      this.timer = null;
      return true;
    }catch(e){
      if (e === Cancelled){
        return false;
      }else{
        // this should not happen
        throw e;
      }
    }
  }
}

