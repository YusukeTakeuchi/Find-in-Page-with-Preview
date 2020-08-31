import { OptionStore } from "../options/store"
import { setupContextMenu } from "../context-menu/context-menu"

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

init();