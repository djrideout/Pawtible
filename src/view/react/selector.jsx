import React, { useState, useEffect } from "react";

export function ROMSelector(props) {
  const [index, setIndex] = useState(0);

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

  let sramLoadRef = null;


  useEffect(() => {
    loadSelected();
  }, []);

  let options = [];
  for(let i = 0; i < props.roms.length; i++) {
    options.push(<option key={props.roms[i].name} value={i}>{props.roms[i].name}</option>);
  }
  return (
    <div id="selector">
        <select onChange={selectROM}>
          {options}
        </select>
        <button onClick={loadSelected}>Load</button>
        <input ref={(r) => loadROMRef = r} type={"file"} style={{display: "none"}} onChange={loadROMFromFile} />
        <input id={"rom-upload-btn"} type={"button"} value={"Load ROM from file"} onClick={() => {
          loadROMRef.value = null;
          loadROMRef.click()
        }} />
    </div>
  );
}
