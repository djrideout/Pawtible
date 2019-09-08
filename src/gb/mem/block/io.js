import { MemoryBlock } from ".";

export class IORegisters extends MemoryBlock {
  constructor(gameBoy) {
    super(0xFF00, 0x0080);
    this.gameBoy_ = gameBoy;
  }

  get GB() {
    return this.gameBoy_;
  }

  set(addr, val) {
    switch(addr) {
      case 0x0004:
        this.GB.Timer.DIV = val;
        break;
      case 0x0005:
        this.GB.Timer.TIMA = val;
        break;
      case 0x0006:
        this.GB.Timer.TMA = val;
        break;
      case 0x0007:
        this.GB.Timer.TAC = val;
        break;
      default:
        super.set(addr, val);
        break;
    }
  }

  get(addr) {
    switch(addr) {
      case 0x0004:
        return this.GB.Timer.DIV;
      case 0x0005:
        return this.GB.Timer.TIMA;
      case 0x0006:
        return this.GB.Timer.TMA;
      case 0x0007:
        return this.GB.Timer.TAC;
      default:
        return super.get(addr);
    }
  }
}
