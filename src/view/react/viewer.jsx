import * as React from "react";

let fuk = 1;

export class GBViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      top: 0x0000,
      changed: null
    };
  }

  get GB() {
    return this.props.gameBoy;
  }

  get top() {
    return this.state.top;
  }

  get rows() {
    return 20;
  }

  get cols() {
    return 16;
  }

  componentDidMount() {
    this.GB.M.addSetHook(addr => {
      if(addr >= this.top && addr <= this.top + (this.rows << 4) + this.cols - 1) {
        this.setState({
          changed: addr
        });
      } else if(this.state.changed !== null) {
        this.setState({
          changed: null
        });
      }
    });
  }

  render() {
    let output = [];
    output.push(<span key={"top-row"} className={"mem-label"}>{"        00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f"}</span>, <br key={"top-row-br"} />);
    for(let i = this.top; i <= this.top + (this.rows << 4); i += 0x10) {
      let label = <span key={`${i}-label`} className={"mem-label"}>{`0x${i.toString(16).padStart(4, "0")}  `}</span>;
      output.push(label);
      for(let j = 0x0; j < this.cols; j++) {
        let str = `${this.GB.M.get(i + j).toString(16).padStart(2, "0")} `;
        if(i + j === this.state.changed) {
          output.push(<span className={"changed-value"} key={"changed"}>{str}</span>);
        } else {
          output.push(str);
        }
      }
      output.push(<br key={`${i}-br`} />);
    }
    return output;
  }
}
