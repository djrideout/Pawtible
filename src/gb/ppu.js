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

const Registers = {
  LCDC: "regLCDC", //FF40
  STAT: "regSTAT", //FF41
  SCY: "regSCY",   //FF42
  SCX: "regSCX",   //FF43
  LY: "regLY",     //FF44
  LYC: "regLYC",   //FF45
  DMA: "regDMA",   //FF46
  BGP: "regBGP",   //FF47
  OBP0: "regOBP0", //FF48
  OBP1: "regOBP1", //FF49
  WY: "regWY",     //FF4A
  WX: "regWX",     //FF4B
};

export class PPU {
  constructor() {
    this.cycles_ = 0;
    this.reset();
  }

  reset() {
    this.LCDC = 0x91;
    this.SCY = 0x00;
    this.SCX = 0x00;
    this.Line = 0x00;
    this.LYC = 0x00;
    this.BGP = 0xFC;
    this.OBP0 = 0xFF;
    this.OBP1 = 0xFF;
    this.WY = 0x00;
    this.WX = 0x00;
  }

  set(register, val) {
    val = val & 0xFF;
    switch(register) {
      case Registers.STAT:
      case Registers.SCY:
      case Registers.SCX:
      case Registers.LYC:
      case Registers.DMA:
      case Registers.BGP:
      case Registers.OBP0:
      case Registers.OBP1:
      case Registers.WY:
      case Registers.WX:
        this[register] = val;
        break;
      case Registers.LCDC:
        //first 3 bits are read only
        this[register] = (val >>> 3 << 3) | (this[register] & 0x07);
        break;
      case Registers.LY:
        //totally read only
        break;
    }
  }

  get(register) {
    switch(register) {
      case Registers.LCDC:
      case Registers.STAT:
      case Registers.SCY:
      case Registers.SCX:
      case Registers.LY:
      case Registers.LYC:
      case Registers.DMA:
      case Registers.BGP:
      case Registers.OBP0:
      case Registers.OBP1:
      case Registers.WY:
      case Registers.WX:
        return this[register];
    }
  }

  step(cycles) {
    this.cycles_ += cycles;
    if(this.cycles_ >= ModeCycles[this.Mode]) {
      this.cycles_ -= ModeCycles[this.Mode];
      switch(this.Mode) {
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
    this.Line++;
    if(this.Line === 143) {
      this.Mode = Modes.VBLANK;
    } else {
      this.Mode = Modes.OAM;
    }
  }

  vblank_() {
    this.Line++;
    if(this.Line > 153) {
      this.Mode = Modes.OAM;
      this.Line = 0;
    }
  }

  oam_() {
    this.Mode = Modes.VRAM;
  }

  vram_() {
    this.Mode = Modes.HBLANK;
  }

  get LCDC() {
    return this.get(Registers.LCDC);
  }

  set LCDC(val) {
    this.set(Registers.LCDC, val);
  }

  get STAT() {
    return this.get(Registers.STAT);
  }

  set STAT(val) {
    this.set(Registers.STAT, val);
  }
  
  get SCY() {
    return this.get(Registers.SCY);
  }

  set SCY(val) {
    this.set(Registers.SCY, val);
  }

  get SCX() {
    return this.get(Registers.SCX);
  }

  set SCX(val) {
    this.set(Registers.SCX, val);
  }

  get LY() {
    return this.get(Registers.LY);
  }

  set LY(val) {
    this.set(Registers.LY, val);
  }

  get LYC() {
    return this.get(Registers.LYC);
  }

  set LYC(val) {
    this.set(Registers.LYC, val);
  }

  get DMA() {
    return this.get(Registers.DMA);
  }

  set DMA(val) {
    this.set(Registers.DMA, val);
  }

  get BGP() {
    return this.get(Registers.BGP);
  }

  set BGP(val) {
    this.set(Registers.BGP, val);
  }

  get OBP0() {
    return this.get(Registers.OBP0);
  }

  set OBP0(val) {
    this.set(Registers.OBP0, val);
  }

  get OBP1() {
    return this.get(Registers.OBP1);
  }

  set OBP1(val) {
    this.set(Registers.OBP1, val);
  }

  get WY() {
    return this.get(Registers.WY);
  }

  set WY(val) {
    this.set(Registers.WY, val);
  }

  get WX() {
    return this.get(Registers.WX);
  }

  set WX(val) {
    this.set(Registers.WX, val);
  }

  get Line() {
    return this.LY;
  }

  /**
   * PRIVATE
   */
  set Line(val) {
    this[Registers.LY] = val & 0xFF;
  }

  get Mode() {
    return this.LCDC & 0x03;
  }

  /**
   * PRIVATE
   */
  set Mode(val) {
    this[Registers.LCDC] = (this.LCDC >>> 2 << 2) | (val & 0x03);
  }
}
