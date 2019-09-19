export class Memory {
  constructor(gameBoy) {
    this.GB = gameBoy;
    this.mem = new Uint8Array(0x10000);
  }

  get(addr, bytes = 1, update = true) {
    let val = 0;
    for(let i = 0; i < bytes; i++) {
      if(addr + i <= 0x3FFF) {
        val |= this.GB.Cart.rom[addr + i] << (8 * i);
      } else if(addr + i >= 0x4000 && addr + i <= 0x7FFF) {
        val |= this.GB.Cart.rom[addr + i + 0x4000 * (this.GB.Cart.romBankNum - 1)] << (8 * i);
      } else if(addr + i >= 0xE000 && addr + i <= 0xFDFF) { //echo ram
        val |= this.mem[addr + i - 0x2000] << (8 * i);
      } else if(addr + i === 0xFF04) {
        val |= this.GB.Timer.DIV << (8 * i);
      } else if(addr + i === 0xFF05) {
        val |= this.GB.Timer.TIMA << (8 * i);
      } else if(addr + i === 0xFF06) {
        val |= this.GB.Timer.TMA << (8 * i);
      } else if(addr + i === 0xFF07) {
        val |= this.GB.Timer.TAC << (8 * i);
      } else if(addr + i >= 0xFF40 && addr + i <= 0xFF4B) {
        val |= this.GB.PPU.Reg[(addr + i) & 0xF] << (8 * i);
      } else {
        val |= this.mem[addr + i] << (8 * i);
      }
      if(update) {
        this.GB.CPU.update(4);
      }
    }
    return val;
  }

  set(addr, val, bytes = 1, update = true) {
    for(let i = 0; i < bytes; i++) {
      if(addr + i <= 0x7FFF) {
        this.GB.Cart.set(addr + i, val >> (8 * i));
      } else if(addr + i >= 0xE000 && addr + i <= 0xFDFF) { //echo ram
        this.mem[addr + i - 0x2000] = val >> (8 * i);
      } else if(addr + i === 0xFF00) {
        this.mem[addr + i] = (this.mem[addr + i] & 0xCF) | ((val >> (8 * i)) & ~0xCF);
      } else if(addr + i === 0xFF04) {
        this.GB.Timer.DIV = val >> (8 * i);
      } else if(addr + i === 0xFF05) {
        this.GB.Timer.TIMA = val >> (8 * i);
      } else if(addr + i === 0xFF06) {
        this.GB.Timer.TMA = val >> (8 * i);
      } else if(addr + i === 0xFF07) {
        this.GB.Timer.TAC = val >> (8 * i);
      } else if(addr + i === 0xFF40) {
        this.GB.PPU.LCDC = val >> (8 * i);
      } else if(addr + i === 0xFF41) {
        this.GB.PPU.STAT = val >> (8 * i);
      } else if(addr + i === 0xFF42) {
        this.GB.PPU.SCY = val >> (8 * i);
      } else if(addr + i === 0xFF43) {
        this.GB.PPU.SCX = val >> (8 * i);
      } else if(addr + i === 0xFF44) {
        this.GB.PPU.LY = val >> (8 * i);
      } else if(addr + i === 0xFF45) {
        this.GB.PPU.LYC = val >> (8 * i);
      } else if(addr + i === 0xFF46) {
        this.GB.PPU.DMA = val >> (8 * i);
      } else if(addr + i === 0xFF47) {
        this.GB.PPU.BGP = val >> (8 * i);
      } else if(addr + i === 0xFF48) {
        this.GB.PPU.OBP0 = val >> (8 * i);
      } else if(addr + i === 0xFF49) {
        this.GB.PPU.OBP1 = val >> (8 * i);
      } else if(addr + i === 0xFF4A) {
        this.GB.PPU.WY = val >> (8 * i);
      } else if(addr + i === 0xFF4B) {
        this.GB.PPU.WX = val >> (8 * i);
      } else {
        this.mem[addr + i] = val >> (8 * i);
      }
      if(update) {
        this.GB.CPU.update(4);
      }
    }
  }
}
