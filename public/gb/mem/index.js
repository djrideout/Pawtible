import { Masks, Channels } from "../apu.js";

export class Memory {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.reset();
  }

  reset() {
    this.mem = new Uint8Array(0x10000);
  }

  get(addr, bytes = 1, update = true) {
    let val = 0;
    for(let i = 0; i < bytes; i++) {
      let offsetAddr = addr + i;
      let shift = 8 * i;
      if(offsetAddr <= 0x3FFF) {
        val |= this.GB.Cart.rom[offsetAddr] << shift;
      } else if(offsetAddr >= 0x4000 && offsetAddr <= 0x7FFF) {
        val |= this.GB.Cart.rom[offsetAddr + 0x4000 * (this.GB.Cart.romBankNum - 1)] << shift;
      } else if(offsetAddr >= 0xA000 && offsetAddr <= 0xBFFF && this.GB.Cart.ram) {
        val |= this.GB.Cart.get(offsetAddr) << shift;
      } else if(offsetAddr >= 0xE000 && offsetAddr <= 0xFDFF) { //echo ram
        val |= this.mem[offsetAddr - 0x2000] << shift;
      } else if(offsetAddr === 0xFF00) {
        val |= this.GB.Joypad.Regs[this.GB.Joypad.Mode] << shift;
      } else if(offsetAddr === 0xFF04) {
        val |= this.GB.Timer.DIV << shift;
      } else if(offsetAddr === 0xFF05) {
        val |= this.GB.Timer.TIMA << shift;
      } else if(offsetAddr === 0xFF06) {
        val |= this.GB.Timer.TMA << shift;
      } else if(offsetAddr === 0xFF07) {
        val |= this.GB.Timer.TAC << shift;
      } else if(offsetAddr >= 0xFF10 && offsetAddr <= 0xFF26) {
        val |= (this.GB.APU.Reg[offsetAddr - 0xFF10] | Masks[offsetAddr - 0xFF10]) << shift;
      } else if(offsetAddr >= 0xFF27 && offsetAddr <= 0xFF2F) {
        val |= 0xFF; // APU: Unused, always reads 0xFF
      } else if(offsetAddr >= 0xFF30 && offsetAddr <= 0xFF3F) {
        // https://gbdev.gg8.se/wiki/articles/Gameboy_sound_hardware#Obscure_Behavior
        // If the wave channel is enabled, accessing any byte from $FF30-$FF3F
        // is equivalent to accessing the current byte selected by the waveform position.
        // Further, on the DMG accesses will only work in this manner if made
        // within a couple of clocks of the wave channel accessing wave RAM;
        // if made at any other time, reads return $FF and writes have no effect.
        if (this.GB.APU.channels[Channels.WAVE].enabled) {
          val |= this.mem[offsetAddr] << shift;
        } else {
          val |= this.mem[offsetAddr] << shift;
        }
      } else if(offsetAddr >= 0xFF40 && offsetAddr <= 0xFF4B) {
        val |= this.GB.PPU.Reg[offsetAddr & 0xF] << shift;
      } else {
        val |= this.mem[offsetAddr] << shift;
      }
      if(update) {
        this.GB.CPU.update(4);
      }
    }
    return val;
  }

  set(addr, val, bytes = 1, update = true) {
    for(let i = 0; i < bytes; i++) {
      let offsetAddr = addr + i;
      let shift = 8 * i;
      if(offsetAddr <= 0x7FFF || (offsetAddr >= 0xA000 && offsetAddr <= 0xBFFF && this.GB.Cart.ram)) {
        this.GB.Cart.set(offsetAddr, val >> shift);
      } else if(offsetAddr >= 0xE000 && offsetAddr <= 0xFDFF) { //echo ram
        this.mem[offsetAddr - 0x2000] = val >> shift;
      } else if(offsetAddr === 0xFF00) {
        this.GB.Joypad.Reg = val >> shift;
      } else if(offsetAddr === 0xFF04) {
        this.GB.Timer.DIV = val >> shift;
      } else if(offsetAddr === 0xFF05) {
        this.GB.Timer.TIMA = val >> shift;
      } else if(offsetAddr === 0xFF06) {
        this.GB.Timer.TMA = val >> shift;
      } else if(offsetAddr === 0xFF07) {
        this.GB.Timer.TAC = val >> shift;
      } else if(offsetAddr >= 0xFF10 && offsetAddr <= 0xFF26) {
        this.GB.APU.set(offsetAddr - 0xFF10, val >> shift);
      } else if(offsetAddr === 0xFF40) {
        this.GB.PPU.LCDC = val >> shift;
      } else if(offsetAddr === 0xFF41) {
        this.GB.PPU.STAT = val >> shift;
      } else if(offsetAddr === 0xFF42) {
        this.GB.PPU.SCY = val >> shift;
      } else if(offsetAddr === 0xFF43) {
        this.GB.PPU.SCX = val >> shift;
      } else if(offsetAddr === 0xFF44) {
        this.GB.PPU.LY = val >> shift;
      } else if(offsetAddr === 0xFF45) {
        this.GB.PPU.LYC = val >> shift;
      } else if(offsetAddr === 0xFF46) {
        this.GB.PPU.DMA = val >> shift;
      } else if(offsetAddr === 0xFF47) {
        this.GB.PPU.BGP = val >> shift;
      } else if(offsetAddr === 0xFF48) {
        this.GB.PPU.OBP0 = val >> shift;
      } else if(offsetAddr === 0xFF49) {
        this.GB.PPU.OBP1 = val >> shift;
      } else if(offsetAddr === 0xFF4A) {
        this.GB.PPU.WY = val >> shift;
      } else if(offsetAddr === 0xFF4B) {
        this.GB.PPU.WX = val >> shift;
      } else {
        this.mem[offsetAddr] = val >> shift;
      }
      if(update) {
        this.GB.CPU.update(4);
      }
    }
  }
}
