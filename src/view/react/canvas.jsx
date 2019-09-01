import { Screen } from "../screen";
import * as React from "react";

export class Canvas extends React.Component {
  constructor(props) {
    super(props);
    this.canvas_ = null;
    this.screen_ = null;
  }

  get GB() {
    return this.props.gameBoy;
  }

  get Screen() {
    return this.screen_;
  }

  componentDidMount() {
    this.screen_ = new Screen(this.canvas_, this.GB);
    this.Screen.blank();
    this.Screen.run();
  }

  render() {
    return (
      <canvas id={"screen"} width={160} height={144} ref={ref => this.canvas_ = ref} />
    );
  }
}
