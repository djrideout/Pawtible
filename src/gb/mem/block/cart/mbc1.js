import { Cartridge } from ".";

/**
 * EXTRAM not implemented yet
 */
export class MBC1 extends Cartridge {
  constructor(byteArr) {
    super(byteArr);
  }

  set(addr, val) {
    if(addr >= 0x2000 && addr <= 0x3FFF) {
      if(val === 0x00) {
        val = 0x01;
      }
      this.romBankNum = (this.romBankNum >> 5 << 5) + (val & 0b11111);
    } else if(addr >= 0x4000 && addr <= 0x5FFF) {
      this.romBankNum = (this.romBankNum & 0b11111) + ((val & 0b11) << 5);
    }
  }
}
