export const Registers = {
  A: "regA",
  F: "regF",
  AF: "regA_regF",
  B: "regB",
  C: "regC",
  BC: "regB_regC",
  D: "regD",
  E: "regE",
  DE: "regD_regE",
  H: "regH",
  L: "regL",
  HL: "regH_regL",
  SP: "regSP",
  PC: "regPC",
  IME: "regIME" //not actually a register, it's a flag, but i'll say it's a register to have a single entrypoint to modifying cpu
};

const Registers8 = {
  A: 0,
  F: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  H: 6,
  L: 7
};

const Registers16 = {
  AF: 0,
  BC: 1,
  DE: 2,
  HL: 3,
  SP: 4,
  PC: 5
}

export const Flags = {
  Z: "Z",
  N: "N",
  H: "H",
  C: "C"
};

const CYCLES_PER_FRAME = 69905; //approx. 4194304Hz/60fps

export class CPU {
  constructor(gameBoy) {
    this.halted_ = false;
    this.paused_ = true;
    this.count_ = 0;
    this.breakpoints_ = new Map();
    this.GB = gameBoy;
    this.Reg8 = new Uint8Array(8);
    this.Reg16 = new Uint16Array(6);
    this.reset();
  }

  reset() {
    this.AF = 0x01B0;
    this.BC = 0x0013;
    this.DE = 0x00D8;
    this.HL = 0x014D;
    this.PC = 0x0100;
    this.SP = 0xFFFE;
    this.FlagIME = false;
  }

  pause() {
    this.paused_ = true;
  }

  isPaused() {
    return this.paused_;
  }

  unpause() {
    this.paused_ = false;
  }

  get Breakpoints() {
    let bps = [];
    this.breakpoints_.forEach((value, key) => {
      bps.push({
        addr: key,
        enabled: value
      });
    });
    return bps.sort((a, b) => a.addr - b.addr);
  }

  setBreakpoint(addr, enabled = true) {
    this.breakpoints_.set(addr, enabled);
  }

  isBreakpointEnabled(addr) {
    return !!this.breakpoints_.get(addr);
  }

  removeBreakpoint(addr) {
    this.breakpoints_.delete(addr);
  }

  runFrame() {
    if(this.paused_) {
      return;
    }
    this.count_ = 0;
    while(this.count_ < CYCLES_PER_FRAME) {
      this.step();
      if(this.isBreakpointEnabled(this.PC)) {
        this.pause();
        return;
      }
    }
  }

  update(cycles) {
    this.count_ += cycles;
    this.GB.PPU.step(cycles);
    this.GB.Timer.step(cycles);
  }

  step() {
    this.runInst_();
    this.interrupts_();
  }

  interrupts_() {
    //If several interrupts are requested at once, the interrupt of the lowest bit takes priority.
    if(this.FlagVBlankRequest) {
      this.halted_ = false;
      if(this.FlagIME && this.FlagVBlankEnable) {
        this.update(4);
        this.FlagVBlankRequest = false;
        this.push_(Registers.PC);
        this.update(4);
        this.PC = 0x0040;
      }
    } else if(this.FlagLCDSTATRequest) {
      this.halted_ = false;
      if(this.FlagIME && this.FlagLCDSTATEnable) {
        this.update(4);
        this.FlagLCDSTATRequest = false;
        this.push_(Registers.PC);
        this.update(4);
        this.PC = 0x0048;
      }
    } else if(this.FlagTimerRequest) {
      this.halted_ = false;
      if(this.FlagIME && this.FlagTimerEnable) {
        this.update(4);
        this.FlagTimerRequest = false;
        this.push_(Registers.PC);
        this.update(4);
        this.PC = 0x0050;
      }
    } else if(this.FlagSerialRequest) {
      this.halted_ = false;
      if(this.FlagIME && this.FlagSerialEnable) {
        this.update(4);
        this.FlagSerialRequest = false;
        this.push_(Registers.PC);
        this.update(4);
        this.PC = 0x0058;
      }
    } else if(this.FlagJoypadRequest) {
      this.halted_ = false;
      if(this.FlagIME && this.FlagJoypadEnable) {
        this.update(4);
        this.FlagJoypadRequest = false;
        this.push_(Registers.PC);
        this.update(4);
        this.PC = 0x0060;
      }
    }
  }

  runInst_() {
    if(this.halted_) {
      this.update(4);
      return;
    }
    switch(this.GB.M.get(this.PC++)) {
      case 0x00:
        break;
      case 0x01:
        this.ldr_(Registers.BC, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        break;
      case 0x02:
        this.lda_(this.BC, this.A);
        break;
      case 0x03:
        this.inc16_(Registers.BC);
        break;
      case 0x04:
        this.inc8r_(Registers.B);
        break;
      case 0x05:
        this.dec8r_(Registers.B);
        break;
      case 0x06:
        this.ldr_(Registers.B, this.GB.M.get(this.PC++));
        break;
      case 0x07:
        this.rlcakku_();
        break;
      case 0x08:
        this.lda_(this.GB.M.get(this.PC, 2), this.SP, 2);
        this.PC += 2;
        break;
      case 0x09:
        this.addHL16r_(Registers.BC);
        break;
      case 0x0A:
        this.ldr_(Registers.A, this.GB.M.get(this.BC));
        break;
      case 0x0B:
        this.dec16_(Registers.BC);
        break;
      case 0x0C:
        this.inc8r_(Registers.C);
        break;
      case 0x0D:
        this.dec8r_(Registers.C);
        break;
      case 0x0E:
        this.ldr_(Registers.C, this.GB.M.get(this.PC++));
        break;
      case 0x0F:
        this.rrcakku_();
        break;
      case 0x10:
        //Let's just say stop is halt for now.
        //this.halted_ = true;
        break;
      case 0x11:
        this.ldr_(Registers.DE, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        break;
      case 0x12:
        this.lda_(this.DE, this.A);
        break;
      case 0x13:
        this.inc16_(Registers.DE);
        break;
      case 0x14:
        this.inc8r_(Registers.D);
        break;
      case 0x15:
        this.dec8r_(Registers.D);
        break;
      case 0x16:
        this.ldr_(Registers.D, this.GB.M.get(this.PC++));
        break;
      case 0x17:
        this.rlakku_();
        break;
      case 0x18:
        this.jr_(this.GB.M.get(this.PC++));
        break;
      case 0x19:
        this.addHL16r_(Registers.DE);
        break;
      case 0x1A:
        this.ldr_(Registers.A, this.GB.M.get(this.DE));
        break;
      case 0x1B:
        this.dec16_(Registers.DE);
        break;
      case 0x1C:
        this.inc8r_(Registers.E);
        break;
      case 0x1D:
        this.dec8r_(Registers.E);
        break;
      case 0x1E:
        this.ldr_(Registers.E, this.GB.M.get(this.PC++));
        break;
      case 0x1F:
        this.rrakku_();
        break;
      case 0x20:
        if(!this.FlagZ) {
          this.jr_(this.GB.M.get(this.PC++));
        } else {
          this.PC++;
          this.update(4);
        }
        break;
      case 0x21:
        this.ldr_(Registers.HL, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        break;
      case 0x22:
        this.lda_(this.HL, this.A);
        this.inc16_(Registers.HL, false);
        break;
      case 0x23:
        this.inc16_(Registers.HL);
        break;
      case 0x24:
        this.inc8r_(Registers.H);
        break;
      case 0x25:
        this.dec8r_(Registers.H);
        break;
      case 0x26:
        this.ldr_(Registers.H, this.GB.M.get(this.PC++));
        break;
      case 0x27:
        this.daa_();
        break;
      case 0x28:
        if(this.FlagZ) {
          this.jr_(this.GB.M.get(this.PC++));
        } else {
          this.PC++;
          this.update(4);
        }
        break;
      case 0x29:
        this.addHL16r_(Registers.HL);
        break;
      case 0x2A:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        this.inc16_(Registers.HL, false);
        break;
      case 0x2B:
        this.dec16_(Registers.HL);
        break;
      case 0x2C:
        this.inc8r_(Registers.L);
        break;
      case 0x2D:
        this.dec8r_(Registers.L);
        break;
      case 0x2E:
        this.ldr_(Registers.L, this.GB.M.get(this.PC++));
        break;
      case 0x2F:
        this.FlagN = true;
        this.FlagH = true;
        this.A ^= 0xFF;
        break;
      case 0x30:
        if(!this.FlagC) {
          this.jr_(this.GB.M.get(this.PC++));
        } else {
          this.PC++;
          this.update(4);
        }
        break;
      case 0x31:
        this.ldr_(Registers.SP, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        break;
      case 0x32:
        this.lda_(this.HL, this.A);
        this.dec16_(Registers.HL, false);
        break;
      case 0x33:
        this.inc16_(Registers.SP);
        break;
      case 0x34:
        this.inc8a_(this.HL);
        break;
      case 0x35:
        this.dec8a_(this.HL);
        break;
      case 0x36:
        this.lda_(this.HL, this.GB.M.get(this.PC++));
        break;
      case 0x37:
        this.scf_();
        break;
      case 0x38:
        if(this.FlagC) {
          this.jr_(this.GB.M.get(this.PC++));
        } else {
          this.PC++;
          this.update(4);
        }
        break;
      case 0x39:
        this.addHL16r_(Registers.SP);
        break;
      case 0x3A:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        this.dec16_(Registers.HL, false);
        break;
      case 0x3B:
        this.dec16_(Registers.SP);
        break;
      case 0x3C:
        this.inc8r_(Registers.A);
        break;
      case 0x3D:
        this.dec8r_(Registers.A);
        break;
      case 0x3E:
        this.ldr_(Registers.A, this.GB.M.get(this.PC++));
        break;
      case 0x3F:
        this.ccf_();
        break;
      case 0x40:
        //this.ldr_(Registers.B, this.B);
        break;
      case 0x41:
        this.ldr_(Registers.B, this.C);
        break;
      case 0x42:
        this.ldr_(Registers.B, this.D);
        break;
      case 0x43:
        this.ldr_(Registers.B, this.E);
        break;
      case 0x44:
        this.ldr_(Registers.B, this.H);
        break;
      case 0x45:
        this.ldr_(Registers.B, this.L);
        break;
      case 0x46:
        this.ldr_(Registers.B, this.GB.M.get(this.HL));
        break;
      case 0x47:
        this.ldr_(Registers.B, this.A);
        break;
      case 0x48:
        this.ldr_(Registers.C, this.B);
        break;
      case 0x49:
        //this.ldr_(Registers.C, this.C);
        break;
      case 0x4A:
        this.ldr_(Registers.C, this.D);
        break;
      case 0x4B:
        this.ldr_(Registers.C, this.E);
        break;
      case 0x4C:
        this.ldr_(Registers.C, this.H);
        break;
      case 0x4D:
        this.ldr_(Registers.C, this.L);
        break;
      case 0x4E:
        this.ldr_(Registers.C, this.GB.M.get(this.HL));
        break;
      case 0x4F:
        this.ldr_(Registers.C, this.A);
        break;
      case 0x50:
        this.ldr_(Registers.D, this.B);
        break;
      case 0x51:
        this.ldr_(Registers.D, this.C);
        break;
      case 0x52:
        //this.ldr_(Registers.D, this.D);
        break;
      case 0x53:
        this.ldr_(Registers.D, this.E);
        break;
      case 0x54:
        this.ldr_(Registers.D, this.H);
        break;
      case 0x55:
        this.ldr_(Registers.D, this.L);
        break;
      case 0x56:
        this.ldr_(Registers.D, this.GB.M.get(this.HL));
        break;
      case 0x57:
        this.ldr_(Registers.D, this.A);
        break;
      case 0x58:
        this.ldr_(Registers.E, this.B);
        break;
      case 0x59:
        this.ldr_(Registers.E, this.C);
        break;
      case 0x5A:
        this.ldr_(Registers.E, this.D);
        break;
      case 0x5B:
        //this.ldr_(Registers.E, this.E);
        break;
      case 0x5C:
        this.ldr_(Registers.E, this.H);
        break;
      case 0x5D:
        this.ldr_(Registers.E, this.L);
        break;
      case 0x5E:
        this.ldr_(Registers.E, this.GB.M.get(this.HL));
        break;
      case 0x5F:
        this.ldr_(Registers.E, this.A);
        break;
      case 0x60:
        this.ldr_(Registers.H, this.B);
        break;
      case 0x61:
        this.ldr_(Registers.H, this.C);
        break;
      case 0x62:
        this.ldr_(Registers.H, this.D);
        break;
      case 0x63:
        this.ldr_(Registers.H, this.E);
        break;
      case 0x64:
        //this.ldr_(Registers.H, this.H);
        break;
      case 0x65:
        this.ldr_(Registers.H, this.L);
        break;
      case 0x66:
        this.ldr_(Registers.H, this.GB.M.get(this.HL));
        break;
      case 0x67:
        this.ldr_(Registers.H, this.A);
        break;
      case 0x68:
        this.ldr_(Registers.L, this.B);
        break;
      case 0x69:
        this.ldr_(Registers.L, this.C);
        break;
      case 0x6A:
        this.ldr_(Registers.L, this.D);
        break;
      case 0x6B:
        this.ldr_(Registers.L, this.E);
        break;
      case 0x6C:
        this.ldr_(Registers.L, this.H);
        break;
      case 0x6D:
        //this.ldr_(Registers.L, this.L);
        break;
      case 0x6E:
        this.ldr_(Registers.L, this.GB.M.get(this.HL));
        break;
      case 0x6F:
        this.ldr_(Registers.L, this.A);
        break;
      case 0x70:
        this.lda_(this.HL, this.B);
        break;
      case 0x71:
        this.lda_(this.HL, this.C);
        break;
      case 0x72:
        this.lda_(this.HL, this.D);
        break;
      case 0x73:
        this.lda_(this.HL, this.E);
        break;
      case 0x74:
        this.lda_(this.HL, this.H);
        break;
      case 0x75:
        this.lda_(this.HL, this.L);
        break;
      case 0x76:
        this.halted_ = true;
        break;
      case 0x77:
        this.lda_(this.HL, this.A);
        break;
      case 0x78:
        this.ldr_(Registers.A, this.B);
        break;
      case 0x79:
        this.ldr_(Registers.A, this.C);
        break;
      case 0x7A:
        this.ldr_(Registers.A, this.D);
        break;
      case 0x7B:
        this.ldr_(Registers.A, this.E);
        break;
      case 0x7C:
        this.ldr_(Registers.A, this.H);
        break;
      case 0x7D:
        this.ldr_(Registers.A, this.L);
        break;
      case 0x7E:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        break;
      case 0x7F:
        //this.ldr_(Registers.A, this.A);
        break;
      case 0x80:
        this.add8r_(Registers.B);
        break;
      case 0x81:
        this.add8r_(Registers.C);
        break;
      case 0x82:
        this.add8r_(Registers.D);
        break;
      case 0x83:
        this.add8r_(Registers.E);
        break;
      case 0x84:
        this.add8r_(Registers.H);
        break;
      case 0x85:
        this.add8r_(Registers.L);
        break;
      case 0x86:
        this.add8v_(this.GB.M.get(this.HL));
        break;
      case 0x87:
        this.add8r_(Registers.A);
        break;
      case 0x88:
        this.adcr_(Registers.B);
        break;
      case 0x89:
        this.adcr_(Registers.C);
        break;
      case 0x8A:
        this.adcr_(Registers.D);
        break;
      case 0x8B:
        this.adcr_(Registers.E);
        break;
      case 0x8C:
        this.adcr_(Registers.H);
        break;
      case 0x8D:
        this.adcr_(Registers.L);
        break;
      case 0x8E:
        this.adcv_(this.GB.M.get(this.HL));
        break;
      case 0x8F:
        this.adcr_(Registers.A);
        break;
      case 0x90:
        this.subr_(Registers.B);
        break;
      case 0x91:
        this.subr_(Registers.C);
        break;
      case 0x92:
        this.subr_(Registers.D);
        break;
      case 0x93:
        this.subr_(Registers.E);
        break;
      case 0x94:
        this.subr_(Registers.H);
        break;
      case 0x95:
        this.subr_(Registers.L);
        break;
      case 0x96:
        this.subv_(this.GB.M.get(this.HL));
        break;
      case 0x97:
        this.subr_(Registers.A);
        break;
      case 0x98:
        this.sbcr_(Registers.B);
        break;
      case 0x99:
        this.sbcr_(Registers.C);
        break;
      case 0x9A:
        this.sbcr_(Registers.D);
        break;
      case 0x9B:
        this.sbcr_(Registers.E);
        break;
      case 0x9C:
        this.sbcr_(Registers.H);
        break;
      case 0x9D:
        this.sbcr_(Registers.L);
        break;
      case 0x9E:
        this.sbcv_(this.GB.M.get(this.HL));
        break;
      case 0x9F:
        this.sbcr_(Registers.A);
        break;
      case 0xA0:
        this.andr_(Registers.B);
        break;
      case 0xA1:
        this.andr_(Registers.C);
        break;
      case 0xA2:
        this.andr_(Registers.D);
        break;
      case 0xA3:
        this.andr_(Registers.E);
        break;
      case 0xA4:
        this.andr_(Registers.H);
        break;
      case 0xA5:
        this.andr_(Registers.L);
        break;
      case 0xA6:
        this.andv_(this.GB.M.get(this.HL));
        break;
      case 0xA7:
        this.andr_(Registers.A);
        break;
      case 0xA8:
        this.xorr_(Registers.B);
        break;
      case 0xA9:
        this.xorr_(Registers.C);
        break;
      case 0xAA:
        this.xorr_(Registers.D);
        break;
      case 0xAB:
        this.xorr_(Registers.E);
        break;
      case 0xAC:
        this.xorr_(Registers.H);
        break;
      case 0xAD:
        this.xorr_(Registers.L);
        break;
      case 0xAE:
        this.xorv_(this.GB.M.get(this.HL));
        break;
      case 0xAF:
        this.xorr_(Registers.A);
        break;
      case 0xB0:
        this.orr_(Registers.B);
        break;
      case 0xB1:
        this.orr_(Registers.C);
        break;
      case 0xB2:
        this.orr_(Registers.D);
        break;
      case 0xB3:
        this.orr_(Registers.E);
        break;
      case 0xB4:
        this.orr_(Registers.H);
        break;
      case 0xB5:
        this.orr_(Registers.L);
        break;
      case 0xB6:
        this.orv_(this.GB.M.get(this.HL));
        break;
      case 0xB7:
        this.orr_(Registers.A);
        break;
      case 0xB8:
        this.cpr_(Registers.B);
        break;
      case 0xB9:
        this.cpr_(Registers.C);
        break;
      case 0xBA:
        this.cpr_(Registers.D);
        break;
      case 0xBB:
        this.cpr_(Registers.E);
        break;
      case 0xBC:
        this.cpr_(Registers.H);
        break;
      case 0xBD:
        this.cpr_(Registers.L);
        break;
      case 0xBE:
        this.cpv_(this.GB.M.get(this.HL));
        break;
      case 0xBF:
        this.cpr_(Registers.A);
        break;
      case 0xC0:
        if(!this.FlagZ) {
          this.ret_();
        } else {
          this.update(4);
        }
        break;
      case 0xC1:
        this.pop_(Registers.BC);
        break;
      case 0xC2:
        if(!this.FlagZ) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr, true);
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xC3:
        this.jp_(this.GB.M.get(this.PC, 2), true);
        break;
      case 0xC4:
        if(!this.FlagZ) {
          this.call16_();
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xC5:
        this.push_(Registers.BC);
        break;
      case 0xC6:
        this.add8v_(this.GB.M.get(this.PC++));
        break;
      case 0xC7:
        this.call8_(0x0000);
        break;
      case 0xC8:
        if(this.FlagZ) {
          this.ret_();
        } else {
          this.update(4);
        }
        break;_
      case 0xC9:
        this.ret_(false);
        break;
      case 0xCA:
        if(this.FlagZ) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr, true);
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xCB:
        this.runCBInst_(this.GB.M.get(this.PC++));
        break;
      case 0xCC:
        if(this.FlagZ) {
          this.call16_();
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xCD:
        this.call16_();
        break;
      case 0xCE:
        this.adcv_(this.GB.M.get(this.PC++));
        break;
      case 0xCF:
        this.call8_(0x0008);
        break;
      case 0xD0:
        if(!this.FlagC) {
          this.ret_();
        } else {
          this.update(4);
        }
        break;
      case 0xD1:
        this.pop_(Registers.DE);
        break;
      case 0xD2:
        if(!this.FlagC) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr, true);
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xD4:
        if(!this.FlagC) {
          this.call16_();
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xD5:
        this.push_(Registers.DE);
        break;
      case 0xD6:
        this.subv_(this.GB.M.get(this.PC++));
        break;
      case 0xD7:
        this.call8_(0x0010);
        break;
      case 0xD8:
        if(this.FlagC) {
          this.ret_();
        } else {
          this.update(4);
        }
        break;
      case 0xD9:
        this.FlagIME = true;
        this.ret_(false);
        break;
      case 0xDA:
        if(this.FlagC) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr, true);
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xDC:
        if(this.FlagC) {
          this.call16_();
        } else {
          this.PC += 2;
          this.update(4);
          this.update(4);
        }
        break;
      case 0xDE:
        this.sbcv_(this.GB.M.get(this.PC++));
        break;
      case 0xDF:
        this.call8_(0x0018);
        break;
      case 0xE0:
        this.lda_(0xFF00 + this.GB.M.get(this.PC++), this.A);
        break;
      case 0xE1:
        this.pop_(Registers.HL);
        break;
      case 0xE2:
        this.lda_(0xFF00 + this.C, this.A);
        break;
      case 0xE5:
        this.push_(Registers.HL);
        break;
      case 0xE6:
        this.andv_(this.GB.M.get(this.PC++));
        break;
      case 0xE7:
        this.call8_(0x0020);
        break;
      case 0xE8:
        this.add16signed8v_(this.GB.M.get(this.PC++));
        break;
      case 0xE9:
        this.jp_(this.HL);
        break;
      case 0xEA:
        this.lda_(this.GB.M.get(this.PC, 2), this.A);
        this.PC += 2;
        break;
      case 0xEE:
        this.xorv_(this.GB.M.get(this.PC++));
        break;
      case 0xEF:
        this.call8_(0x0028);
        break;
      case 0xF0:
        this.ldr_(Registers.A, this.GB.M.get(0xFF00 + this.GB.M.get(this.PC++)));
        break;
      case 0xF1:
        this.pop_(Registers.AF);
        break;
      case 0xF2:
        this.ldr_(Registers.A, this.GB.M.get(0xFF00 + this.C), false);
        break;
      case 0xF3:
        this.FlagIME = false;
        break;
      case 0xF5:
        this.push_(Registers.AF);
        break;
      case 0xF6:
        this.orv_(this.GB.M.get(this.PC++));
        break;
      case 0xF7:
        this.call8_(0x0030);
        break;
      case 0xF8:
        this.lda16SPsigned8v_(Registers.HL, this.GB.M.get(this.PC++));
        break;
      case 0xF9:
        this.ldr_(Registers.SP, this.HL, true);
        break;
      case 0xFA:
        this.ldr_(Registers.A, this.GB.M.get(this.GB.M.get(this.PC, 2)));
        this.PC += 2;
        break;
      case 0xFB:
        this.FlagIME = true;
        break;
      case 0xFE:
        this.cpv_(this.GB.M.get(this.PC++));
        break;
      case 0xFF:
        this.call8_(0x0038);
        break;
      default:
        throw Error(`Unimplemented opcode 0x${this.GB.M.get(addr, 1, false).toString(16).toUpperCase().padStart(2, "0")}`);
    }
  }

  call8_(a8) {
    this.SP -= 2;
    this.update(4);
    this.lda_(this.SP, this.PC, 2);
    this.PC = a8;
  }

  call16_() {
    let a16 = this.GB.M.get(this.PC, 2);
    this.PC += 2;
    this.SP -= 2;
    this.update(4);
    this.lda_(this.SP, this.PC, 2);
    this.PC = a16;
  }

  inc16_(register, update = true) {
    this.set(register, this.get(register) + 1);
    if(update) {
      this.update(4);
    }
  }

  inc8r_(register) {
    let v0 = this.get(register);
    this.set(register, v0 + 1);
    let v1 = this.get(register);
    this.FlagZ = !v1;
    this.FlagN = false;
    this.FlagH = (v0 & 0xF) + 1 > 0xF;
  }

  inc8a_(addr) {
    let v0 = this.GB.M.get(addr);
    this.GB.M.set(addr, v0 + 1);
    let v1 = this.GB.M.get(addr, 1, false);
    this.FlagZ = !v1;
    this.FlagN = false;
    this.FlagH = (v0 & 0xF) + 1 > 0xF;
  }

  dec16_(register, update = true) {
    this.set(register, this.get(register) - 1);
    if(update) {
      this.update(4);
    }
  }

  dec8r_(register) {
    let v0 = this.get(register);
    this.set(register, v0 - 1);
    let v1 = this.get(register);
    this.FlagZ = !v1;
    this.FlagN = true;
    this.FlagH = (v1 & 0xF) > (v0 & 0xF);
  }

  dec8a_(addr) {
    let v0 = this.GB.M.get(addr);
    this.GB.M.set(addr, v0 - 1);
    let v1 = this.GB.M.get(addr, 1, false);
    this.FlagZ = !v1;
    this.FlagN = true;
    this.FlagH = (v1 & 0xF) > (v0 & 0xF);
  }

  andr_(register) {
    this.A &= this.get(register);
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = true;
    this.FlagC = false;
  }

  andv_(value) {
    this.A &= value;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = true;
    this.FlagC = false;
  }

  orr_(register) {
    this.A |= this.get(register);
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  orv_(value) {
    this.A |= value;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  xorr_(register) {
    this.A ^= this.get(register);
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  xorv_(value) {
    this.A ^= value;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  addHL16r_(register) {
    let v0 = this.HL;
    let value = this.get(register);
    this.HL = v0 + value;
    this.FlagN = false;
    this.FlagH = (v0 & 0xFFF) + (value & 0xFFF) > 0xFFF; //how is this a HALF carry???
    this.FlagC = v0 + value > 0xFFFF;
    this.update(4);
  }

  add8r_(register) {
    let v0 = this.A;
    let value = this.get(register);
    this.A = v0 + value;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) > 0xF;
    this.FlagC = value + v0 > 0xFF;
  }

  add8v_(value) {
    let v0 = this.A;
    this.A = v0 + value;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) > 0xF;
    this.FlagC = value + v0 > 0xFF;
  }

  add16signed8v_(value) {
    //JS numbers in bitwise are 32 bit, so make it negative (if 8 bit negative) in JS
    value = value << 24 >> 24;
    let ogSP = this.SP;
    this.SP += value;
    let test = ogSP ^ value ^ this.SP;
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = (test & 0x10) === 0x10;
    this.FlagC = (test & 0x100) === 0x100;
    this.update(4);
    this.update(4);
  }

  lda16SPsigned8v_(register, value) {
    //JS numbers in bitwise are 32 bit, so make it negative (if 8 bit negative) in JS
    value = value << 24 >> 24;
    this.set(register, this.SP + value);
    let test = this.SP ^ value ^ this.HL;
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = (test & 0x10) === 0x10;
    this.FlagC = (test & 0x100) === 0x100;
    this.update(4);
  }

  subr_(register) {
    this.cpr_(register);
    this.A -= this.get(register);
  }

  subv_(value) {
    this.cpv_(value);
    this.A -= value;
  }

  adcr_(register) {
    let v0 = this.A;
    let value = this.get(register);
    this.A = v0 + value + this.FlagC;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
    this.FlagC = value + v0 + this.FlagC > 0xFF;
  }

  adcv_(value) {
    let v0 = this.A;
    this.A = v0 + value + this.FlagC;
    this.FlagZ = !this.A;
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
    this.FlagC = value + v0 + this.FlagC > 0xFF;
  }

  sbcr_(register) {
    let value = this.get(register);
    let sum = this.A - value - this.FlagC;
    this.FlagH = (this.A & 0xF) - (value & 0xF) - this.FlagC < 0
    this.FlagC = sum < 0;
    this.A = sum & 0xFF;
    this.FlagZ = !this.A;
    this.FlagN = true;
  }

  sbcv_(value) {
    let sum = this.A - value - this.FlagC;
    this.FlagH = (this.A & 0xF) - (value & 0xF) - this.FlagC < 0
    this.FlagC = sum < 0;
    this.A = sum & 0xFF;
    this.FlagZ = !this.A;
    this.FlagN = true;
  }

  cpr_(register) {
    let a = this.A;
    let r = this.get(register);
    this.FlagZ = a === r;
    this.FlagN = true;
    this.FlagH = (r & 0xF) > (a & 0xF);
    this.FlagC = r > a;
  }

  cpv_(value) {
    let a = this.A;
    this.FlagZ = a === value;
    this.FlagN = true;
    this.FlagH = (value & 0xF) > (a & 0xF);
    this.FlagC = value > a;
  }

  ldr_(register, val, update = false) {
    this.set(register, val);
    if(update) {
      this.update(4);
    }
  }

  lda_(addr, val, bytes = 1) {
    this.GB.M.set(addr, val, bytes);
  }

  push_(register) {
    this.SP -= 2;
    this.update(4);
    this.GB.M.set(this.SP, this.get(register), 2);
  }

  pop_(register) {
    this.set(register, this.GB.M.get(this.SP, 2));
    this.SP += 2;
  }

  jr_(offset) {
    //JS numbers are 32-bit when using bitwise operators
    //GB numbers are 8-bit, and so this happens
    this.PC += (offset & 0x80) ? -~(0xFFFFFF00 + offset - 1) : offset;
    this.update(4);
  }

  jp_(addr, update = false) {
    this.PC = addr;
    if(update) {
      this.update(4);
    }
  }

  ret_(update = true) {
    if(update) {
      this.update(4);
    }
    this.PC = this.GB.M.get(this.SP, 2);
    this.update(4);
    this.SP += 2;
  }

  rlakku_() {
    let v = this.A;
    let top = (v & 0x80) >>> 7;
    this.A = (v << 1) | (this.FlagC ? 0x01 : 0x00);
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rlcakku_() {
    let v = this.A;
    let top = (v & 0x80) >>> 7;
    this.A = (v << 1) | top;
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rrakku_() {
    let v = this.A;
    let bot = v & 0x01;
    this.A = (v >>> 1) | (this.FlagC ? 0x80 : 0x00)
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rrcakku_() {
    let v = this.A;
    let bot = (v & 0x01) << 7;
    this.A = (v >>> 1) | bot;
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  scf_() {
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = true;
  }

  ccf_() {
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC ^= true;
  }

  //Very good explanation here:
  //https://forums.nesdev.com/viewtopic.php?f=20&t=15944#p196282
  daa_() {
    if(!this.FlagN) {
      if(this.FlagC || this.A > 0x99) {
        this.A += 0x60;
        this.FlagC = true;
      }
      if(this.FlagH || (this.A & 0x0F) > 0x09) {
        this.A += 0x06;
      }
    } else {
      if(this.FlagC) {
        this.A -= 0x60;
      }
      if(this.FlagH) {
        this.A -= 0x06;
      }
    }
    this.FlagZ = !this.A;
    this.FlagH = 0;
  }

  runCBInst_(op) {
    switch(op) {
      case 0x00:
        this.rlcr_(Registers.B);
        break;
      case 0x01:
        this.rlcr_(Registers.C);
        break;
      case 0x02:
        this.rlcr_(Registers.D);
        break;
      case 0x03:
        this.rlcr_(Registers.E);
        break;
      case 0x04:
        this.rlcr_(Registers.H);
        break;
      case 0x05:
        this.rlcr_(Registers.L);
        break;
      case 0x06:
        this.rlca_(this.HL);
        break;
      case 0x07:
        this.rlcr_(Registers.A);
        break;
      case 0x08:
        this.rrcr_(Registers.B);
        break;
      case 0x09:
        this.rrcr_(Registers.C);
        break;
      case 0x0A:
        this.rrcr_(Registers.D);
        break;
      case 0x0B:
        this.rrcr_(Registers.E);
        break;
      case 0x0C:
        this.rrcr_(Registers.H);
        break;
      case 0x0D:
        this.rrcr_(Registers.L);
        break;
      case 0x0E:
        this.rrca_(this.HL);
        break;
      case 0x0F:
        this.rrcr_(Registers.A);
        break;
      case 0x10:
        this.rlr_(Registers.B);
        break;
      case 0x11:
        this.rlr_(Registers.C);
        break;
      case 0x12:
        this.rlr_(Registers.D);
        break;
      case 0x13:
        this.rlr_(Registers.E);
        break;
      case 0x14:
        this.rlr_(Registers.H);
        break;
      case 0x15:
        this.rlr_(Registers.L);
        break;
      case 0x16:
        this.rla_(this.HL);
        break;
      case 0x17:
        this.rlr_(Registers.A);
        break;
      case 0x18:
        this.rrr_(Registers.B);
        break;
      case 0x19:
        this.rrr_(Registers.C);
        break;
      case 0x1A:
        this.rrr_(Registers.D);
        break;
      case 0x1B:
        this.rrr_(Registers.E);
        break;
      case 0x1C:
        this.rrr_(Registers.H);
        break;
      case 0x1D:
        this.rrr_(Registers.L);
        break;
      case 0x1E:
        this.rra_(this.HL);
        break;
      case 0x1F:
        this.rrr_(Registers.A);
        break;
      case 0x20:
        this.slar_(Registers.B);
        break;
      case 0x21:
        this.slar_(Registers.C);
        break;
      case 0x22:
        this.slar_(Registers.D);
        break;
      case 0x23:
        this.slar_(Registers.E);
        break;
      case 0x24:
        this.slar_(Registers.H);
        break;
      case 0x25:
        this.slar_(Registers.L);
        break;
      case 0x26:
        this.slaa_(this.HL);
        break;
      case 0x27:
        this.slar_(Registers.A);
        break;
      case 0x28:
        this.srar_(Registers.B);
        break;
      case 0x29:
        this.srar_(Registers.C);
        break;
      case 0x2A:
        this.srar_(Registers.D);
        break;
      case 0x2B:
        this.srar_(Registers.E);
        break;
      case 0x2C:
        this.srar_(Registers.H);
        break;
      case 0x2D:
        this.srar_(Registers.L);
        break;
      case 0x2E:
        this.sraa_(this.HL);
        break;
      case 0x2F:
        this.srar_(Registers.A);
        break;
      case 0x30:
        this.swapr_(Registers.B);
        break;
      case 0x31:
        this.swapr_(Registers.C);
        break;
      case 0x32:
        this.swapr_(Registers.D);
        break;
      case 0x33:
        this.swapr_(Registers.E);
        break;
      case 0x34:
        this.swapr_(Registers.H);
        break;
      case 0x35:
        this.swapr_(Registers.L);
        break;
      case 0x36:
        this.swapa_(this.HL);
        break;
      case 0x37:
        this.swapr_(Registers.A);
        break;
      case 0x38:
        this.srlr_(Registers.B);
        break;
      case 0x39:
        this.srlr_(Registers.C);
        break;
      case 0x3A:
        this.srlr_(Registers.D);
        break;
      case 0x3B:
        this.srlr_(Registers.E);
        break;
      case 0x3C:
        this.srlr_(Registers.H);
        break;
      case 0x3D:
        this.srlr_(Registers.L);
        break;
      case 0x3E:
        this.srla_(this.HL);
        break;
      case 0x3F:
        this.srlr_(Registers.A);
        break;
      case 0x40:
        this.bitr_(Registers.B, 0);
        break;
      case 0x41:
        this.bitr_(Registers.C, 0);
        break;
      case 0x42:
        this.bitr_(Registers.D, 0);
        break;
      case 0x43:
        this.bitr_(Registers.E, 0);
        break;
      case 0x44:
        this.bitr_(Registers.H, 0);
        break;
      case 0x45:
        this.bitr_(Registers.L, 0);
        break;
      case 0x46:
        this.bita_(this.HL, 0);
        break;
      case 0x47:
        this.bitr_(Registers.A, 0);
        break;
      case 0x48:
        this.bitr_(Registers.B, 1);
        break;
      case 0x49:
        this.bitr_(Registers.C, 1);
        break;
      case 0x4A:
        this.bitr_(Registers.D, 1);
        break;
      case 0x4B:
        this.bitr_(Registers.E, 1);
        break;
      case 0x4C:
        this.bitr_(Registers.H, 1);
        break;
      case 0x4D:
        this.bitr_(Registers.L, 1);
        break;
      case 0x4E:
        this.bita_(this.HL, 1);
        break;
      case 0x4F:
        this.bitr_(Registers.A, 1);
        break;
      case 0x50:
        this.bitr_(Registers.B, 2);
        break;
      case 0x51:
        this.bitr_(Registers.C, 2);
        break;
      case 0x52:
        this.bitr_(Registers.D, 2);
        break;
      case 0x53:
        this.bitr_(Registers.E, 2);
        break;
      case 0x54:
        this.bitr_(Registers.H, 2);
        break;
      case 0x55:
        this.bitr_(Registers.L, 2);
        break;
      case 0x56:
        this.bita_(this.HL, 2);
        break;
      case 0x57:
        this.bitr_(Registers.A, 2);
        break;
      case 0x58:
        this.bitr_(Registers.B, 3);
        break;
      case 0x59:
        this.bitr_(Registers.C, 3);
        break;
      case 0x5A:
        this.bitr_(Registers.D, 3);
        break;
      case 0x5B:
        this.bitr_(Registers.E, 3);
        break;
      case 0x5C:
        this.bitr_(Registers.H, 3);
        break;
      case 0x5D:
        this.bitr_(Registers.L, 3);
        break;
      case 0x5E:
        this.bita_(this.HL, 3);
        break;
      case 0x5F:
        this.bitr_(Registers.A, 3);
        break;
      case 0x60:
        this.bitr_(Registers.B, 4);
        break;
      case 0x61:
        this.bitr_(Registers.C, 4);
        break;
      case 0x62:
        this.bitr_(Registers.D, 4);
        break;
      case 0x63:
        this.bitr_(Registers.E, 4);
        break;
      case 0x64:
        this.bitr_(Registers.H, 4);
        break;
      case 0x65:
        this.bitr_(Registers.L, 4);
        break;
      case 0x66:
        this.bita_(this.HL, 4);
        break;
      case 0x67:
        this.bitr_(Registers.A, 4);
        break;
      case 0x68:
        this.bitr_(Registers.B, 5);
        break;
      case 0x69:
        this.bitr_(Registers.C, 5);
        break;
      case 0x6A:
        this.bitr_(Registers.D, 5);
        break;
      case 0x6B:
        this.bitr_(Registers.E, 5);
        break;
      case 0x6C:
        this.bitr_(Registers.H, 5);
        break;
      case 0x6D:
        this.bitr_(Registers.L, 5);
        break;
      case 0x6E:
        this.bita_(this.HL, 5);
        break;
      case 0x6F:
        this.bitr_(Registers.A, 5);
        break;
      case 0x70:
        this.bitr_(Registers.B, 6);
        break;
      case 0x71:
        this.bitr_(Registers.C, 6);
        break;
      case 0x72:
        this.bitr_(Registers.D, 6);
        break;
      case 0x73:
        this.bitr_(Registers.E, 6);
        break;
      case 0x74:
        this.bitr_(Registers.H, 6);
        break;
      case 0x75:
        this.bitr_(Registers.L, 6);
        break;
      case 0x76:
        this.bita_(this.HL, 6);
        break;
      case 0x77:
        this.bitr_(Registers.A, 6);
        break;
      case 0x78:
        this.bitr_(Registers.B, 7);
        break;
      case 0x79:
        this.bitr_(Registers.C, 7);
        break;
      case 0x7A:
        this.bitr_(Registers.D, 7);
        break;
      case 0x7B:
        this.bitr_(Registers.E, 7);
        break;
      case 0x7C:
        this.bitr_(Registers.H, 7);
        break;
      case 0x7D:
        this.bitr_(Registers.L, 7);
        break;
      case 0x7E:
        this.bita_(this.HL, 7);
        break;
      case 0x7F:
        this.bitr_(Registers.A, 7);
        break;
      case 0x80:
        this.resr_(Registers.B, 0);
        break;
      case 0x81:
        this.resr_(Registers.C, 0);
        break;
      case 0x82:
        this.resr_(Registers.D, 0);
        break;
      case 0x83:
        this.resr_(Registers.E, 0);
        break;
      case 0x84:
        this.resr_(Registers.H, 0);
        break;
      case 0x85:
        this.resr_(Registers.L, 0);
        break;
      case 0x86:
        this.resa_(this.HL, 0);
        break;
      case 0x87:
        this.resr_(Registers.A, 0);
        break;
      case 0x88:
        this.resr_(Registers.B, 1);
        break;
      case 0x89:
        this.resr_(Registers.C, 1);
        break;
      case 0x8A:
        this.resr_(Registers.D, 1);
        break;
      case 0x8B:
        this.resr_(Registers.E, 1);
        break;
      case 0x8C:
        this.resr_(Registers.H, 1);
        break;
      case 0x8D:
        this.resr_(Registers.L, 1);
        break;
      case 0x8E:
        this.resa_(this.HL, 1);
        break;
      case 0x8F:
        this.resr_(Registers.A, 1);
        break;
      case 0x90:
        this.resr_(Registers.B, 2);
        break;
      case 0x91:
        this.resr_(Registers.C, 2);
        break;
      case 0x92:
        this.resr_(Registers.D, 2);
        break;
      case 0x93:
        this.resr_(Registers.E, 2);
        break;
      case 0x94:
        this.resr_(Registers.H, 2);
        break;
      case 0x95:
        this.resr_(Registers.L, 2);
        break;
      case 0x96:
        this.resa_(this.HL, 2);
        break;
      case 0x97:
        this.resr_(Registers.A, 2);
        break;
      case 0x98:
        this.resr_(Registers.B, 3);
        break;
      case 0x99:
        this.resr_(Registers.C, 3);
        break;
      case 0x9A:
        this.resr_(Registers.D, 3);
        break;
      case 0x9B:
        this.resr_(Registers.E, 3);
        break;
      case 0x9C:
        this.resr_(Registers.H, 3);
        break;
      case 0x9D:
        this.resr_(Registers.L, 3);
        break;
      case 0x9E:
        this.resa_(this.HL, 3);
        break;
      case 0x9F:
        this.resr_(Registers.A, 3);
        break;
      case 0xA0:
        this.resr_(Registers.B, 4);
        break;
      case 0xA1:
        this.resr_(Registers.C, 4);
        break;
      case 0xA2:
        this.resr_(Registers.D, 4);
        break;
      case 0xA3:
        this.resr_(Registers.E, 4);
        break;
      case 0xA4:
        this.resr_(Registers.H, 4);
        break;
      case 0xA5:
        this.resr_(Registers.L, 4);
        break;
      case 0xA6:
        this.resa_(this.HL, 4);
        break;
      case 0xA7:
        this.resr_(Registers.A, 4);
        break;
      case 0xA8:
        this.resr_(Registers.B, 5);
        break;
      case 0xA9:
        this.resr_(Registers.C, 5);
        break;
      case 0xAA:
        this.resr_(Registers.D, 5);
        break;
      case 0xAB:
        this.resr_(Registers.E, 5);
        break;
      case 0xAC:
        this.resr_(Registers.H, 5);
        break;
      case 0xAD:
        this.resr_(Registers.L, 5);
        break;
      case 0xAE:
        this.resa_(this.HL, 5);
        break;
      case 0xAF:
        this.resr_(Registers.A, 5);
        break;
      case 0xB0:
        this.resr_(Registers.B, 6);
        break;
      case 0xB1:
        this.resr_(Registers.C, 6);
        break;
      case 0xB2:
        this.resr_(Registers.D, 6);
        break;
      case 0xB3:
        this.resr_(Registers.E, 6);
        break;
      case 0xB4:
        this.resr_(Registers.H, 6);
        break;
      case 0xB5:
        this.resr_(Registers.L, 6);
        break;
      case 0xB6:
        this.resa_(this.HL, 6);
        break;
      case 0xB7:
        this.resr_(Registers.A, 6);
        break;
      case 0xB8:
        this.resr_(Registers.B, 7);
        break;
      case 0xB9:
        this.resr_(Registers.C, 7);
        break;
      case 0xBA:
        this.resr_(Registers.D, 7);
        break;
      case 0xBB:
        this.resr_(Registers.E, 7);
        break;
      case 0xBC:
        this.resr_(Registers.H, 7);
        break;
      case 0xBD:
        this.resr_(Registers.L, 7);
        break;
      case 0xBE:
        this.resa_(this.HL, 7);
        break;
      case 0xBF:
        this.resr_(Registers.A, 7);
        break;
      case 0xC0:
        this.setr_(Registers.B, 0);
        break;
      case 0xC1:
        this.setr_(Registers.C, 0);
        break;
      case 0xC2:
        this.setr_(Registers.D, 0);
        break;
      case 0xC3:
        this.setr_(Registers.E, 0);
        break;
      case 0xC4:
        this.setr_(Registers.H, 0);
        break;
      case 0xC5:
        this.setr_(Registers.L, 0);
        break;
      case 0xC6:
        this.seta_(this.HL, 0);
        break;
      case 0xC7:
        this.setr_(Registers.A, 0);
        break;
      case 0xC8:
        this.setr_(Registers.B, 1);
        break;
      case 0xC9:
        this.setr_(Registers.C, 1);
        break;
      case 0xCA:
        this.setr_(Registers.D, 1);
        break;
      case 0xCB:
        this.setr_(Registers.E, 1);
        break;
      case 0xCC:
        this.setr_(Registers.H, 1);
        break;
      case 0xCD:
        this.setr_(Registers.L, 1);
        break;
      case 0xCE:
        this.seta_(this.HL, 1);
        break;
      case 0xCF:
        this.setr_(Registers.A, 1);
        break;
      case 0xD0:
        this.setr_(Registers.B, 2);
        break;
      case 0xD1:
        this.setr_(Registers.C, 2);
        break;
      case 0xD2:
        this.setr_(Registers.D, 2);
        break;
      case 0xD3:
        this.setr_(Registers.E, 2);
        break;
      case 0xD4:
        this.setr_(Registers.H, 2);
        break;
      case 0xD5:
        this.setr_(Registers.L, 2);
        break;
      case 0xD6:
        this.seta_(this.HL, 2);
        break;
      case 0xD7:
        this.setr_(Registers.A, 2);
        break;
      case 0xD8:
        this.setr_(Registers.B, 3);
        break;
      case 0xD9:
        this.setr_(Registers.C, 3);
        break;
      case 0xDA:
        this.setr_(Registers.D, 3);
        break;
      case 0xDB:
        this.setr_(Registers.E, 3);
        break;
      case 0xDC:
        this.setr_(Registers.H, 3);
        break;
      case 0xDD:
        this.setr_(Registers.L, 3);
        break;
      case 0xDE:
        this.seta_(this.HL, 3);
        break;
      case 0xDF:
        this.setr_(Registers.A, 3);
        break;
      case 0xE0:
        this.setr_(Registers.B, 4);
        break;
      case 0xE1:
        this.setr_(Registers.C, 4);
        break;
      case 0xE2:
        this.setr_(Registers.D, 4);
        break;
      case 0xE3:
        this.setr_(Registers.E, 4);
        break;
      case 0xE4:
        this.setr_(Registers.H, 4);
        break;
      case 0xE5:
        this.setr_(Registers.L, 4);
        break;
      case 0xE6:
        this.seta_(this.HL, 4);
        break;
      case 0xE7:
        this.setr_(Registers.A, 4);
        break;
      case 0xE8:
        this.setr_(Registers.B, 5);
        break;
      case 0xE9:
        this.setr_(Registers.C, 5);
        break;
      case 0xEA:
        this.setr_(Registers.D, 5);
        break;
      case 0xEB:
        this.setr_(Registers.E, 5);
        break;
      case 0xEC:
        this.setr_(Registers.H, 5);
        break;
      case 0xED:
        this.setr_(Registers.L, 5);
        break;
      case 0xEE:
        this.seta_(this.HL, 5);
        break;
      case 0xEF:
        this.setr_(Registers.A, 5);
        break;
      case 0xF0:
        this.setr_(Registers.B, 6);
        break;
      case 0xF1:
        this.setr_(Registers.C, 6);
        break;
      case 0xF2:
        this.setr_(Registers.D, 6);
        break;
      case 0xF3:
        this.setr_(Registers.E, 6);
        break;
      case 0xF4:
        this.setr_(Registers.H, 6);
        break;
      case 0xF5:
        this.setr_(Registers.L, 6);
        break;
      case 0xF6:
        this.seta_(this.HL, 6);
        break;
      case 0xF7:
        this.setr_(Registers.A, 6);
        break;
      case 0xF8:
        this.setr_(Registers.B, 7);
        break;
      case 0xF9:
        this.setr_(Registers.C, 7);
        break;
      case 0xFA:
        this.setr_(Registers.D, 7);
        break;
      case 0xFB:
        this.setr_(Registers.E, 7);
        break;
      case 0xFC:
        this.setr_(Registers.H, 7);
        break;
      case 0xFD:
        this.setr_(Registers.L, 7);
        break;
      case 0xFE:
        this.seta_(this.HL, 7);
        break;
      case 0xFF:
        this.setr_(Registers.A, 7);
        break;
      default:
        throw Error(`Unimplemented CB opcode 0x${op.toString(16).toUpperCase().padStart(2, "0")}`);
    }
  }

  rlcr_(register) {
    let v = this.get(register);
    let top = (v & 0x80) >>> 7;
    this.set(register, (v << 1) | top);
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rlca_(addr) {
    let v = this.GB.M.get(addr);
    let top = (v & 0x80) >>> 7;
    this.GB.M.set(addr, (v << 1) | top);
    this.FlagZ = !this.GB.M.get(addr, 1, false);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rrcr_(register) {
    let v = this.get(register);
    let bot = (v & 0x01) << 7;
    this.set(register, (v >>> 1) | bot);
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rrca_(addr) {
    let v = this.GB.M.get(addr);
    let bot = (v & 0x01) << 7;
    this.GB.M.set(addr, (v >>> 1) | bot);
    this.FlagZ = !this.GB.M.get(addr, 1, false);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rlr_(register) {
    let v = this.get(register);
    let top = (v & 0x80) >>> 7;
    this.set(register, (v << 1) | (this.FlagC ? 0x01 : 0x00));
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rla_(addr) {
    let v = this.GB.M.get(addr);
    let top = (v & 0x80) >>> 7;
    this.GB.M.set(addr, (v << 1) | (this.FlagC ? 0x01 : 0x00));
    this.FlagZ = !this.GB.M.get(addr, 1, false);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rrr_(register) {
    let v = this.get(register);
    let bot = v & 0x01;
    this.set(register, (v >>> 1) | (this.FlagC ? 0x80 : 0x00));
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rra_(addr) {
    let v = this.GB.M.get(addr);
    let bot = v & 0x01;
    this.GB.M.set(addr, (v >>> 1) | (this.FlagC ? 0x80 : 0x00));
    this.FlagZ = !this.GB.M.get(addr, 1, false);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  slar_(register) {
    let v = this.get(register);
    this.FlagC = !!(v & 0x80);
    this.set(register, v << 1);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.get(register);
  }

  slaa_(addr) {
    let v = this.GB.M.get(addr);
    this.FlagC = !!(v & 0x80);
    this.GB.M.set(addr, v << 1);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.GB.M.get(addr, 1, false);
  }

  srar_(register) {
    let v = this.get(register);
    let top = v & 0x80;
    this.FlagC = !!(v & 0x01);
    this.set(register, (v >> 1 | top));
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.get(register);
  }

  sraa_(addr) {
    let v = this.GB.M.get(addr);
    let top = v & 0x80;
    this.FlagC = !!(v & 0x01);
    this.GB.M.set(addr, (v >> 1 | top));
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.GB.M.get(addr, 1, false);
  }

  swapr_(register) {
    let v = this.get(register);
    let top = v & 0xF0;
    let bot = v & 0x0F;
    this.set(register, (bot << 4) | (top >>> 4));
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  swapa_(addr) {
    let v = this.GB.M.get(addr);
    let top = v & 0xF0;
    let bot = v & 0x0F;
    this.GB.M.set(addr, (bot << 4) | (top >>> 4));
    this.FlagZ = !this.GB.M.get(addr, 1, false);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  srlr_(register) {
    let v = this.get(register);
    this.FlagC = !!(v & 0x01);
    this.set(register, v >>> 1);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.get(register);
  }

  srla_(addr) {
    let v = this.GB.M.get(addr);
    this.FlagC = !!(v & 0x01);
    this.GB.M.set(addr, v >>> 1);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagZ = !this.GB.M.get(addr, 1, false);
  }

  bitr_(register, bit) {
    let v = this.get(register);
    this.FlagZ = !(v & (0x01 << bit));
    this.FlagN = false;
    this.FlagH = true;
  }

  bita_(addr, bit) {
    let v = this.GB.M.get(addr);
    this.FlagZ = !(v & (0x01 << bit));
    this.FlagN = false;
    this.FlagH = true;
  }

  resr_(register, bit) {
    this.set(register, this.get(register) & ~(0x01 << bit));
  }

  resa_(addr, bit) {
    this.GB.M.set(addr, this.GB.M.get(addr) & ~(0x01 << bit));
  }

  setr_(register, bit) {
    this.set(register, this.get(register) | (0x01 << bit));
  }

  seta_(addr, bit) {
    this.GB.M.set(addr, this.GB.M.get(addr) | (0x01 << bit));
  }

  set A(val) {
    this.Reg8[Registers8.A] = val;
    this.Reg16[Registers16.AF] = (this.Reg16[Registers16.AF] & 0xFF) | (val << 8);
  }

  set F(val) {
    val = val & 0xF0;
    this.Reg8[Registers8.F] = val;
    this.Reg16[Registers16.AF] = (this.Reg16[Registers16.AF] & 0xFF00) | val;
  }

  set AF(val) {
    val = val & 0xFFF0;
    this.Reg8[Registers8.A] = val >>> 8;
    this.Reg8[Registers8.F] = val;
    this.Reg16[Registers16.AF] = val;
  }

  set B(val) {
    this.Reg8[Registers8.B] = val;
    this.Reg16[Registers16.BC] = (this.Reg16[Registers16.BC] & 0xFF) | (val << 8);
  }

  set C(val) {
    this.Reg8[Registers8.C] = val;
    this.Reg16[Registers16.BC] = (this.Reg16[Registers16.BC] & 0xFF00) | val;
  }

  set BC(val) {
    this.Reg8[Registers8.B] = val >>> 8;
    this.Reg8[Registers8.C] = val;
    this.Reg16[Registers16.BC] = val;
  }

  set D(val) {
    this.set(Registers.D, val);
  }

  set E(val) {
    this.set(Registers.E, val);
  }

  set DE(val) {
    this.set(Registers.DE, val);
  }

  set H(val) {
    this.set(Registers.H, val);
  }

  set L(val) {
    this.set(Registers.L, val);
  }

  set HL(val) {
    this.set(Registers.HL, val);
  }

  set SP(val) {
    this.set(Registers.SP, val);
  }

  set PC(val) {
    this.set(Registers.PC, val);
  }

  /**
   * Arbitrary (non-direct register) getters/setters
   */

  get FlagZ() {
    return !!(this.F & 0x80);
  }

  set FlagZ(bool) {
    bool ? this.F |= 0x80 : this.F &= ~0x80;
  }

  get FlagN() {
    return !!(this.F & 0x40);
  }

  set FlagN(bool) {
    bool ? this.F |= 0x40 : this.F &= ~0x40;
  }

  get FlagH() {
    return !!(this.F & 0x20);
  }

  set FlagH(bool) {
    bool ? this.F |= 0x20 : this.F &= ~0x20;
  }

  get FlagC() {
    return !!(this.F & 0x10);
  }

  set FlagC(bool) {
    bool ? this.F |= 0x10 : this.F &= ~0x10;
  }

  //Interrupt flags
  get FlagIME() {
    return !!(this.get(Registers.IME));
  }

  set FlagIME(bool) {
    bool ? this.set(Registers.IME, 1) : this.set(Registers.IME, 0);
  }

  get FlagVBlankEnable() {
    return !!(this.GB.M.get(0xFFFF, 1, false) & 0x01);
  }

  set FlagVBlankEnable(bool) {
    let og = this.GB.M.get(0xFFFF, 1, false);
    bool ? og |= 0x01 : og &= ~0x01;
    this.GB.M.set(0xFFFF, og, 1, false);
  }

  get FlagLCDSTATEnable() {
    return !!(this.GB.M.get(0xFFFF, 1, false) & 0x02);
  }

  set FlagLCDSTATEnable(bool) {
    let og = this.GB.M.get(0xFFFF, 1, false);
    bool ? og |= 0x02 : og &= ~0x02;
    this.GB.M.set(0xFFFF, og, 1, false);
  }

  get FlagTimerEnable() {
    return !!(this.GB.M.get(0xFFFF, 1, false) & 0x04);
  }

  set FlagTimerEnable(bool) {
    let og = this.GB.M.get(0xFFFF, 1, false);
    bool ? og |= 0x04 : og &= ~0x04;
    this.GB.M.set(0xFFFF, og, 1, false);
  }

  get FlagSerialEnable() {
    return !!(this.GB.M.get(0xFFFF, 1, false) & 0x08);
  }

  set FlagSerialEnable(bool) {
    let og = this.GB.M.get(0xFFFF, 1, false);
    bool ? og |= 0x08 : og &= ~0x08;
    this.GB.M.set(0xFFFF, og, 1, false);
  }

  get FlagJoypadEnable() {
    return !!(this.GB.M.get(0xFFFF, 1, false) & 0x10);
  }

  set FlagJoypadEnable(bool) {
    let og = this.GB.M.get(0xFFFF, 1, false);
    bool ? og |= 0x10 : og &= ~0x10;
    this.GB.M.set(0xFFFF, og, 1, false);
  }

  get FlagVBlankRequest() {
    return !!(this.GB.M.get(0xFF0F, 1, false) & 0x01);
  }

  set FlagVBlankRequest(bool) {
    let og = this.GB.M.get(0xFF0F, 1, false);
    bool ? og |= 0x01 : og &= ~0x01;
    this.GB.M.set(0xFF0F, og, 1, false);
  }

  get FlagLCDSTATRequest() {
    return !!(this.GB.M.get(0xFF0F, 1, false) & 0x02);
  }

  set FlagLCDSTATRequest(bool) {
    let og = this.GB.M.get(0xFF0F, 1, false);
    bool ? og |= 0x02 : og &= ~0x02;
    this.GB.M.set(0xFF0F, og, 1, false);
  }

  get FlagTimerRequest() {
    return !!(this.GB.M.get(0xFF0F, 1, false) & 0x04);
  }

  set FlagTimerRequest(bool) {
    let og = this.GB.M.get(0xFF0F, 1, false);
    bool ? og |= 0x04 : og &= ~0x04;
    this.GB.M.set(0xFF0F, og, 1, false);
  }

  get FlagSerialRequest() {
    return !!(this.GB.M.get(0xFF0F, 1, false) & 0x08);
  }

  set FlagSerialRequest(bool) {
    let og = this.GB.M.get(0xFF0F, 1, false);
    bool ? og |= 0x08 : og &= ~0x08;
    this.GB.M.set(0xFF0F, og, 1, false);
  }

  get FlagJoypadRequest() {
    return !!(this.GB.M.get(0xFF0F, 1, false) & 0x10);
  }

  set FlagJoypadRequest(bool) {
    let og = this.GB.M.get(0xFF0F, 1, false);
    bool ? og |= 0x10 : og &= ~0x10;
    this.GB.M.set(0xFF0F, og, 1, false);
  }
}

export function get_flags_updated(register, oldVal, newVal) {
  if(register === Registers.F || register === Registers.AF) {
    return {
      [Flags.Z]: !!((oldVal & 0x80) ^ (newVal & 0x80)),
      [Flags.N]: !!((oldVal & 0x40) ^ (newVal & 0x40)),
      [Flags.H]: !!((oldVal & 0x20) ^ (newVal & 0x20)),
      [Flags.C]: !!((oldVal & 0x10) ^ (newVal & 0x10))
    };
  } else {
    return {
      [Flags.Z]: false,
      [Flags.N]: false,
      [Flags.H]: false,
      [Flags.C]: false
    };
  }
}
