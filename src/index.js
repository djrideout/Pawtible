import cpu_instrs from "../public/rom/cpu_instrs/cpu_instrs.gb";
import instr_timing from "../public/rom/instr_timing/instr_timing.gb";
import mem_timing from "../public/rom/mem_timing-2/mem_timing.gb";
import rtc3test from "../public/rom/rtc3test/rtc3test.gb";
import mona from "../public/rom/homebrew/mona.gb";
import retroid from "../public/rom/homebrew/retroid.gb";
import pocket from "../public/rom/homebrew/pocket.gb";
import { GameBoy } from "./gb";
import { Site } from "./view/react/site";
import React from "react";
import ReactDOM from "react-dom";

let roms = [
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
    name: "rtc3test",
    path: rtc3test,
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
