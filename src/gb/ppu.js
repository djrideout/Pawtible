export class PPU {
  constructor() {
    this.mode_ = 0;
    this.cycles_ = 0;
    this.line_ = 0;
  }

  get Line() {
    return this.line_;
  }

  step(cycles) {
    this.cycles_ += cycles;
  }
}
