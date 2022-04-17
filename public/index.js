import { GameBoy } from "./gb/index.js";
import { Site } from "./view/react/site.js";

let roms = [
  {
    name: "cpu_instrs",
    path: "rom/cpu_instrs/cpu_instrs.gb",
    rom: null
  },
  {
    name: "instr_timing",
    path: "rom/instr_timing/instr_timing.gb",
    rom : null
  },
  {
    name: "mem_timing",
    path: "rom/mem_timing-2/mem_timing.gb",
    rom: null
  },
  {
    name: "rtc3test",
    path: "rom/rtc3test/rtc3test.gb",
    rom: null
  },
  {
    name: "mona",
    path: "rom/homebrew/mona.gb",
    rom: null
  },
  {
    name: "retroid",
    path: "rom/homebrew/retroid.gb",
    rom: null
  },
  {
    name: "pocket",
    path: "rom/homebrew/pocket.gb",
    rom: null
  }
];
async function load() {
  for(let i = 0; i < roms.length; i++) {
    let res = await fetch(roms[i].path);
    roms[i].rom = new Uint8Array(await res.arrayBuffer());
  }
  let gameBoy = new GameBoy();
  ReactDOM.render(React.createElement(Site, {
    gameBoy,
    roms
  }), document.querySelector("#mount"));
  window.roms = roms;
  window.gb = gameBoy;
}
load();
