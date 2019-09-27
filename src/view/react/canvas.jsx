import { Screen } from "../screen";
import * as React from "react";

export class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.canvas_ = null;
    this.screen_ = null;
  }

  componentDidMount() {
    this.screen_ = new Screen(this.canvas_, this.props.gameBoy);
    this.screen_.run();
  }

  render() {
    return (
      <canvas id={"screen"} width={160} height={144} ref={ref => this.canvas_ = ref} tabIndex={1} />
    );
  }
}
