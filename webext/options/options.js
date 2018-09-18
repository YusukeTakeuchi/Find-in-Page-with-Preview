document.addEventListener("DOMContentLoaded", initPage);

async function initPage(){
  const options = await OptionStore.load(),
        form = document.getElementById("main-form")
  setFormValues(form, options);
  setFormAttrs(form);

  form.addEventListener("change", () => {
    saveOptions(form);
    setFormAttrs(form);
    updateShortcutKeys(form);
  });
}

function setFormValues(form, options){
  for (const elt of Array.from(form.elements)){
    setInputValue(elt, options[elt.name]);
  }
}

function setInputValue(elt, value){
  if (elt.type.toLowerCase() === "checkbox"){
    elt.checked = value;
  }else{
    elt.value = value;
  }
}


function saveOptions(form){
  const obj = {};
  for (const elt of Array.from(form.elements)){
    const value = getInputValue(elt);
    if (value != null){
      obj[elt.name] = value;
    }
  }
  OptionStore.save(obj);
}


function getInputValue(elt){
  switch (elt.type.toLowerCase()){
    case "checkbox":
      return elt.checked;
    case "number":
      return elt.valueAsNumber;
    default:
      return elt.value;
  }
}

function setFormAttrs(form){
  form.elements.groupImageSize.disabled = form.elements.imageSizeSameAsPreview.checked;
}

async function updateShortcutKeys(form){
  let successPopupPromise, successSidebarPromise;

  const shortcutPopup =
    form.elements.shortcutPopupEnabled.checked &&
    buildShortcutString(
      form.elements.shortcutPopupModifier.value,
      form.elements.shortcutPopupModifier2.value,
      form.elements.shortcutPopupKey.value
    );
  if (shortcutPopup){
    try{
      successPopupPromise = browser.commands.update({
        name: "_execute_browser_action",
        shortcut: shortcutPopup
      });
    }catch(e){
      successPopupPromise = Promise.reject();
    }
  }else{
    successPopupPromise = browser.commands.reset("_execute_browser_action");
  }

  const shortcutSidebar =
    form.elements.shortcutSidebarEnabled.checked &&
    buildShortcutString(
      form.elements.shortcutSidebarModifier.value,
      form.elements.shortcutSidebarModifier2.value,
      form.elements.shortcutSidebarKey.value
    );
  if (shortcutSidebar){
    try{
      successSidebarPromise = browser.commands.update({
        name: "_execute_sidebar_action",
        shortcut: shortcutSidebar
      });
    }catch(e){
      successSidebarPromise = Promise.reject();
    }
  }else{
    successSidebarPromise = browser.commands.reset("_execute_sidebar_action");
  }

  successPopupPromise.then(
    onSuccess("shortcut-popup-result"),
    onFail("shortcut-popup-result")
  );

  successSidebarPromise.then(
    onSuccess("shortcut-sidebar-result"),
    onFail("shortcut-sidebar-result")
  );

  function onSuccess(resultEltId){
    return () => {
      const elt = document.getElementById(resultEltId);
      elt.classList.add("shortcut-valid");
      elt.classList.remove("shortcut-invalid");
    };
  }

  function onFail(resultEltId){
    return () => {
      const elt = document.getElementById(resultEltId);
      elt.classList.add("shortcut-invalid");
      elt.classList.remove("shortcut-valid");
    };
  }
}

/**
 * @param {?string} m1 modifier
 * @param {?string} m2 second modifier
 * @param {?string} key
 **/
function buildShortcutString(m1, m2, key){
  return [m1, m2, key].filter( item => item != null && item !== "").join("+");
}
