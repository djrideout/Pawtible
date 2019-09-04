import { MemoryBlock } from "./block";
import { Interrupt } from "./block/interrupt";
import { IORegisters } from "./block/io";

export class Memory {
  constructor(gameBoy) {
    this.Cart = new MemoryBlock(0x0000, 0x8000);
    this.VRAM = new MemoryBlock(0x8000, 0x2000);
    this.ExtRAM = new MemoryBlock(0xA000, 0x2000); //supposed to be part of cartridge, will implement later
    this.WorkRAM = new MemoryBlock(0xC000, 0x2000);
    this.EchoRAM = this.WorkRAM.echo(0xE000, 0x1E00);
    this.OAM = new MemoryBlock(0xFE00, 0x00A0);
    this.Trash = new MemoryBlock(0xFEA0, 0x0060);
    this.IOReg = new IORegisters(gameBoy);
    this.HighRAM = new MemoryBlock(0xFF80, 0x007F);
    this.Interrupt = new Interrupt(0xFFFF);
  }

  setBlock(index, block) {
    this.Blocks[index] = block;
  }

  get Blocks() {
    if(!this.blocks_) {
      this.blocks_ = [];
    }
    return this.blocks_;
  }

  get Cart() {
    return this.Blocks[0];
  }

  set Cart(block) {
    this.setBlock(0, block);
  }

  get VRAM() {
    return this.Blocks[1];
  }

  set VRAM(block) {
    this.setBlock(1, block);
  }

  get ExtRAM() {
    return this.Blocks[2];
  }

  set ExtRAM(block) {
    this.setBlock(2, block);
  }

  get WorkRAM() {
    return this.Blocks[3];
  }

  set WorkRAM(block) {
    this.setBlock(3, block);
  }

  get EchoRAM() {
    return this.Blocks[4];
  }

  set EchoRAM(block) {
    this.setBlock(4, block);
  }

  get OAM() {
    return this.Blocks[5];
  }

  set OAM(block) {
    this.setBlock(5, block);
  }

  get Trash() {
    return this.Blocks[6];
  }

  set Trash(block) {
    this.setBlock(6, block);
  }

  get IOReg() {
    return this.Blocks[7];
  }

  set IOReg(block) {
    this.setBlock(7, block);
  }

  get HighRAM() {
    return this.Blocks[8];
  }

  set HighRAM(block) {
    this.setBlock(8, block);
  }

  get Interrupt() {
    return this.Blocks[9];
  }

  set Interrupt(block) {
    this.setBlock(9, block);
  }

  get length() {
    let total = 0;
    for(let i = 0; i < this.Blocks.length; i++) {
      total += this.Blocks[i].length;
    }
    return total;
  }

  getByte_(addr) {
    for(let i = 0; i < this.Blocks.length; i++) {
      let b = this.Blocks[i];
      if(addr >= b.start && addr < b.start + b.length) {
        return b.get(addr - b.start);
      }
    }
  }

  get(addr, bytes = 1) {
    let val = 0x00;
    for(let i = 0; i < bytes; i++) {
      val += this.getByte_(addr + i) << (8 * i);
    }
    return val;
  }

  setByte_(addr, val) {
    for(let i = 0; i < this.Blocks.length; i++) {
      let b = this.Blocks[i];
      if(addr >= b.start && addr < b.start + b.length) {
        b.set(addr - b.start, val);
      }
    }
  }

  set(addr, val, bytes = 1) {
    for(let i = 0; i < bytes; i++) {
      this.setByte_(addr + i, val >> (8 * i));
    }
  }
}
