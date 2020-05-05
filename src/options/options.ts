import { DefaultValues, OptionStore } from './store';

type OptionObject = typeof DefaultValues;
type OptionObjectPartial = Partial<OptionObject>;

type FormControl = HTMLInputElement;

type OptionForm = HTMLFormElement & {
  elements: {
    [key: string]: any,
  }
};

document.addEventListener("DOMContentLoaded", initPage);

async function initPage(): Promise<void>{
  const options = await OptionStore.load(),
        form = document.getElementById("main-form") as OptionForm;
  setFormValues(form, options);
  setFormAttrs(form);

  form.addEventListener("change", () => {
    saveOptions(form);
    setFormAttrs(form);
    updateShortcutKeys(form);
  });
}

function setFormValues(form: HTMLFormElement, options: any){
  for (const elt of Array.from(form.elements) as Array<FormControl>){
    setInputValue(elt, options[elt.name]);
  }
}

function setInputValue(elt: FormControl, value: any){
  if (elt.type.toLowerCase() === "checkbox"){
    elt.checked = value;
  }else{
    elt.value = value;
  }
}


function saveOptions(form: HTMLFormElement){
  const obj: OptionObjectPartial = {};
  for (const elt of Array.from(form.elements) as Array<FormControl>){
    const value = getInputValue(elt);
    if (value != null){
      // @ts-ignore
      obj[elt.name] = value;
    }
  }
  OptionStore.save(obj);
}


function getInputValue(elt: HTMLInputElement){
  switch (elt.type.toLowerCase()){
    case "checkbox":
      return elt.checked;
    case "number":
      return elt.valueAsNumber;
    default:
      return elt.value;
  }
}

function setFormAttrs(form: OptionForm){
  form.elements["groupImageSize"].disabled = form.elements["imageSizeSameAsPreview"].checked;
}

async function updateShortcutKeys(form: OptionForm){
  let successPopupPromise: Promise<void>,
      successSidebarPromise: Promise<void>;

  const shortcutPopup =
    form.elements["shortcutPopupEnabled"].checked &&
    buildShortcutString(
      form.elements["shortcutPopupModifier"].value,
      form.elements["shortcutPopupModifier2"].value,
      form.elements["shortcutPopupKey"].value
    );
  if (shortcutPopup){
    try{
      // @ts-ignore (commands.update is not defined yet)
      successPopupPromise = browser.commands.update({
        name: "_execute_browser_action",
        shortcut: shortcutPopup
      });
    }catch(e){
      successPopupPromise = Promise.reject();
    }
  }else{
    // @ts-ignore (commands.reset is not defined yet)
    successPopupPromise = browser.commands.reset("_execute_browser_action");
  }

  const shortcutSidebar =
    form.elements["shortcutSidebarEnabled"].checked &&
    buildShortcutString(
      form.elements["shortcutSidebarModifier"].value,
      form.elements["shortcutSidebarModifier2"].value,
      form.elements["shortcutSidebarKey"].value
    );
  if (shortcutSidebar){
    try{
      // @ts-ignore
      successSidebarPromise = browser.commands.update({
        name: "_execute_sidebar_action",
        shortcut: shortcutSidebar
      });
    }catch(e){
      successSidebarPromise = Promise.reject();
    }
  }else{
    // @ts-ignore
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

  function onSuccess(resultEltId: string){
    return () => {
      const elt = document.getElementById(resultEltId);
      if (elt == null){
        throw `element not found: ${resultEltId}`;
      }
      elt.classList.add("shortcut-valid");
      elt.classList.remove("shortcut-invalid");
    };
  }

  function onFail(resultEltId: string){
    return () => {
      const elt = document.getElementById(resultEltId);
      if (elt == null){
        throw `element not found: ${resultEltId}`;
      }
      elt.classList.add("shortcut-invalid");
      elt.classList.remove("shortcut-valid");
    };
  }
}

/**
 * @param m1 modifier
 * @param m2 second modifier
 * @param key
 **/
function buildShortcutString(m1: string, m2: string, key: string): string{
  return [m1, m2, key].filter( item => item != null && item !== "").join("+");
}
