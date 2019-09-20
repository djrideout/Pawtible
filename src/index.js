import testrompath from "../public/rom/mem_timing-2/mem_timing.gb";
import { GameBoy } from "./gb";
import { Site } from "./view/react/site";
import * as React from "react";
import * as ReactDOM from "react-dom";

let xhr = new XMLHttpRequest();
xhr.open("GET", testrompath);
xhr.responseType = "arraybuffer";
xhr.onload = () => {
  let gameBoy = new GameBoy();
  let mount = document.querySelector("#mount");
  let site = React.createElement(Site, {
    gameBoy,
    testROM: new Uint8Array(xhr.response)
  });
  ReactDOM.render(site, mount);
  window.gb = gameBoy;
}
xhr.send(null);
