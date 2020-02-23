import { Canvas } from "./canvas";
import { GBViewer } from "./viewer";
import { ROMSelector } from "./selector";
import React from "react";

export function Site(props) {
  return (
    <>
      <div id={"screen-container"} className={"wrapper"}>
        <Canvas gameBoy={props.gameBoy} />
      </div>
      <GBViewer gameBoy={props.gameBoy} />
      <ROMSelector gameBoy={props.gameBoy} roms={props.roms} />
      <div id={"controls"}>
        {"Controls:"}<br />
        {"Up: W"}<br />
        {"Left: A"}<br />
        {"Down: S"}<br />
        {"Right: D"}<br />
        {"Select: G"}<br />
        {"Start: H"}<br />
        {"B: K"}<br />
        {"A: L"}<br />
      </div>
    </>
  );
}
