document.addEventListener("DOMContentLoaded", initPage);

async function initPage(){
  const options = await OptionStore.load(),
        form = document.getElementById("main-form")
  setFormValues(form, options);
  setFormAttrs(form);

  form.addEventListener("change", () => {
    saveOptions(form);
    setFormAttrs(form);
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
