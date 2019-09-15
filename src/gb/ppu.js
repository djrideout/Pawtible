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

const DMA_TOTAL = 644; //cycles

const Shades = {
  WHITE: 0,
  LIGHT_GRAY: 1,
  DARK_GRAY: 2,
  BLACK: 3
};

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
    this.GB = gameBoy;
    this.cycles_ = 0;
    this.dmaStartAddr_ = 0;
    this.dmaThreshold_ = 0;
    this.dmaRemain_ = 0;
    this.prev_ = null;
    this.Buffer = [];
    for(let i = 0; i < 144; i++) {
      this.Buffer[i] = [];
      for(let j = 0; j < 160; j++) {
        this.Buffer[i][j] = "#FFFFFF";
      }
    }
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

  get(register) {
    switch(register) {
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
      case Registers.STAT:
        //bit 7 always 1, bits 0-2 return 0 when LCD is disabled
        let val = this[register];
        val |= 0x80; //bit 7 always 1;
        val = this[Registers.LCDC] & 0x80 ? val : val >>> 3 << 3; //bits 0-2 return 0 when LCD is disabled
        val = (val & ~0x04) | ((this[Registers.LYC] === this[Registers.LY]) << 2);
        return val;
    }
  }


  set(register, val) {
    val = val & 0xFF;
    switch(register) {
      case Registers.LCDC:
      case Registers.SCY:
      case Registers.SCX:
      case Registers.LYC:
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
        this[register] = 0x00; //reset line to 0??
        break;
      case Registers.DMA:
        this[register] = val;
        this.dmaThreshold_ = 4;
        this.dmaRemain_ = DMA_TOTAL;
        break;
    }
  }

  step(cycles) {
    while(cycles > 0) {
      this.cycles_++;
      cycles--;
      if(this.cycles_ >= ModeCycles[this.ScreenMode]) {
        this.cycles_ -= ModeCycles[this.ScreenMode];
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
      this.dma_();
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
      case this.ScreenMode === Modes.HBLANK && this.HBlankCheckEnable:
      case this.ScreenMode === Modes.OAM && this.OAMCheckEnable:
      case this.ScreenMode === Modes.VBLANK && (this.VBlankCheckEnable || this.OAMCheckEnable):
        bool = true;
        break;
    }
    //STAT IRQ is triggered on rising edge of this internal signal
    if(this.prev_ === false && bool === true) {
      this.FlagLCDSTATRequest = true;
    }
    this.prev_ = bool;
  }

  dma_() {
    if(this.dmaRemain_ > 0) {
      this.dmaRemain_--;
      this.dmaThreshold_--;
      if(this.dmaThreshold_ === -1) {
        this.dmaThreshold_ = 3;
        let byte = (DMA_TOTAL - this.dmaRemain_ - 5) / 4;
        this.GB.M.OAM.set(byte, this.GB.M.get(this.DMASourceAddr + byte));
      }
    }
  }

  hblank_() {
    this.Line++;
    if(this.Line === 143) {
      this.ScreenMode = Modes.VBLANK;
    } else {
      this.ScreenMode = Modes.OAM;
    }
  }

  vblank_() {
    this.Line++;
    if(this.Line === 144) {
      this.GB.CPU.FlagVBlankRequest = true;
    }
    if(this.Line > 153) {
      this.ScreenMode = Modes.OAM;
      this.Line = 0;
    }
  }

  oam_() {
    this.ScreenMode = Modes.VRAM;
  }

  vram_() {
    //TODO: Make this cycle-accurate instead of rendering the entire line at the end of mode 3
    if(this.Line < 144) {
      this.renderLine_();
    }
    this.ScreenMode = Modes.HBLANK;
  }

  renderLine_() {
    let pixels = this.Buffer[this.Line];
    for(let i = 0; i < pixels.length; i++) {
      let color = this.Pixel(this.SCX + i, this.SCY + this.Line);
      switch(this.ColorShade(color)) {
        case Shades.WHITE:
          pixels[i] = "#FFFFFF";
          break;
        case Shades.LIGHT_GRAY:
          pixels[i] = "#C7C7C7";
          break;
        case Shades.DARK_GRAY:
          pixels[i] = "#6E6E6E";
          break;
        case Shades.BLACK:
          pixels[i] = "#000000";
          break;
      }
    }
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

  get DMASourceAddr() {
    return this.DMA << 8;
  }

  get BGMapStart() {
    switch((this.LCDC >>> 3) & 0x01) {
      case 0:
        return 0x1800;
      case 1:
        return 0x1C00;
    }
  }

  TileStart(num) {
    let offset = null;
    //all addresses are relative to the start of VRAM
    switch((this.LCDC >>> 4) & 0x01) {
      case 0:
        offset = (num << 24 >> 24) * 16;
        return 0x1000 + offset;
      case 1:
          offset = num * 16;
          return offset;
    }
  }

  /**
   * x and y are relative to the background map
   */
  Pixel(x, y) {
    //Wrap around BG map if positions overflow
    x = x % 256;
    y = y % 256;

    //Get the tile this pixel is located in relative to the bg map
    let mapX = Math.floor(x / 8);
    let mapY = Math.floor(y / 8);
    let mapNum = 32 * mapY + mapX;

    //Get the starting address for the tile data using the current addressing mode
    let tileNum = this.GB.M.VRAM.get(this.BGMapStart + mapNum);
    let tileStart = this.TileStart(tileNum);

    //Get the pixel relative to the start of the tile
    let tileX = x - mapX * 8;
    let tileY = y - mapY * 8;

    //Get the relevant tile data
    let lineByte0 = this.GB.M.VRAM.get(tileStart + tileY * 2);
    let lineByte1 = this.GB.M.VRAM.get(tileStart + tileY * 2 + 1);

    //Get the color for this pixel
    let shift = 8 - tileX - 1;
    let color = ((lineByte1 & (0x01 << shift)) >>> (shift - 1)) | ((lineByte0 & (0x01 << shift)) >>> shift);

    return color;
  }

  ColorShade(color) {
    switch(color) {
      case 0:
        return this.BGP & 0x03;
      case 1:
        return (this.BGP & 0x0C) >>> 2;
      case 2:
        return (this.BGP & 0x30) >>> 4;
      case 3:
        return (this.BGP & 0xC0) >>> 6;
    }
  }
}
