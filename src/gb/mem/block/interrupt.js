import { MemoryBlock } from ".";

export class Interrupt extends MemoryBlock {
  constructor(start) {
    super(start, 0x0001);
  }

  reset() {
    this.Value = 0x01;
  }

  get Value() {
    return this.get(0x0000);
  }

  set Value(val) {
    this.set(0x0000, val);
  }
}
