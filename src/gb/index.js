import { Memory } from "./mem";
import { CartridgeFactory } from "./mem/block/cart/factory";
import { CPU } from "./cpu";
import { PPU } from "./ppu";
import { Timer } from "./timer";
import { Joypad } from "./joypad";
import { APU, Registers } from "./apu";
import { Cartridge, Types } from "./mem/block/cart";

export const RTCModes = {
  SYSTEM: "Sync RTC to system clock",
  CYCLE:  "Cycle-accurate RTC"
};

export class GameBoy {
  constructor() {
    this.Cart = new Cartridge();
    this.M = new Memory(this);
    this.CPU = new CPU(this);
    this.PPU = new PPU(this);
    this.Timer = new Timer(this);
    this.Joypad = new Joypad(this);
    this.APU = new APU(this);
    this.setRTCMode(RTCModes.SYSTEM);
    this.reset();
  }

  setRTCMode(mode) {
    this.rtcMode = mode;
  }

  load(byteArr) {
    let cart = CartridgeFactory.create(byteArr, this);
    if (cart.constructor.name === "Cartridge" && cart.type !== Types.ROM) {
      alert(`Unsupported cartridge type ${cart.type}`);
      return;
    }
    this.reset();
    this.Cart = cart;
  }

  loadSRAM(byteArr) {
    if (this.Cart.loadSRAM) {
      this.Cart.loadSRAM(byteArr);
      this.reset();
    }
  }

  saveSRAM() {
    if (this.Cart.saveSRAM) {
      return this.Cart.saveSRAM();
    } else {
      return null;
    }
  }

  //Initial state from pan docs: http://bgb.bircd.org/pandocs.htm#cpuregistersandflags
  reset() {
    this.CPU.reset();
    this.PPU.reset();
    this.APU.reset();
    this.Timer.reset();
    this.Cart.reset();
    this.M.reset();
    //interrupt
    this.M.set(0xFFFF, 0x00, 1, false);
    //io
    this.M.mem[0xFF00] = 0xCF; //some of the read only bits needs to be modified here
    //sound
    this.APU.Reg[Registers.NR10] = 0x80;
    this.APU.Reg[Registers.NR11] = 0xBF;
    this.APU.Reg[Registers.NR12] = 0xF3;
    this.APU.Reg[Registers.NR14] = 0xBF;
    this.APU.Reg[Registers.NR21] = 0x3F;
    this.APU.Reg[Registers.NR22] = 0x00;
    this.APU.Reg[Registers.NR24] = 0xBF;
    this.APU.Reg[Registers.NR30] = 0x7F;
    this.APU.Reg[Registers.NR31] = 0xFF;
    this.APU.Reg[Registers.NR32] = 0x9F;
    this.APU.Reg[Registers.NR34] = 0xBF;
    this.APU.Reg[Registers.NR41] = 0xFF;
    this.APU.Reg[Registers.NR42] = 0x00;
    this.APU.Reg[Registers.NR43] = 0x00;
    this.APU.Reg[Registers.NR44] = 0xBF;
    this.APU.Reg[Registers.NR50] = 0x77;
    this.APU.Reg[Registers.NR51] = 0xF3;
    this.APU.Reg[Registers.NR52] = 0xF1;
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
