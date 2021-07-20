export const Registers8 = {
  A: 0,
  F: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  H: 6,
  L: 7
};

export const Registers16 = {
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
    this.mapCBs_();
    this.GB = gameBoy;
    this.paused_ = true;
    this.breakpoints_ = new Map();
    this.reset();
  }

  mapCBs_() {
    this.rot_f = [
      this.rlc_.bind(this),
      this.rrc_.bind(this),
      this.rl_.bind(this),
      this.rr_.bind(this),
      this.sla_.bind(this),
      this.sra_.bind(this),
      this.swap_.bind(this),
      this.srl_.bind(this)
    ];
    this.bit_f = [...new Array(8).keys()].map((val) => this.bit_.bind(this, val));
    this.res_f = [...new Array(8).keys()].map((val) => this.res_.bind(this, val));
    this.set_f = [...new Array(8).keys()].map((val) => this.set_.bind(this, val));
  }

  reset() {
    this.halted_ = false;
    this.FlagIME = false;
    this.count_ = 0;
    this.Reg8 = new Uint8Array(8);
    this.Reg16 = new Uint16Array(6);
    this.Reg16[Registers16.PC] = 0x0100;
    this.Reg16[Registers16.SP] = 0xFFFE;
    this.AF = 0x01B0;
    this.BC = 0x0013;
    this.DE = 0x00D8;
    this.HL = 0x014D;
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

  removeBreakpoint(addr) {
    this.breakpoints_.delete(addr);
  }

  runFrame() {
    if (this.paused_) {
      return;
    }
    this.count_ = 0;
    while (this.count_ < CYCLES_PER_FRAME) {
      this.step();
      if (!!this.breakpoints_.get(this.Reg16[Registers16.PC])) {
        this.pause();
        return;
      }
    }
  }

  update(cycles) {
    this.count_ += cycles;
    this.GB.Timer.step(cycles);
    this.GB.PPU.step(cycles);
    this.GB.APU.step(cycles);
  }

  step() {
    //RUN INSTRUCTION START
    let cbInst = false;
    if (this.halted_) {
      this.update(4);
    } else {
      let pc = this.Reg16[Registers16.PC]++;
      let inst = this.GB.M.get(pc);
      switch (inst) {
        case 0x00:
          break;
        case 0x01:
          this.ldr16_(Registers16.BC, this.GB.M.get(this.Reg16[Registers16.PC], 2));
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0x02:
          this.GB.M.set(this.Reg16[Registers16.BC], this.Reg8[Registers8.A]);
          break;
        case 0x03:
          this.inc16_(Registers16.BC);
          break;
        case 0x04:
          this.inc8r_(Registers8.B);
          break;
        case 0x05:
          this.dec8r_(Registers8.B);
          break;
        case 0x06:
          this.ldr8_(Registers8.B, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x07:
          this.rlcakku_();
          break;
        case 0x08:
          this.GB.M.set(this.GB.M.get(this.Reg16[Registers16.PC], 2), this.Reg16[Registers16.SP], 2);
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0x09:
          this.addHL16r_(Registers16.BC);
          break;
        case 0x0A:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.BC]));
          break;
        case 0x0B:
          this.dec16_(Registers16.BC);
          break;
        case 0x0C:
          this.inc8r_(Registers8.C);
          break;
        case 0x0D:
          this.dec8r_(Registers8.C);
          break;
        case 0x0E:
          this.ldr8_(Registers8.C, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x0F:
          this.rrcakku_();
          break;
        case 0x10:
          //Let's just say stop is halt for now.
          //this.halted_ = true;
          break;
        case 0x11:
          this.ldr16_(Registers16.DE, this.GB.M.get(this.Reg16[Registers16.PC], 2));
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0x12:
          this.GB.M.set(this.Reg16[Registers16.DE], this.Reg8[Registers8.A]);
          break;
        case 0x13:
          this.inc16_(Registers16.DE);
          break;
        case 0x14:
          this.inc8r_(Registers8.D);
          break;
        case 0x15:
          this.dec8r_(Registers8.D);
          break;
        case 0x16:
          this.ldr8_(Registers8.D, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x17:
          this.rlakku_();
          break;
        case 0x18:
          this.jr_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x19:
          this.addHL16r_(Registers16.DE);
          break;
        case 0x1A:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.DE]));
          break;
        case 0x1B:
          this.dec16_(Registers16.DE);
          break;
        case 0x1C:
          this.inc8r_(Registers8.E);
          break;
        case 0x1D:
          this.dec8r_(Registers8.E);
          break;
        case 0x1E:
          this.ldr8_(Registers8.E, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x1F:
          this.rrakku_();
          break;
        case 0x20:
          if (!this.FlagZ) {
            this.jr_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          } else {
            this.Reg16[Registers16.PC]++;
            this.update(4);
          }
          break;
        case 0x21:
          this.ldr16_(Registers16.HL, this.GB.M.get(this.Reg16[Registers16.PC], 2));
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0x22:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.A]);
          this.inc16_(Registers16.HL, false);
          break;
        case 0x23:
          this.inc16_(Registers16.HL);
          break;
        case 0x24:
          this.inc8r_(Registers8.H);
          break;
        case 0x25:
          this.dec8r_(Registers8.H);
          break;
        case 0x26:
          this.ldr8_(Registers8.H, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x27:
          this.daa_();
          break;
        case 0x28:
          if (this.FlagZ) {
            this.jr_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          } else {
            this.Reg16[Registers16.PC]++;
            this.update(4);
          }
          break;
        case 0x29:
          this.addHL16r_(Registers16.HL);
          break;
        case 0x2A:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.HL]));
          this.inc16_(Registers16.HL, false);
          break;
        case 0x2B:
          this.dec16_(Registers16.HL);
          break;
        case 0x2C:
          this.inc8r_(Registers8.L);
          break;
        case 0x2D:
          this.dec8r_(Registers8.L);
          break;
        case 0x2E:
          this.ldr8_(Registers8.L, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x2F:
          this.FlagN = true;
          this.FlagH = true;
          this.A = this.Reg8[Registers8.A] ^ 0xFF;
          break;
        case 0x30:
          if (!this.FlagC) {
            this.jr_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          } else {
            this.Reg16[Registers16.PC]++;
            this.update(4);
          }
          break;
        case 0x31:
          this.ldr16_(Registers16.SP, this.GB.M.get(this.Reg16[Registers16.PC], 2));
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0x32:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.A]);
          this.dec16_(Registers16.HL, false);
          break;
        case 0x33:
          this.inc16_(Registers16.SP);
          break;
        case 0x34:
          this.inc8a_(this.Reg16[Registers16.HL]);
          break;
        case 0x35:
          this.dec8a_(this.Reg16[Registers16.HL]);
          break;
        case 0x36:
          this.GB.M.set(this.Reg16[Registers16.HL], this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x37:
          this.scf_();
          break;
        case 0x38:
          if (this.FlagC) {
            this.jr_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          } else {
            this.Reg16[Registers16.PC]++;
            this.update(4);
          }
          break;
        case 0x39:
          this.addHL16r_(Registers16.SP);
          break;
        case 0x3A:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.HL]));
          this.dec16_(Registers16.HL, false);
          break;
        case 0x3B:
          this.dec16_(Registers16.SP);
          break;
        case 0x3C:
          this.inc8r_(Registers8.A);
          break;
        case 0x3D:
          this.dec8r_(Registers8.A);
          break;
        case 0x3E:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0x3F:
          this.ccf_();
          break;
        case 0x40:
          //this.ldr8_(Registers8.B, this.Reg8[Registers8.B]);
          break;
        case 0x41:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.C]);
          break;
        case 0x42:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.D]);
          break;
        case 0x43:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.E]);
          break;
        case 0x44:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.H]);
          break;
        case 0x45:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.L]);
          break;
        case 0x46:
          this.ldr8_(Registers8.B, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x47:
          this.ldr8_(Registers8.B, this.Reg8[Registers8.A]);
          break;
        case 0x48:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.B]);
          break;
        case 0x49:
          //this.ldr8_(Registers8.C, this.Reg8[Registers8.C]);
          break;
        case 0x4A:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.D]);
          break;
        case 0x4B:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.E]);
          break;
        case 0x4C:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.H]);
          break;
        case 0x4D:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.L]);
          break;
        case 0x4E:
          this.ldr8_(Registers8.C, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x4F:
          this.ldr8_(Registers8.C, this.Reg8[Registers8.A]);
          break;
        case 0x50:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.B]);
          break;
        case 0x51:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.C]);
          break;
        case 0x52:
          //this.ldr8_(Registers8.D, this.Reg8[Registers8.D]);
          break;
        case 0x53:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.E]);
          break;
        case 0x54:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.H]);
          break;
        case 0x55:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.L]);
          break;
        case 0x56:
          this.ldr8_(Registers8.D, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x57:
          this.ldr8_(Registers8.D, this.Reg8[Registers8.A]);
          break;
        case 0x58:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.B]);
          break;
        case 0x59:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.C]);
          break;
        case 0x5A:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.D]);
          break;
        case 0x5B:
          //this.ldr8_(Registers8.E, this.Reg8[Registers8.E]);
          break;
        case 0x5C:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.H]);
          break;
        case 0x5D:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.L]);
          break;
        case 0x5E:
          this.ldr8_(Registers8.E, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x5F:
          this.ldr8_(Registers8.E, this.Reg8[Registers8.A]);
          break;
        case 0x60:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.B]);
          break;
        case 0x61:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.C]);
          break;
        case 0x62:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.D]);
          break;
        case 0x63:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.E]);
          break;
        case 0x64:
          //this.ldr8_(Registers8.H, this.Reg8[Registers8.H]);
          break;
        case 0x65:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.L]);
          break;
        case 0x66:
          this.ldr8_(Registers8.H, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x67:
          this.ldr8_(Registers8.H, this.Reg8[Registers8.A]);
          break;
        case 0x68:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.B]);
          break;
        case 0x69:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.C]);
          break;
        case 0x6A:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.D]);
          break;
        case 0x6B:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.E]);
          break;
        case 0x6C:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.H]);
          break;
        case 0x6D:
          //this.ldr8_(Registers8.L, this.Reg8[Registers8.L]);
          break;
        case 0x6E:
          this.ldr8_(Registers8.L, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x6F:
          this.ldr8_(Registers8.L, this.Reg8[Registers8.A]);
          break;
        case 0x70:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.B]);
          break;
        case 0x71:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.C]);
          break;
        case 0x72:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.D]);
          break;
        case 0x73:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.E]);
          break;
        case 0x74:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.H]);
          break;
        case 0x75:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.L]);
          break;
        case 0x76:
          this.halted_ = true;
          break;
        case 0x77:
          this.GB.M.set(this.Reg16[Registers16.HL], this.Reg8[Registers8.A]);
          break;
        case 0x78:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.B]);
          break;
        case 0x79:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.C]);
          break;
        case 0x7A:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.D]);
          break;
        case 0x7B:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.E]);
          break;
        case 0x7C:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.H]);
          break;
        case 0x7D:
          this.ldr8_(Registers8.A, this.Reg8[Registers8.L]);
          break;
        case 0x7E:
          this.ldr8_(Registers8.A, this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x7F:
          //this.ldr8_(Registers8.A, this.Reg8[Registers8.A]);
          break;
        case 0x80:
          this.add8r_(Registers8.B);
          break;
        case 0x81:
          this.add8r_(Registers8.C);
          break;
        case 0x82:
          this.add8r_(Registers8.D);
          break;
        case 0x83:
          this.add8r_(Registers8.E);
          break;
        case 0x84:
          this.add8r_(Registers8.H);
          break;
        case 0x85:
          this.add8r_(Registers8.L);
          break;
        case 0x86:
          this.add8v_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x87:
          this.add8r_(Registers8.A);
          break;
        case 0x88:
          this.adcr_(Registers8.B);
          break;
        case 0x89:
          this.adcr_(Registers8.C);
          break;
        case 0x8A:
          this.adcr_(Registers8.D);
          break;
        case 0x8B:
          this.adcr_(Registers8.E);
          break;
        case 0x8C:
          this.adcr_(Registers8.H);
          break;
        case 0x8D:
          this.adcr_(Registers8.L);
          break;
        case 0x8E:
          this.adcv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x8F:
          this.adcr_(Registers8.A);
          break;
        case 0x90:
          this.subr_(Registers8.B);
          break;
        case 0x91:
          this.subr_(Registers8.C);
          break;
        case 0x92:
          this.subr_(Registers8.D);
          break;
        case 0x93:
          this.subr_(Registers8.E);
          break;
        case 0x94:
          this.subr_(Registers8.H);
          break;
        case 0x95:
          this.subr_(Registers8.L);
          break;
        case 0x96:
          this.subv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x97:
          this.subr_(Registers8.A);
          break;
        case 0x98:
          this.sbcr_(Registers8.B);
          break;
        case 0x99:
          this.sbcr_(Registers8.C);
          break;
        case 0x9A:
          this.sbcr_(Registers8.D);
          break;
        case 0x9B:
          this.sbcr_(Registers8.E);
          break;
        case 0x9C:
          this.sbcr_(Registers8.H);
          break;
        case 0x9D:
          this.sbcr_(Registers8.L);
          break;
        case 0x9E:
          this.sbcv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0x9F:
          this.sbcr_(Registers8.A);
          break;
        case 0xA0:
          this.andr_(Registers8.B);
          break;
        case 0xA1:
          this.andr_(Registers8.C);
          break;
        case 0xA2:
          this.andr_(Registers8.D);
          break;
        case 0xA3:
          this.andr_(Registers8.E);
          break;
        case 0xA4:
          this.andr_(Registers8.H);
          break;
        case 0xA5:
          this.andr_(Registers8.L);
          break;
        case 0xA6:
          this.andv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0xA7:
          this.andr_(Registers8.A);
          break;
        case 0xA8:
          this.xorr_(Registers8.B);
          break;
        case 0xA9:
          this.xorr_(Registers8.C);
          break;
        case 0xAA:
          this.xorr_(Registers8.D);
          break;
        case 0xAB:
          this.xorr_(Registers8.E);
          break;
        case 0xAC:
          this.xorr_(Registers8.H);
          break;
        case 0xAD:
          this.xorr_(Registers8.L);
          break;
        case 0xAE:
          this.xorv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0xAF:
          this.xorr_(Registers8.A);
          break;
        case 0xB0:
          this.orr_(Registers8.B);
          break;
        case 0xB1:
          this.orr_(Registers8.C);
          break;
        case 0xB2:
          this.orr_(Registers8.D);
          break;
        case 0xB3:
          this.orr_(Registers8.E);
          break;
        case 0xB4:
          this.orr_(Registers8.H);
          break;
        case 0xB5:
          this.orr_(Registers8.L);
          break;
        case 0xB6:
          this.orv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0xB7:
          this.orr_(Registers8.A);
          break;
        case 0xB8:
          this.cpr_(Registers8.B);
          break;
        case 0xB9:
          this.cpr_(Registers8.C);
          break;
        case 0xBA:
          this.cpr_(Registers8.D);
          break;
        case 0xBB:
          this.cpr_(Registers8.E);
          break;
        case 0xBC:
          this.cpr_(Registers8.H);
          break;
        case 0xBD:
          this.cpr_(Registers8.L);
          break;
        case 0xBE:
          this.cpv_(this.GB.M.get(this.Reg16[Registers16.HL]));
          break;
        case 0xBF:
          this.cpr_(Registers8.A);
          break;
        case 0xC0:
          if (!this.FlagZ) {
            this.ret_();
          } else {
            this.update(4);
          }
          break;
        case 0xC1:
          this.pop_(Registers16.BC);
          break;
        case 0xC2:
          if (!this.FlagZ) {
            let addr = this.GB.M.get(this.Reg16[Registers16.PC], 2);
            this.Reg16[Registers16.PC] += 2;
            this.jp_(addr, true);
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xC3:
          this.jp_(this.GB.M.get(this.Reg16[Registers16.PC], 2), true);
          break;
        case 0xC4:
          if (!this.FlagZ) {
            this.call16_();
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xC5:
          this.push_(Registers16.BC);
          break;
        case 0xC6:
          this.add8v_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xC7:
          this.call8_(0x0000);
          break;
        case 0xC8:
          if (this.FlagZ) {
            this.ret_();
          } else {
            this.update(4);
          }
          break;_
        case 0xC9:
          this.ret_(false);
          break;
        case 0xCA:
          if (this.FlagZ) {
            let addr = this.GB.M.get(this.Reg16[Registers16.PC], 2);
            this.Reg16[Registers16.PC] += 2;
            this.jp_(addr, true);
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xCB:
          cbInst = true;
          break;
        case 0xCC:
          if (this.FlagZ) {
            this.call16_();
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xCD:
          this.call16_();
          break;
        case 0xCE:
          this.adcv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xCF:
          this.call8_(0x0008);
          break;
        case 0xD0:
          if (!this.FlagC) {
            this.ret_();
          } else {
            this.update(4);
          }
          break;
        case 0xD1:
          this.pop_(Registers16.DE);
          break;
        case 0xD2:
          if (!this.FlagC) {
            let addr = this.GB.M.get(this.Reg16[Registers16.PC], 2);
            this.Reg16[Registers16.PC] += 2;
            this.jp_(addr, true);
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xD4:
          if (!this.FlagC) {
            this.call16_();
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xD5:
          this.push_(Registers16.DE);
          break;
        case 0xD6:
          this.subv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xD7:
          this.call8_(0x0010);
          break;
        case 0xD8:
          if (this.FlagC) {
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
          if (this.FlagC) {
            let addr = this.GB.M.get(this.Reg16[Registers16.PC], 2);
            this.Reg16[Registers16.PC] += 2;
            this.jp_(addr, true);
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xDC:
          if (this.FlagC) {
            this.call16_();
          } else {
            this.Reg16[Registers16.PC] += 2;
            this.update(4);
            this.update(4);
          }
          break;
        case 0xDE:
          this.sbcv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xDF:
          this.call8_(0x0018);
          break;
        case 0xE0:
          this.GB.M.set(0xFF00 + this.GB.M.get(this.Reg16[Registers16.PC]++), this.Reg8[Registers8.A]);
          break;
        case 0xE1:
          this.pop_(Registers16.HL);
          break;
        case 0xE2:
          this.GB.M.set(0xFF00 + this.Reg8[Registers8.C], this.Reg8[Registers8.A]);
          break;
        case 0xE5:
          this.push_(Registers16.HL);
          break;
        case 0xE6:
          this.andv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xE7:
          this.call8_(0x0020);
          break;
        case 0xE8:
          this.add16signed8v_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xE9:
          this.jp_(this.Reg16[Registers16.HL]);
          break;
        case 0xEA:
          this.GB.M.set(this.GB.M.get(this.Reg16[Registers16.PC], 2), this.Reg8[Registers8.A]);
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0xEE:
          this.xorv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xEF:
          this.call8_(0x0028);
          break;
        case 0xF0:
          this.ldr8_(Registers8.A, this.GB.M.get(0xFF00 + this.GB.M.get(this.Reg16[Registers16.PC]++)));
          break;
        case 0xF1:
          this.pop_(Registers16.AF);
          break;
        case 0xF2:
          this.ldr8_(Registers8.A, this.GB.M.get(0xFF00 + this.Reg8[Registers8.C]), false);
          break;
        case 0xF3:
          this.FlagIME = false;
          break;
        case 0xF5:
          this.push_(Registers16.AF);
          break;
        case 0xF6:
          this.orv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xF7:
          this.call8_(0x0030);
          break;
        case 0xF8:
          this.lda16SPsigned8v_(Registers16.HL, this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xF9:
          this.ldr16_(Registers16.SP, this.Reg16[Registers16.HL], true);
          break;
        case 0xFA:
          this.ldr8_(Registers8.A, this.GB.M.get(this.GB.M.get(this.Reg16[Registers16.PC], 2)));
          this.Reg16[Registers16.PC] += 2;
          break;
        case 0xFB:
          this.FlagIME = true;
          break;
        case 0xFE:
          this.cpv_(this.GB.M.get(this.Reg16[Registers16.PC]++));
          break;
        case 0xFF:
          this.call8_(0x0038);
          break;
        default:
          throw Error(`Unimplemented opcode 0x${inst.toString(16).toUpperCase().padStart(2, "0")} at 0x${pc.toString(16).toUpperCase().padStart(4, "0")}`);
      }
    }
    if (cbInst) {
      // https://gb-archive.github.io/salvage/decoding_gbz80_opcodes/Decoding%20Gamboy%20Z80%20Opcodes.html
      let op = this.GB.M.get(this.Reg16[Registers16.PC]++);
      let x = (op >>> 6) & 0b11;
      let y = (op >>> 3) & 0b111;
      let z = op & 0b111;
      let addr = z === 6;
      let r = [
        Registers8.B,
        Registers8.C,
        Registers8.D,
        Registers8.E,
        Registers8.H,
        Registers8.L,
        this.Reg16[Registers16.HL],
        Registers8.A
      ];
      let f = [
        this.rot_f[y],
        this.bit_f[y],
        this.res_f[y],
        this.set_f[y]
      ];
      f[x](r[z], addr);
    }
    //RUN INSTRUCTION END

    //INTERRUPTS START
    //If several interrupts are requested at once, the interrupt of the lowest bit takes priority.
    if (this.FlagVBlankRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagVBlankEnable) {
        this.update(4);
        this.FlagVBlankRequest = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0040;
      }
    } else if (this.FlagLCDSTATRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagLCDSTATEnable) {
        this.update(4);
        this.FlagLCDSTATRequest = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0048;
      }
    } else if (this.FlagTimerRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagTimerEnable) {
        this.update(4);
        this.FlagTimerRequest = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0050;
      }
    } else if (this.FlagSerialRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagSerialEnable) {
        this.update(4);
        this.FlagSerialRequest = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0058;
      }
    } else if (this.FlagJoypadRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagJoypadEnable) {
        this.update(4);
        this.FlagJoypadRequest = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0060;
      }
    }
    //INTERRUPTS END
  }

  call8_(a8) {
    this.Reg16[Registers16.SP] -= 2;
    this.update(4);
    this.GB.M.set(this.Reg16[Registers16.SP], this.Reg16[Registers16.PC], 2);
    this.Reg16[Registers16.PC] = a8;
  }

  call16_() {
    let a16 = this.GB.M.get(this.Reg16[Registers16.PC], 2);
    this.Reg16[Registers16.PC] += 2;
    this.Reg16[Registers16.SP] -= 2;
    this.update(4);
    this.GB.M.set(this.Reg16[Registers16.SP], this.Reg16[Registers16.PC], 2);
    this.Reg16[Registers16.PC] = a16;
  }

  inc16_(register, update = true) {
    this.set16(register, this.Reg16[register] + 1);
    if (update) {
      this.update(4);
    }
  }

  inc8r_(register) {
    let v0 = this.Reg8[register];
    this.set8(register, v0 + 1);
    let v1 = this.Reg8[register];
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
    this.set16(register, this.Reg16[register] - 1);
    if (update) {
      this.update(4);
    }
  }

  dec8r_(register) {
    let v0 = this.Reg8[register];
    this.set8(register, v0 - 1);
    let v1 = this.Reg8[register];
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
    this.A = this.Reg8[Registers8.A] & this.Reg8[register];
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = true;
    this.FlagC = false;
  }

  andv_(value) {
    this.A = this.Reg8[Registers8.A] & value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = true;
    this.FlagC = false;
  }

  orr_(register) {
    this.A = this.Reg8[Registers8.A] | this.Reg8[register];
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  orv_(value) {
    this.A = this.Reg8[Registers8.A] | value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  xorr_(register) {
    this.A = this.Reg8[Registers8.A] ^ this.Reg8[register];
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  xorv_(value) {
    this.A = this.Reg8[Registers8.A] ^ value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  addHL16r_(register) {
    let v0 = this.Reg16[Registers16.HL];
    let value = this.Reg16[register];
    this.HL = v0 + value;
    this.FlagN = false;
    this.FlagH = (v0 & 0xFFF) + (value & 0xFFF) > 0xFFF; //how is this a HALF carry???
    this.FlagC = v0 + value > 0xFFFF;
    this.update(4);
  }

  add8r_(register) {
    let v0 = this.Reg8[Registers8.A];
    let value = this.Reg8[register];
    this.A = v0 + value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) > 0xF;
    this.FlagC = value + v0 > 0xFF;
  }

  add8v_(value) {
    let v0 = this.Reg8[Registers8.A];
    this.A = v0 + value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) > 0xF;
    this.FlagC = value + v0 > 0xFF;
  }

  add16signed8v_(value) {
    //JS numbers in bitwise are 32 bit, so make it negative (if 8 bit negative) in JS
    value = value << 24 >> 24;
    let ogSP = this.Reg16[Registers16.SP];
    this.Reg16[Registers16.SP] += value;
    let test = ogSP ^ value ^ this.Reg16[Registers16.SP];
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
    this.set16(register, this.Reg16[Registers16.SP] + value);
    let test = this.Reg16[Registers16.SP] ^ value ^ this.Reg16[Registers16.HL];
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = (test & 0x10) === 0x10;
    this.FlagC = (test & 0x100) === 0x100;
    this.update(4);
  }

  subr_(register) {
    this.cpr_(register);
    this.A = this.Reg8[Registers8.A] - this.Reg8[register];
  }

  subv_(value) {
    this.cpv_(value);
    this.A = this.Reg8[Registers8.A] - value;
  }

  adcr_(register) {
    let v0 = this.Reg8[Registers8.A];
    let value = this.Reg8[register];
    this.A = v0 + value + this.FlagC;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
    this.FlagC = value + v0 + this.FlagC > 0xFF;
  }

  adcv_(value) {
    let v0 = this.Reg8[Registers8.A];
    this.A = v0 + value + this.FlagC;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
    this.FlagC = value + v0 + this.FlagC > 0xFF;
  }

  sbcr_(register) {
    let value = this.Reg8[register];
    let sum = this.Reg8[Registers8.A] - value - this.FlagC;
    this.FlagH = (this.Reg8[Registers8.A] & 0xF) - (value & 0xF) - this.FlagC < 0
    this.FlagC = sum < 0;
    this.A = sum & 0xFF;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = true;
  }

  sbcv_(value) {
    let sum = this.Reg8[Registers8.A] - value - this.FlagC;
    this.FlagH = (this.Reg8[Registers8.A] & 0xF) - (value & 0xF) - this.FlagC < 0
    this.FlagC = sum < 0;
    this.A = sum & 0xFF;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = true;
  }

  cpr_(register) {
    let a = this.Reg8[Registers8.A];
    let r = this.Reg8[register];
    this.FlagZ = a === r;
    this.FlagN = true;
    this.FlagH = (r & 0xF) > (a & 0xF);
    this.FlagC = r > a;
  }

  cpv_(value) {
    let a = this.Reg8[Registers8.A];
    this.FlagZ = a === value;
    this.FlagN = true;
    this.FlagH = (value & 0xF) > (a & 0xF);
    this.FlagC = value > a;
  }

  ldr8_(register, val, update = false) {
    this.set8(register, val);
    if (update) {
      this.update(4);
    }
  }

  ldr16_(register, val, update = false) {
    this.set16(register, val);
    if (update) {
      this.update(4);
    }
  }

  push_(register) {
    this.Reg16[Registers16.SP] -= 2;
    this.update(4);
    this.GB.M.set(this.Reg16[Registers16.SP], this.Reg16[register], 2);
  }

  pop_(register) {
    this.set16(register, this.GB.M.get(this.Reg16[Registers16.SP], 2));
    this.Reg16[Registers16.SP] += 2;
  }

  jr_(offset) {
    //JS numbers are 32-bit when using bitwise operators
    //GB numbers are 8-bit, and so this happens
    this.Reg16[Registers16.PC] += (offset & 0x80) ? -~(0xFFFFFF00 + offset - 1) : offset;
    this.update(4);
  }

  jp_(addr, update = false) {
    this.Reg16[Registers16.PC] = addr;
    if (update) {
      this.update(4);
    }
  }

  ret_(update = true) {
    if (update) {
      this.update(4);
    }
    this.Reg16[Registers16.PC] = this.GB.M.get(this.Reg16[Registers16.SP], 2);
    this.update(4);
    this.Reg16[Registers16.SP] += 2;
  }

  rlakku_() {
    let v = this.Reg8[Registers8.A];
    let top = (v & 0x80) >>> 7;
    this.A = (v << 1) | (this.FlagC ? 0x01 : 0x00);
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rlcakku_() {
    let v = this.Reg8[Registers8.A];
    let top = (v & 0x80) >>> 7;
    this.A = (v << 1) | top;
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rrakku_() {
    let v = this.Reg8[Registers8.A];
    let bot = v & 0x01;
    this.A = (v >>> 1) | (this.FlagC ? 0x80 : 0x00)
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rrcakku_() {
    let v = this.Reg8[Registers8.A];
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
    if (!this.FlagN) {
      if (this.FlagC || this.Reg8[Registers8.A] > 0x99) {
        this.A = this.Reg8[Registers8.A] + 0x60;
        this.FlagC = true;
      }
      if (this.FlagH || (this.Reg8[Registers8.A] & 0x0F) > 0x09) {
        this.A = this.Reg8[Registers8.A] + 0x06;
      }
    } else {
      if (this.FlagC) {
        this.A = this.Reg8[Registers8.A] - 0x60;
      }
      if (this.FlagH) {
        this.A = this.Reg8[Registers8.A] - 0x06;
      }
    }
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagH = 0;
  }

  rlc_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let top = (v & 0x80) >>> 7;
    if (addr) {
      this.GB.M.set(location, (v << 1) | top);
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (v << 1) | top);
      this.FlagZ = !this.Reg8[location];
    }
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rrc_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let bot = (v & 0x01) << 7;
    if (addr) {
      this.GB.M.set(location, (v >>> 1) | bot);
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (v >>> 1) | bot);
      this.FlagZ = !this.Reg8[location];
    }
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  rl_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let top = (v & 0x80) >>> 7;
    if (addr) {
      this.GB.M.set(location, (v << 1) | (this.FlagC ? 0x01 : 0x00));
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (v << 1) | (this.FlagC ? 0x01 : 0x00));
      this.FlagZ = !this.Reg8[location];
    }
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!top;
  }

  rr_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let bot = v & 0x01;
    if (addr) {
      this.GB.M.set(location, (v >>> 1) | (this.FlagC ? 0x80 : 0x00));
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (v >>> 1) | (this.FlagC ? 0x80 : 0x00));
      this.FlagZ = !this.Reg8[location];
    }
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = !!bot;
  }

  sla_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    this.FlagC = !!(v & 0x80);
    this.FlagN = false;
    this.FlagH = false;
    if (addr) {
      this.GB.M.set(location, v << 1);
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, v << 1);
      this.FlagZ = !this.Reg8[location];
    }
  }

  sra_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let top = v & 0x80;
    this.FlagC = !!(v & 0x01);
    this.FlagN = false;
    this.FlagH = false;
    if (addr) {
      this.GB.M.set(location, (v >> 1 | top));
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (v >> 1 | top));
      this.FlagZ = !this.Reg8[location];
    }
  }

  swap_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    let top = v & 0xF0;
    let bot = v & 0x0F;
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
    if (addr) {
      this.GB.M.set(location, (bot << 4) | (top >>> 4));
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, (bot << 4) | (top >>> 4));
      this.FlagZ = !this.Reg8[location];
    }
  }

  srl_(location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    this.FlagC = !!(v & 0x01);
    this.FlagN = false;
    this.FlagH = false;
    if (addr) {
      this.GB.M.set(location, v >>> 1);
      this.FlagZ = !this.GB.M.get(location, 1, false);
    } else {
      this.set8(location, v >>> 1);
      this.FlagZ = !this.Reg8[location];
    }
  }

  bit_(bit, location, addr) {
    let v = null;
    if (addr) {
      v = this.GB.M.get(location);
    } else {
      v = this.Reg8[location];
    }
    this.FlagZ = !(v & (0x01 << bit));
    this.FlagN = false;
    this.FlagH = true;
  }

  res_(bit, location, addr) {
    if (addr) {
      this.GB.M.set(location, this.GB.M.get(location) & ~(0x01 << bit));
    } else {
      this.set8(location, this.Reg8[location] & ~(0x01 << bit));
    }
  }

  set_(bit, location, addr) {
    if (addr) {
      this.GB.M.set(location, this.GB.M.get(location) | (0x01 << bit));
    } else {
      this.set8(location, this.Reg8[location] | (0x01 << bit));
    }
  }

  /**
   * 8-bit registers are stored redundantly in both their 8 and 16 bit combo forms
   * to eliminate all forms of getters and getting functions to increase performance on the common case (getting).
   * There is also duplicated setting code to reduce the call stack by 1.
   */

  set8(register, val) {
    switch (register) {
      case Registers8.A:
        this.Reg8[Registers8.A] = val;
        this.Reg16[Registers16.AF] = (this.Reg16[Registers16.AF] & 0xFF) | (val << 8);
        break;
      case Registers8.F:
        val = val & 0xF0;
        this.Reg8[Registers8.F] = val;
        this.Reg16[Registers16.AF] = (this.Reg16[Registers16.AF] & 0xFF00) | val;
        break;
      case Registers8.B:
        this.Reg8[Registers8.B] = val;
        this.Reg16[Registers16.BC] = (this.Reg16[Registers16.BC] & 0xFF) | (val << 8);
        break;
      case Registers8.C:
        val = val & 0xFF;
        this.Reg8[Registers8.C] = val;
        this.Reg16[Registers16.BC] = (this.Reg16[Registers16.BC] & 0xFF00) | val;
        break;
      case Registers8.D:
        this.Reg8[Registers8.D] = val;
        this.Reg16[Registers16.DE] = (this.Reg16[Registers16.DE] & 0xFF) | (val << 8);
        break;
      case Registers8.E:
        val = val & 0xFF;
        this.Reg8[Registers8.E] = val;
        this.Reg16[Registers16.DE] = (this.Reg16[Registers16.DE] & 0xFF00) | val;
        break;
      case Registers8.H:
        this.Reg8[Registers8.H] = val;
        this.Reg16[Registers16.HL] = (this.Reg16[Registers16.HL] & 0xFF) | (val << 8);
        break;
      case Registers8.L:
        val = val & 0xFF;
        this.Reg8[Registers8.L] = val;
        this.Reg16[Registers16.HL] = (this.Reg16[Registers16.HL] & 0xFF00) | val;
        break;
    }
  }

  set16(register, val) {
    switch (register) {
      case Registers16.AF:
        val = val & 0xFFF0;
        this.Reg8[Registers8.A] = val >>> 8;
        this.Reg8[Registers8.F] = val;
        this.Reg16[Registers16.AF] = val;
        break;
      case Registers16.BC:
        this.Reg8[Registers8.B] = val >>> 8;
        this.Reg8[Registers8.C] = val;
        this.Reg16[Registers16.BC] = val;
        break;
      case Registers16.DE:
        this.Reg8[Registers8.D] = val >>> 8;
        this.Reg8[Registers8.E] = val;
        this.Reg16[Registers16.DE] = val;
        break;
      case Registers16.HL:
        this.Reg8[Registers8.H] = val >>> 8;
        this.Reg8[Registers8.L] = val;
        this.Reg16[Registers16.HL] = val;
        break;
      case Registers16.PC:
        this.Reg16[Registers16.PC] = val;
        break;
      case Registers16.SP:
        this.Reg16[Registers16.SP] = val;
        break;
    }
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
    val = val & 0xFF;
    this.Reg8[Registers8.C] = val;
    this.Reg16[Registers16.BC] = (this.Reg16[Registers16.BC] & 0xFF00) | val;
  }

  set BC(val) {
    this.Reg8[Registers8.B] = val >>> 8;
    this.Reg8[Registers8.C] = val;
    this.Reg16[Registers16.BC] = val;
  }

  set D(val) {
    this.Reg8[Registers8.D] = val;
    this.Reg16[Registers16.DE] = (this.Reg16[Registers16.DE] & 0xFF) | (val << 8);
  }

  set E(val) {
    val = val & 0xFF;
    this.Reg8[Registers8.E] = val;
    this.Reg16[Registers16.DE] = (this.Reg16[Registers16.DE] & 0xFF00) | val;
  }

  set DE(val) {
    this.Reg8[Registers8.D] = val >>> 8;
    this.Reg8[Registers8.E] = val;
    this.Reg16[Registers16.DE] = val;
  }

  set H(val) {
    this.Reg8[Registers8.H] = val;
    this.Reg16[Registers16.HL] = (this.Reg16[Registers16.HL] & 0xFF) | (val << 8);
  }

  set L(val) {
    val = val & 0xFF;
    this.Reg8[Registers8.L] = val;
    this.Reg16[Registers16.HL] = (this.Reg16[Registers16.HL] & 0xFF00) | val;
  }

  set HL(val) {
    this.Reg8[Registers8.H] = val >>> 8;
    this.Reg8[Registers8.L] = val;
    this.Reg16[Registers16.HL] = val;
  }

  set SP(val) {
    this.Reg16[Registers16.SP] = val;
  }

  set PC(val) {
    this.Reg16[Registers16.PC] = val;
  }

  /**
   * Arbitrary (non-direct register) getters/setters
   */

  get FlagZ() {
    return !!(this.Reg8[Registers8.F] & 0x80);
  }

  set FlagZ(bool) {
    bool ? this.F = this.Reg8[Registers8.F] | 0x80 : this.F = this.Reg8[Registers8.F] & ~0x80;
  }

  get FlagN() {
    return !!(this.Reg8[Registers8.F] & 0x40);
  }

  set FlagN(bool) {
    bool ? this.F = this.Reg8[Registers8.F] | 0x40 : this.F = this.Reg8[Registers8.F] & ~0x40;
  }

  get FlagH() {
    return !!(this.Reg8[Registers8.F] & 0x20);
  }

  set FlagH(bool) {
    bool ? this.F = this.Reg8[Registers8.F] | 0x20 : this.F = this.Reg8[Registers8.F] & ~0x20;
  }

  get FlagC() {
    return !!(this.Reg8[Registers8.F] & 0x10);
  }

  set FlagC(bool) {
    bool ? this.F = this.Reg8[Registers8.F] | 0x10 : this.F = this.Reg8[Registers8.F] & ~0x10;
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
