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
  constructor(gameBoy) {
    this.gameBoy_ = gameBoy;
    this.cycles_ = 0;
    this.prev_ = null;
    this.reset();
  }

  get GB() {
    return this.gameBoy_;
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

  get(register) {
    switch(register) {
      case Registers.STAT:
        //bit 7 always 1, bits 0-2 return 0 when LCD is disabled
        //let val = this[register] | 0x80 | ((this.LYC === this.LY) << 3);
        let val = this[register];
        val |= 0x80; //bit 7 always 1;
        val = this[Registers.LCDC] & 0x80 ? val : val >>> 3 << 3; //bits 0-2 return 0 when LCD is disabled
        val = (val & ~0x04) | ((this[Registers.LYC] === this[Registers.LY]) << 2);
        return val;
      case Registers.LCDC:
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


  set(register, val) {
    val = val & 0xFF;
    switch(register) {
      case Registers.LCDC:
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
      case Registers.STAT:
        //first 3 bits are read only
        this[register] = (val >>> 3 << 3) | (this[register] & 0x07);
        break;
      case Registers.LY:
        //totally read only
        break;
    }
  }

  step(cycles) {
    while(cycles > 0) {
      this.cycles_++;
      cycles--;
      if(this.cycles_ === ModeCycles[this.ScreenMode]) {
        this.cycles_ = 0;
        switch(this.ScreenMode) {
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
      this.statIRQ_();
    }
  }

  //cases documented in The Cycle-Accurate Game Boy Docs by AntonioND
  statIRQ_() {
    let bool = null;
    switch(true) {
      case !this.LCDEnable:
      default:
        bool = false;
        break;
      case this.LYCCompare && this.LYCCheckEnable:
      case this.Mode === Modes.HBLANK && this.HBlankCheckEnable:
      case this.Mode === Modes.OAM && this.OAMCheckEnable:
      case this.Mode === Modes.VBLANK && (this.VBlankCheckEnable || this.OAMCheckEnable):
        bool = true;
        break;
    }
    //STAT IRQ is triggered on rising edge of this internal signal
    if(this.prev_ === false && bool === true) {
      this.FlagLCDSTATRequest = true;
    }
    this.prev_ = bool;
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
    if(this.Line === 144) {
      this.GB.CPU.FlagVBlankRequest = true;
    }
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

  get LCDEnable() {
    return !!(this.LCDC & 0x80);
  }

  set LCDEnable(bool) {
    bool ? this.LCDC |= 0x80 : this.LCDC &= ~0x80;
  }

  get WindowTileMap() {
    return !!(this.LCDC & 0x40);
  }

  set WindowTileMap(bool) {
    bool ? this.LCDC |= 0x40 : this.LCDC &= ~0x40;
  }

  get WindowEnable() {
    return !!(this.LCDC & 0x20);
  }

  set WindowEnable(bool) {
    bool ? this.LCDC |= 0x20 : this.LCDC &= ~0x20;
  }

  get BGWindowTileSet() {
    return !!(this.LCDC & 0x10);
  }

  set BGWindowTileSet(bool) {
    bool ? this.LCDC |= 0x10 : this.LCDC &= ~0x10;
  }

  get BGTileMap() {
    return !!(this.LCDC & 0x08);
  }

  set BGTileMap(bool) {
    bool ? this.LCDC |= 0x08 : this.LCDC &= ~0x08;
  }

  get SpriteSize() {
    return !!(this.LCDC & 0x04);
  }

  set SpriteSize(bool) {
    bool ? this.LCDC |= 0x04 : this.LCDC &= ~0x04;
  }

  get SpritesEnable() {
    return !!(this.LCDC & 0x02);
  }

  set SpritesEnable(bool) {
    bool ? this.LCDC |= 0x02 : this.LCDC &= ~0x02;
  }

  get BGEnable() {
    return !!(this.LCDC & 0x01);
  }

  set BGEnable(bool) {
    bool ? this.LCDC |= 0x01 : this.LCDC &= ~0x01;
  }

  get LYCCheckEnable() {
    return !!(this.STAT & 0x40);
  }

  set LYCCheckEnable(bool) {
    bool ? this.STAT |= 0x40 : this.STAT &= ~0x40;
  }

  get OAMCheckEnable() {
    return !!(this.STAT & 0x20);
  }

  set OAMCheckEnable(bool) {
    bool ? this.STAT |= 0x20 : this.STAT &= ~0x20;
  }

  get VBlankCheckEnable() {
    return !!(this.STAT & 0x10);
  }

  set VBlankCheckEnable(bool) {
    bool ? this.STAT |= 0x10 : this.STAT &= ~0x10;
  }

  get HBlankCheckEnable() {
    return !!(this.STAT & 0x08);
  }

  set HBlankCheckEnable(bool) {
    bool ? this.STAT |= 0x08 : this.STAT &= ~0x08;
  }

  get LYCCompare() {
    return !!(this.STAT & 0x04);
  }

  get ScreenMode() {
    return this.STAT & 0x03;
  }

  /**
   * PRIVATE
   */
  set ScreenMode(val) {
    this[Registers.STAT] = (this.STAT >>> 2 << 2) | (val & 0x03);
  }
}
