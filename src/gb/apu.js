export const Registers = {
  NR10: 0,  //FF10
  NR11: 1,  //FF11
  NR12: 2,  //FF12
  NR13: 3,  //FF13
  NR14: 4,  //FF14
  NR20: 5,  //FF15, unused
  NR21: 6,  //FF16
  NR22: 7,  //FF17
  NR23: 8,  //FF18
  NR24: 9,  //FF19
  NR30: 10, //FF1A
  NR31: 11, //FF1B
  NR32: 12, //FF1C
  NR33: 13, //FF1D
  NR34: 14, //FF1E
  NR40: 15, //FF1F, unused
  NR41: 16, //FF20
  NR42: 17, //FF21
  NR43: 18, //FF22
  NR44: 19, //FF23
  NR50: 20, //FF24
  NR51: 21, //FF25
  NR52: 22  //FF26
};

export const Masks = [
  0x80, 0x3F, 0x00, 0xFF, 0xBF,
  0xFF, 0x3F, 0x00, 0xFF, 0xBF,
  0x7F, 0xFF, 0x9F, 0xFF, 0xBF,
  0xFF, 0xFF, 0x00, 0x00, 0xBF,
  0x00, 0x00, 0x70
];

export class APU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  reset() {
    this.Reg = new Uint8Array(23);
    this.step = 0;
    let that = this;
    this.channels = [
      {
        get enabled() {
          return that.Reg[Registers.NR52] & 0x01;
        },
        set enabled(bool) {
          that.Reg[Registers.NR52] = (that.Reg[Registers.NR52] & ~0x01) | (bool << 0)
        },
        get dac_enabled() {
          return that.Reg[Registers.NR12] & 0xF8;
        },
        length: {
          counter: 0,
          get enabled() {
            return that.Reg[Registers.NR14] & 0x40;
          },
          set enabled(bool) {
            that.Reg[Registers.NR14] = (that.Reg[Registers.NR14] & ~0x40) | (bool << 6);
          },
          get data() {
            return that.Reg[Registers.NR11] & 0x3F;
          },
          set data(val) {
            that.Reg[Registers.NR11] = (that.Reg[Registers.NR11] & ~0x3F) | (val & 0x3F);
          }
        }
      },
      {
        get enabled() {
          return that.Reg[Registers.NR52] & 0x02;
        },
        set enabled(bool) {
          that.Reg[Registers.NR52] = (that.Reg[Registers.NR52] & ~0x02) | (bool << 1)
        },
        get dac_enabled() {
          return that.Reg[Registers.NR22] & 0xF8;
        },
        length: {
          counter: 0,
          get enabled() {
            return that.Reg[Registers.NR24] & 0x40;
          },
          set enabled(bool) {
            that.Reg[Registers.NR24] = (that.Reg[Registers.NR24] & ~0x40) | (bool << 6);
          },
          get data() {
            return that.Reg[Registers.NR21] & 0x3F;
          },
          set data(val) {
            that.Reg[Registers.NR21] = (that.Reg[Registers.NR21] & ~0x3F) | (val & 0x3F);
          }
        }
      },
      {
        get enabled() {
          return that.Reg[Registers.NR52] & 0x04;
        },
        set enabled(bool) {
          that.Reg[Registers.NR52] = (that.Reg[Registers.NR52] & ~0x04) | (bool << 2)
        },
        get dac_enabled() {
          return that.Reg[Registers.NR30] & 0x80;
        },
        length: {
          counter: 0,
          get enabled() {
            return that.Reg[Registers.NR34] & 0x40;
          },
          set enabled(bool) {
            that.Reg[Registers.NR34] = (that.Reg[Registers.NR34] & ~0x40) | (bool << 6);
          },
          get data() {
            return that.Reg[Registers.NR31];
          },
          set data(val) {
            that.Reg[Registers.NR31] = val;
          }
        }
      },
      {
        get enabled() {
          return that.Reg[Registers.NR52] & 0x08;
        },
        set enabled(bool) {
          that.Reg[Registers.NR52] = (that.Reg[Registers.NR52] & ~0x08) | (bool << 3)
        },
        get dac_enabled() {
          return that.Reg[Registers.NR42] & 0xF8;
        },
        length: {
          counter: 0,
          get enabled() {
            return that.Reg[Registers.NR44] & 0x40;
          },
          set enabled(bool) {
            that.Reg[Registers.NR44] = (that.Reg[Registers.NR44] & ~0x40) | (bool << 6);
          },
          get data() {
            return that.Reg[Registers.NR41] & 0x3F;
          },
          set data(val) {
            that.Reg[Registers.NR41] = (that.Reg[Registers.NR41] & ~0x3F) | (val & 0x3F);
          }
        }
      }
    ];
  }

  get enabled() {
    return this.Reg[Registers.NR52] & 0x80;
  }

  set enabled(bool) {
    this.Reg[Registers.NR52] = (this.Reg[Registers.NR52] & ~0x80) | (bool << 7);
  }

  stepFrameSequencer() {
    this.step = (this.step + 1) % 8;
    if ((this.step % 2) === 0) {
      this.stepLength_();
    }
    if (this.step === 7) {
      this.stepEnvelope_();
    }
    if (this.step === 2 || this.step === 6) {
      this.stepSweep_();
    }
  }

  stepLength_() {
    for (let i = 0; i < this.channels.length; i++) {
      let chan = this.channels[i];
      if (chan.length.enabled && chan.length.counter > 0) {
        if (--chan.length.counter === 0) {
          chan.enabled = false;
        }
      }
    }
  }

  stepEnvelope_() {

  }

  stepSweep_() {

  }

  set(reg, val) {
    if (reg !== Registers.NR52 && !this.enabled) {
      return;
    }
    if (reg === Registers.NR52) {
      val &= ~0x0F;
      if (!(val & 0x80)) {
        // When disabling sound, all registers are set to 0
        for (let i = 0; i < this.Reg.length; i++) {
          this.Reg[i] = 0;
        }
      }
    }
    let chan = (reg - 1) / 5;
    if (chan % 1 === 0 && chan < 4) {
      // When writing length data, counter must be set as well
      let mask = chan === 2 ? 0xFF : 0x3F;
      this.channels[chan].length.counter = mask + 1 - (val & mask);
    }
    chan = (reg - 4) / 5;
    if (chan % 1 === 0 && chan < 4 && (val & 0x80)) {
      // Causing trigger event
      if (this.channels[chan].dac_enabled) {
        this.channels[chan].enabled = true;
      }
      if (this.channels[chan].length.counter === 0) {
        this.channels[chan].length.counter = chan === 2 ? 256 : 64;
      }
    }
    chan = (reg - 2) / 5;
    if (chan % 1 === 0 && chan < 4 && chan !== 2 && (val & 0xF8) === 0) {
      // DAC disabled for channel 1, 2, or 4
      this.channels[chan].enabled = false;
    }
    if (chan % 1 === 0 && chan === 2 && (val & 0x80) === 0) {
      // DAC disabled for channel 3
      this.channels[chan].enabled = false;
    }
    this.Reg[reg] = val;
  }
}
