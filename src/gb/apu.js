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

const Masks = [
  0x80, 0x3F, 0x00, 0xFF, 0xBF,
  0xFF, 0x3F, 0x00, 0xFF, 0xBF,
  0x7F, 0xFF, 0x9F, 0xFF, 0xBF,
  0xFF, 0xFF, 0x00, 0x00, 0xBF,
  0x00, 0x00, 0x70
];

const EnabledFlags = {
  GLOBAL: 0x80,
  CHANNEL_4: 0x08,
  CHANNEL_3: 0x04,
  CHANNEL_2: 0x02,
  CHANNEL_1: 0x01
};

export class APU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  step(cycles) {

  }

  stepFrameSequencer() {

  }

  reset() {
    this.Reg = new Uint8Array(23);
    this.MaskedReg = new Uint8Array(23);
  }

  set(reg, val) {
    if (reg !== Registers.NR52 && !(this.Reg[Registers.NR52] & EnabledFlags.GLOBAL)) { //APU off
      return;
    }
    if (reg === Registers.NR52) {
      val &= ~0x0F;
      if (!(val & EnabledFlags.GLOBAL)) {
        for (let i = 0; i < this.Reg.length; i++) {
          this.Reg[i] = 0;
          this.MaskedReg[i] = Masks[i];
        }
      }
    }
    this.Reg[reg] = val;
    this.MaskedReg[reg] = val | Masks[reg];
  }
}
