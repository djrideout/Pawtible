/**
 * Described in Timer section of https://github.com/AntonioND/giibiiadvance/blob/master/docs/TCAGBD.pdf
 */
export class Timer {
  constructor(gameBoy) {
    this.gameBoy_ = gameBoy;
    this.reset();
  }

  get GB() {
    return this.gameBoy_;
  }
    
  reset() {
    this.counter_ = 0xABCC; //Top 8 bits are DIV register (0xFF04)
    this.tima_ = 0x00;
    this.tma_ = 0x00;
    this.tac_ = 0x00;
    this.prevFEDinput_ = null;
    this.interruptDelay_ = false;
  }

  get DIV() {
    return this.counter_ >>> 8;
  }

  set DIV(val) {
    this.counter_ = 0x0000;
    this.onCounterChange_();
  }

  get TIMA() {
    return this.tima_;
  }
  
  set TIMA(val) {
    this.tima_ = val & 0xFF;
  }

  get TMA() {
    return this.tma_;
  }
  
  set TMA(val) {
    this.tma_ = val & 0xFF;
  }

  get TAC() {
    return this.tac_;
  }
  
  set TAC(val) {
    //Only the lower 3 bits of TAC are R/W.
    this.tac_ = (this.tac_ >>> 3 << 3) | (val & 0x07);
  }

  get TimerEnabled() {
    return !!(this.TAC & 0x04);
  }

  step(cycles) {
    if(this.interruptDelay_) {
      this.interruptDelay_ = false;
      this.doInterrupt_();
    }
    this.counter_ = (this.counter_ + cycles) & 0xFFFF;
    this.onCounterChange_();
  }

  onCounterChange_() {
    //Multiplexer to select bit from counter using TAC
    let bit = null;
    switch(this.TAC & 0x03) {
      case 0b00:
        bit = (this.counter_ >>> 9) & 0x01;
        break;
      case 0b01:
        bit = (this.counter_ >>> 3) & 0x01;
        break;
      case 0b10:
        bit = (this.counter_ >>> 5) & 0x01;
        break;
      case 0b11:
        bit = (this.counter_ >>> 7) & 0x01;
        break;
    }
    //Input to the falling edge detector
    let input = bit & ((this.TAC >> 2) & 0x01);
    //Determine whether timer should increment using falling edge detector
    if(this.prevFEDinput_ === 1 && input === 0) {
      this.incTIMA_();
    }
    this.prevFEDinput_ = input;
  }

  incTIMA_() {
    if(this.TIMA === 0xFF) {
      //This is only supposed to delay 4 cycles, but I can't check that precisely,
      //so we'll just do the interrupt on the next step (as soon as possible).
      this.interruptDelay_ = true;
      this.TIMA = this.TMA;
    } else {
      this.TIMA++;
    }
  }

  doInterrupt_() {
    if(this.GB.CPU.FlagIME && this.GB.CPU.FlagTimerEnable) {
      this.GB.CPU.FlagTimerRequest = true;
    }
  }
}
