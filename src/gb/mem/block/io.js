import { MemoryBlock } from ".";

export class IORegisters extends MemoryBlock {
  constructor(gameBoy) {
    super(0xFF00, 0x0080);
    this.gameBoy_ = gameBoy;
  }

  get GB() {
    return this.gameBoy_;
  }

  get(addr) {
    if(this.start + addr === 0xFF44) {
      return this.GB.PPU.Line;
    } else {
      return super.get(addr);
    }
  }
}
