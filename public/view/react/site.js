import { Canvas } from "./canvas.js";
import { GBViewer } from "./viewer.js";
import { ROMSelector } from "./selector.js";

export function Site(props) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    id: "screen-container",
    className: "wrapper"
  }, /*#__PURE__*/React.createElement(Canvas, {
    gameBoy: props.gameBoy
  })), /*#__PURE__*/React.createElement(GBViewer, {
    gameBoy: props.gameBoy
  }), /*#__PURE__*/React.createElement(ROMSelector, {
    gameBoy: props.gameBoy,
    roms: props.roms
  }), /*#__PURE__*/React.createElement("div", {
    id: "controls"
  }, "Controls:", /*#__PURE__*/React.createElement("br", null), "Up: W", /*#__PURE__*/React.createElement("br", null), "Left: A", /*#__PURE__*/React.createElement("br", null), "Down: S", /*#__PURE__*/React.createElement("br", null), "Right: D", /*#__PURE__*/React.createElement("br", null), "Select: G", /*#__PURE__*/React.createElement("br", null), "Start: H", /*#__PURE__*/React.createElement("br", null), "B: K", /*#__PURE__*/React.createElement("br", null), "A: L", /*#__PURE__*/React.createElement("br", null)));
}
