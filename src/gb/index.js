import { Memory } from "./mem";
import { CartridgeFactory } from "./mem/block/cart/factory";
import { CPU } from "./cpu";
import { PPU } from "./ppu";
import { Timer } from "./timer";

export class GameBoy {
  constructor() {
    this.memoryMap_ = new Memory(this);
    this.cpu_ = new CPU(this);
    this.ppu_ = new PPU(this);
    this.timer_ = new Timer(this);
    this.reset();
  }

  get M() {
    return this.memoryMap_;
  }

  get CPU() {
    return this.cpu_;
  }

  get PPU() {
    return this.ppu_;
  }

  get Timer() {
    return this.timer_;
  }

  load(byteArr) {
    this.M.Cart = CartridgeFactory.create(byteArr);
  }

  //Initial state from pan docs: http://bgb.bircd.org/pandocs.htm#cpuregistersandflags
  reset() {
    this.CPU.reset();
    this.PPU.reset();
    this.Timer.reset();
    this.M.Interrupt.reset();
    this.M.IOReg.reset();
    //rest of these are sound
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
