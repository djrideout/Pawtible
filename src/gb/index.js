import { Memory } from "./mem";
import { CartridgeFactory } from "./mem/block/cart/factory";
import { CPU } from "./cpu";
import { PPU } from "./ppu";
import { Timer } from "./timer";
import { Cartridge } from "./mem/block/cart";

export class GameBoy {
  constructor() {
    this.Cart = new Cartridge();
    this.M = new Memory(this);
    this.CPU = new CPU(this);
    this.PPU = new PPU(this);
    this.Timer = new Timer(this);
    this.reset();
  }

  load(byteArr) {
    this.Cart = CartridgeFactory.create(byteArr);
  }

  //Initial state from pan docs: http://bgb.bircd.org/pandocs.htm#cpuregistersandflags
  reset() {
    this.CPU.reset();
    this.PPU.reset();
    this.Timer.reset();
    //interrupt
    this.M.set(0xFFFF, 0x00, 1, false);
    //io
    this.M.mem[0xFF00] = 0xCF; //some of the read only bits needs to be modified here
    //sound
    this.M.set(0xFF10, 0x80, 1, false);
    this.M.set(0xFF11, 0xBF, 1, false);
    this.M.set(0xFF12, 0xF3, 1, false);
    this.M.set(0xFF14, 0xBF, 1, false);
    this.M.set(0xFF16, 0x3F, 1, false);
    this.M.set(0xFF17, 0x00, 1, false);
    this.M.set(0xFF19, 0xBF, 1, false);
    this.M.set(0xFF1A, 0x7F, 1, false);
    this.M.set(0xFF1B, 0xFF, 1, false);
    this.M.set(0xFF1C, 0x9F, 1, false);
    this.M.set(0xFF1E, 0xBF, 1, false);
    this.M.set(0xFF20, 0xFF, 1, false);
    this.M.set(0xFF21, 0x00, 1, false);
    this.M.set(0xFF22, 0x00, 1, false);
    this.M.set(0xFF23, 0xBF, 1, false);
    this.M.set(0xFF24, 0x77, 1, false);
    this.M.set(0xFF25, 0xF3, 1, false);
    this.M.set(0xFF26, 0xF1, 1, false);
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
