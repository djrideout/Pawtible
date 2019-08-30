import { Memory } from "./memory";
import { CPU } from "./cpu";
import { Cartridge } from "./cart";

export class GameBoy {
  constructor() {
    this.cart_ = new Cartridge();
    this.memoryMap_ = new Memory(this.cart_);
    this.cpu_ = new CPU();
  }

  get M() {
    return this.memoryMap_;
  }

  get CPU() {
    return this.cpu_;
  }

  //Initial state from pan docs: http://bgb.bircd.org/pandocs.htm#cpuregistersandflags
  //Initial I/O registers not done yet
  init() {
    this.CPU.AF = 0x01B0;
    this.CPU.BC = 0x0013;
    this.CPU.DE = 0x00D8;
    this.CPU.HL = 0x014D;
    this.CPU.PC = 0x0100;
    this.CPU.SP = 0xFFFE;
    for(let i = 0x0000; i <= 0xFFFF; i++) {
      this.M.set(i, 0x00);
    }
  }
}
