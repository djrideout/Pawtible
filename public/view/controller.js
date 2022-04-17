import { Inputs } from "../gb/joypad.js";

const Keymap = {
  "KeyW": Inputs.UP,
  "KeyS": Inputs.DOWN,
  "KeyA": Inputs.LEFT,
  "KeyD": Inputs.RIGHT,
  "KeyK": Inputs.B,
  "KeyL": Inputs.A,
  "KeyG": Inputs.SELECT,
  "KeyH": Inputs.START
};

export class GameController {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.onKeyDown = on_key_down.bind(this);
    this.onKeyUp = on_key_up.bind(this);
    this.prev_ = [];
    Object.values(Inputs).forEach(input => {
      this.prev_[input] = false;
    });
    this.curr_ = [];
    Object.values(Inputs).forEach(input => {
      this.curr_[input] = false;
    });
    this.next_ = [];
    Object.values(Inputs).forEach(input => {
      this.next_[input] = false;
    });
  }

  update() {
    Object.values(Inputs).forEach(input => {
      this.prev_[input] = this.curr_[input];
      this.curr_[input] = this.next_[input];
      if(!this.prev_[input] && this.curr_[input]) {
        this.GB.Joypad.update(input, true);
      } else if(this.prev_[input] && !this.curr_[input]) {
        this.GB.Joypad.update(input, false);
      }
  });
  }
}

function on_key_down(e) {
  e.preventDefault();
  e.stopPropagation();
  let input = Keymap[e.code];
  if(input !== undefined) {
    this.next_[input] = true;
  }
}

function on_key_up(e) {
  e.preventDefault();
  e.stopPropagation();
  let input = Keymap[e.code];
  if(input !== undefined) {
    this.next_[input] = false;
  }
}
