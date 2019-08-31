export class MemoryBlock {
  constructor(start, length) {
    this.start_ = start;
    this.length_ = length;
    this.mem_ = new Array(length);
    this.mem_.fill(0x00);
  }

  get(addr) {
    return this.mem_[addr];
  }

  set(addr, val) {
    this.mem_[addr] = val & 0xFF;
  }

  get key() {
    return this.key_;
  }

  get start() {
    return this.start_;
  }

  get length() {
    return this.length_;
  }

  //This is only necessary for the Echo RAM.
  echo(start, length) {
    let echo = new MemoryBlock(start, length);
    echo.mem_ = this.mem_;
    return echo;
  }
}
