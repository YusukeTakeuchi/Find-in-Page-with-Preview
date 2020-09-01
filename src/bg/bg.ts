import { OptionStore } from "../options/store"
import { setupContextMenu } from "../context-menu/context-menu"
import { MessagesBG } from "../messages/messages"

function init(){
  /** Observe popup windows **/
  browser.runtime.onConnect.addListener( (port) => {
    port.onDisconnect.addListener( () => {
      resetFind();
    });
  });

  initContextMenu();
}

function resetFind(): void{
  browser.find.removeHighlighting();
}

async function initContextMenu(){
  const options = await OptionStore.load();
  setupContextMenu({
    popup: options.showContextMenuPopup,
    sidebar: options.showContextMenuSidebar,
  });
}

MessagesBG.receive({
  SetContextMenu({ popup, sidebar }){
    // BG need to do this because the option page cannot execute commands after it is closed
    setupContextMenu({ popup, sidebar });
  }
})

init();