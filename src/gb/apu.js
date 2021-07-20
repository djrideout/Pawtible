export const Registers = {
  NR10: 0,  //FF10
  NR11: 1,  //FF11
  NR12: 2,  //FF12
  NR13: 3,  //FF13
  NR14: 4,  //FF14
  NR21: 5,  //FF16
  NR22: 6,  //FF17
  NR23: 7,  //FF18
  NR24: 8,  //FF19
  NR30: 9,  //FF1A
  NR31: 10, //FF1B
  NR32: 11, //FF1C
  NR33: 12, //FF1D
  NR34: 13, //FF1E
  NR41: 14, //FF20
  NR42: 15, //FF21
  NR43: 16, //FF22
  NR44: 17, //FF23
  NR50: 18, //FF24
  NR51: 19, //FF25
  NR52: 20  //FF26
};

const SquareDuties = [
  0b00000001,
  0b10000001,
  0b10000111,
  0b01111110
];

// https://nightshade256.github.io/2021/03/27/gb-sound-emulation.html
// https://gbdev.io/pandocs/Sound_Controller.html
export class APU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  reset() {
    this.Reg = new Uint8Array(21);
    this.queueTimer_ = 0;
    this.frameSequencerClock_ = 0;
    this.enabled_ = true;
    this.Channel2 = {
      enabled: true,
      freq: 0,
      freqTimer: 0,
      length: 0,
      lengthTimer: 0,
      pos: 0,
      restart: 0
    };
  }

  step(cycles) {
    if (!this.enabled_) {
      return;
    }
    while (cycles > 0) {
      cycles--;
      this.Channel2.freqTimer--;
      if (this.Channel2.freqTimer <= 0) {
        this.Channel2.freqTimer = (2048 - this.Channel2.freq) * 4;
        this.Channel2.pos = (this.Channel2.pos + 1) % 8;
      }
      this.queueTimer_--;
      if (this.queueTimer_ <= 0) {
        this.queueTimer_ = 87; //approx. 4194304Hz/48000Hz

      }
    }
  }

  stepFrameSequencer() {
    this.frameSequencerClock_ = (this.frameSequencerClock_ + 1) % 8;
    if (this.frameSequencerClock_ & 0b1 === 0) {
      this.stepLength_();
    }
    if (this.frameSequencerClock_ === 7) {
      this.stepEnvelope_();
    }
    if (this.frameSequencerClock_ & 0b10 === 1 && this.frameSequencerClock_ & 0b1 === 0) {
      this.stepSweep_();
    }
  }

  stepLength_() {
    if (this.Channel2LengthEnabled && this.Channel2.lengthTimer > 0) {
      this.Channel2.lengthTimer--;
      if (this.Channel2.lengthTimer === 0) {
        this.Channel2.enabled = false;
      }
    }
  }

  stepEnvelope_() {

  }

  stepSweep_() {

  }

  set NR10(val) {
    this.Reg[Registers.NR10] = val;
  }

  set NR11(val) {
    this.Reg[Registers.NR11] = val;
  }

  set NR12(val) {
    this.Reg[Registers.NR12] = val;
  }

  set NR13(val) {
    this.Reg[Registers.NR13] = val;
  }

  set NR14(val) {
    this.Reg[Registers.NR14] = val;
  }

  set NR21(val) {
    this.Channel2.length = val & 0b111111;
    this.Channel2.lengthTimer = 64 - this.Channel2.length;
    this.Reg[Registers.NR21] = val & ~0b111111;
  }

  set NR22(val) {
    this.Reg[Registers.NR22] = val;
  }

  set NR23(val) {
    this.Channel2.freq = (this.Channel2.freq &= ~0b11111111) | val;
  }

  set NR24(val) {
    this.Channel2.freq = (this.Channel2.freq &= ~0b11100000000) | (val & 0b111 << 8);
    this.Channel2.restart = this.Channel2.freq & 0b1000000;
    if (this.Reg[Registers.NR24] & 0b10000000) {
      // Trigger Event
      this.Channel2.enabled = true;
      if (this.Channel2.lengthTimer === 0) {
        this.Channel2.lengthTimer = 64;
      }
      this.Channel2.freqTimer = (2048 - this.Channel2.freq) * 4;
    }
    this.Reg[Registers.NR24] = val & ~0b10000111;
  }

  set NR30(val) {
    this.Reg[Registers.NR30] = val;
  }

  set NR31(val) {
    this.Reg[Registers.NR31] = val;
  }

  set NR32(val) {
    this.Reg[Registers.NR32] = val;
  }

  set NR33(val) {
    this.Reg[Registers.NR33] = val;
  }

  set NR34(val) {
    this.Reg[Registers.NR34] = val;
  }

  set NR41(val) {
    this.Reg[Registers.NR41] = val;
  }

  set NR42(val) {
    this.Reg[Registers.NR42] = val;
  }

  set NR43(val) {
    this.Reg[Registers.NR43] = val;
  }

  set NR44(val) {
    this.Reg[Registers.NR44] = val;
  }

  set NR50(val) {
    this.Reg[Registers.NR50] = val;
  }

  set NR51(val) {
    this.Reg[Registers.NR51] = val;
  }

  set NR52(val) {
    this.Reg[Registers.NR52] = val;
  }

  get Channel2Amplitude() {
    return SquareDuties[this.Channel2Duty][this.Channel2.pos];
  }

  get Channel2Duty() {
    return this.Reg[Registers.NR21] & 0b11000000 >> 6;
  }

  get Channel2EnvelopeVolume() {
    return this.Reg[Registers.NR22] & 0b11110000 >> 4;
  }

  get Channel2EnvelopeDirection() {
    return this.Reg[Registers.NR22] & 0b1000 >> 3;
  }

  get Channel2EnvelopeSweep() {
    return this.Reg[Registers.NR22] & 0b111;
  }

  get Channel2LengthEnabled() {
    return this.Reg[Registers.NR24] & 0b1000000;
  }
}
