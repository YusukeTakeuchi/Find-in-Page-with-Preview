Messaging = {
  receive(recv){
    browser.runtime.onMessage.addListener( ({command,args}, sender) => {
      args.command = command;
      args.sender = sender;
      const method = recv["on" + command];
      if (method){
        return Promise.resolve(method.call(recv, args));
      }else{
        return Promise.reject(`cannot handle message: ${command}`);
      }
    });
  },

  async sendToBG(command, args={}){
    return browser.runtime.sendMessage( {command, args});
  },

  async sendToTab(tabId, command, args={}){
    return browser.tabs.sendMessage(tabId, {command, args});
  },

  async sendToActiveTab(command, args={}){
    const tabs = await browser.tabs.query({
      currentWindow: true,
      active: true,
    });
    if (tabs.length !== 1){
      throw new Messaging.Error("Failed to get active tab");
    }
    return this.sendToTab(tabs[0].id, command, args);
  },
}

Messaging.Error = class extends Error{};
