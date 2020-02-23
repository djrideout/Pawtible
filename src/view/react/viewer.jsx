import { CPU, Registers8, Registers16 } from "../../gb/cpu";
import React from "react";

export class GBViewer extends React.Component {
  constructor(props) {
    super(props);
    this.toggleTracking = toggle_tracking.bind(this);
    this.state = {
      tracking: true
    };
  }

  get GB() {
    return this.props.gameBoy;
  }

  render() {
    return (
      <>
        <div className={"wrapper"} id={"viewer-left"}>
          <MemoryViewer gameBoy={this.GB} tracking={this.state.tracking} />
          <RegisterViewer gameBoy={this.GB} tracking={this.state.tracking} />
        </div>
        <BreakpointViewer gameBoy={this.GB} />
        <div id={"check"}>
          <input type="checkbox" checked={this.state.tracking} onChange={this.toggleTracking} />{"Debugger enabled (may impact performance)"}
        </div>
      </>
    );
  }
}

function toggle_tracking() {
  this.setState({
    tracking: !this.state.tracking
  });
}

class MemoryViewer extends React.Component {
  constructor(props) {
    super(props);
    this.setTop_ = set_top.bind(this);
    this.onKeyPress_ = on_mem_key_press.bind(this);
    this.onScroll_ = on_scroll.bind(this);
    this.setTopScroll_ = set_top_scroll.bind(this);
    this.scrollContainer_ = null;
    this.state = {
      top: 0x0000
    };
    mem_set_closure(this);
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

  render() {
    let output = [];
    output.push(<span key={"top-row"} className={"mem-label"}>{"        00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F"}</span>, <br key={"top-row-br"} />);
    for(let i = this.top; i <= this.top + (this.rows << 4); i += 0x10) {
      let label = <span key={`${i - this.top}-label`} className={"mem-label"}>{`0x${i.toString(16).toUpperCase().padStart(4, "0")}  `}</span>;
      output.push(label);
      let str1 = "";
      let changed = null;
      let str2 = "";
      for(let j = 0x0; j < this.cols; j++) {
        let val = `${this.GB.M.get(i + j, 1, false).toString(16).toUpperCase().padStart(2, "0")} `;
        if(this.GB.CPU.isPaused() && i + j === this.GB.CPU.PC) {
          changed = <span className={"program-counter"} key={"changed"}>{val}</span>;
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
    top: row > ((this.GB.M.mem.length - 1 >> 4) - this.rows) << 4 ? ((this.GB.M.mem.length - 1 >> 4) - this.rows) << 4 : row
  });
}

function set_top_scroll(addr) {
  let r = (addr >> 4 << 4) / ((this.GB.M.mem.length - 1) >> 4 << 4);
  let max = this.scrollContainer_.firstChild.offsetHeight - this.scrollContainer_.offsetHeight;
  this.scrollContainer_.scrollTop = r * max;
}

function on_mem_key_press(e) {
  if(e.nativeEvent.keyCode === 13) { //enter
    let addr = parseInt(e.target.value, 16);
    if(Number.isInteger(addr) && addr <= this.GB.M.mem.length - 1) {
      this.setTopScroll_(addr);
    }
  }
}

function on_scroll(e) {
  let el = e.target;
  let max = el.firstChild.offsetHeight - el.offsetHeight;
  let r = el.scrollTop / max;
  let row = Math.ceil(((this.GB.M.mem.length - 1) >> 4) * r) << 4;
  this.setTop_(row);
}

window.testRomString = "";

function mem_set_closure(viewer) {
  let cpuPause = CPU.prototype.pause;
  CPU.prototype.pause = function() {
    cpuPause.call(this);
    viewer.forceUpdate();
  }
  let cpuUnpause = CPU.prototype.unpause;
  CPU.prototype.unpause = function() {
    cpuUnpause.call(this);
    viewer.forceUpdate();
  }
  let ogRunFrame = CPU.prototype.runFrame;
  CPU.prototype.runFrame = function() {
    ogRunFrame.call(this);
    if(viewer.props.tracking) {
      viewer.forceUpdate();
    }
  }
  let cpuStep = CPU.prototype.step;
  CPU.prototype.step = function() {
    let cycles = cpuStep.call(this);
    if(this.isPaused() && viewer.props.tracking) {
      viewer.forceUpdate();
    }
    return cycles;
  }
}

class RegisterViewer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      changed: null,
      flags: {}
    };
    cpu_set_closure(this);
  }

  get GB() {
    return this.props.gameBoy;
  }

  get changed() {
    return this.state.changed;
  }

  get flags() {
    return this.state.flags;
  }

  render() {
    let cpu = this.GB.CPU;
    return (
      <div id={"viewer-registers"}>
        {"A"}{`: ${cpu.Reg8[Registers8.A].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"B"}{`: ${cpu.Reg8[Registers8.B].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"D"}{`: ${cpu.Reg8[Registers8.D].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"H"}{`: ${cpu.Reg8[Registers8.H].toString(16).toUpperCase().padStart(2, "0")}`}
        <br />
        {"F"}{`: ${cpu.Reg8[Registers8.F].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"C"}{`: ${cpu.Reg8[Registers8.C].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"E"}{`: ${cpu.Reg8[Registers8.E].toString(16).toUpperCase().padStart(2, "0")}  `}
        {"L"}{`: ${cpu.Reg8[Registers8.L].toString(16).toUpperCase().padStart(2, "0")}`}
        <br />
        {"SP"}{`: ${cpu.Reg16[Registers16.SP].toString(16).toUpperCase().padStart(4, "0")}  `}
        {"PC"}{`: ${cpu.Reg16[Registers16.PC].toString(16).toUpperCase().padStart(4, "0")}`}
        <br />
        {"IME"}{`: ${cpu.FlagIME.toString().padEnd(5, " ")}  `}
        {"Z"}{`: ${cpu.FlagZ.toString().padEnd(5, " ")}  `}
        {"N"}{`: ${cpu.FlagN.toString().padEnd(5, " ")}  `}
        {"H"}{`: ${cpu.FlagH.toString().padEnd(5, " ")}  `}
        {"C"}{`: ${cpu.FlagC.toString().padEnd(5, " ")}`}
      </div>
    )
  }
}

function cpu_set_closure(viewer) {
  let ogRunFrame = CPU.prototype.runFrame;
  CPU.prototype.runFrame = function() {
    ogRunFrame.call(this);
    if(viewer.props.tracking) {
      viewer.forceUpdate();
    }
  }
  let ogPause = CPU.prototype.pause;
  CPU.prototype.pause = function() {
    ogPause.call(this);
    viewer.forceUpdate();
  }
}

class BreakpointViewer extends React.Component {
  constructor(props) {
    super(props);
    this.onKeyPress_ = on_breakpoint_key_press.bind(this);
    breakpoint_set_closure(this);
  }

  get GB() {
    return this.props.gameBoy;
  }

  render() {
    let bps = this.GB.CPU.Breakpoints;
    let bpDivs = [];
    for(let i = 0; i < bps.length; i++) {
      bpDivs.push(<div key={i} className={"breakpoint"}>
        {`0x${bps[i].addr.toString(16).padStart(4, "0")}         `}
        <input type={"checkbox"} checked={bps[i].enabled} onChange={() => this.GB.CPU.setBreakpoint(bps[i].addr, !bps[i].enabled)} /> 
      </div>);
    }
    return (
      <div className={"wrapper"} id={"viewer-breakpoints"}>
        <input type={"text"} id={"viewer-breakpoint-input"} onKeyPress={this.onKeyPress_} />
        <input type={"button"} onClick={() => this.GB.CPU.isPaused() ? this.GB.CPU.unpause() : this.GB.CPU.pause()} value={this.GB.CPU.isPaused() ? "Unpause" : "Pause"} />
        <input type={"button"} onClick={() => this.GB.CPU.step()} value={"Step"} disabled={!this.GB.CPU.isPaused()} />
        <div id={"breakpoint-items"}>
          {bpDivs}
        </div>
      </div>
    )
  }
}

function on_breakpoint_key_press(e) {
  if(e.nativeEvent.keyCode === 13) { //enter
    let addr = parseInt(e.target.value, 16);
    if(Number.isInteger(addr) && addr <= this.GB.M.mem.length - 1) {
      this.GB.CPU.setBreakpoint(addr);
    }
  }
}

function breakpoint_set_closure(viewer) {
  let ogPause = CPU.prototype.pause;
  CPU.prototype.pause = function() {
    ogPause.call(this);
    viewer.forceUpdate();
  }
  let ogUnpause = CPU.prototype.unpause;
  CPU.prototype.unpause = function() {
    ogUnpause.call(this);
    viewer.forceUpdate();
  }
  let ogSet = CPU.prototype.setBreakpoint;
  CPU.prototype.setBreakpoint = function(addr, enabled) {
    ogSet.call(this, addr, enabled);
    viewer.forceUpdate();
  }
  let ogRemove = CPU.prototype.removeBreakpoint;
  CPU.prototype.removeBreakpoint = function(addr) {
    ogRemove.call(this, addr);
    viewer.forceUpdate();
  }
}
