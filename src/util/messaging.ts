type Receiver = {
  [command: string]: (arg:any, meta:any) => any
}

type Meta<T> = {
  command: keyof T,
  sender: browser.runtime.MessageSender,
}

type CommandArg<T> = {
  [Cmd in keyof T]:
    T[Cmd] extends ( () => any ) // if the listener method takes no argument, sendToXX methods don't require an argument either
      ? []
      : [T[Cmd] extends (arg: infer A, meta: Meta<T>) => (infer X) ? A : never]
}

type CommandResult<T> = {
  [Cmd in keyof T]: T[Cmd] extends (arg: infer A, meta: Meta<T>) => (Promise<infer X> | infer X) ? X : never
}

type Message<T, C extends keyof T> = {
  command: C,
  args: CommandArg<T>[C],
}


export class Messaging<T extends Receiver>{
  constructor(){

  }

  receive<R extends T>(receiver: R){
    // @ts-ignore
    browser.runtime.onMessage.addListener( ({command, args}: { command: keyof T, args: any }, sender: browser.runtime.MessageSender) => {
      const meta = { command, sender };
      const method = receiver[command];
      if (method){
        return Promise.resolve(method.call(receiver, args, meta));
      }else{
        // just ignore unknown messages
        //return Promise.reject(`cannot handle message: ${command}`);
      }
    });
  }
  async sendToBG<C extends keyof T>(command: C, ...argsMaybe: CommandArg<T>[C]): Promise<CommandResult<T>[C]>{
    return browser.runtime.sendMessage( {command, args: argsMaybe.length > 0 ? argsMaybe[0] : null });
  }

  async sendToTab<C extends keyof T>(tabId: number, command: C, ...argsMaybe: CommandArg<T>[C]): Promise<CommandResult<T>[C] | void>{
    return browser.tabs.sendMessage(tabId, {command, args: argsMaybe.length > 0 ? argsMaybe[0] : null });
  }

  async sendToActiveTab<C extends keyof T>(command: C, ...args: CommandArg<T>[C]): Promise<CommandResult<T>[C] | void>{
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    if (tabs.length !== 1 || tabs[0].id == null){
      throw "Failed to get active tab";
    }
    return this.sendToTab(tabs[0].id, command, ...args);
  }
}