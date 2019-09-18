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

export const Registers = {
  LCDC: 0, //FF40
  STAT: 1, //FF41
  SCY: 2,  //FF42
  SCX: 3,  //FF43
  LY: 4,   //FF44
  LYC: 5,  //FF45
  DMA: 6,  //FF46
  BGP: 7,  //FF47
  OBP0: 8, //FF48
  OBP1: 9, //FF49
  WY: 10,  //FF4A
  WX: 11,  //FF4B
};

export class PPU {
  constructor(gameBoy) {
    this.GB = gameBoy;
    /**
     * Consider these to be immutable.
     * Modifying some of these directly will have unintended consequences,
     * as some have special functionality when written to.
     * so only use the setters to change them.
     */
    this.Reg = new Uint8Array(12);
    this.cycles_ = 0;
    this.dmaStartAddr_ = 0;
    this.dmaThreshold_ = 0;
    this.dmaRemain_ = 0;
    this.prev_ = null;
    this.Buffer = [[], [], [], []]; //each index is a shade
    this.rects_ = [[], [], [], []]; //each index is a shade
      //format for each shade is [x, y, width, height, x, y, width, height, ...]
    this.cache_ = [];
      //each index has 3 slots of 8 bits and one slot of 2 bits that each mean
      //
      // 3  2        1        0
      //|xx|xxxxxxxx|xxxxxxxx|xxxxxxxx|
      //
      // 3. shade
      // 2. left x position
      // 1. bottom y position
      // 0. width
      //
      //and value is the starting index in the main shade array if an existing rectangle meets that description.
      //if it doesn't exist, it will either be undefined or null.
      //
      //this way, when finishing a new rectangle on the current line,
      //we can instantly check if there is an existing rectangle above it
      //with the same shade and width that can be joined to.
      //
      //this is only meant for internal use, when generating the frame buffer
      
    this.reset();
  }

  reset() {
    this.Reg[Registers.LCDC] = 0x91;
    this.Reg[Registers.SCY] = 0x00;
    this.Reg[Registers.SCX] = 0x00;
    this.Reg[Registers.LY] = 0x00;
    this.Reg[Registers.LYC] = 0x00;
    this.Reg[Registers.BGP] = 0xFC;
    this.Reg[Registers.OBP0] = 0xFF;
    this.Reg[Registers.OBP1] = 0xFF;
    this.Reg[Registers.WY] = 0x00;
    this.Reg[Registers.WX] = 0x00;
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
    this.Line = this.Reg[Registers.LY] + 1;
    if(this.Reg[Registers.LY] === 144) {
      this.ScreenMode = Modes.VBLANK;
      this.GB.CPU.FlagVBlankRequest = true;
    } else {
      this.ScreenMode = Modes.OAM;
    }
  }

  vblank_() {
    this.Line = this.Reg[Registers.LY] + 1;
    if(this.Reg[Registers.LY] == 154) {
      this.ScreenMode = Modes.OAM;
      this.Line = 0;
      this.Buffer[0] = this.rects_[0];
      this.Buffer[1] = this.rects_[1];
      this.Buffer[2] = this.rects_[2];
      this.Buffer[3] = this.rects_[3];
      this.rects_[0] = [];
      this.rects_[1] = [];
      this.rects_[2] = [];
      this.rects_[3] = [];
      this.cache_ = [];
    }
  }

  oam_() {
    this.ScreenMode = Modes.VRAM;
  }

  vram_() {
    //TODO: Make this cycle-accurate instead of rendering the entire line at the end of mode 3
    if(this.Reg[Registers.LY] < 144) {
      this.renderLine_();
    }
    this.ScreenMode = Modes.HBLANK;
  }

  renderLine_() {
    let shades = [this.ColorShade(0), this.ColorShade(1), this.ColorShade(2), this.ColorShade(3)];
    let prevShade = null;
    for(let i = 0; i < 160; i++) {
      let shade = shades[this.Pixel(this.Reg[Registers.SCX] + i, this.Reg[Registers.SCY] + this.Reg[Registers.LY])];
      if(shade === 0) {
        //Not creating a buffer for white because it's not really necessary.
        //White can just be used as a backdrop for the screen, then the other
        //shades can be drawn on top of it.
        continue;
      }
      let b = this.rects_[shade];
      if(b[b.length - 4] + b[b.length - 2] === i) {
        b[b.length - 2]++;
      } else {
        let pb = this.rects_[prevShade];
        if(pb) {
          //the previous rectangle has ended. see if it can be joined to a potential rectangle above it
          let oldCacheIndex = (prevShade << 24) | ((pb[pb.length - 4] & 0xFF) << 16) | (((this.Reg[Registers.LY] - 1) & 0xFF) << 8) | (pb[pb.length - 2] & 0xFF);
          let newCacheIndex = (prevShade << 24) | ((pb[pb.length - 4] & 0xFF) << 16) | (((this.Reg[Registers.LY]) & 0xFF) << 8) | (pb[pb.length - 2] & 0xFF);
          let shadeIndex = this.cache_[oldCacheIndex];
          if(shadeIndex !== null && shadeIndex !== undefined) {
            //we can join it. do that.
            this.rects_[prevShade][shadeIndex + 3]++;
            this.rects_[prevShade].length -= 4;
            this.cache_[oldCacheIndex] = null;
            this.cache_[newCacheIndex] = shadeIndex;
          } else if(prevShade !== null) {
            //if we can't join it, cache it so we can potentially join rectangles below to it later
            this.cache_[newCacheIndex] = this.rects_[prevShade].length - 4;
          }
        }
        //start a new rectangle with the current shade
        b.push(i, this.Reg[Registers.LY], 1, 1);
      }
      prevShade = shade;
    }
  }

  set LCDC(val) {
    this.Reg[Registers.LCDC] = val;
    //let's not handle the STAT first 3 bits returning 0 when LCD disabled thing right now
  }

  set STAT(val) {
    this.Reg[Registers.STAT] = 0x80 | (val >>> 3 << 3) | (this.Reg[Registers.STAT] & 0x07);
  }

  set SCY(val) {
    this.Reg[Registers.SCY] = val;
  }

  set SCX(val) {
    this.Reg[Registers.SCX] = val;
  }

  set LY(val) {
    this.Line = 0;
  }

  set LYC(val) {
    this.Reg[Registers.LYC] = val;
    //special set case
    this.Reg[Registers.LYC] === this.Reg[Registers.LY] ? this.Reg[Registers.STAT] = this.Reg[Registers.STAT] | 0x04 : this.Reg[Registers.STAT] = this.Reg[Registers.STAT] & ~0x04;
  }

  set DMA(val) {
    this.Reg[Registers.DMA] = val;
    this.dmaThreshold_ = 4;
    this.dmaRemain_ = DMA_TOTAL;
  }

  set BGP(val) {
    this.Reg[Registers.BGP] = val;
  }

  set OBP0(val) {
    this.Reg[Registers.OBP0] = val;
  }

  set OBP1(val) {
    this.Reg[Registers.OBP1] = val;
  }

  set WY(val) {
    this.Reg[Registers.WY] = val;
  }

  set WX(val) {
    this.Reg[Registers.WX] = val;
  }

  /**
   * Arbitrary (non-direct register) getters and setters
   * Mainly to improve readability
   */

  set Line(val) {
    this.Reg[Registers.LY] = val;
    //special set case
    this.Reg[Registers.LYC] === this.Reg[Registers.LY] ? this.Reg[Registers.STAT] = this.Reg[Registers.STAT] | 0x04 : this.Reg[Registers.STAT] = this.Reg[Registers.STAT] & ~0x04;
  }

  get LCDEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x80);
  }

  set LCDEnable(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x80 : this.LCDC = this.Reg[Registers.LCDC] & ~0x80;
  }

  get WindowTileMap() {
    return !!(this.Reg[Registers.LCDC] & 0x40);
  }

  set WindowTileMap(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x40 : this.LCDC = this.Reg[Registers.LCDC] & ~0x40;
  }

  get WindowEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x20);
  }

  set WindowEnable(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x20 : this.LCDC = this.Reg[Registers.LCDC] & ~0x20;
  }

  get BGWindowTileSet() {
    return !!(this.Reg[Registers.LCDC] & 0x10);
  }

  set BGWindowTileSet(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x10 : this.LCDC = this.Reg[Registers.LCDC] & ~0x10;
  }

  get BGTileMap() {
    return !!(this.Reg[Registers.LCDC] & 0x08);
  }

  set BGTileMap(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x08 : this.LCDC = this.Reg[Registers.LCDC] & ~0x08;
  }

  get SpriteSize() {
    return !!(this.Reg[Registers.LCDC] & 0x04);
  }

  set SpriteSize(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x04 : this.LCDC = this.Reg[Registers.LCDC] & ~0x04;
  }

  get SpritesEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x02);
  }

  set SpritesEnable(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x02 : this.LCDC = this.Reg[Registers.LCDC] & ~0x02;
  }

  get BGEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x01);
  }

  set BGEnable(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x01 : this.LCDC = this.Reg[Registers.LCDC] & ~0x01;
  }

  get LYCCheckEnable() {
    return !!(this.Reg[Registers.STAT] & 0x40);
  }

  set LYCCheckEnable(bool) {
    bool ? this.STAT = this.Reg[Registers.STAT] | 0x40 : this.STAT = this.Reg[Registers.STAT] & ~0x40;
  }

  get OAMCheckEnable() {
    return !!(this.Reg[Registers.STAT] & 0x20);
  }

  set OAMCheckEnable(bool) {
    bool ? this.STAT = this.Reg[Registers.STAT] | 0x20 : this.STAT = this.Reg[Registers.STAT] & ~0x20;
  }

  get VBlankCheckEnable() {
    return !!(this.Reg[Registers.STAT] & 0x10);
  }

  set VBlankCheckEnable(bool) {
    bool ? this.STAT = this.Reg[Registers.STAT] | 0x10 : this.STAT = this.Reg[Registers.STAT] & ~0x10;
  }

  get HBlankCheckEnable() {
    return !!(this.Reg[Registers.STAT] & 0x08);
  }

  set HBlankCheckEnable(bool) {
    bool ? this.STAT = this.Reg[Registers.STAT] | 0x08 : this.STAT = this.Reg[Registers.STAT] & ~0x08;
  }

  get LYCCompare() {
    return !!(this.Reg[Registers.STAT] & 0x04);
  }

  get ScreenMode() {
    return this.Reg[Registers.STAT] & 0x03;
  }

  /**
   * PRIVATE
   */
  set ScreenMode(val) {
    //special set case, normally first 3 bits are read only but not internally
    this.Reg[Registers.STAT] = (this.Reg[Registers.STAT] >>> 2 << 2) | (val & 0x03);
  }

  get DMASourceAddr() {
    return this.Reg[Registers.DMA] << 8;
  }

  get BGMapStart() {
    switch((this.Reg[Registers.LCDC] >>> 3) & 0x01) {
      case 0:
        return 0x1800;
      case 1:
        return 0x1C00;
    }
  }

  TileStart(num) {
    let offset = null;
    //all addresses are relative to the start of VRAM
    switch((this.Reg[Registers.LCDC] >>> 4) & 0x01) {
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
    let ms = (lineByte1 & (0x01 << shift)) >> shift;
    let ls = (lineByte0 & (0x01 << shift)) >> shift;
    let color = (ms << 1) | ls;

    return color;
  }

  ColorShade(color) {
    switch(color) {
      case 0:
        return this.Reg[Registers.BGP] & 0x03;
      case 1:
        return (this.Reg[Registers.BGP] & 0x0C) >>> 2;
      case 2:
        return (this.Reg[Registers.BGP] & 0x30) >>> 4;
      case 3:
        return (this.Reg[Registers.BGP] & 0xC0) >>> 6;
    }
  }
}
