let dateUtils = require("./dateUtils");

exports.log = (module, message, tags=[]) => {
  let out = "";

  out += "[" + dateUtils.toLocaleString(dateUtils.getCurrentDate()) + "]";
  out += "[" + module + "]";

  if(tags.length > 0)
    out += "(";
    
  for(let i = 0; i < tags.length; i++){
    out += tags[i] + ((i < tags.length - 1) ? ", " : "");
  }
    
  if(tags.length > 0)
    out += ")";

  out += ": " + message;

  console.log(out);
}