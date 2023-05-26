/**
 * 
 * @returns Epoch time de la fecha actual
 */
exports.getCurrentDate = () => {
  return Date.now();
}

/**
 * 
 * @param {String} str un string con el tiempo que ha pasado desde la fecha que se quiere obtener
 *    la string se monta de la siguiente manera:
 *      numero1tiempo1 numero2tiempo2
 *    por ejemplo:
 *      "2D 12h"  -> hace dos dias y 12 horas
 * 
 * @returns Epoch time de la fecha pasada
 */
exports.getPastDate = (str) => {
  let dates = str.split(" ");
  let pas = 0;

  for(let i = 0; i < dates.length; i++){
    switch(dates[i].charAt(dates[i].length - 1)){
      case "s":
        pas += 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "m":
        pas += 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "h":
        pas += 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "D":
        pas += 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "W":
        pas += 7 * 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "M":
        pas += 30 * 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
    }
  }

  return Date.now() - pas;
  
}

exports.getBaseDate = (str) => {
  let dates = str.split(" ");
  let pas = 0;

  for(let i = 0; i < dates.length; i++){
    switch(dates[i].charAt(dates[i].length - 1)){
      case "s":
        pas += 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "m":
        pas += 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "h":
        pas += 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "D":
        pas += 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "W":
        pas += 7 * 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
      case "M":
        pas += 30 * 24 * 60 * 60 * 1000 * Number.parseInt(dates[i].substring(0, dates[i].length - 1));
        break;
    }
  }

  return pas;
}

exports.dateToEpoch = (date) => {  
  return date.getTime();
}

exports.prettyNumber = (num) => { return (num < 10) ? "0" + num : num; }

exports.getDayAndHour = (epoch) => {
  let date = new Date(epoch);
  const DAYS = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];

  return DAYS[date.getDay()] + " " + date.getDate() + ", " + this.prettyNumber(date.getHours()) + ":" + this.prettyNumber(date.getMinutes()) + ":" + this.prettyNumber(date.getSeconds());
}

exports.getEpochFromDayAndHour = (date, month=null, year=null) => {
  let out = new Date();
  let hours = date.split(",")[1].slice(1);
  let day = Number.parseInt(date.split(" ")[1].substring(0, date.split(" ")[1].length));

  if(year != null)
    out.setFullYear(year);
  if(month != null)
    out.setMonth(month - 1);

  let h = Number.parseInt(hours.split(":")[0]);
  let m = Number.parseInt(hours.split(":")[1]);
  let s = Number.parseInt(hours.split(":")[2]);
  
  out.setDate(day);
  out.setHours(h, m, s);

  return out;
}


exports.getISOString = (epoch) => {
  return (new Date(epoch)).toISOString();
}

exports.toLocaleString = (epoch) => {
  return (new Date(epoch)).toLocaleString();
}

exports.getString = (epoch) => {
  return (new Date(epoch)).toString();
}


exports.generateTimeCounter = () => {
  let cdf = this.getCurrentDate;
  let lastEpoch = cdf();

  function pressCounter() {
    let out = cdf() - lastEpoch;
    lastEpoch = cdf();
    return out;
  }

  return pressCounter
}