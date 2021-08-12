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

const MaxLengths = [
  64,
  64,
  256,
  64
];

const Duties = [
  0b00000001,
  0b00000011,
  0b00001111,
  0b11111100
];

export class APU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  reset() {
    this.Reg = new Uint8Array(23);
    this.step_ = 0;
    let that = this;
    this.channels = [
      {
        duty_position: 0,
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
        },
        frequency: {
          counter: 0,
          get value() {
            return ((that.Reg[Registers.NR14] & 7) <<8) | that.Reg[Registers.NR13];
          }
        }
      },
      {
        duty_position: 0,
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
        },
        frequency: {
          counter: 0,
          get value() {
            return ((that.Reg[Registers.NR24] & 7) <<8) | that.Reg[Registers.NR23];
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
        },
        frequency: {
          counter: 0,
          get value() {
            return ((that.Reg[Registers.NR34] & 7) <<8) | that.Reg[Registers.NR33];
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

  step(cycles) {
    while (cycles > 0) {
      cycles--;
      for (let i = 0; i < this.channels.length; i++) {
        // https://nightshade256.github.io/2021/03/27/gb-sound-emulation.html
        // Each T-cycle the frequency timer is decremented by 1.
        // As soon as it reaches 0, it is reloaded with a value calculated by:
        // Frequency Timer = (2048 - Frequency) * 4
        // and the wave duty position register is incremented by 1.
        // Note: The wave duty position is wrapped back to 0 when it goes above 7.
        //
        // Only channels 1, 2 and 3 have frequency counters as channel 4 is a noise channel.
        if (this.channels[i].enabled && i < 3) {
          if (--this.channels[i].frequency.counter <= 0) {
            this.channels[i].frequency.counter = (2048 - this.channels[i].frequency.value) * 4;
            // Of the channels that have a frequency counter, only channels 1 and 2 have duty positions
            // as the duty patterns in the table 'Duties' are for square waves only. Channel 3 is a wave channel.
            if (i < 2) {
              this.channels[i].duty_position = (this.channels[i].duty_position + 1) % 8;
            }
          }
        }
      }
    }
  }

  stepFrameSequencer() {
    this.step_ = (this.step_ + 1) % 8;
    if ((this.step_ % 2) === 0) {
      this.stepLength_();
    }
    if (this.step_ === 7) {
      this.stepEnvelope_();
    }
    if (this.step_ === 2 || this.step_ === 6) {
      this.stepSweep_();
    }
  }

  stepLength_() {
    for (let i = 0; i < this.channels.length; i++) {
      let chan = this.channels[i];
      if (chan.length.enabled && chan.length.counter > 0 && --chan.length.counter === 0) {
        chan.enabled = false;
      }
    }
  }

  stepEnvelope_() {

  }

  stepSweep_() {

  }

  set(reg, val) {
    // Only writes to NR52 are allowed if APU is disabled globally
    if (reg !== Registers.NR52 && !this.enabled) {
      return;
    }

    // NR52 controls whether sound is on or off globally (bit 7).
    // The other bits are for the individual channels, and are read only.
    if (reg === Registers.NR52) {
      val &= ~0x0F;
      // When disabling sound globally, all APU registers are set to 0
      if (!(val & 0x80)) {
        for (let i = 0; i < this.Reg.length; i++) {
          this.Reg[i] = 0;
        }
      }
    }

    let chan = (reg - 1) / 5;
    // Writing to NRx1
    if (chan % 1 === 0 && chan < 4) {
      // When writing length data, the length counter must be set as well
      let mask = MaxLengths[chan] - 1;
      this.channels[chan].length.counter = mask + 1 - (val & mask);
    }

    chan = (reg - 2) / 5;
    // Writing to NRx2
    // DAC is being disabled for channels 1, 2, or 4
    if (chan % 1 === 0 && chan < 4 && chan !== 2 && (val & 0xF8) === 0) {
      this.channels[chan].enabled = false;
    }
    // DAC is being disabled for channel 3
    if (chan % 1 === 0 && chan === 2 && (val & 0x80) === 0) {
      this.channels[chan].enabled = false;
    }

    chan = (reg - 4) / 5;
    // Writing to NRx4
    // See https://gbdev.gg8.se/wiki/articles/Gameboy_sound_hardware#Obscure_Behavior for more documentation on some of this behaviour.
    if (chan % 1 === 0 && chan < 4) {
      // On write to register 4, if the next sequencer step does not clock length, there is obscure behaviour.
      // If length is being enabled, and length counter is greater than 0, the length counter is clocked.
      if ((this.step_ & 1) === 0 && !this.channels[chan].length.enabled && (val & 0x40) && this.channels[chan].length.counter > 0) {
        this.channels[chan].length.counter--;
        // Disable the channel if length is 0 as usual.
        // If there is a trigger event happening on this write, the channel will be re-enabled there.
        if (this.channels[chan].length.counter === 0) {
          this.channels[chan].enabled = false;
        }
      }
      // Causing trigger event
      if (val & 0x80) {
        this.channels[chan].enabled = true;
        // On a trigger event, if the length counter is 0, it will be set to the max value for this channel.
        if (this.channels[chan].length.counter === 0) {
          this.channels[chan].length.counter = MaxLengths[chan];
          // If the sequencer's next step doesn't clock length and length is enabled with this write (regardless of whether it was already enabled),
          // the length counter is clocked.
          if ((this.step_ & 1) === 0 && (val & 0x40)) {
            this.channels[chan].length.counter--;
          }
        }
        // If the channel's DAC is off, the channel becomes disabled again after the trigger work is done.
        if (!this.channels[chan].dac_enabled) {
          this.channels[chan].enabled = false;
        }
      }
    }
    this.Reg[reg] = val;
  }
}
