import { Canvas } from "./canvas";
import { GBViewer } from "./viewer";
import * as React from "react";

export class Site extends React.Component {
  get GB() {
    return this.props.gameBoy;
  }

  componentDidMount() {
    this.GB.load(this.props.testROM);
  }

  render() {
    return (
      <>
        <div className={"wrapper"}>
          <Canvas gameBoy={this.GB} />
        </div>
        <GBViewer gameBoy={this.GB} />
      </>
    );
  }
}
