import { Cartridge, Types } from ".";
import { CPU_FREQUENCY } from "../../../cpu";
import { RTCModes } from "../../..";

const Registers = {
  SECONDS:    0x00,
  MINUTES:    0x01,
  HOURS:      0x02,
  DAYS_LOWER: 0x03,
  DAYS_UPPER: 0x04 // Bit 0: MSB of day counter, Bit 6: Halt flag, Bit 7: Day Counter Carry Flag (1=Counter overflow) 
};

const Masks = {
  [Registers.SECONDS]: 0b00111111,
  [Registers.MINUTES]: 0b00111111,
  [Registers.HOURS]:   0b00011111,
  [Registers.DAYS_LOWER]: 0b11111111,
  [Registers.DAYS_UPPER]: 0b11000001
};

/**
 * https://gbdev.io/pandocs/MBC3.html
 */
export class MBC3 extends Cartridge {
  constructor(byteArr, gameBoy) {
    super(byteArr);
    this.GB = gameBoy;
  }

  reset() {
    super.reset();
    if (!this.ram) {
      this.ram = new Uint8Array(0x8000);
    }
    if (!this.lastSecond) {
      this.lastSecond = Math.round(Date.now() / 1000);
    }
    this.cycles = 0;
    this.registers = new Uint8Array(5);
    this.latchedRegisters = new Uint8Array(5);
    this.willLatch = false;
    this.ramTimerEnabled = true;
    this.rtcRegMapped = false;
    this.rtcRegister = 0x00;
    this.ramBankNum = 0;
    this.hasTimer = this.type === Types.MBC3TIMERBATTERY || this.type === Types.MBC3TIMERRAMBATTERY;
  }

  loadSRAM(arr) {
    this.ram = arr.subarray(0, this.ram.length);
    if (this.hasTimer) {
      let rtcArr = arr.subarray(this.ram.length, this.ram.length + 48);
      this.registers[Registers.SECONDS] = rtcArr[0];
      this.registers[Registers.MINUTES] = rtcArr[4];
      this.registers[Registers.HOURS] = rtcArr[8];
      this.registers[Registers.DAYS_LOWER] = rtcArr[12];
      this.registers[Registers.DAYS_UPPER] = rtcArr[16];
      this.latchedRegisters[Registers.SECONDS] = rtcArr[20];
      this.latchedRegisters[Registers.MINUTES] = rtcArr[24];
      this.latchedRegisters[Registers.HOURS] = rtcArr[28];
      this.latchedRegisters[Registers.DAYS_LOWER] = rtcArr[32];
      this.latchedRegisters[Registers.DAYS_UPPER] = rtcArr[36];
      let timestamp = 0;
      for (let i = 0; i < 4; i++) {
        timestamp |= rtcArr[40 + i] << (8 * i);
      }
      this.lastSecond = timestamp;
    }
  }

  saveSRAM() {
    let arr = new Uint8Array(this.hasTimer ? this.ram.length + 48 : this.ram.length);
    arr.set(this.ram);
    if (this.hasTimer) {
      // http://bgb.bircd.org/rtcsave.html
      let rtcArr = new Uint8Array(48);
      rtcArr[0] = this.registers[Registers.SECONDS];
      rtcArr[4] = this.registers[Registers.MINUTES];
      rtcArr[8] = this.registers[Registers.HOURS];
      rtcArr[12] = this.registers[Registers.DAYS_LOWER];
      rtcArr[16] = this.registers[Registers.DAYS_UPPER];
      rtcArr[20] = this.latchedRegisters[Registers.SECONDS];
      rtcArr[24] = this.latchedRegisters[Registers.MINUTES];
      rtcArr[28] = this.latchedRegisters[Registers.HOURS];
      rtcArr[32] = this.latchedRegisters[Registers.DAYS_LOWER];
      rtcArr[36] = this.latchedRegisters[Registers.DAYS_UPPER];
      // This is supposed to be a 64-bit little endian number, but bitwise in JS is only done on 32 bit numbers.
      // So it's not technically right, but it works because all timestamps still fit in 32 bits.
      // JS numbers are also doubles, with 53 bits worth of integer space.
      // Will leave it like this for now.
      for (let i = 0; i < 4; i++) {
        rtcArr[40 + i] = (this.lastSecond & (0xFF << (8 * i))) >>> (8 * i);
      }
      arr.set(rtcArr, this.ram.length);
    }
    return arr;
  }

  step(cycles) {
    if (!this.hasTimer) {
      return;
    }
    this.cycles += cycles;
    if (this.registers[Registers.DAYS_UPPER] & 0x40) {
      this.cycles -= cycles;
      return;
    }
    let threshold = this.GB.rtcMode === RTCModes.SYSTEM ? CPU_FREQUENCY / 32 : CPU_FREQUENCY;
    if (this.cycles < threshold) {
      return;
    }
    this.cycles -= threshold;
    let time = this.GB.rtcMode === RTCModes.SYSTEM ? Math.round(Date.now() / 1000) : this.lastSecond + 1;
    if ((this.registers[Registers.DAYS_UPPER] & 0x40) === 0) {
      while (this.lastSecond + 60 * 60 * 24 < time) {
        this.lastSecond += 60 * 60 * 24;
        this.registers[Registers.DAYS_LOWER] = (this.registers[Registers.DAYS_LOWER] + 1) & Masks[Registers.DAYS_LOWER];
        if (this.registers[Registers.DAYS_LOWER] === 0) {
          if (this.registers[Registers.DAYS_UPPER] & 1) {
            this.registers[Registers.DAYS_UPPER] |= 0x80;
          }
          this.registers[Registers.DAYS_UPPER] ^= 1;
        }
      }
      while (this.lastSecond < time) {
        this.lastSecond++;
        this.registers[Registers.SECONDS] = (this.registers[Registers.SECONDS] + 1) & Masks[Registers.SECONDS];
        if (this.registers[Registers.SECONDS] !== 60) {
          continue;
        }
        this.registers[Registers.SECONDS] = 0;
        this.registers[Registers.MINUTES] = (this.registers[Registers.MINUTES] + 1) & Masks[Registers.MINUTES];
        if (this.registers[Registers.MINUTES] !== 60) {
          continue;
        }
        this.registers[Registers.MINUTES] = 0;
        this.registers[Registers.HOURS] = (this.registers[Registers.HOURS] + 1) & Masks[Registers.HOURS];
        if (this.registers[Registers.HOURS] !== 24) {
          continue;
        }
        this.registers[Registers.HOURS] = 0;
        this.registers[Registers.DAYS_LOWER] = (this.registers[Registers.DAYS_LOWER] + 1) & Masks[Registers.DAYS_LOWER];
        if (this.registers[Registers.DAYS_LOWER] !== 0) {
          continue;
        }
        if (this.registers[Registers.DAYS_UPPER] & 1) {
          this.registers[Registers.DAYS_UPPER] |= 0x80;
        }
        this.registers[Registers.DAYS_UPPER] ^= 1;
      }
    }
  }

  get(addr) {
    if (addr >= 0xA000 && addr <= 0xBFFF) {
      if (this.ramTimerEnabled) {
        if (this.hasTimer && this.rtcRegMapped) {
          return this.latchedRegisters[this.rtcRegister];
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
      if (val === 0 && !this.willLatch) {
        this.willLatch = true;
      }
      if (val === 1 && this.willLatch) {
        this.willLatch = false;
        this.latchedRegisters = this.registers.subarray(0);
      }
    } else if (addr >= 0xA000 && addr <= 0xBFFF) {
      if (this.ramTimerEnabled) {
        if (this.hasTimer && this.rtcRegMapped) {
          if (this.rtcRegister === Registers.SECONDS) {
            this.cycles = 0;
          }
          this.registers[this.rtcRegister] = val & Masks[this.rtcRegister];
        } else {
          this.ram[addr - 0xA000 + 0x2000 * this.ramBankNum] = val;
        }
      }
    }
  }
}
