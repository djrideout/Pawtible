import { MemoryMap } from "./memory";

export class GameBoy {
  constructor() {
    this.memoryMap_ = new MemoryMap();
  }

  get M() {
    return this.memoryMap_;
  }

  init() {
    for(let i = 0x0000; i <= 0xFFFF; i++) {
      this.M.set(i, i);
    }
  }
}
