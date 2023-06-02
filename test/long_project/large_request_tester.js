const cp = require("child_process");

(async () => {
  for(let i = 0; i < +process.argv[2]; i++) {
    await new Promise(r => {setTimeout(r, 100)});
    console.log("Request [" + i + "]");
    cp.spawn("apolemia.sh", ["python3", "main.py"], { encoding : 'utf8' });
  }
})()