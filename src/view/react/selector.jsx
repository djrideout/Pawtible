import * as React from "react";

export class ROMSelector extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0
    };
  }

  selectROM(index) {
    this.setState({
      index
    });
  }

  loadSelected() {
    this.props.gameBoy.load(this.props.roms[this.state.index].rom);
  }

  componentDidMount() {
    this.loadSelected();
  }

  render() {
    let options = [];
    for(let i = 0; i < this.props.roms.length; i++) {
      options.push(<option key={this.props.roms[i].name} value={i}>{this.props.roms[i].name}</option>);
    }
    return (
      <div id="selector">
          <select onChange={e => this.selectROM(parseInt(e.target.value))}>
            {options}
          </select>
          <button onClick={() => this.loadSelected()}>Load</button>
      </div>
    );
  }
}
