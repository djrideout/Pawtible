import { Registers as APURegisters } from "../apu";

export class Memory {
  constructor(gameBoy) {
    this.GB = gameBoy;
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
      } else if(offsetAddr >= 0xFF10 && offsetAddr <= 0xFF14) {
        val |= this.GB.APU.Reg[offsetAddr - 0xFF10] << shift;
      } else if(offsetAddr >= 0xFF16 && offsetAddr <= 0xFF1E) {
        val |= this.GB.APU.Reg[offsetAddr - 0xFF10 - 1] << shift;
      } else if(offsetAddr >= 0xFF20 && offsetAddr <= 0xFF26) {
        val |= this.GB.APU.Reg[offsetAddr - 0xFF10 - 2] << shift;
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
      if(offsetAddr <= 0x7FFF) {
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
      } else if(offsetAddr === 0xFF10) {
        this.GB.APU.NR10 = val >> shift;
      } else if(offsetAddr === 0xFF11) {
        this.GB.APU.NR11 = val >> shift;
      } else if(offsetAddr === 0xFF12) {
        this.GB.APU.NR12 = val >> shift;
      } else if(offsetAddr === 0xFF13) {
        this.GB.APU.NR13 = val >> shift;
      } else if(offsetAddr === 0xFF14) {
        this.GB.APU.NR14 = val >> shift;
      } else if(offsetAddr === 0xFF16) {
        this.GB.APU.NR21 = val >> shift;
      } else if(offsetAddr === 0xFF17) {
        this.GB.APU.NR22 = val >> shift;
      } else if(offsetAddr === 0xFF18) {
        this.GB.APU.NR23 = val >> shift;
      } else if(offsetAddr === 0xFF19) {
        this.GB.APU.NR24 = val >> shift;
      } else if(offsetAddr === 0xFF1A) {
        this.GB.APU.NR30 = val >> shift;
      } else if(offsetAddr === 0xFF1B) {
        this.GB.APU.NR31 = val >> shift;
      } else if(offsetAddr === 0xFF1C) {
        this.GB.APU.NR32 = val >> shift;
      } else if(offsetAddr === 0xFF1D) {
        this.GB.APU.NR33 = val >> shift;
      } else if(offsetAddr === 0xFF1E) {
        this.GB.APU.NR34 = val >> shift;
      } else if(offsetAddr === 0xFF20) {
        this.GB.APU.NR41 = val >> shift;
      } else if(offsetAddr === 0xFF21) {
        this.GB.APU.NR42 = val >> shift;
      } else if(offsetAddr === 0xFF22) {
        this.GB.APU.NR43 = val >> shift;
      } else if(offsetAddr === 0xFF23) {
        this.GB.APU.NR44 = val >> shift;
      } else if(offsetAddr === 0xFF24) {
        this.GB.APU.NR50 = val >> shift;
      } else if(offsetAddr === 0xFF25) {
        this.GB.APU.NR51 = val >> shift;
      } else if(offsetAddr === 0xFF26) {
        this.GB.APU.NR52 = val >> shift;
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
