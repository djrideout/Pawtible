import { Cartridge } from ".";

const Registers = {
  SECONDS:    0x00,
  MINUTES:    0x01,
  HOURS:      0x02,
  DAYS_LOWER: 0x03,
  DAYS_UPPER: 0x04 // Bit 0: MSB of day counter, Bit 6: Halt flag, Bit 7: Day Counter Carry Flag (1=Counter overflow) 
};

/**
 * https://gbdev.io/pandocs/MBC3.html
 */
export class MBC3 extends Cartridge {
  reset() {
    super.reset();
    if (!this.ram) {
      this.ram = new Uint8Array(0x8000);
    }
    this.registers = new Uint8Array(5);
    this.ramTimerEnabled = true;
    this.rtcRegMapped = false;
    this.rtcRegister = 0x00;
    this.ramBankNum = 0;
  }

  get(addr) {
    if (addr >= 0xA000 && addr <= 0xBFFF) {
      if (this.ramTimerEnabled) {
        if (this.rtcRegMapped) {
          return this.registers[this.rtcRegister];
        } else {
          return this.ram[addr - 0xA000 + 0x2000 * this.ramBankNum];
        }
      } else {
        return 0; // I guess I'll do this
      }
    }
  }

  set(addr, val) {
    if (addr <= 0x1FFF) {
      if (val === 0x0A) {
        this.ramTimerEnabled = true;
      } else if (val === 0x00) {
        this.ramTimerEnabled = false;
      }
    } else if (addr >= 0x2000 && addr <= 0x3FFF) {
      if(val === 0x00) {
        val = 0x01;
      }
      this.romBankNum = (this.romBankNum >> 7 << 7) | (val & 0b1111111);
    } else if (addr >= 0x4000 && addr <= 0x5FFF) {
      if (val >= 0x00 && val <= 0x03) {
        this.rtcRegMapped = false;
        this.ramBankNum = val;
      } else if (val >= 0x08 && val <= 0x0C) {
        this.rtcRegMapped = true;
        this.rtcRegister = val - 8;
      }
    } else if (addr >= 0x6000 && addr <= 0x7FFF) {
      //Latch Clock Data, probably does nothing if the clock doesn't work yet
    } else if (addr >= 0xA000 && addr <= 0xBFFF) {
      if (this.ramTimerEnabled) {
        if (this.rtcRegMapped) {
          this.registers[this.rtcRegister] = val;
        } else {
          this.ram[addr - 0xA000 + 0x2000 * this.ramBankNum] = val;
        }
      }
    }
  }
}
