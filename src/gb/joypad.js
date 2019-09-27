const Modes = {
  NOTHING: 0,
  DIRECTION: 1,
  BUTTON: 2,
  EITHER: 3
};

export const Inputs = {
  A: 0,
  B: 1,
  SELECT: 2,
  START: 3,
  RIGHT: 4,
  LEFT: 5,
  UP: 6,
  DOWN: 7
};

export class Joypad {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.Mode = Modes.NOTHING;
    this.Regs = new Uint8Array(4);
    this.Regs[Modes.NOTHING] = 0xFF;
    this.Regs[Modes.DIRECTION] = 0xFF;
    this.Regs[Modes.BUTTON] = 0xFF;
    this.Regs[Modes.EITHER] = 0xFF;
    this.inputs_ = 0xFF;
  }

  set Reg(val) {
    val &= 0b00110000;
    this.Mode = (val >>> 4) & 0x03;
    this.Regs[Modes.NOTHING] = (this.Regs[Modes.NOTHING] & 0b11001111)  | val;
    this.Regs[Modes.DIRECTION] = (this.Regs[Modes.DIRECTION] & 0b11001111)  | val;
    this.Regs[Modes.BUTTON] = (this.Regs[Modes.BUTTON] & 0b11001111)  | val;
    this.Regs[Modes.EITHER] = (this.Regs[Modes.EITHER] & 0b11001111)  | val;
  }

  //true for pressed, false for unpressed
  update(input, bool) {
    let prevInputs = this.inputs_;
    bool ? this.inputs_ &= ~(0x01 << input) : this.inputs_ |= (0x01 << input);
    this.Regs[Modes.DIRECTION] = (this.Regs[Modes.DIRECTION] & 0xF0) | (this.inputs_ & 0x0F);
    this.Regs[Modes.BUTTON] = (this.Regs[Modes.BUTTON] & 0xF0) | ((this.inputs_ >>> 4) & 0x0F);
    this.Regs[Modes.EITHER] = (this.Regs[Modes.EITHER] & 0xF0) | (this.inputs_ & 0x0F) | ((this.inputs_ >>> 4) & 0x0F);
    let diff = prevInputs ^ this.inputs_;
    if(prevInputs & diff) {
      this.GB.CPU.FlagJoypadRequest = true;
    }
  }
}
