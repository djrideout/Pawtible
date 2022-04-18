import { isLittleEndian } from "./utils.js";

let tempReg8 = {};
if (isLittleEndian()) {
  tempReg8 = {
    A: 1,
    F: 0,
    B: 3,
    C: 2,
    D: 5,
    E: 4,
    H: 7,
    L: 6
  };
} else {
  tempReg8 = {
    A: 0,
    F: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    H: 6,
    L: 7
  };
}
export const Registers8 = tempReg8;

export const Registers16 = {
  AF: 0,
  BC: 1,
  DE: 2,
  HL: 3,
  SP: 4,
  PC: 5
};

const Reg16Masks = new Uint16Array([0xFFF0, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF]);
const Reg8Masks = new Uint8Array(Reg16Masks.buffer);

export const Flags = {
  Z: "Z",
  N: "N",
  H: "H",
  C: "C"
};

export const CPU_FREQUENCY = 0x400000;
const CYCLES_PER_FRAME = Math.floor(CPU_FREQUENCY / 60);

export class CPU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.paused_ = true;
    this.breakpoints_ = new Map();
    this.reset();
  }

  reset() {
    this.halted_ = false;
    this.FlagIME = false;
    this.count_ = 0;
    this.Reg16 = new Uint16Array(6);
    this.Reg8 = new Uint8Array(this.Reg16.buffer);
    this.Reg16[Registers16.PC] = 0x0100;
    this.Reg16[Registers16.SP] = 0xFFFE;
    this.Reg16[Registers16.AF] = 0x01B0;
    this.Reg16[Registers16.BC] = 0x0013;
    this.Reg16[Registers16.DE] = 0x00D8;
    this.Reg16[Registers16.HL] = 0x014D;
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
    if (this.GB.Cart.step) {
      this.GB.Cart.step(cycles);
    }
  }

  step() {
    //RUN INSTRUCTION START
    let cbInst = false;
    if (this.halted_) {
      this.update(4);
    } else {
      // https://gb-archive.github.io/salvage/decoding_gbz80_opcodes/Decoding%20Gamboy%20Z80%20Opcodes.html
      let pc = this.Reg16[Registers16.PC]++;
      let op = this.GB.M.get(pc);
      let x = (op >>> 6) & 0b11;
      let y = (op >>> 3) & 0b111;
      let z = op & 0b111;
      let p = y >>> 1;
      let q = y & 1;
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
      let location = r[z];
      let v = null;
      let mask = addr ? 0xFF : Reg8Masks[location];
      let new_val = null;
      if (x === 0) {
        let rp = [
          Registers16.BC,
          Registers16.DE,
          Registers16.HL,
          Registers16.SP
        ];
        let reg = rp[p];
        let dest = r[y];
        let dest_addr = y === 6;
        let dest_mask = dest_addr ? 0xFF : Reg8Masks[dest];
        if (z === 0) {
          // Relative jumps and assorted ops
          if (y === 0) {
            // NOP
          } else if (y === 1) {
            this.GB.M.set(this.GB.M.get(this.Reg16[Registers16.PC], 2), this.Reg16[Registers16.SP], 2);
            this.Reg16[Registers16.PC] += 2;
          } else if (y === 2) {
            //Let's just say stop is halt for now.
            //this.halted_ = true;
          } else {
            // Relative jumps
            let conditions = [
              !this.FlagZ,
              this.FlagZ,
              !this.FlagC,
              this.FlagC
            ];
            let condition = y - 4 >= 0 ? conditions[y - 4] : true;
            if (condition) {
              let offset = this.GB.M.get(this.Reg16[Registers16.PC]++);
              //JS numbers are 32-bit when using bitwise operators
              //GB numbers are 8-bit, and so this happens
              this.Reg16[Registers16.PC] += (offset & 0x80) ? -~(0xFFFFFF00 + offset - 1) : offset;
            } else {
              this.Reg16[Registers16.PC]++;
            }
            this.update(4);
          }
        } else if (z === 1) {
          // 16-bit load immediate/add
          if (q === 0) {
            this.Reg16[reg] = this.GB.M.get(this.Reg16[Registers16.PC], 2) & Reg16Masks[reg];
            this.Reg16[Registers16.PC] += 2;
          } else {
            let v0 = this.Reg16[Registers16.HL];
            let value = this.Reg16[reg];
            this.Reg16[Registers16.HL] = v0 + value;
            this.FlagN = false;
            this.FlagH = (v0 & 0xFFF) + (value & 0xFFF) > 0xFFF; //how is this a HALF carry???
            this.FlagC = v0 + value > 0xFFFF;
            this.update(4);
          }
        } else if (z === 2) {
          // Indirect loading
          let r16 = p === 3 ? Registers16.HL : reg;
          if (q === 0) {
            // LD addr
            this.GB.M.set(this.Reg16[r16], this.Reg8[Registers8.A]);
          } else {
            // LD A
            this.Reg8[Registers8.A] = this.GB.M.get(this.Reg16[r16]);
          }
          if (p === 2) {
            this.Reg16[r16]++;
          } else if (p === 3) {
            this.Reg16[r16]--;
          }
        } else if (z === 3) {
          // 16-bit INC/DEC
          if (q === 0) {
            this.Reg16[reg] = (this.Reg16[reg] + 1) & Reg16Masks[reg];
          } else {
            this.Reg16[reg] = (this.Reg16[reg] - 1) & Reg16Masks[reg];
          }
          this.update(4);
        } else if (z === 4) {
          // 8-bit INC
          let v0 = dest_addr ? this.GB.M.get(dest) : this.Reg8[dest];
          if (dest_addr) {
            this.GB.M.set(dest, v0 + 1);
          } else {
            this.Reg8[dest] = (v0 + 1) & dest_mask;
          }
          let v1 = dest_addr ? this.GB.M.get(dest, 1, false) : this.Reg8[dest];
          this.FlagZ = !v1;
          this.FlagN = false;
          this.FlagH = (v0 & 0xF) + 1 > 0xF;
        } else if (z === 5) {
          // 8-bit DEC
          let v0 = dest_addr ? this.GB.M.get(dest) : this.Reg8[dest];
          if (dest_addr) {
            this.GB.M.set(dest, v0 - 1);
          } else {
            this.Reg8[dest] = (v0 - 1) & dest_mask;
          }
          let v1 = dest_addr ? this.GB.M.get(dest, 1, false) : this.Reg8[dest];
          this.FlagZ = !v1;
          this.FlagN = true;
          this.FlagH = (v1 & 0xF) > (v0 & 0xF);
        } else if (z === 6) {
          // 8-bit load immediate
          let val = this.GB.M.get(this.Reg16[Registers16.PC]++);
          if (dest_addr) {
            this.GB.M.set(dest, val);
          } else {
            this.Reg8[dest] = val & dest_mask;
          }
        } else if (z === 7) {
          // Assorted operations on accumulator/flags
          if (y === 0) {
            // RLCA
            let v = this.Reg8[Registers8.A];
            let top = (v & 0x80) >>> 7;
            this.Reg8[Registers8.A] = (v << 1) | top;
            this.FlagZ = false;
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC = !!top;
          } else if (y === 1) {
            // RRCA
            let v = this.Reg8[Registers8.A];
            let bot = (v & 0x01) << 7;
            this.Reg8[Registers8.A] = (v >>> 1) | bot;
            this.FlagZ = false;
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC = !!bot;
          } else if (y === 2) {
            // RLA
            let v = this.Reg8[Registers8.A];
            let top = (v & 0x80) >>> 7;
            this.Reg8[Registers8.A] = (v << 1) | (this.FlagC ? 0x01 : 0x00);
            this.FlagZ = false;
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC = !!top;
          } else if (y === 3) {
            // RRA
            let v = this.Reg8[Registers8.A];
            let bot = v & 0x01;
            this.Reg8[Registers8.A] = (v >>> 1) | (this.FlagC ? 0x80 : 0x00)
            this.FlagZ = false;
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC = !!bot;
          } else if (y === 4) {
            // DAA
            //Very good explanation here:
            //https://forums.nesdev.com/viewtopic.php?f=20&t=15944#p196282
            if (!this.FlagN) {
              if (this.FlagC || this.Reg8[Registers8.A] > 0x99) {
                this.Reg8[Registers8.A] = this.Reg8[Registers8.A] + 0x60;
                this.FlagC = true;
              }
              if (this.FlagH || (this.Reg8[Registers8.A] & 0x0F) > 0x09) {
                this.Reg8[Registers8.A] = this.Reg8[Registers8.A] + 0x06;
              }
            } else {
              if (this.FlagC) {
                this.Reg8[Registers8.A] = this.Reg8[Registers8.A] - 0x60;
              }
              if (this.FlagH) {
                this.Reg8[Registers8.A] = this.Reg8[Registers8.A] - 0x06;
              }
            }
            this.FlagZ = !this.Reg8[Registers8.A];
            this.FlagH = 0;
          } else if (y === 5) {
            // CPL
            this.FlagN = true;
            this.FlagH = true;
            this.Reg8[Registers8.A] = this.Reg8[Registers8.A] ^ 0xFF;
          } else if (y === 6) {
            // SCF
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC = true;
          } else if (y === 7) {
            // CCF
            this.FlagN = false;
            this.FlagH = false;
            this.FlagC ^= true;
          }
        }
      } else if (x === 1) {
        // 8-bit loading
        v = addr ? this.GB.M.get(location) : this.Reg8[location]; // In here temporarily for refactor due to extra updates if not
        if (z === 6 && y === 6) {
          this.halted_ = true;
        } else {
          let dest = r[y];
          let dest_addr = y === 6;
          let dest_mask = dest_addr ? 0xFF : Reg8Masks[dest];
          if (dest_addr) {
            this.GB.M.set(dest, v & dest_mask);
          } else {
            this.Reg8[dest] = v & dest_mask;
          }
        }
      } else if (x === 2) {
        let v0 = this.Reg8[Registers8.A];
        v = addr ? this.GB.M.get(location) : this.Reg8[location]; // In here temporarily for refactor due to extra updates if not
        // Operate on accumulator and register/memory location
        if (y === 0) {
          // ADD
          this.Reg8[Registers8.A] = v0 + v;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = false;
          this.FlagH = (v & 0xF) + (v0 & 0xF) > 0xF;
          this.FlagC = v + v0 > 0xFF;
        } else if (y === 1) {
          // ADC
          this.Reg8[Registers8.A] = v0 + v + this.FlagC;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = false;
          this.FlagH = (v & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
          this.FlagC = v + v0 + this.FlagC > 0xFF;
        } else if (y === 2) {
          // SUB
          this.FlagZ = v0 === v;
          this.FlagN = true;
          this.FlagH = (v & 0xF) > (v0 & 0xF);
          this.FlagC = v > v0;
          this.Reg8[Registers8.A] = v0 - v;
        } else if (y === 3) {
          // SBC
          let sum = v0 - v - this.FlagC;
          this.FlagH = (v0 & 0xF) - (v & 0xF) - this.FlagC < 0
          this.FlagC = sum < 0;
          this.Reg8[Registers8.A] = sum & 0xFF;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = true;
        } else if (y === 4) {
          // AND
          this.Reg8[Registers8.A] = v0 & v;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = false;
          this.FlagH = true;
          this.FlagC = false;
        } else if (y === 5) {
          // XOR
          this.Reg8[Registers8.A] = v0 ^ v;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = false;
          this.FlagH = false;
          this.FlagC = false;
        } else if (y === 6) {
          // OR
          this.Reg8[Registers8.A] = v0 | v;
          this.FlagZ = !this.Reg8[Registers8.A];
          this.FlagN = false;
          this.FlagH = false;
          this.FlagC = false;
        } else if (y === 7) {
          // CP
          this.FlagZ = v0 === v;
          this.FlagN = true;
          this.FlagH = (v & 0xF) > (v0 & 0xF);
          this.FlagC = v > v0;
        }
      } else {
        switch (op) {
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
            throw Error(`Unimplemented opcode 0x${op.toString(16).toUpperCase().padStart(2, "0")} at 0x${pc.toString(16).toUpperCase().padStart(4, "0")}`);
        }
        if (cbInst) {
          op = this.GB.M.get(this.Reg16[Registers16.PC]++);
          x = (op >>> 6) & 0b11;
          y = (op >>> 3) & 0b111;
          z = op & 0b111;
          addr = z === 6;
          r = [
            Registers8.B,
            Registers8.C,
            Registers8.D,
            Registers8.E,
            Registers8.H,
            Registers8.L,
            this.Reg16[Registers16.HL],
            Registers8.A
          ];
          location = r[z];
          v = addr ? this.GB.M.get(location) : this.Reg8[location];
          mask = addr ? 0xFF : Reg8Masks[location];
          new_val = null;
          if (x === 0) {
            // Rotation/shift operations
            let carry = null;
            if (y === 0) {
              // RLC
              let top = (v & 0x80) >>> 7;
              new_val = ((v << 1) | top) & mask;
              carry = !!top;
            } else if (y === 1) {
              // RRC
              let bot = (v & 0x01) << 7;
              new_val = ((v >>> 1) | bot) & mask;
              carry = !!bot;
            } else if (y === 2) {
              // RL
              let top = (v & 0x80) >>> 7;
              new_val = ((v << 1) | (this.FlagC ? 0x01 : 0x00)) & mask;
              carry = !!top;
            } else if (y === 3) {
              // RR
              let bot = v & 0x01;
              new_val = ((v >>> 1) | (this.FlagC ? 0x80 : 0x00)) & mask;
              carry = !!bot;
            } else if (y === 4) {
              // SLA
              carry = !!(v & 0x80);
              new_val = (v << 1) & mask;
            } else if (y === 5) {
              // SRA
              let top = v & 0x80;
              carry = !!(v & 0x01);
              new_val = (v >> 1 | top) & mask;
            } else if (y === 6) {
              // SWAP
              let top = v & 0xF0;
              let bot = v & 0x0F;
              carry = false;
              new_val = ((bot << 4) | (top >>> 4)) & mask;
            } else if (y === 7) {
              // SRL
              carry = !!(v & 0x01);
              new_val = (v >>> 1) & mask;
            }
            this.FlagN = false;
            this.FlagH = false;
            this.FlagZ = !new_val;
            this.FlagC = carry;
          } else if (x === 1) {
            // Test bit
            this.FlagZ = !(v & (0x01 << y));
            this.FlagN = false;
            this.FlagH = true;
          } else if (x === 2) {
            // Reset bit
            new_val = (v & ~(0x01 << y)) & mask;
          } else if (x === 3) {
            // Set bit
            new_val = (v | (0x01 << y)) & mask;
          }
          if (new_val !== null) {
            if (addr) {
              this.GB.M.set(location, new_val);
            } else {
              this.Reg8[location] = new_val;
            }
          }
        }
      }
    }
    //RUN INSTRUCTION END

    //INTERRUPTS START
    //If several interrupts are requested at once, the interrupt of the lowest bit takes priority.
    if (this.FlagVBlankRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagVBlankEnable) {
        this.update(4);
        this.FlagVBlankRequest = false;
        this.FlagIME = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0040;
      }
    } else if (this.FlagLCDSTATRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagLCDSTATEnable) {
        this.update(4);
        this.FlagLCDSTATRequest = false;
        this.FlagIME = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0048;
      }
    } else if (this.FlagTimerRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagTimerEnable) {
        this.update(4);
        this.FlagTimerRequest = false;
        this.FlagIME = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0050;
      }
    } else if (this.FlagSerialRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagSerialEnable) {
        this.update(4);
        this.FlagSerialRequest = false;
        this.FlagIME = false;
        this.push_(Registers16.PC);
        this.update(4);
        this.Reg16[Registers16.PC] = 0x0058;
      }
    } else if (this.FlagJoypadRequest) {
      this.halted_ = false;
      if (this.FlagIME && this.FlagJoypadEnable) {
        this.update(4);
        this.FlagJoypadRequest = false;
        this.FlagIME = false;
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

  andv_(value) {
    this.Reg8[Registers8.A] = this.Reg8[Registers8.A] & value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = true;
    this.FlagC = false;
  }

  orv_(value) {
    this.Reg8[Registers8.A] = this.Reg8[Registers8.A] | value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  xorv_(value) {
    this.Reg8[Registers8.A] = this.Reg8[Registers8.A] ^ value;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = false;
    this.FlagC = false;
  }

  add8v_(value) {
    let v0 = this.Reg8[Registers8.A];
    this.Reg8[Registers8.A] = v0 + value;
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
    this.Reg16[register] = (this.Reg16[Registers16.SP] + value) & Reg16Masks[register];
    let test = this.Reg16[Registers16.SP] ^ value ^ this.Reg16[Registers16.HL];
    this.FlagZ = false;
    this.FlagN = false;
    this.FlagH = (test & 0x10) === 0x10;
    this.FlagC = (test & 0x100) === 0x100;
    this.update(4);
  }

  subv_(value) {
    this.cpv_(value);
    this.Reg8[Registers8.A] = this.Reg8[Registers8.A] - value;
  }

  adcv_(value) {
    let v0 = this.Reg8[Registers8.A];
    this.Reg8[Registers8.A] = v0 + value + this.FlagC;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = false;
    this.FlagH = (value & 0xF) + (v0 & 0xF) + (this.FlagC & 0xF) > 0xF;
    this.FlagC = value + v0 + this.FlagC > 0xFF;
  }

  sbcv_(value) {
    let sum = this.Reg8[Registers8.A] - value - this.FlagC;
    this.FlagH = (this.Reg8[Registers8.A] & 0xF) - (value & 0xF) - this.FlagC < 0
    this.FlagC = sum < 0;
    this.Reg8[Registers8.A] = sum & 0xFF;
    this.FlagZ = !this.Reg8[Registers8.A];
    this.FlagN = true;
  }

  cpv_(value) {
    let a = this.Reg8[Registers8.A];
    this.FlagZ = a === value;
    this.FlagN = true;
    this.FlagH = (value & 0xF) > (a & 0xF);
    this.FlagC = value > a;
  }

  ldr8_(register, val, update = false) {
    this.Reg8[register] = val & Reg8Masks[register];
    if (update) {
      this.update(4);
    }
  }

  ldr16_(register, val, update = false) {
    this.Reg16[register] = val & Reg16Masks[register];
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
    this.Reg16[register] = this.GB.M.get(this.Reg16[Registers16.SP], 2) & Reg16Masks[register];
    this.Reg16[Registers16.SP] += 2;
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

  /**
   * Arbitrary (non-direct register) getters/setters
   */

  get FlagZ() {
    return !!(this.Reg8[Registers8.F] & 0x80);
  }

  set FlagZ(bool) {
    bool ? this.Reg8[Registers8.F] = this.Reg8[Registers8.F] | 0x80 : this.Reg8[Registers8.F] = this.Reg8[Registers8.F] & ~0x80;
  }

  get FlagN() {
    return !!(this.Reg8[Registers8.F] & 0x40);
  }

  set FlagN(bool) {
    bool ? this.Reg8[Registers8.F] = this.Reg8[Registers8.F] | 0x40 : this.Reg8[Registers8.F] = this.Reg8[Registers8.F] & ~0x40;
  }

  get FlagH() {
    return !!(this.Reg8[Registers8.F] & 0x20);
  }

  set FlagH(bool) {
    bool ? this.Reg8[Registers8.F] = this.Reg8[Registers8.F] | 0x20 : this.Reg8[Registers8.F] = this.Reg8[Registers8.F] & ~0x20;
  }

  get FlagC() {
    return !!(this.Reg8[Registers8.F] & 0x10);
  }

  set FlagC(bool) {
    bool ? this.Reg8[Registers8.F] = this.Reg8[Registers8.F] | 0x10 : this.Reg8[Registers8.F] = this.Reg8[Registers8.F] & ~0x10;
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
