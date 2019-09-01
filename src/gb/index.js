import { Memory } from "./mem";
import { CPU } from "./cpu";

export class GameBoy {
  constructor() {
    this.memoryMap_ = new Memory();
    this.cpu_ = new CPU();
    this.reset();
  }

  loadROM(byteArr) {
    console.log(byteArr);
  }

  get M() {
    return this.memoryMap_;
  }

  get CPU() {
    return this.cpu_;
  }

  //Initial state from pan docs: http://bgb.bircd.org/pandocs.htm#cpuregistersandflags
  reset() {
    this.CPU.AF = 0x01B0;
    this.CPU.BC = 0x0013;
    this.CPU.DE = 0x00D8;
    this.CPU.HL = 0x014D;
    this.CPU.PC = 0x0100;
    this.CPU.SP = 0xFFFE;
    this.M.IOReg.set(0x0005, 0x00);
    this.M.IOReg.set(0x0006, 0x00);
    this.M.IOReg.set(0x0007, 0x00);
    this.M.IOReg.set(0x0010, 0x80);
    this.M.IOReg.set(0x0011, 0xBF);
    this.M.IOReg.set(0x0012, 0xF3);
    this.M.IOReg.set(0x0014, 0xBF);
    this.M.IOReg.set(0x0016, 0x3F);
    this.M.IOReg.set(0x0017, 0x00);
    this.M.IOReg.set(0x0019, 0xBF);
    this.M.IOReg.set(0x001A, 0x7F);
    this.M.IOReg.set(0x001B, 0xFF);
    this.M.IOReg.set(0x001C, 0x9F);
    this.M.IOReg.set(0x001E, 0xBF);
    this.M.IOReg.set(0x0020, 0xFF);
    this.M.IOReg.set(0x0021, 0x00);
    this.M.IOReg.set(0x0022, 0x00);
    this.M.IOReg.set(0x0023, 0xBF);
    this.M.IOReg.set(0x0024, 0x77);
    this.M.IOReg.set(0x0025, 0xF3);
    this.M.IOReg.set(0x0026, 0xF1);
    this.M.IOReg.set(0x0040, 0x91);
    this.M.IOReg.set(0x0042, 0x00);
    this.M.IOReg.set(0x0043, 0x00);
    this.M.IOReg.set(0x0045, 0x00);
    this.M.IOReg.set(0x0047, 0xFC);
    this.M.IOReg.set(0x0048, 0xFF);
    this.M.IOReg.set(0x0049, 0xFF);
    this.M.IOReg.set(0x004A, 0x00);
    this.M.IOReg.set(0x004B, 0x00);
    this.M.Interrupt.Value = 0x00;
  }

  time() {
    let t0 = performance.now();
    for(let i = 0; i < 100; i++) {
      this.reset();
    }
    let t1 = performance.now();
    console.log(t1 - t0);
  }
}
