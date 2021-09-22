import { CancellableDelay } from "../util/cancellable-delay"

function setupContextMenu({ popup, sidebar }: { popup: boolean, sidebar: boolean }){
  browser.menus.removeAll();

  if (popup){
    browser.menus.create({
      title: "Find in Page (Popup)",
      contexts: ["selection"],
      async onclick(info, tab){
        await browser.browserAction.openPopup();
        const q = info.selectionText;
        if (q){
          openAndWaitForFindWindow(q.trim(), "popup", null);
        }
      }
    });
  }

  if (sidebar){
    browser.menus.create({
      title: "Find in Page (Sidebar)",
      contexts: ["selection"],
      async onclick(info, tab){
        browser.sidebarAction.open();
        const q = info.selectionText;
        if (q){
          const curWin = await browser.windows.getCurrent();
          openAndWaitForFindWindow(q.trim(), "sidebar", curWin.id);
        }
      }
    });
  }
}

const RetryCount = 50;
const WaitMs = 100;

async function openAndWaitForFindWindow(q: string, type: "popup" | "sidebar", windowId: number | null | undefined){
  const delay = new CancellableDelay;
  // wait for a popup to open and be initialized
  retry: for (let i=0; i<RetryCount; i++){
    // @ts-ignore
    const windows = browser.extension.getViews({ type });
    for (const win of windows){
      // @ts-ignore
      const app = win.App;
      if (app != null && (windowId == null || (await app.getWindowId()) == windowId ) && app.isInitialized()){
        app.setQuery(q);
        break retry;
      }
    }
    console.debug("waiting for a popup to open", i);
    await delay.cancelAndExecute(WaitMs);
  }
}

export {
  setupContextMenu,
}