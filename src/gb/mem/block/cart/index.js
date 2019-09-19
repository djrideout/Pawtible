const TypesMap = [];
export const Types = {
  ROM: TypesMap[0x00] ="ROM",
  MBC1: TypesMap[0x01] = "MBC1",
  MBC1RAM: TypesMap[0x02] = "MBC1+RAM",
  MBC1RAMBATTERY: TypesMap[0x03] = "MBC1+RAM+BATTERY",
  MBC2: TypesMap[0x05] = "MBC2",
  MBC2BATTERY: TypesMap[0x06] = "MBC2+BATTERY",
  ROMRAM: TypesMap[0x08] = "ROM+RAM",
  ROMRAMBATTERY: TypesMap[0x09] = "ROM+RAM+BATTERY",
  MMM01: TypesMap[0x0B] = "MMM01",
  MMM01RAM: TypesMap[0x0C] = "MMM01+RAM",
  MMM01RAMBATTERY: TypesMap[0x0D] = "MMM01+RAM+BATTERY",
  MBC3TIMERBATTERY: TypesMap[0x0F] = "MBC3+TIMER+BATTERY",
  MBC3TIMERRAMBATTERY: TypesMap[0x10] = "MBC3+TIMER+RAM+BATTERY",
  MBC3: TypesMap[0x11] = "MBC3",
  MBC3RAM: TypesMap[0x12] = "MBC3+RAM",
  MBC3RAMBATTERY: TypesMap[0x13] = "MBC3+RAM+BATTERY",
  MBC5: TypesMap[0x19] = "MBC5",
  MBC5RAM: TypesMap[0x1A] = "MBC5+RAM",
  MBC5RAMBATTERY: TypesMap[0x1B] = "MBC5+RAM+BATTERY",
  MBC5RUMBLE: TypesMap[0x1C] = "MBC5+RUMBLE",
  MBC5RUMBLERAM: TypesMap[0x1D] = "MBC5+RUMBLE+RAM",
  MBC5RUMBLERAMBATTERY: TypesMap[0x1E] = "MBC5+RUMBLE+RAM+BATTERY",
  MBC6: TypesMap[0x20] = "MBC6",
  MBC7SENSORRUMBLERAMBATTERY: TypesMap[0x22] = "MBC5+SENSOR+RUMBLE+RAM+BATTERY",
  POCKETCAMERA: TypesMap[0xFC] = "POCKET CAMERA",
  BANDAITAMA5: TypesMap[0xFD] = "BANDAI TAMA5",
  HuC3: TypesMap[0xFE] = "HuC3",
  HuC1RAMBATTERY: TypesMap[0xFF] = "HuC1+RAM+BATTERY"
};

const ROMSizeMap = [];
ROMSizeMap[0x00] = 32 * 1024;
ROMSizeMap[0x01] = 64 * 1024;
ROMSizeMap[0x02] = 128 * 1024;
ROMSizeMap[0x03] = 256 * 1024;
ROMSizeMap[0x04] = 512 * 1024;
ROMSizeMap[0x05] = 1024 * 1024;
ROMSizeMap[0x06] = 2048 * 1024;
ROMSizeMap[0x07] = 4096 * 1024;
ROMSizeMap[0x08] = 8192 * 1024;
ROMSizeMap[0x52] = 1152 * 1024;
ROMSizeMap[0x53] = 1280 * 1024;
ROMSizeMap[0x54] = 1536 * 1024;

const RAMSizeMap = [];
RAMSizeMap[0x00] = 0;
RAMSizeMap[0x01] = 2 * 1024;
RAMSizeMap[0x02] = 8 * 1024;
RAMSizeMap[0x03] = 32 * 1024;
RAMSizeMap[0x04] = 128 * 1024;
RAMSizeMap[0x05] = 64 * 1024;

export class Cartridge {
  constructor(byteArr = new Uint8Array(0x8000)) {
    this.rom = byteArr;
    this.romBankNum = 1;
  }

  get(addr) {
    return this.rom[addr];
  }

  set(addr, val) {
    //nah
  }

  /**
   * Probably going to print these on the view somewhere later.
   * Other than that they don't serve any technical purpose.
   */

  get title() {
    let title = "";
    for(let i = 0x0134; i <= 0x0143; i++) {
      title += String.fromCharCode(this.rom[i]);
    }
    return title;
  }

  get romSize() {
    return ROMSizeMap[this.rom[0x0148]];
  }

  get romBanks() {
    return this.romSize / 1024 / 16;
  }

  get ramSize() {
    return RAMSizeMap[this.rom[0x0149]];
  }

  get ramBanks() {
    switch(true) {
      case this.ramSize === 0:
        return 0;
      case this.ramSize <= 8 * 1024:
        return 1;
      default:
        return this.ramSize / 1024 / 8;
    }
  }

  get type() {
    return TypesMap[this.rom[0x0147]];
  }
}
