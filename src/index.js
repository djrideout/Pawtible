import cpu_instrs from "../public/rom/cpu_instrs/cpu_instrs.gb";
import instr_timing from "../public/rom/instr_timing/instr_timing.gb";
import mem_timing from "../public/rom/mem_timing-2/mem_timing.gb";
import mona from "../public/rom/homebrew/mona.gb";
import retroid from "../public/rom/homebrew/retroid.gb";
import pocket from "../public/rom/homebrew/pocket.gb";
import { GameBoy } from "./gb";
import { Site } from "./view/react/site";
import * as React from "react";
import * as ReactDOM from "react-dom";

let romData = [
  {
    name: "cpu_instrs",
    path: cpu_instrs,
    rom: null
  },
  {
    name: "instr_timing",
    path: instr_timing,
    rom : null
  },
  {
    name: "mem_timing",
    path: mem_timing,
    rom: null
  },
  {
    name: "mona",
    path: mona,
    rom: null
  },
  {
    name: "retroid",
    path: retroid,
    rom: null
  },
  {
    name: "pocket",
    path: pocket,
    rom: null
  }
];
let load = path => {
  return new Promise(resolve => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", path);
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      resolve(new Uint8Array(xhr.response));
    }
    xhr.send(null);
  });
};
let proms = [];
for(let i = 0; i < romData.length; i++) {
  proms.push(load(romData[i].path));
}
Promise.all(proms).then(bins => {
  for(let i = 0; i < bins.length; i++) {
    romData[i].rom = bins[i];
  }
  return romData;
}).then(roms => {
  let gameBoy = new GameBoy();
  let mount = document.querySelector("#mount");
  let site = React.createElement(Site, {
    gameBoy,
    roms
  });
  ReactDOM.render(site, mount);
  window.roms = roms;
  window.gb = gameBoy;
});
