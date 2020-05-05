/** Observe popup windows **/
browser.runtime.onConnect.addListener( (port) => {
  port.onDisconnect.addListener( () => {
    resetFind();
  });
});

function resetFind(): void{
  browser.find.removeHighlighting();
}
