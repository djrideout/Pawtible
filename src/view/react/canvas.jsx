import { Screen } from "../screen";
import { GameController } from "../controller";
import * as React from "react";

export class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.canvas_ = null;
    this.screen_ = null;
    this.controller_ = new GameController(this.props.gameBoy);
  }

  componentDidMount() {
    this.screen_ = new Screen(this.canvas_, this.controller_, this.props.gameBoy);
    this.screen_.run();
  }

  render() {
    return (
      <canvas id={"screen"} width={160} height={144} ref={ref => this.canvas_ = ref} tabIndex={1} onKeyDown={this.controller_.onKeyDown} onKeyUp={this.controller_.onKeyUp} />
    );
  }
}
