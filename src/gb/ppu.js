const Modes = {
  HBLANK: 0,
  VBLANK: 1,
  OAM: 2,
  VRAM: 3
};

const ModeCycles = [
  204,
  456,
  80,
  172
];

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
    if(this.cycles_ >= ModeCycles[this.mode_]) {
      this.cycles_ -= ModeCycles[this.mode_];
      switch(this.mode_) {
        case Modes.HBLANK:
          this.hblank_();
          break;
        case Modes.VBLANK:
          this.vblank_();
          break;
        case Modes.OAM:
          this.oam_();
          break;
        case Modes.VRAM:
          this.vram_();
          break;
      }
    }
  }

  hblank_() {
    this.line_++;
    if(this.line_ === 143) {
      this.mode_ = Modes.VBLANK;
    } else {
      this.mode_ = Modes.OAM;
    }
  }

  vblank_() {
    this.line_++;
    if(this.line_ > 153) {
      this.mode_ = Modes.OAM;
      this.line_ = 0;
    }
  }

  oam_() {
    this.mode_ = Modes.VRAM;
  }

  vram_() {
    this.mode_ = Modes.HBLANK;
  }
}
