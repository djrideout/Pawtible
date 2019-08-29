import { MemoryMap } from "./memory";
import { CPU } from "./cpu";

export class GameBoy {
  constructor() {
    this.memoryMap_ = new MemoryMap();
    this.cpu_ = new CPU();
  }

  get M() {
    return this.memoryMap_;
  }

  get CPU() {
    return this.cpu_;
  }

  init() {
    for(let i = 0x0000; i <= 0xFFFF; i++) {
      this.M.set(i, i);
    }
  }
}
