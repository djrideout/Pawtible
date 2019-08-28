import { Canvas } from "./canvas";
import { GBViewer } from "./viewer";
import * as React from "react";

export class Site extends React.Component {
  get GB() {
    return this.props.gameBoy;
  }

  componentDidMount() {
    this.GB.init();
  }

  render() {
    return (
      <>
        <div className={"wrapper"}>
          <Canvas gameBoy={this.GB} />
        </div>
        <div className={"wrapper"} id={"viewer-wrapper"}>
          <GBViewer gameBoy={this.GB} />
        </div>
      </>
    );
  }
}
