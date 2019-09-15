import { Canvas } from "./canvas";
import { GBViewer } from "./viewer";
import * as React from "react";

export class Site extends React.Component {
  componentDidMount() {
    this.props.gameBoy.load(this.props.testROM);
  }

  render() {
    return (
      <>
        <div className={"wrapper"}>
          <Canvas gameBoy={this.props.gameBoy} />
        </div>
        <GBViewer gameBoy={this.props.gameBoy} />
      </>
    );
  }
}
