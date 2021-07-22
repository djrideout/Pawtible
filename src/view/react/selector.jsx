import React, { useState, useEffect, useReducer } from "react";
import { GameBoy, RTCModes } from "../../gb";

export function ROMSelector(props) {
  const [index, setIndex] = useState(0);
  const [ignored, forceUpdate] = useReducer(x => x + 1, 0);

  const selectROM = (e) => {
    setIndex(parseInt(e.target.value));
  };

  const loadSelected = () => {
    props.gameBoy.load(props.roms[index].rom);
  };

  let loadROMRef = null;
  const loadROMFromFile = async (e) => {
    let buffer = await e.target.files[0].arrayBuffer();
    let arr = new Uint8Array(buffer);
    props.gameBoy.load(arr);
  };

  const saveSRAM = () => {
    if (!props.gameBoy.Cart.ram) {
      alert("No ExtRAM");
      return;
    }
    let blob = new Blob([props.gameBoy.Cart.ram], {
      type: "application/octet-stream"
    });
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('A');
    a.href = url;
    a.download = `${props.gameBoy.Cart.title}.srm`;
    document.body.appendChild(a);
    a.style.display = 'none';
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  };

  let loadSRAMRef = null;
  const loadSRAMFromFile = async (e) => {
    if (!props.gameBoy.Cart.ram) {
      alert("No ExtRAM");
      return;
    }
    let buffer = await e.target.files[0].arrayBuffer();
    let arr = new Uint8Array(buffer);
    props.gameBoy.Cart.ram = arr;
    props.gameBoy.reset();
  };

  const setRTCMode = (e) => {
    props.gameBoy.setRTCMode(e.target.value);
  };

  useEffect(() => {
    timer_set_closure(forceUpdate);
    loadSelected();
  }, []);

  return (
    <div id="selector">
        <select onChange={selectROM}>
          {props.roms.map((rom, i) => <option key={rom.name} value={i}>{rom.name}</option>)}
        </select>
        <button onClick={loadSelected}>Load</button>
        <input ref={(r) => loadROMRef = r} type={"file"} style={{display: "none"}} onChange={loadROMFromFile} />
        <input type={"button"} value={"Load ROM from file"} onClick={() => {
          loadROMRef.value = null;
          loadROMRef.click()
        }} />
        <input type={"button"} value={"Save SRAM to file"} onClick={saveSRAM} />
        <input ref={(r) => loadSRAMRef = r} type={"file"} style={{display: "none"}} onChange={loadSRAMFromFile} />
        <input type={"button"} value={"Load SRAM from file (restarts emulation)"} onClick={() => {
          if (!props.gameBoy.Cart.ram) {
            alert("No ExtRAM");
            return;
          }
          loadSRAMRef.value = null;
          loadSRAMRef.click()
        }} />
        <br />
        <select onChange={setRTCMode} value={props.gameBoy.rtcMode}>
          {Object.values(RTCModes).map((mode) => <option key={mode} value={mode}>{mode}</option>)}
        </select>
    </div>
  );
}

function timer_set_closure(forceUpdate) {
  let ogSetRTC = GameBoy.prototype.setRTCMode;
  GameBoy.prototype.setRTCMode = function(mode) {
    ogSetRTC.call(this, mode);
    forceUpdate();
  }
}
