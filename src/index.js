import { GameBoy } from "./gb";
import { Site } from "./view/react/site";
import * as React from "react";
import * as ReactDOM from "react-dom";

let gameBoy = new GameBoy();
let mount = document.querySelector("#mount");
let site = React.createElement(Site, {
  gameBoy
});
ReactDOM.render(site, mount);

window.gb = gameBoy;
