import { Memory } from "../../gb/mem";
import { MemoryBlock } from "../../gb/mem/block";
import { CPU, Registers, Flags, get_flags_updated } from "../../gb/cpu";
import * as React from "react";

export class GBViewer extends React.Component {
  get GB() {
    return this.props.gameBoy;
  }

  render() {
    return (
      <>
        <div className={"wrapper"} id={"viewer-left"}>
          <MemoryViewer gameBoy={this.GB} />
          <RegisterViewer gameBoy={this.GB} />
        </div>
        <BreakpointViewer gameBoy={this.GB} />
      </>
    );
  }
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
    output.push(<span key={"top-row"} className={"mem-label"}>{"        00 01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f"}</span>, <br key={"top-row-br"} />);
    for(let i = this.top; i <= this.top + (this.rows << 4); i += 0x10) {
      let label = <span key={`${i - this.top}-label`} className={"mem-label"}>{`0x${i.toString(16).toUpperCase().padStart(4, "0")}  `}</span>;
      output.push(label);
      let str1 = "";
      let changed = null;
      let str2 = "";
      for(let j = 0x0; j < this.cols; j++) {
        let val = `${this.GB.M.get(i + j).toString(16).toUpperCase().padStart(2, "0")} `;
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
    top: row > ((this.GB.M.length - 1 >> 4) - this.rows) << 4 ? ((this.GB.M.length - 1 >> 4) - this.rows) << 4 : row
  });
}

function set_top_scroll(addr) {
  let r = (addr >> 4 << 4) / ((this.GB.M.length - 1) >> 4 << 4);
  let max = this.scrollContainer_.firstChild.offsetHeight - this.scrollContainer_.offsetHeight;
  this.scrollContainer_.scrollTop = r * max;
}

function on_mem_key_press(e) {
  if(e.nativeEvent.keyCode === 13) { //enter
    let addr = parseInt(e.target.value, 16);
    if(Number.isInteger(addr) && addr <= this.GB.M.length - 1) {
      this.setTopScroll_(addr);
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

window.testRomString = "";

function mem_set_closure(viewer) {
  let mbSet = MemoryBlock.prototype.set;
  MemoryBlock.prototype.set = function(addr, val, bytes) {
    mbSet.call(this, addr, val, bytes);
    //FOR TEST ROM ONLY, WILL REMOVE LATER
    if(this.start + addr === 0xFF01) {
      window.testRomString += String.fromCharCode(this.get(addr));
    } else if(this.start + addr === 0xFF02 && this.get(addr) === 0x81) {
      console.log(window.testRomString);
    }
  }
  let mSetBlock = Memory.prototype.setBlock;
  Memory.prototype.setBlock = function(index, block) {
    mSetBlock.call(this, index, block);
    viewer.forceUpdate();
  }
  let cpuPause = CPU.prototype.pause;
  CPU.prototype.pause = function() {
    cpuPause.call(this);
    //viewer.setTopScroll_(this.PC);
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
    viewer.forceUpdate();
  }
  let cpuStep = CPU.prototype.step;
  CPU.prototype.step = function() {
    let cycles = cpuStep.call(this);
    if(this.isPaused()) {
      //viewer.setTopScroll_(this.PC);
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
        {this.changed === Registers.A || this.changed === Registers.AF ? <span className={"changed-value"}>{"A"}</span> : "A"}{`: ${cpu.A.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.B || this.changed === Registers.BC ? <span className={"changed-value"}>{"B"}</span> : "B"}{`: ${cpu.B.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.D || this.changed === Registers.DE ? <span className={"changed-value"}>{"D"}</span> : "D"}{`: ${cpu.D.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.H || this.changed === Registers.HL ? <span className={"changed-value"}>{"H"}</span> : "H"}{`: ${cpu.H.toString(16).toUpperCase().padStart(2, "0")}`}
        <br />
        {this.changed === Registers.F || this.changed === Registers.AF ? <span className={"changed-value"}>{"F"}</span> : "F"}{`: ${cpu.F.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.C || this.changed === Registers.BC ? <span className={"changed-value"}>{"C"}</span> : "C"}{`: ${cpu.C.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.E || this.changed === Registers.DE ? <span className={"changed-value"}>{"E"}</span> : "E"}{`: ${cpu.E.toString(16).toUpperCase().padStart(2, "0")}  `}
        {this.changed === Registers.L || this.changed === Registers.HL ? <span className={"changed-value"}>{"L"}</span> : "L"}{`: ${cpu.L.toString(16).toUpperCase().padStart(2, "0")}`}
        <br />
        {this.changed === Registers.SP ? <span className={"changed-value"}>{"SP"}</span> : "SP"}{`: ${cpu.SP.toString(16).toUpperCase().padStart(4, "0")}  `}
        {this.changed === Registers.PC ? <span className={"changed-value"}>{"PC"}</span> : "PC"}{`: ${cpu.PC.toString(16).toUpperCase().padStart(4, "0")}`}
        <br />
        {this.changed === Registers.IME ? <span className={"changed-value"}>{"IME"}</span> : "IME"}{`: ${cpu.FlagIME.toString().padEnd(5, " ")}  `}
        {this.flags[Flags.Z] ? <span className={"changed-value"}>{"Z"}</span> : "Z"}{`: ${cpu.FlagZ.toString().padEnd(5, " ")}  `}
        {this.flags[Flags.N] ? <span className={"changed-value"}>{"N"}</span> : "N"}{`: ${cpu.FlagN.toString().padEnd(5, " ")}  `}
        {this.flags[Flags.H] ? <span className={"changed-value"}>{"H"}</span> : "H"}{`: ${cpu.FlagH.toString().padEnd(5, " ")}  `}
        {this.flags[Flags.C] ? <span className={"changed-value"}>{"C"}</span> : "C"}{`: ${cpu.FlagC.toString().padEnd(5, " ")}`}
      </div>
    )
  }
}

function cpu_set_closure(viewer) {
  let ogRunFrame = CPU.prototype.runFrame;
  CPU.prototype.runFrame = function() {
    ogRunFrame.call(this);
    viewer.forceUpdate();
  }
  let ogPause = CPU.prototype.pause;
  CPU.prototype.pause = function() {
    ogPause.call(this);
    viewer.forceUpdate();
  }
  let ogSet = CPU.prototype.set;
  CPU.prototype.set = function(register, val) {
    let ogVal = this.get(register);
    ogSet.call(this, register, val);
    if(this.isPaused()) {
      viewer.setState({
        changed: register,
        flags: get_flags_updated(register, ogVal, this.get(register))
      });
    }
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
    if(Number.isInteger(addr) && addr <= this.GB.M.length - 1) {
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
