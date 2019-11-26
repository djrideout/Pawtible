import { Canvas } from "./canvas";
import { GBViewer } from "./viewer";
import { ROMSelector } from "./selector";
import * as React from "react";

export class Site extends React.Component {
  render() {
    return (
      <>
        <div id={"screen-container"} className={"wrapper"}>
          <Canvas gameBoy={this.props.gameBoy} />
        </div>
        <GBViewer gameBoy={this.props.gameBoy} />
        <ROMSelector gameBoy={this.props.gameBoy} roms={this.props.roms} />
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
}
