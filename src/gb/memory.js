export class MemoryMap {
  constructor() {
    this.setHooks_ = [];
    this.temp_ = new Array(this.length);
    this.temp_.fill(0x00);
  }

  get(addr) {
    return this.temp_[addr];
  }

  set(addr, val) {
    val = val & 0xFF;
    this.temp_[addr] = val;
    for(let i = 0; i < this.setHooks_.length; i++) {
      this.setHooks_[i](addr, val);
    }
  }

  get length() {
    return 0x10000;
  }

  addSetHook(callback) {
    this.setHooks_.push(callback);
  }
}
