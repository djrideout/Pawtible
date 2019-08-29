import * as React from "react";

export class GBViewer extends React.Component {
  get GB() {
    return this.props.gameBoy;
  }

  render() {
    return (
      <>
        <MemoryViewer gameBoy={this.GB} />
        <RegisterViewer gameBoy={this.GB} />
      </>
    );
  }
}

class MemoryViewer extends React.Component {
  constructor(props) {
    super(props);
    this.setTop_ = set_top.bind(this);
    this.setChanged_ = set_changed.bind(this);
    this.onKeyPress_ = on_key_press.bind(this);
    this.onScroll_ = on_scroll.bind(this);
    this.scrollContainer_ = null;
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

  get changed() {
    return this.state.changed;
  }

  get rows() {
    return 20;
  }

  get cols() {
    return 16;
  }

  shouldComponentUpdate(nextProps, nextState) {
    let inView = state => {
      return state.changed >= state.top && state.changed <= state.top + (this.rows << 4) + this.cols - 1;
    };
    switch(true) {
      case inView(nextState):
      case inView(this.state) && !inView(nextState):
      case nextState.top !== this.top:
        return true;
      default:
        return false;
    }
  }

  componentDidMount() {
    this.GB.M.addSetHook(this.setChanged_);
  }

  render() {
    let output = [];
    output.push(<span key={"top-row"} className={"mem-label"}>{"        00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f"}</span>, <br key={"top-row-br"} />);
    for(let i = this.top; i <= this.top + (this.rows << 4); i += 0x10) {
      let label = <span key={`${i - this.top}-label`} className={"mem-label"}>{`0x${i.toString(16).padStart(4, "0")}  `}</span>;
      output.push(label);
      let str1 = "";
      let changed = null;
      let str2 = "";
      for(let j = 0x0; j < this.cols; j++) {
        let val = `${this.GB.M.get(i + j).toString(16).padStart(2, "0")} `;
        if(i + j === this.changed) {
          changed = <span className={"changed-value"} key={"changed"}>{val}</span>;
        } else {
          if(changed === null) {
            str1 += val;
          } else {
            str2 += val;
          }
        }
      }
      if(str1.length > 0) output.push(str1);
      if(changed !== null) output.push(changed);
      if(str2.length > 0) output.push(str2);
      output.push(<br key={`${i - this.top}-br`} />);
    }
    return (
      <div id={"viewer-memory"}>
        <input id={"viewer-memory-input"} type={"text"} onKeyPress={this.onKeyPress_}/>
        <div id={"viewer-memory-text"}>{output}</div>
        <div id={"viewer-memory-scroll-container"} onScroll={this.onScroll_} ref={ref => this.scrollContainer_ = ref}>
          <div id={"viewer-memory-scroll-space"} />
        </div>
      </div>
    );
  }
}

function set_top(row) {
  this.setState({
    top: row > ((this.GB.M.length - 1 >> 4) - this.rows) << 4 ? ((this.GB.M.length - 1 >> 4) - this.rows) << 4 : row
  });
}

function set_changed(addr) {
  this.setState({
    changed: addr
  });
}

function on_key_press(e) {
  if(e.nativeEvent.keyCode === 13) { //enter
    let addr = parseInt(e.target.value, 16);
    if(Number.isInteger(addr) && addr <= this.GB.M.length - 1) {
      let r = (addr >> 4 << 4) / ((this.GB.M.length - 1) >> 4 << 4);
      let max = this.scrollContainer_.firstChild.offsetHeight - this.scrollContainer_.offsetHeight;
      this.scrollContainer_.scrollTop = r * max;
    }
  }
}

function on_scroll(e) {
  let el = e.target;
  let max = el.firstChild.offsetHeight - el.offsetHeight;
  let r = el.scrollTop / max;
  let row = Math.ceil(((this.GB.M.length - 1) >> 4) * r) << 4;
  this.setTop_(row);
}

class RegisterViewer extends React.Component {
  get GB() {
    return this.props.gameBoy;
  }

  componentDidMount() {
    this.GB.CPU.addSetHook(() => this.forceUpdate());
  }

  render() {
    let cpu = this.GB.CPU;
    return (
      <div id={"viewer-registers"}>
        {`AF: ${cpu.AF.toString(16).padStart(4, "0")}  BC: ${cpu.BC.toString(16).padStart(4, "0")}  DE: ${cpu.DE.toString(16).padStart(4, "0")}  HL: ${cpu.HL.toString(16).padStart(4, "0")}  SP: ${cpu.SP.toString(16).padStart(4, "0")}  PC: ${cpu.PC.toString(16).padStart(4, "0")}`}
        <br />
        {`Z: ${cpu.FlagZ}  N: ${cpu.FlagN}  H: ${cpu.FlagH}  C: ${cpu.FlagC}`}
      </div>
    )
  }
}