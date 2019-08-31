import { MemoryBlock } from "./block";

export const Blocks = {
  CART: "cart",
  VRAM: "vram",
  EXTRAM: "extram",
  WORKRAM: "workram",
  ECHORAM: "echoram",
  OAM: "oam",
  TRASH: "trash",
  IOREG: "ioreg",
  HRAM: "hram",
  INTERRUPT: "interrupt"
};

export const StartAddrs = {
  [Blocks.CART]: 0x0000,
  [Blocks.VRAM]: 0x8000,
  [Blocks.EXTRAM]: 0xA000,
  [Blocks.WORKRAM]: 0xC000,
  [Blocks.ECHORAM]: 0xE000,
  [Blocks.OAM]: 0xFE00,
  [Blocks.TRASH]: 0xFEA0,
  [Blocks.IOREG]: 0xFF00,
  [Blocks.HRAM]: 0xFF80,
  [Blocks.INTERRUPT]: 0xFFFF
};

export class Memory {
  constructor() {
    let work = null;
    this.blocks_ = [
      new MemoryBlock(Blocks.CART, 0x8000),
      new MemoryBlock(Blocks.VRAM, 0x2000),
      new MemoryBlock(Blocks.EXTRAM, 0x2000),
      work = new MemoryBlock(Blocks.WORKRAM, 0x2000),
      work.echo(Blocks.ECHORAM, 0x1E00),
      new MemoryBlock(Blocks.OAM, 0x00A0),
      new MemoryBlock(Blocks.TRASH, 0x0060),
      new MemoryBlock(Blocks.IOREG, 0x0080),
      new MemoryBlock(Blocks.HRAM, 0x007F),
      new MemoryBlock(Blocks.INTERRUPT, 0x0001)
    ];
  }

  get Blocks() {
    return this.blocks_;
  }

  get Cart() {
    return this.Blocks[0];
  }

  get VRAM() {
    return this.Blocks[1];
  }

  get ExtRAM() {
    return this.Blocks[2];
  }

  get WorkRAM() {
    return this.Blocks[3];
  }

  get EchoRAM() {
    return this.Blocks[4];
  }

  get OAM() {
    return this.Blocks[5];
  }

  get Trash() {
    return this.Blocks[6];
  }

  get IOREG() {
    return this.Blocks[7];
  }

  get HighRAM() {
    return this.Blocks[8];
  }

  get Interrupt() {
    return this.Blocks[9];
  }

  get length() {
    let total = 0;
    for(let i = 0; i < this.Blocks.length; i++) {
      total += this.Blocks[i].length;
    }
    return total;
  }

  get(addr) {
    for(let i = 0; i < this.Blocks.length; i++) {
      let b = this.Blocks[i];
      if(addr >= StartAddrs[b.key] && addr < StartAddrs[b.key] + b.length) {
        return b.get(addr - StartAddrs[b.key]);
      }
    }
  }

  set(addr, val) {
    for(let i = 0; i < this.Blocks.length; i++) {
      let b = this.Blocks[i];
      if(addr >= StartAddrs[b.key] && addr < StartAddrs[b.key] + b.length) {
        b.set(addr - StartAddrs[b.key], val);
      }
    }
  }
}
