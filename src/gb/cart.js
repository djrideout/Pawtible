
export class Cartridge {
  constructor() {
    this.temp = new Array(0x8000);
    this.temp.fill(0x00);
  }

  get(addr) {
    return this.temp[addr];
  }
}
