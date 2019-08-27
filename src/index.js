import { MemoryMap } from "./nes/memory";

let i = 0;
let cb = () => i++;
let map = new MemoryMap(cb);
for(let i = 0x0000; i <= 0xFFFF; i++) {
  map[i] = 0xBB;
}
map[0xCCCC]++;
console.log(i.toString(16)); //0x10001
