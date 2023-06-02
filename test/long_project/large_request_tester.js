const cp = require("child_process");

(async () => {
  for(let i = 0; i < +process.argv[2]; i++) {
    console.log("Request [" + i + "]");
    cp.spawn("apolemia.bat", ["py", "main.py"], { encoding : 'utf8' });
  }
})()