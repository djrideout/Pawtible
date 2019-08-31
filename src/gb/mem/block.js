export class MemoryBlock {
  constructor(key, length) {
    this.key_ = key;
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

  get length() {
    return this.length_;
  }

  //This is only necessary for the Echo RAM.
  echo(key, length) {
    let echo = new MemoryBlock(key, length);
    echo.mem_ = this.mem_;
    return echo;
  }
}
