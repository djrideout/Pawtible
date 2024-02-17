/**
 * Described in Timer section of https://github.com/AntonioND/giibiiadvance/blob/master/docs/TCAGBD.pdf
 */

const Addrs = {
  DIV: 0xFF04,
  TIMA: 0xFF05,
  TMA: 0xFF06,
  TAC: 0xFF07
};

export class Timer {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  reset() {
    this.GB.M.mem[Addrs.DIV] = 0xAB;
    this.ctrLow = 0xCC;
    this.prev = null;
    this.interruptThreshold_ = 0;
  }

  step(cycles) {
    while (cycles > 0) {
      this.interruptThreshold_--;
      if (this.interruptThreshold_ === 0) {
        this.GB.CPU.FlagTimerRequest = true;
      }
      let ctr = (this.GB.M.mem[Addrs.DIV] << 8) | this.ctrLow;
      this.prev = ctr;
      ctr = (ctr + 1) & 0xFFFF;
      this.GB.M.mem[Addrs.DIV] = ctr >> 8;
      this.ctrLow = ctr & 0xFF;
      cycles--;
      this.onCounterChange();
    }
  }

  onCounterChange() {
    //Multiplexer to select bit from counter using TAC
    let bit = null;
    switch (this.GB.M.mem[Addrs.TAC] & 0x03) {
      case 0b00:
        bit = 9;
        break;
      case 0b01:
        bit = 3;
        break;
      case 0b10:
        bit = 5;
        break;
      case 0b11:
        bit = 7;
        break;
    }
    let ctr = (this.GB.M.mem[Addrs.DIV] << 8) | this.ctrLow;
    //Input to the falling edge detector
    let enabled = (this.GB.M.mem[Addrs.TAC] >> 2) & 0x01;
    //Determine whether timer should increment using falling edge detector
    if (((this.prev >>> bit) & 0x01 & enabled) === 1 && ((ctr >>> bit) & 0x01 & enabled) === 0) {
      if (this.GB.M.mem[Addrs.TIMA] === 0xFF) {
        //Delay interrupt 4 cycles
        this.interruptThreshold_ = 4;
        this.GB.M.mem[Addrs.TIMA] = this.GB.M.mem[Addrs.TMA];
      } else {
        this.GB.M.mem[Addrs.TIMA]++;
      }
    }
    //Determine whether to step the APU Frame Sequencer using DIV.
    if ((this.prev >>> 12) & 0x01 === 1 && ((ctr >>> 12) & 0x01) === 0) {
      this.GB.APU.stepFrameSequencer();
    }
  }
}
