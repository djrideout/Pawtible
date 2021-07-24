/**
 * Described in Timer section of https://github.com/AntonioND/giibiiadvance/blob/master/docs/TCAGBD.pdf
 */

 export class Timer {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }
    
  reset() {
    this.counter_ = 0xABCC; //Top 8 bits are DIV register (0xFF04)
    this.tima_ = 0x00;
    this.tma_ = 0x00;
    this.tac_ = 0x00;
    this.prev_ = null;
    this.interruptThreshold_ = 0;
  }

  get DIV() {
    return this.counter_ >>> 8;
  }

  set DIV(set) {
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

  step(cycles) {
    while (cycles > 0) {
      this.interruptThreshold_--;
      if (this.interruptThreshold_ === 0) {
        this.GB.CPU.FlagTimerRequest = true;
      }
      this.counter_ = (this.counter_ + 1) & 0xFFFF;
      cycles--;
      this.onCounterChange_();
    }
  }

  onCounterChange_() {
    //Multiplexer to select bit from counter using TAC
    let bit = null;
    switch (this.TAC & 0x03) {
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
    //Input to the falling edge detector
    let enabled = (this.TAC >> 2) & 0x01;
    //Determine whether timer should increment using falling edge detector
    if (((this.prev_ >>> bit) & 0x01 & enabled) === 1 && ((this.counter_ >>> bit) & 0x01 & enabled) === 0) {
      if (this.TIMA === 0xFF) {
        //Delay interrupt 4 cycles
        this.interruptThreshold_ = 4;
        this.TIMA = this.TMA;
      } else {
        this.TIMA++;
      }
    }
    //Determine whether to step the APU Frame Sequencer using DIV.
    if ((this.prev_ >>> 12) & 0x01 === 1 && ((this.counter_ >>> 12) & 0x01) === 0) {
      this.GB.APU.stepFrameSequencer();
    }
    this.prev_ = this.counter_;
  }
}
