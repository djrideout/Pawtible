import { CPU, Registers8, Registers16 } from "../../gb/cpu.js";

export function GBViewer(props) {
  const [tracking, setTracking] = React.useState(true);

  const toggleTracking = () => {
    setTracking(!tracking);
  };

  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "wrapper",
    id: "viewer-left"
  }, /*#__PURE__*/React.createElement(MemoryViewer, {
    gameBoy: props.gameBoy,
    tracking: tracking
  }), /*#__PURE__*/React.createElement(RegisterViewer, {
    gameBoy: props.gameBoy,
    tracking: tracking
  })), /*#__PURE__*/React.createElement(BreakpointViewer, {
    gameBoy: props.gameBoy
  }), /*#__PURE__*/React.createElement("div", {
    id: "check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: tracking,
    onChange: toggleTracking
  }), "Debugger enabled (may impact performance)"));
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

  get rows() {
    return 20;
  }

  get cols() {
    return 16;
  }

  render() {
    let output = [];
    output.push( /*#__PURE__*/React.createElement("span", {
      key: "top-row",
      className: "mem-label"
    }, "        00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F"), /*#__PURE__*/React.createElement("br", {
      key: "top-row-br"
    }));

    for (let i = this.top; i <= this.top + (this.rows << 4); i += 0x10) {
      let label = /*#__PURE__*/React.createElement("span", {
        key: `${i - this.top}-label`,
        className: "mem-label"
      }, `0x${i.toString(16).toUpperCase().padStart(4, "0")}  `);
      output.push(label);
      let str1 = "";
      let changed = null;
      let str2 = "";

      for (let j = 0x0; j < this.cols; j++) {
        let val = `${this.GB.M.get(i + j, 1, false).toString(16).toUpperCase().padStart(2, "0")} `;

        if (this.GB.CPU.isPaused() && i + j === this.GB.CPU.PC) {
          changed = /*#__PURE__*/React.createElement("span", {
            className: "program-counter",
            key: "changed"
          }, val);
        } else {
          if (changed === null) {
            str1 += val;
          } else {
            str2 += val;
          }
        }
      }

      if (str1.length > 0) output.push(str1);
      if (changed !== null) output.push(changed);
      if (str2.length > 0) output.push(str2);
      output.push( /*#__PURE__*/React.createElement("br", {
        key: `${i - this.top}-br`
      }));
    }

    return /*#__PURE__*/React.createElement("div", {
      id: "viewer-memory"
    }, /*#__PURE__*/React.createElement("input", {
      id: "viewer-memory-input",
      type: "text",
      onKeyPress: this.onKeyPress_
    }), /*#__PURE__*/React.createElement("div", {
      id: "viewer-memory-text"
    }, output), /*#__PURE__*/React.createElement("div", {
      id: "viewer-memory-scroll-container",
      onScroll: this.onScroll_,
      ref: ref => this.scrollContainer_ = ref
    }, /*#__PURE__*/React.createElement("div", {
      id: "viewer-memory-scroll-space"
    })));
  }

}

function set_top(row) {
  this.setState({
    top: row > (this.GB.M.mem.length - 1 >> 4) - this.rows << 4 ? (this.GB.M.mem.length - 1 >> 4) - this.rows << 4 : row
  });
}

function set_top_scroll(addr) {
  let r = (addr >> 4 << 4) / (this.GB.M.mem.length - 1 >> 4 << 4);
  let max = this.scrollContainer_.firstChild.offsetHeight - this.scrollContainer_.offsetHeight;
  this.scrollContainer_.scrollTop = r * max;
}

function on_mem_key_press(e) {
  if (e.nativeEvent.keyCode === 13) {
    //enter
    let addr = parseInt(e.target.value, 16);

    if (Number.isInteger(addr) && addr <= this.GB.M.mem.length - 1) {
      this.setTopScroll_(addr);
    }
  }
}

function on_scroll(e) {
  let el = e.target;
  let max = el.firstChild.offsetHeight - el.offsetHeight;
  let r = el.scrollTop / max;
  let row = Math.ceil((this.GB.M.mem.length - 1 >> 4) * r) << 4;
  this.setTop_(row);
}

function mem_set_closure(viewer) {
  let cpuPause = CPU.prototype.pause;

  CPU.prototype.pause = function () {
    cpuPause.call(this);
    viewer.forceUpdate();
  };

  let cpuUnpause = CPU.prototype.unpause;

  CPU.prototype.unpause = function () {
    cpuUnpause.call(this);
    viewer.forceUpdate();
  };

  let ogRunFrame = CPU.prototype.runFrame;

  CPU.prototype.runFrame = function () {
    ogRunFrame.call(this);

    if (viewer.props.tracking) {
      viewer.forceUpdate();
    }
  };

  let cpuStep = CPU.prototype.step;

  CPU.prototype.step = function () {
    let cycles = cpuStep.call(this);

    if (this.isPaused() && viewer.props.tracking) {
      viewer.forceUpdate();
    }

    return cycles;
  };
}

class RegisterViewer extends React.Component {
  constructor(props) {
    super(props);
    cpu_set_closure(this);
  }

  get GB() {
    return this.props.gameBoy;
  }

  render() {
    let cpu = this.GB.CPU;
    return /*#__PURE__*/React.createElement("div", {
      id: "viewer-registers"
    }, "A", `: ${cpu.Reg8[Registers8.A].toString(16).toUpperCase().padStart(2, "0")}  `, "B", `: ${cpu.Reg8[Registers8.B].toString(16).toUpperCase().padStart(2, "0")}  `, "D", `: ${cpu.Reg8[Registers8.D].toString(16).toUpperCase().padStart(2, "0")}  `, "H", `: ${cpu.Reg8[Registers8.H].toString(16).toUpperCase().padStart(2, "0")}`, /*#__PURE__*/React.createElement("br", null), "F", `: ${cpu.Reg8[Registers8.F].toString(16).toUpperCase().padStart(2, "0")}  `, "C", `: ${cpu.Reg8[Registers8.C].toString(16).toUpperCase().padStart(2, "0")}  `, "E", `: ${cpu.Reg8[Registers8.E].toString(16).toUpperCase().padStart(2, "0")}  `, "L", `: ${cpu.Reg8[Registers8.L].toString(16).toUpperCase().padStart(2, "0")}`, /*#__PURE__*/React.createElement("br", null), "SP", `: ${cpu.Reg16[Registers16.SP].toString(16).toUpperCase().padStart(4, "0")}  `, "PC", `: ${cpu.Reg16[Registers16.PC].toString(16).toUpperCase().padStart(4, "0")}`, /*#__PURE__*/React.createElement("br", null), "IME", `: ${cpu.FlagIME.toString().padEnd(5, " ")}  `, "Z", `: ${cpu.FlagZ.toString().padEnd(5, " ")}  `, "N", `: ${cpu.FlagN.toString().padEnd(5, " ")}  `, "H", `: ${cpu.FlagH.toString().padEnd(5, " ")}  `, "C", `: ${cpu.FlagC.toString().padEnd(5, " ")}`);
  }

}

function cpu_set_closure(viewer) {
  let ogRunFrame = CPU.prototype.runFrame;

  CPU.prototype.runFrame = function () {
    ogRunFrame.call(this);

    if (viewer.props.tracking) {
      viewer.forceUpdate();
    }
  };

  let ogPause = CPU.prototype.pause;

  CPU.prototype.pause = function () {
    ogPause.call(this);
    viewer.forceUpdate();
  };
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

    for (let i = 0; i < bps.length; i++) {
      bpDivs.push( /*#__PURE__*/React.createElement("div", {
        key: i,
        className: "breakpoint"
      }, `0x${bps[i].addr.toString(16).padStart(4, "0")}         `, /*#__PURE__*/React.createElement("input", {
        type: "checkbox",
        checked: bps[i].enabled,
        onChange: () => this.GB.CPU.setBreakpoint(bps[i].addr, !bps[i].enabled)
      })));
    }

    return /*#__PURE__*/React.createElement("div", {
      className: "wrapper",
      id: "viewer-breakpoints"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      id: "viewer-breakpoint-input",
      onKeyPress: this.onKeyPress_
    }), /*#__PURE__*/React.createElement("input", {
      type: "button",
      onClick: () => this.GB.CPU.isPaused() ? this.GB.CPU.unpause() : this.GB.CPU.pause(),
      value: this.GB.CPU.isPaused() ? "Unpause" : "Pause"
    }), /*#__PURE__*/React.createElement("input", {
      type: "button",
      onClick: () => this.GB.CPU.step(),
      value: "Step",
      disabled: !this.GB.CPU.isPaused()
    }), /*#__PURE__*/React.createElement("div", {
      id: "breakpoint-items"
    }, bpDivs));
  }

}

function on_breakpoint_key_press(e) {
  if (e.nativeEvent.keyCode === 13) {
    //enter
    let addr = parseInt(e.target.value, 16);

    if (Number.isInteger(addr) && addr <= this.GB.M.mem.length - 1) {
      this.GB.CPU.setBreakpoint(addr);
    }
  }
}

function breakpoint_set_closure(viewer) {
  let ogPause = CPU.prototype.pause;

  CPU.prototype.pause = function () {
    ogPause.call(this);
    viewer.forceUpdate();
  };

  let ogUnpause = CPU.prototype.unpause;

  CPU.prototype.unpause = function () {
    ogUnpause.call(this);
    viewer.forceUpdate();
  };

  let ogSet = CPU.prototype.setBreakpoint;

  CPU.prototype.setBreakpoint = function (addr, enabled) {
    ogSet.call(this, addr, enabled);
    viewer.forceUpdate();
  };

  let ogRemove = CPU.prototype.removeBreakpoint;

  CPU.prototype.removeBreakpoint = function (addr) {
    ogRemove.call(this, addr);
    viewer.forceUpdate();
  };
}
