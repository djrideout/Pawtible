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

export class APU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.Reg = new Uint8Array(21);
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
    this.Reg[Registers.NR21] = val;
  }

  set NR22(val) {
    this.Reg[Registers.NR22] = val;
  }

  set NR23(val) {
    this.Reg[Registers.NR23] = val;
  }

  set NR24(val) {
    this.Reg[Registers.NR24] = val;
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
}
