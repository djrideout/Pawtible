import { MemoryBlock } from "./block";
import { Interrupt } from "./interrupt";

export class Memory {
  constructor() {
    let cart = new MemoryBlock(0x0000, 0x8000);
    let vram = new MemoryBlock(0x8000, 0x2000);
    let extram = new MemoryBlock(0xA000, 0x2000);
    let workram = new MemoryBlock(0xC000, 0x2000);
    let echoram = workram.echo(0xE000, 0x1E00);
    let oam = new MemoryBlock(0xFE00, 0x00A0);
    let trash = new MemoryBlock(0xFEA0, 0x0060);
    let ioreg = new MemoryBlock(0xFF00, 0x0080);
    let hram = new MemoryBlock(0xFF80, 0x007F);
    let interrupt = new Interrupt(0xFFFF);
    this.blocks_ = [cart, vram, extram, workram, echoram, oam, trash, ioreg, hram, interrupt];
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

  get IOReg() {
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
      if(addr >= b.start && addr < b.start + b.length) {
        return b.get(addr - b.start);
      }
    }
  }

  set(addr, val) {
    for(let i = 0; i < this.Blocks.length; i++) {
      let b = this.Blocks[i];
      if(addr >= b.start && addr < b.start + b.length) {
        b.set(addr - b.start, val);
      }
    }
  }
}
