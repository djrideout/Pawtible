import React, { useState, useEffect } from "react";

export function ROMSelector(props) {
  const [index, setIndex] = useState(0);

  const selectROM = (e) => {
    setIndex(parseInt(e.target.value));
  };

  const loadSelected = () => {
    props.gameBoy.load(props.roms[index].rom);
  };

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
    </div>
  );
}
