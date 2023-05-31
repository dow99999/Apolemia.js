let fs = require("fs");


fs.writeFileSync("test.txt", "Hola mundo distribuido")

console.log("Ejecucion distribuida!");

for(let i = 0; i < 5; i++){
  (async () => {
    console.log("a" + i)
    await new Promise(r => setTimeout(r, 2000));
    console.log("b" + i)
  })()
}