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

export const Flags = {
  Z: "Z",
  N: "N",
  H: "H",
  C: "C"
};

const CYCLES_PER_FRAME = 69905; //approx. 4194304Hz/60fps

export class CPU {
  constructor(gameBoy) {
    this.paused_ = true;
    this.breakpoints_ = new Map();
    this.gameBoy_ = gameBoy;
    this[Registers.A] = 0x01;
    this[Registers.F] = 0x02;
    this[Registers.B] = 0x03;
    this[Registers.C] = 0x04;
    this[Registers.D] = 0x05;
    this[Registers.E] = 0x06;
    this[Registers.H] = 0x07;
    this[Registers.L] = 0x08;
    this[Registers.SP] = 0x1234;
    this[Registers.PC] = 0x1234;
    this[Registers.IME] = 0;
  }

  get GB() {
    return this.gameBoy_;
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
    //more stuff will happen per frame here, not just step
    let cycles = 0;
    while(cycles < CYCLES_PER_FRAME) {
      cycles += this.step();
      if(this.isBreakpointEnabled(this.PC)) {
        this.pause();
        return;
      }
    }
  }

  step() {
    let cycles = this.runInst();
    this.GB.PPU.step(cycles);
    return cycles;
  }

  runInst() {
    let addr = this.PC++;
    switch(this.GB.M.get(addr)) {
      case 0x00:
        return 4;
      case 0x01:
        this.ldr_(Registers.BC, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        return 12;
      case 0x02:
        this.lda_(this.BC, this.A);
        return 8;
      case 0x03:
        this.inc16_(Registers.BC);
        return 8;
      case 0x04:
        this.inc8r_(Registers.B);
        return 4;
      case 0x05:
        this.dec8r_(Registers.B);
        return 4;
      case 0x06:
        this.ldr_(Registers.B, this.GB.M.get(this.PC++));
        return 8;
      case 0x07:
        this.rlcakku_();
        return 4;
      case 0x09:
        this.add16r_(this.BC);
        return 8;
      case 0x0A:
        this.ldr_(Registers.A, this.GB.M.get(this.BC));
        return 8;
      case 0x0B:
        this.dec16_(Registers.BC);
        return 8;
      case 0x0C:
        this.inc8r_(Registers.C);
        return 4;
      case 0x0D:
        this.dec8r_(Registers.C);
        return 4;
      case 0x0E:
        this.ldr_(Registers.C, this.GB.M.get(this.PC++));
        return 8;
      case 0x0F:
        this.rrcakku_();
        return 4;
      case 0x11:
        this.ldr_(Registers.DE, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        return 12;
      case 0x12:
        this.lda_(this.DE, this.A);
        return 8;
      case 0x13:
        this.inc16_(Registers.DE);
        return 8;
      case 0x14:
        this.inc8r_(Registers.D);
        return 4;
      case 0x15:
        this.dec8r_(Registers.D);
        return 4;
      case 0x16:
        this.ldr_(Registers.D, this.GB.M.get(this.PC++));
        return 8;
      case 0x17:
        this.rlakku_();
        return 4;
      case 0x18:
        this.jr_(this.GB.M.get(this.PC++));
        return 12;
      case 0x19:
        this.add16r_(this.DE);
        return 8;
      case 0x1A:
        this.ldr_(Registers.A, this.GB.M.get(this.DE));
        return 8;
      case 0x1B:
        this.dec16_(Registers.DE);
        return 8;
      case 0x1C:
        this.inc8r_(Registers.E);
        return 4;
      case 0x1D:
        this.dec8r_(Registers.E);
        return 4;
      case 0x1E:
        this.ldr_(Registers.E, this.GB.M.get(this.PC++));
        return 8;
      case 0x1F:
        this.rrakku_();
        return 4;
      case 0x20:
        if(!this.FlagZ) {
          this.jr_(this.GB.M.get(this.PC++));
          return 12;
        } else {
          this.PC++
          return 8;
        }
      case 0x21:
        this.ldr_(Registers.HL, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        return 12;
      case 0x22:
        this.lda_(this.HL, this.A);
        this.inc16_(this.HL);
        return 8;
      case 0x23:
        this.inc16_(Registers.HL);
        return 8;
      case 0x24:
        this.inc8r_(Registers.H);
        return 4;
      case 0x25:
        this.dec8r_(Registers.H);
        return 4;
      case 0x26:
        this.ldr_(Registers.H, this.GB.M.get(this.PC++));
        return 8;
      case 0x28:
        if(this.FlagZ) {
          this.jr_(this.GB.M.get(this.PC++));
          return 12;
        } else {
          this.PC++;
          return 8;
        }
      case 0x29:
        this.add16r_(this.HL);
        return 8;
      case 0x2A:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        this.inc16_(Registers.HL);
        return 8;
      case 0x2B:
        this.dec16_(Registers.HL);
        return 8;
      case 0x2C:
        this.inc8r_(Registers.L);
        return 4;
      case 0x2D:
        this.dec8r_(Registers.L);
        return 4;
      case 0x2E:
        this.ldr_(Registers.L, this.GB.M.get(this.PC++));
        return 8;
      case 0x30:
        if(!this.FlagC) {
          this.jr_(this.GB.M.get(this.PC++));
          return 12;
        } else {
          this.PC++;
          return 8;
        }
      case 0x31:
        this.ldr_(Registers.SP, this.GB.M.get(this.PC, 2));
        this.PC += 2;
        return 12;
      case 0x32:
        this.lda_(this.HL, this.A);
        this.dec16_(this.HL);
        return 8;
      case 0x33:
        this.inc16_(Registers.SP);
        return 8;
      case 0x34:
        this.inc8a_(this.HL);
        return 12;
      case 0x35:
        this.dec8a_(this.HL);
        return 12;
      case 0x36:
        this.lda_(this.HL, this.GB.M.get(this.PC++));
        return 12;
      case 0x38:
        if(this.FlagC) {
          this.jr_(this.GB.M.get(this.PC++));
          return 12;
        } else {
          this.PC++
          return 8;
        }
      case 0x39:
        this.add16r_(this.SP);
        return 8;
      case 0x3A:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        this.dec16_(Registers.HL);
        return 8;
      case 0x3B:
        this.dec16_(Registers.SP);
        return 8;
      case 0x3C:
        this.inc8r_(Registers.A);
        return 4;
      case 0x3D:
        this.dec8r_(Registers.A);
        return 4;
      case 0x3E:
        this.ldr_(Registers.A, this.GB.M.get(this.PC++));
        return 8;
      case 0x40:
        //this.ldr_(Registers.B, this.B);
        return 4;
      case 0x41:
        this.ldr_(Registers.B, this.C);
        return 4;
      case 0x42:
        this.ldr_(Registers.B, this.D);
        return 4;
      case 0x43:
        this.ldr_(Registers.B, this.E);
        return 4;
      case 0x44:
        this.ldr_(Registers.B, this.H);
        return 4;
      case 0x45:
        this.ldr_(Registers.B, this.L);
        return 4;
      case 0x46:
        this.ldr_(Registers.B, this.GB.M.get(this.HL));
        return 8;
      case 0x47:
        this.ldr_(Registers.B, this.A);
        return 4;
      case 0x48:
        this.ldr_(Registers.C, this.B);
        return 4;
      case 0x49:
        //this.ldr_(Registers.C, this.C);
        return 4;
      case 0x4A:
        this.ldr_(Registers.C, this.D);
        return 4;
      case 0x4B:
        this.ldr_(Registers.C, this.E);
        return 4;
      case 0x4C:
        this.ldr_(Registers.C, this.H);
        return 4;
      case 0x4D:
        this.ldr_(Registers.C, this.L);
        return 4;
      case 0x4E:
        this.ldr_(Registers.C, this.GB.M.get(this.HL));
        return 8;
      case 0x4F:
        this.ldr_(Registers.C, this.A);
        return 4;
      case 0x50:
        this.ldr_(Registers.D, this.B);
        return 4;
      case 0x51:
        this.ldr_(Registers.D, this.C);
        return 4;
      case 0x52:
        //this.ldr_(Registers.D, this.D);
        return 4;
      case 0x53:
        this.ldr_(Registers.D, this.E);
        return 4;
      case 0x54:
        this.ldr_(Registers.D, this.H);
        return 4;
      case 0x55:
        this.ldr_(Registers.D, this.L);
        return 4;
      case 0x56:
        this.ldr_(Registers.D, this.GB.M.get(this.HL));
        return 8;
      case 0x57:
        this.ldr_(Registers.D, this.A);
        return 4;
      case 0x58:
        this.ldr_(Registers.E, this.B);
        return 4;
      case 0x59:
        this.ldr_(Registers.E, this.C);
        return 4;
      case 0x5A:
        this.ldr_(Registers.E, this.D);
        return 4;
      case 0x5B:
        //this.ldr_(Registers.E, this.E);
        return 4;
      case 0x5C:
        this.ldr_(Registers.E, this.H);
        return 4;
      case 0x5D:
        this.ldr_(Registers.E, this.L);
        return 4;
      case 0x5E:
        this.ldr_(Registers.E, this.GB.M.get(this.HL));
        return 8;
      case 0x5F:
        this.ldr_(Registers.E, this.A);
        return 4;
      case 0x60:
        this.ldr_(Registers.H, this.B);
        return 4;
      case 0x61:
        this.ldr_(Registers.H, this.C);
        return 4;
      case 0x62:
        this.ldr_(Registers.H, this.D);
        return 4;
      case 0x63:
        this.ldr_(Registers.H, this.E);
        return 4;
      case 0x64:
        //this.ldr_(Registers.H, this.H);
        return 4;
      case 0x65:
        this.ldr_(Registers.H, this.L);
        return 4;
      case 0x66:
        this.ldr_(Registers.H, this.GB.M.get(this.HL));
        return 8;
      case 0x67:
        this.ldr_(Registers.H, this.A);
        return 4;
      case 0x68:
        this.ldr_(Registers.L, this.B);
        return 4;
      case 0x69:
        this.ldr_(Registers.L, this.C);
        return 4;
      case 0x6A:
        this.ldr_(Registers.L, this.D);
        return 4;
      case 0x6B:
        this.ldr_(Registers.L, this.E);
        return 4;
      case 0x6C:
        this.ldr_(Registers.L, this.H);
        return 4;
      case 0x6D:
        //this.ldr_(Registers.L, this.L);
        return 4;
      case 0x6E:
        this.ldr_(Registers.L, this.GB.M.get(this.HL));
        return 8;
      case 0x6F:
        this.ldr_(Registers.L, this.A);
        return 4;
      case 0x70:
        this.lda_(this.HL, this.B);
        return 8;
      case 0x71:
        this.lda_(this.HL, this.C);
        return 8;
      case 0x72:
        this.lda_(this.HL, this.D);
        return 8;
      case 0x73:
        this.lda_(this.HL, this.E);
        return 8;
      case 0x74:
        this.lda_(this.HL, this.H);
        return 8;
      case 0x75:
        this.lda_(this.HL, this.L);
        return 8;
      //case 0x76:
      //    HALT, IMPLEMENT LATER
      //    return 4;
      case 0x77:
        this.lda_(this.HL, this.A);
        return 8;
      case 0x78:
        this.ldr_(Registers.A, this.B);
        return 4;
      case 0x79:
        this.ldr_(Registers.A, this.C);
        return 4;
      case 0x7A:
        this.ldr_(Registers.A, this.D);
        return 4;
      case 0x7B:
        this.ldr_(Registers.A, this.E);
        return 4;
      case 0x7C:
        this.ldr_(Registers.A, this.H);
        return 4;
      case 0x7D:
        this.ldr_(Registers.A, this.L);
        return 4;
      case 0x7E:
        this.ldr_(Registers.A, this.GB.M.get(this.HL));
        return 8;
      case 0x7F:
        //this.ldr_(Registers.A, this.A);
        return 4;
      case 0x80:
        this.add8r_(Registers.B);
        return 4;
      case 0x81:
        this.add8r_(Registers.C);
        return 4;
      case 0x82:
        this.add8r_(Registers.D);
        return 4;
      case 0x83:
        this.add8r_(Registers.E);
        return 4;
      case 0x84:
        this.add8r_(Registers.H);
        return 4;
      case 0x85:
        this.add8r_(Registers.L);
        return 4;
      case 0x86:
        this.add8v_(this.GB.M.get(this.PC++));
        return 8;
      case 0x87:
        this.add8r_(Registers.A);
        return 4;
      case 0x88:
        this.adcr_(Registers.B);
        return 4;
      case 0x89:
        this.adcr_(Registers.C);
        return 4;
      case 0x8A:
        this.adcr_(Registers.D);
        return 4;
      case 0x8B:
        this.adcr_(Registers.E);
        return 4;
      case 0x8C:
        this.adcr_(Registers.H);
        return 4;
      case 0x8D:
        this.adcr_(Registers.L);
        return 4;
      case 0x8E:
        this.adcv_(this.GB.M.get(this.HL));
        return 8;
      case 0x8F:
        this.adcr_(Registers.A);
        return 4;
      case 0x90:
        this.subr_(Registers.B);
        return 4;
      case 0x91:
        this.subr_(Registers.C);
        return 4;
      case 0x92:
        this.subr_(Registers.D);
        return 4;
      case 0x93:
        this.subr_(Registers.E);
        return 4;
      case 0x94:
        this.subr_(Registers.H);
        return 4;
      case 0x95:
        this.subr_(Registers.L);
        return 4;
      case 0x96:
        this.subv_(this.GB.M.get(this.HL));
        return 8;
      case 0x97:
        this.subr_(Registers.A);
        return 4;
      case 0x98:
        this.sbcr_(Registers.B);
        return 4;
      case 0x99:
        this.sbcr_(Registers.C);
        return 4;
      case 0x9A:
        this.sbcr_(Registers.D);
        return 4;
      case 0x9B:
        this.sbcr_(Registers.E);
        return 4;
      case 0x9C:
        this.sbcr_(Registers.H);
        return 4;
      case 0x9D:
        this.sbcr_(Registers.L);
        return 4;
      case 0x9E:
        this.sbcv_(this.GB.M.get(this.HL));
        return 8;
      case 0x9F:
        this.sbcr_(Registers.A);
        return 4;
      case 0xA0:
        this.andr_(Registers.B);
        return 4;
      case 0xA1:
        this.andr_(Registers.C);
        return 4;
      case 0xA2:
        this.andr_(Registers.D);
        return 4;
      case 0xA3:
        this.andr_(Registers.E);
        return 4;
      case 0xA4:
        this.andr_(Registers.H);
        return 4;
      case 0xA5:
        this.andr_(Registers.L);
        return 4;
      case 0xA6:
        this.andv_(this.GB.M.get(this.HL));
        return 8;
      case 0xA7:
        this.andr_(Registers.A);
        return 4;
      case 0xA8:
        this.xorr_(Registers.B);
        return 4;
      case 0xA9:
        this.xorr_(Registers.C);
        return 4;
      case 0xAA:
        this.xorr_(Registers.D);
        return 4;
      case 0xAB:
        this.xorr_(Registers.E);
        return 4;
      case 0xAC:
        this.xorr_(Registers.H);
        return 4;
      case 0xAD:
        this.xorr_(Registers.L);
        return 4;
      case 0xAE:
        this.xorv_(this.GB.M.get(this.HL));
        return 8;
      case 0xAF:
        this.xorr_(Registers.A);
        return 4;
      case 0xB0:
        this.orr_(Registers.B);
        return 4;
      case 0xB1:
        this.orr_(Registers.C);
        return 4;
      case 0xB2:
        this.orr_(Registers.D);
        return 4;
      case 0xB3:
        this.orr_(Registers.E);
        return 4;
      case 0xB4:
        this.orr_(Registers.H);
        return 4;
      case 0xB5:
        this.orr_(Registers.L);
        return 4;
      case 0xB6:
        this.orv_(this.GB.M.get(this.HL));
        return 8;
      case 0xB7:
        this.orr_(Registers.A);
        return 4;
      case 0xB8:
        this.cpr_(Registers.B);
        return 4;
      case 0xB9:
        this.cpr_(Registers.C);
        return 4;
      case 0xBA:
        this.cpr_(Registers.D);
        return 4;
      case 0xBB:
        this.cpr_(Registers.E);
        return 4;
      case 0xBC:
        this.cpr_(Registers.H);
        return 4;
      case 0xBD:
        this.cpr_(Registers.L);
        return 4;
      case 0xBE:
        this.cpv_(this.GB.M.get(this.HL));
        return 8;
      case 0xBF:
        this.cpr_(Registers.A);
        return 4;
      case 0xC0:
        if(!this.FlagZ) {
          this.ret_();
          return 20;
        } else {
          return 8;
        }
      case 0xC1:
        this.pop_(Registers.BC);
        return 12;
      case 0xC2:
        if(!this.FlagZ) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr);
          return 16;
        } else {
          return 12;
        }
      case 0xC3:
        this.jp_(this.GB.M.get(this.PC, 2));
        return 16;
      case 0xC4:
        if(!this.FlagZ) {
          this.call_();
          return 24;
        } else {
          this.PC += 2;
          return 12;
        }
      case 0xC5:
        this.push_(Registers.BC);
        return 16;
      case 0xC6:
        this.add8v_(this.GB.M.get(this.PC++));
        return 8;
      case 0xC8:
        if(this.FlagZ) {
          this.ret_();
          return 20;
        } else {
          return 8;
        }
      case 0xC9:
        this.ret_();
        return 16;
      case 0xCA:
        if(this.FlagZ) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr);
          return 16;
        } else {
          return 12;
        }
      case 0xCB:
        return 4 + this.runCBInst(this.GB.M.get(this.PC++));
      case 0xCC:
        if(this.FlagZ) {
          this.call_();
          return 24;
        } else {
          this.PC += 2;
          return 12;
        }
      case 0xCD:
        this.call_();
        return 24;
      case 0xCE:
        this.adcv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xD0:
        if(!this.FlagC) {
          this.ret_();
          return 20;
        } else {
          return 8;
        }
      case 0xD1:
        this.pop_(Registers.DE);
        return 12;
      case 0xD2:
        if(!this.FlagC) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr);
          return 16;
        } else {
          return 12;
        }
      case 0xD4:
        if(!this.FlagC) {
          this.call_();
          return 24;
        } else {
          this.PC += 2;
          return 12;
        }
      case 0xD5:
        this.push_(Registers.DE);
        return 16;
      case 0xD6:
        this.subv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xD8:
        if(this.FlagC) {
          this.ret_();
          return 20;
        } else {
          return 8;
        }
      case 0xDA:
        if(this.FlagC) {
          let addr = this.GB.M.get(this.PC, 2);
          this.PC += 2;
          this.jp_(addr);
          return 16;
        } else {
          return 12;
        }
      case 0xDC:
        if(this.FlagC) {
          this.call_();
          return 24;
        } else {
          this.PC += 2;
          return 12;
        }
      case 0xDE:
        this.sbcv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xE0:
        this.lda_(0xFF00 + this.GB.M.get(this.PC++), this.A);
        return 12;
      case 0xE1:
        this.pop_(Registers.HL);
        return 12;
      case 0xE5:
        this.push_(Registers.HL);
        return 16;
      case 0xE6:
        this.andv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xE8:
        this.add16signed8v_(this.GB.M.get(this.PC++));
        return 16;
      case 0xE9:
        this.jp_(this.HL);
        return 4;
      case 0xEA:
        this.lda_(this.GB.M.get(this.PC, 2), this.A);
        this.PC += 2;
        return 16;
      case 0xEE:
        this.xorv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xF0:
        this.ldr_(Registers.A, this.GB.M.get(0xFF00 + this.GB.M.get(this.PC++)));
        return 12;
      case 0xF1:
        this.pop_(Registers.AF);
        return 12;
      case 0xF3:
        this.FlagIME = false;
        return 4;
      case 0xF5:
        this.push_(Registers.AF);
        return 16;
      case 0xF6:
        this.orv_(this.GB.M.get(this.PC++));
        return 8;
      case 0xFA:
        this.ldr_(Registers.A, this.GB.M.get(this.GB.M.get(this.PC, 2)));
        this.PC += 2;
        return 16;
      case 0xFE:
        this.cpv_(this.GB.M.get(this.PC++));
        return 8;
      default:
        throw Error(`Unimplemented opcode 0x${this.GB.M.get(addr).toString(16).toUpperCase().padStart(2, "0")}`);
    }
  }

  call_() {
    let a16 = this.GB.M.get(this.PC, 2);
    this.PC += 2;
    this.SP -= 2;
    this.lda_(this.SP, this.PC, 2);
    this.PC = a16;
  }

  inc16_(register) {
    this.set(register, this.get(register) + 1);
  }

  inc8r_(register) {
    let v0 = this.get(register);
    this.set(register, v0 + 1);
    let v1 = this.get(register);
    this.FlagZ = !v1;
    this.FlagN = false;
    this.FlagH = (v1 & 0xF) + (v0 & 0xF) > 0xF;
  }

  inc8a_(addr) {
    let v0 = this.GB.M.get(addr);
    this.GB.M.set(addr, v0 + 1);
    let v1 = this.GB.M.get(addr);
    this.FlagZ = !v1;
    this.FlagN = false;
    this.FlagH = (v1 & 0xF) + (v0 & 0xF) > 0xF;
  }

  dec16_(register) {
    this.set(register, this.get(register) - 1);
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
    let v1 = this.GB.M.get(addr);
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

  add16r_(register) {
    let v0 = this.HL;
    let value = this.get(register);
    this.HL = v0 + value;
    this.FlagN = false;
    this.FlagH = (v0 & 0xFF) + (value & 0xFF) > 0xFF;
    this.FlagC = v0 + value > 0xFFFF;
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
    let v0 = this.SP;
    let negative = value & 0x80;
    value = negative ? -~(0xFFFFFF00 + value - 1) : value;
    this.SP = v0 + value;
    this.FlagZ = false;
    this.FlagN = false;
    if(negative) {
      this.FlagH = (value & 0xFF) < (v0 & 0xFF);
    } else {
      this.FlagH = (value & 0xFF) + (v0 & 0xFF) > 0xFF;
    }
    if(negative) {
      this.FlagC = value + v0 > 0xFFFF;
    } else {
      this.FlagC = value > v0;
    }
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
    let total = this.get(register) + this.FlagC;
    this.cpv_(total);
    this.A -= total;
  }

  sbcv_(value) {
    let total = value + this.FlagC;
    this.cpv_(total);
    this.A -= total;
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

  ldr_(register, val) {
    this.set(register, val);
  }

  lda_(addr, val, bytes = 1) {
    this.GB.M.set(addr, val, bytes);
  }

  push_(register) {
    this.SP -= 2;
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
  }

  jp_(addr) {
    this.PC = addr;
  }

  ret_() {
    this.PC = this.GB.M.get(this.SP, 2);
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

  runCBInst(op) {
    switch(op) {
      case 0x00:
        this.rlcr_(Registers.B);
        return 8;
      case 0x01:
        this.rlcr_(Registers.C);
        return 8;
      case 0x02:
        this.rlcr_(Registers.D);
        return 8;
      case 0x03:
        this.rlcr_(Registers.E);
        return 8;
      case 0x04:
        this.rlcr_(Registers.H);
        return 8;
      case 0x05:
        this.rlcr_(Registers.L);
        return 8;
      case 0x06:
        this.rlca_(this.HL);
        return 16;
      case 0x07:
        this.rlcr_(Registers.A);
        return 8;
      case 0x08:
        this.rrcr_(Registers.B);
        return 8;
      case 0x09:
        this.rrcr_(Registers.C);
        return 8;
      case 0x0A:
        this.rrcr_(Registers.D);
        return 8;
      case 0x0B:
        this.rrcr_(Registers.E);
        return 8;
      case 0x0C:
        this.rrcr_(Registers.H);
        return 8;
      case 0x0D:
        this.rrcr_(Registers.L);
        return 8;
      case 0x0E:
        this.rlca_(this.HL);
        return 16;
      case 0x0F:
        this.rrcr_(Registers.A);
        return 8;
      case 0x10:
        this.rlr_(Registers.B);
        return 8;
      case 0x11:
        this.rlr_(Registers.C);
        return 8;
      case 0x12:
        this.rlr_(Registers.D);
        return 8;
      case 0x13:
        this.rlr_(Registers.E);
        return 8;
      case 0x14:
        this.rlr_(Registers.H);
        return 8;
      case 0x15:
        this.rlr_(Registers.L);
        return 8;
      case 0x16:
        this.rla_(this.HL);
        return 16;
      case 0x17:
        this.rlr_(Registers.A);
        return 8;
      case 0x18:
        this.rrr_(Registers.B);
        return 8;
      case 0x19:
        this.rrr_(Registers.C);
        return 8;
      case 0x1A:
        this.rrr_(Registers.D);
        return 8;
      case 0x1B:
        this.rrr_(Registers.E);
        return 8;
      case 0x1C:
        this.rrr_(Registers.H);
        return 8;
      case 0x1D:
        this.rrr_(Registers.L);
        return 8;
      case 0x1E:
        this.rra_(this.HL);
        return 16;
      case 0x1F:
        this.rrr_(Registers.A);
        return 8;
      case 0x20:
        this.slar_(Registers.B);
        return 8;
      case 0x21:
        this.slar_(Registers.C);
        return 8;
      case 0x22:
        this.slar_(Registers.D);
        return 8;
      case 0x23:
        this.slar_(Registers.E);
        return 8;
      case 0x24:
        this.slar_(Registers.H);
        return 8;
      case 0x25:
        this.slar_(Registers.L);
        return 8;
      case 0x26:
        this.slaa_(this.HL);
        return 16;
      case 0x27:
        this.slar_(Registers.A);
        return 8;
      case 0x28:
        this.srar_(Registers.B);
        return 8;
      case 0x29:
        this.srar_(Registers.C);
        return 8;
      case 0x2A:
        this.srar_(Registers.D);
        return 8;
      case 0x2B:
        this.srar_(Registers.E);
        return 8;
      case 0x2C:
        this.srar_(Registers.H);
        return 8;
      case 0x2D:
        this.srar_(Registers.L);
        return 8;
      case 0x2E:
        this.sraa_(this.HL);
        return 16;
      case 0x2F:
        this.srar_(Registers.A);
        return 8;
      case 0x30:
        this.swapr_(Registers.B);
        return 8;
      case 0x31:
        this.swapr_(Registers.C);
        return 8;
      case 0x32:
        this.swapr_(Registers.D);
        return 8;
      case 0x33:
        this.swapr_(Registers.E);
        return 8;
      case 0x34:
        this.swapr_(Registers.H);
        return 8;
      case 0x35:
        this.swapr_(Registers.L);
        return 8;
      case 0x36:
        this.swapa_(this.HL);
        return 16;
      case 0x37:
        this.swapr_(Registers.A);
        return 8;
      case 0x38:
        this.srlr_(Registers.B);
        return 8;
      case 0x39:
        this.srlr_(Registers.C);
        return 8;
      case 0x3A:
        this.srlr_(Registers.D);
        return 8;
      case 0x3B:
        this.srlr_(Registers.E);
        return 8;
      case 0x3C:
        this.srlr_(Registers.H);
        return 8;
      case 0x3D:
        this.srlr_(Registers.L);
        return 8;
      case 0x3E:
        this.srla_(this.HL);
        return 16;
      case 0x3F:
        this.srlr_(Registers.A);
        return 8;
      case 0x40:
        this.bitr_(Registers.B, 0);
        return 8;
      case 0x41:
        this.bitr_(Registers.C, 0);
        return 8;
      case 0x42:
        this.bitr_(Registers.D, 0);
        return 8;
      case 0x43:
        this.bitr_(Registers.E, 0);
        return 8;
      case 0x44:
        this.bitr_(Registers.H, 0);
        return 8;
      case 0x45:
        this.bitr_(Registers.L, 0);
        return 8;
      case 0x46:
        this.bita_(this.HL, 0);
        return 12;
      case 0x47:
        this.bitr_(Registers.A, 0);
        return 8;
      case 0x48:
        this.bitr_(Registers.B, 1);
        return 8;
      case 0x49:
        this.bitr_(Registers.C, 1);
        return 8;
      case 0x4A:
        this.bitr_(Registers.D, 1);
        return 8;
      case 0x4B:
        this.bitr_(Registers.E, 1);
        return 8;
      case 0x4C:
        this.bitr_(Registers.H, 1);
        return 8;
      case 0x4D:
        this.bitr_(Registers.L, 1);
        return 8;
      case 0x4E:
        this.bita_(this.HL, 1);
        return 12;
      case 0x4F:
        this.bitr_(Registers.A, 1);
        return 8;
      case 0x50:
        this.bitr_(Registers.B, 2);
        return 8;
      case 0x51:
        this.bitr_(Registers.C, 2);
        return 8;
      case 0x52:
        this.bitr_(Registers.D, 2);
        return 8;
      case 0x53:
        this.bitr_(Registers.E, 2);
        return 8;
      case 0x54:
        this.bitr_(Registers.H, 2);
        return 8;
      case 0x55:
        this.bitr_(Registers.L, 2);
        return 8;
      case 0x56:
        this.bita_(this.HL, 2);
        return 12;
      case 0x57:
        this.bitr_(Registers.A, 2);
        return 8;
      case 0x58:
        this.bitr_(Registers.B, 3);
        return 8;
      case 0x59:
        this.bitr_(Registers.C, 3);
        return 8;
      case 0x5A:
        this.bitr_(Registers.D, 3);
        return 8;
      case 0x5B:
        this.bitr_(Registers.E, 3);
        return 8;
      case 0x5C:
        this.bitr_(Registers.H, 3);
        return 8;
      case 0x5D:
        this.bitr_(Registers.L, 3);
        return 8;
      case 0x5E:
        this.bita_(this.HL, 3);
        return 12;
      case 0x5F:
        this.bitr_(Registers.A, 3);
        return 8;
      case 0x60:
        this.bitr_(Registers.B, 4);
        return 8;
      case 0x61:
        this.bitr_(Registers.C, 4);
        return 8;
      case 0x62:
        this.bitr_(Registers.D, 4);
        return 8;
      case 0x63:
        this.bitr_(Registers.E, 4);
        return 8;
      case 0x64:
        this.bitr_(Registers.H, 4);
        return 8;
      case 0x65:
        this.bitr_(Registers.L, 4);
        return 8;
      case 0x66:
        this.bita_(this.HL, 4);
        return 12;
      case 0x67:
        this.bitr_(Registers.A, 4);
        return 8;
      case 0x68:
        this.bitr_(Registers.B, 5);
        return 8;
      case 0x69:
        this.bitr_(Registers.C, 5);
        return 8;
      case 0x6A:
        this.bitr_(Registers.D, 5);
        return 8;
      case 0x6B:
        this.bitr_(Registers.E, 5);
        return 8;
      case 0x6C:
        this.bitr_(Registers.H, 5);
        return 8;
      case 0x6D:
        this.bitr_(Registers.L, 5);
        return 8;
      case 0x6E:
        this.bita_(this.HL, 5);
        return 12;
      case 0x6F:
        this.bitr_(Registers.A, 5);
        return 8;
      case 0x70:
        this.bitr_(Registers.B, 6);
        return 8;
      case 0x71:
        this.bitr_(Registers.C, 6);
        return 8;
      case 0x72:
        this.bitr_(Registers.D, 6);
        return 8;
      case 0x73:
        this.bitr_(Registers.E, 6);
        return 8;
      case 0x74:
        this.bitr_(Registers.H, 6);
        return 8;
      case 0x75:
        this.bitr_(Registers.L, 6);
        return 8;
      case 0x76:
        this.bita_(this.HL, 6);
        return 12;
      case 0x77:
        this.bitr_(Registers.A, 6);
        return 8;
      case 0x78:
        this.bitr_(Registers.B, 7);
        return 8;
      case 0x79:
        this.bitr_(Registers.C, 7);
        return 8;
      case 0x7A:
        this.bitr_(Registers.D, 7);
        return 8;
      case 0x7B:
        this.bitr_(Registers.E, 7);
        return 8;
      case 0x7C:
        this.bitr_(Registers.H, 7);
        return 8;
      case 0x7D:
        this.bitr_(Registers.L, 7);
        return 8;
      case 0x7E:
        this.bita_(this.HL, 7);
        return 12;
      case 0x7F:
        this.bitr_(Registers.A, 7);
        return 8;
      case 0x80:
        this.resr_(Registers.B, 0);
        return 8;
      case 0x81:
        this.resr_(Registers.C, 0);
        return 8;
      case 0x82:
        this.resr_(Registers.D, 0);
        return 8;
      case 0x83:
        this.resr_(Registers.E, 0);
        return 8;
      case 0x84:
        this.resr_(Registers.H, 0);
        return 8;
      case 0x85:
        this.resr_(Registers.L, 0);
        return 8;
      case 0x86:
        this.resa_(this.HL, 0);
        return 16;
      case 0x87:
        this.resr_(Registers.A, 0);
        return 8;
      case 0x88:
        this.resr_(Registers.B, 1);
        return 8;
      case 0x89:
        this.resr_(Registers.C, 1);
        return 8;
      case 0x8A:
        this.resr_(Registers.D, 1);
        return 8;
      case 0x8B:
        this.resr_(Registers.E, 1);
        return 8;
      case 0x8C:
        this.resr_(Registers.H, 1);
        return 8;
      case 0x8D:
        this.resr_(Registers.L, 1);
        return 8;
      case 0x8E:
        this.resa_(this.HL, 1);
        return 16;
      case 0x8F:
        this.resr_(Registers.A, 1);
        return 8;
      case 0x90:
        this.resr_(Registers.B, 2);
        return 8;
      case 0x91:
        this.resr_(Registers.C, 2);
        return 8;
      case 0x92:
        this.resr_(Registers.D, 2);
        return 8;
      case 0x93:
        this.resr_(Registers.E, 2);
        return 8;
      case 0x94:
        this.resr_(Registers.H, 2);
        return 8;
      case 0x95:
        this.resr_(Registers.L, 2);
        return 8;
      case 0x96:
        this.resa_(this.HL, 2);
        return 16;
      case 0x97:
        this.resr_(Registers.A, 2);
        return 8;
      case 0x98:
        this.resr_(Registers.B, 3);
        return 8;
      case 0x99:
        this.resr_(Registers.C, 3);
        return 8;
      case 0x9A:
        this.resr_(Registers.D, 3);
        return 8;
      case 0x9B:
        this.resr_(Registers.E, 3);
        return 8;
      case 0x9C:
        this.resr_(Registers.H, 3);
        return 8;
      case 0x9D:
        this.resr_(Registers.L, 3);
        return 8;
      case 0x9E:
        this.resa_(this.HL, 3);
        return 16;
      case 0x9F:
        this.resr_(Registers.A, 3);
        return 8;
      case 0xA0:
        this.resr_(Registers.B, 4);
        return 8;
      case 0xA1:
        this.resr_(Registers.C, 4);
        return 8;
      case 0xA2:
        this.resr_(Registers.D, 4);
        return 8;
      case 0xA3:
        this.resr_(Registers.E, 4);
        return 8;
      case 0xA4:
        this.resr_(Registers.H, 4);
        return 8;
      case 0xA5:
        this.resr_(Registers.L, 4);
        return 8;
      case 0xA6:
        this.resa_(this.HL, 4);
        return 16;
      case 0xA7:
        this.resr_(Registers.A, 4);
        return 8;
      case 0xA8:
        this.resr_(Registers.B, 5);
        return 8;
      case 0xA9:
        this.resr_(Registers.C, 5);
        return 8;
      case 0xAA:
        this.resr_(Registers.D, 5);
        return 8;
      case 0xAB:
        this.resr_(Registers.E, 5);
        return 8;
      case 0xAC:
        this.resr_(Registers.H, 5);
        return 8;
      case 0xAD:
        this.resr_(Registers.L, 5);
        return 8;
      case 0xAE:
        this.resa_(this.HL, 5);
        return 16;
      case 0xAF:
        this.resr_(Registers.A, 5);
        return 8;
      case 0xB0:
        this.resr_(Registers.B, 6);
        return 8;
      case 0xB1:
        this.resr_(Registers.C, 6);
        return 8;
      case 0xB2:
        this.resr_(Registers.D, 6);
        return 8;
      case 0xB3:
        this.resr_(Registers.E, 6);
        return 8;
      case 0xB4:
        this.resr_(Registers.H, 6);
        return 8;
      case 0xB5:
        this.resr_(Registers.L, 6);
        return 8;
      case 0xB6:
        this.resa_(this.HL, 6);
        return 16;
      case 0xB7:
        this.resr_(Registers.A, 6);
        return 8;
      case 0xB8:
        this.resr_(Registers.B, 7);
        return 8;
      case 0xB9:
        this.resr_(Registers.C, 7);
        return 8;
      case 0xBA:
        this.resr_(Registers.D, 7);
        return 8;
      case 0xBB:
        this.resr_(Registers.E, 7);
        return 8;
      case 0xBC:
        this.resr_(Registers.H, 7);
        return 8;
      case 0xBD:
        this.resr_(Registers.L, 7);
        return 8;
      case 0xBE:
        this.resa_(this.HL, 7);
        return 16;
      case 0xBF:
        this.resr_(Registers.A, 7);
        return 8;
      case 0xC0:
        this.setr_(Registers.B, 0);
        return 8;
      case 0xC1:
        this.setr_(Registers.C, 0);
        return 8;
      case 0xC2:
        this.setr_(Registers.D, 0);
        return 8;
      case 0xC3:
        this.setr_(Registers.E, 0);
        return 8;
      case 0xC4:
        this.setr_(Registers.H, 0);
        return 8;
      case 0xC5:
        this.setr_(Registers.L, 0);
        return 8;
      case 0xC6:
        this.seta_(this.HL, 0);
        return 16;
      case 0xC7:
        this.setr_(Registers.A, 0);
        return 8;
      case 0xC8:
        this.setr_(Registers.B, 1);
        return 8;
      case 0xC9:
        this.setr_(Registers.C, 1);
        return 8;
      case 0xCA:
        this.setr_(Registers.D, 1);
        return 8;
      case 0xCB:
        this.setr_(Registers.E, 1);
        return 8;
      case 0xCC:
        this.setr_(Registers.H, 1);
        return 8;
      case 0xCD:
        this.setr_(Registers.L, 1);
        return 8;
      case 0xCE:
        this.seta_(this.HL, 1);
        return 16;
      case 0xCF:
        this.setr_(Registers.A, 1);
        return 8;
      case 0xD0:
        this.setr_(Registers.B, 2);
        return 8;
      case 0xD1:
        this.setr_(Registers.C, 2);
        return 8;
      case 0xD2:
        this.setr_(Registers.D, 2);
        return 8;
      case 0xD3:
        this.setr_(Registers.E, 2);
        return 8;
      case 0xD4:
        this.setr_(Registers.H, 2);
        return 8;
      case 0xD5:
        this.setr_(Registers.L, 2);
        return 8;
      case 0xD6:
        this.seta_(this.HL, 2);
        return 16;
      case 0xD7:
        this.setr_(Registers.A, 2);
        return 8;
      case 0xD8:
        this.setr_(Registers.B, 3);
        return 8;
      case 0xD9:
        this.setr_(Registers.C, 3);
        return 8;
      case 0xDA:
        this.setr_(Registers.D, 3);
        return 8;
      case 0xDB:
        this.setr_(Registers.E, 3);
        return 8;
      case 0xDC:
        this.setr_(Registers.H, 3);
        return 8;
      case 0xDD:
        this.setr_(Registers.L, 3);
        return 8;
      case 0xDE:
        this.seta_(this.HL, 3);
        return 16;
      case 0xDF:
        this.setr_(Registers.A, 3);
        return 8;
      case 0xE0:
        this.setr_(Registers.B, 4);
        return 8;
      case 0xE1:
        this.setr_(Registers.C, 4);
        return 8;
      case 0xE2:
        this.setr_(Registers.D, 4);
        return 8;
      case 0xE3:
        this.setr_(Registers.E, 4);
        return 8;
      case 0xE4:
        this.setr_(Registers.H, 4);
        return 8;
      case 0xE5:
        this.setr_(Registers.L, 4);
        return 8;
      case 0xE6:
        this.seta_(this.HL, 4);
        return 16;
      case 0xE7:
        this.setr_(Registers.A, 4);
        return 8;
      case 0xE8:
        this.setr_(Registers.B, 5);
        return 8;
      case 0xE9:
        this.setr_(Registers.C, 5);
        return 8;
      case 0xEA:
        this.setr_(Registers.D, 5);
        return 8;
      case 0xEB:
        this.setr_(Registers.E, 5);
        return 8;
      case 0xEC:
        this.setr_(Registers.H, 5);
        return 8;
      case 0xED:
        this.setr_(Registers.L, 5);
        return 8;
      case 0xEE:
        this.seta_(this.HL, 5);
        return 16;
      case 0xEF:
        this.setr_(Registers.A, 5);
        return 8;
      case 0xF0:
        this.setr_(Registers.B, 6);
        return 8;
      case 0xF1:
        this.setr_(Registers.C, 6);
        return 8;
      case 0xF2:
        this.setr_(Registers.D, 6);
        return 8;
      case 0xF3:
        this.setr_(Registers.E, 6);
        return 8;
      case 0xF4:
        this.setr_(Registers.H, 6);
        return 8;
      case 0xF5:
        this.setr_(Registers.L, 6);
        return 8;
      case 0xF6:
        this.seta_(this.HL, 6);
        return 16;
      case 0xF7:
        this.setr_(Registers.A, 6);
        return 8;
      case 0xF8:
        this.setr_(Registers.B, 7);
        return 8;
      case 0xF9:
        this.setr_(Registers.C, 7);
        return 8;
      case 0xFA:
        this.setr_(Registers.D, 7);
        return 8;
      case 0xFB:
        this.setr_(Registers.E, 7);
        return 8;
      case 0xFC:
        this.setr_(Registers.H, 7);
        return 8;
      case 0xFD:
        this.setr_(Registers.L, 7);
        return 8;
      case 0xFE:
        this.seta_(this.HL, 7);
        return 16;
      case 0xFF:
        this.setr_(Registers.A, 7);
        return 8;
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
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
  }

  swapr_(register) {
    let v = this.get(register);
    let top = v & 0xFF00;
    let bot = v & 0x00FF;
    this.set(register, (bot << 4) | (top >> 4));
    this.FlagZ = !this.get(register);
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  swapa_(addr) {
    let v = this.GB.M.get(addr);
    let top = v & 0xFF00;
    let bot = v & 0x00FF;
    this.GB.M.set(addr, (bot << 4) | (top >> 4));
    this.FlagZ = !this.GB.M.get(addr);
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
    this.FlagZ = !this.GB.M.get(addr);
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

  get(register) {
    switch(register) {
      case Registers.A:
      case Registers.F:
      case Registers.B:
      case Registers.C:
      case Registers.D:
      case Registers.E:
      case Registers.H:
      case Registers.L:
      case Registers.SP:
      case Registers.PC:
      case Registers.IME:
        return this[register];
      case Registers.AF:
      case Registers.BC:
      case Registers.DE:
      case Registers.HL:
        let split = register.split("_");
        return (this[split[0]] << 8) + this[split[1]];
    }
  }

  set(register, val) {
    switch(register) {
      case Registers.A:
      case Registers.F:
      case Registers.B:
      case Registers.C:
      case Registers.D:
      case Registers.E:
      case Registers.H:
      case Registers.L:
      case Registers.IME:
        this[register] = val & 0xFF;
        break;
      case Registers.AF:
      case Registers.BC:
      case Registers.DE:
      case Registers.HL:
        let split = register.split("_");
        this[split[0]] = (val >> 8) & 0xFF;
        this[split[1]] = val & 0xFF;
        break;
      case Registers.SP:
      case Registers.PC:
        this[register] = val & 0xFFFF;
        break;
    }
  }

  get A() {
    return this.get(Registers.A);
  }

  set A(val) {
    this.set(Registers.A, val);
  }

  get F() {
    return this.get(Registers.F);
  }

  set F(val) {
    this.set(Registers.F, val);
  }

  get AF() {
    return this.get(Registers.AF);
  }

  set AF(val) {
    this.set(Registers.AF, val);
  }

  get B() {
    return this.get(Registers.B);
  }

  set B(val) {
    this.set(Registers.B, val);
  }

  get C() {
    return this.get(Registers.C);
  }

  set C(val) {
    this.set(Registers.C, val);
  }

  get BC() {
    return this.get(Registers.BC);
  }

  set BC(val) {
    this.set(Registers.BC, val);
  }

  get D() {
    return this.get(Registers.D);
  }

  set D(val) {
    this.set(Registers.D, val);
  }

  get E() {
    return this.get(Registers.E);
  }

  set E(val) {
    this.set(Registers.E, val);
  }

  get DE() {
    return this.get(Registers.DE);
  }

  set DE(val) {
    this.set(Registers.DE, val);
  }

  get H() {
    return this.get(Registers.H);
  }

  set H(val) {
    this.set(Registers.H, val);
  }

  get L() {
    return this.get(Registers.L);
  }

  set L(val) {
    this.set(Registers.L, val);
  }

  get HL() {
    return this.get(Registers.HL);
  }

  set HL(val) {
    this.set(Registers.HL, val);
  }

  get SP() {
    return this.get(Registers.SP);
  }

  set SP(val) {
    this.set(Registers.SP, val);
  }

  get PC() {
    return this.get(Registers.PC);
  }

  set PC(val) {
    this.set(Registers.PC, val);
  }

  get FlagIME() {
    return !!(this.get(Registers.IME));
  }

  set FlagIME(bool) {
    bool ? this.set(Registers.IME, 1) : this.set(Registers.IME, 0);
  }

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
