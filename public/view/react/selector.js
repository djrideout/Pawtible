import { GameBoy, RTCModes } from "../../gb/index.js";

export function ROMSelector(props) {
  const [index, setIndex] = React.useState(0);
  const [ignored, forceUpdate] = React.useReducer(x => x + 1, 0);

  const selectROM = e => {
    setIndex(parseInt(e.target.value));
  };

  const loadSelected = () => {
    props.gameBoy.load(props.roms[index].rom);
  };

  let loadROMRef = null;

  const loadROMFromFile = async e => {
    let buffer = await e.target.files[0].arrayBuffer();
    let arr = new Uint8Array(buffer);
    props.gameBoy.load(arr);
  };

  const saveSRAM = () => {
    let ram = props.gameBoy.saveSRAM();

    if (!ram) {
      alert("No ExtRAM");
      return;
    }

    let blob = new Blob([ram], {
      type: "application/octet-stream"
    });
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('A');
    a.href = url;
    a.download = `${props.gameBoy.Cart.title}.sav`;
    document.body.appendChild(a);
    a.style.display = 'none';
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };

  let loadSRAMRef = null;

  const loadSRAMFromFile = async e => {
    if (!props.gameBoy.Cart.ram) {
      alert("No ExtRAM");
      return;
    }

    let buffer = await e.target.files[0].arrayBuffer();
    let arr = new Uint8Array(buffer);
    props.gameBoy.loadSRAM(arr);
  };

  const setRTCMode = e => {
    props.gameBoy.setRTCMode(e.target.value);
  };

  React.useEffect(() => {
    timer_set_closure(forceUpdate);
    loadSelected();
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    id: "selector"
  }, /*#__PURE__*/React.createElement("select", {
    onChange: selectROM
  }, props.roms.map((rom, i) => /*#__PURE__*/React.createElement("option", {
    key: rom.name,
    value: i
  }, rom.name))), /*#__PURE__*/React.createElement("button", {
    onClick: loadSelected
  }, "Load"), /*#__PURE__*/React.createElement("input", {
    ref: r => loadROMRef = r,
    type: "file",
    style: {
      display: "none"
    },
    onChange: loadROMFromFile
  }), /*#__PURE__*/React.createElement("input", {
    type: "button",
    value: "Load ROM from file",
    onClick: () => {
      loadROMRef.value = null;
      loadROMRef.click();
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: "button",
    value: "Save SRAM to file",
    onClick: saveSRAM
  }), /*#__PURE__*/React.createElement("input", {
    ref: r => loadSRAMRef = r,
    type: "file",
    style: {
      display: "none"
    },
    onChange: loadSRAMFromFile
  }), /*#__PURE__*/React.createElement("input", {
    type: "button",
    value: "Load SRAM from file (restarts emulation)",
    onClick: () => {
      if (!props.gameBoy.Cart.ram) {
        alert("No ExtRAM");
        return;
      }

      loadSRAMRef.value = null;
      loadSRAMRef.click();
    }
  }), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("select", {
    onChange: setRTCMode,
    value: props.gameBoy.rtcMode
  }, Object.values(RTCModes).map(mode => /*#__PURE__*/React.createElement("option", {
    key: mode,
    value: mode
  }, mode))));
}

function timer_set_closure(forceUpdate) {
  let ogSetRTC = GameBoy.prototype.setRTCMode;

  GameBoy.prototype.setRTCMode = function (mode) {
    ogSetRTC.call(this, mode);
    forceUpdate();
  };
}
