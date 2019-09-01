import { Cartridge } from ".";

/**
 * EXTRAM not implemented yet
 */
export class MBC1 extends Cartridge {
  constructor(byteArr) {
    super(byteArr);
    this.bankNum_ = 0x01; //7 bits, 01-7F
  }

  get(addr) {
    super.get(addr);
    if(addr <= 0x3FFF) {
      return this.rom_[addr];
    } else {
      return this.rom_[addr + 0x4000 * (this.bankNum_ - 1)];
    }
  }

  set(addr, val) {
    super.set(addr, val);
    if(addr >= 0x2000 && addr <= 0x3FFF) {
      if(val === 0x00) {
        val = 0x01;
      }
      this.bankNum_ = (this.bankNum_ >> 5 << 5) + (val & 0b11111);
    } else if(addr >= 0x4000 && addr <= 0x5FFF) {
      this.bankNum_ = (this.bankNum_ & 0b11111) + ((val & 0b11) << 5);
    }
  }
}
