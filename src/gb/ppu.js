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
    this.reset();
  }

  reset() {
    /**
     * Consider these to be immutable.
     * Modifying some of these directly will have unintended consequences,
     * as some have special functionality when written to.
     * so only use the setters to change them.
     * Although, there are a few internal cases where setting directly is necessary,
     * like when STAT is updated on changes to LYC or LY.
     */
    this.Reg = new Uint8Array(12);
    this.cycles_ = 0;
    this.dmaStartAddr_ = 0;
    this.dmaThreshold_ = 0;
    this.dmaRemain_ = 0;
    this.prev_ = null;
    this.sprites_ = [];
    this.bgShades_ = [0, 0, 0, 0];
    this.obp0Shades_ = [0, 0, 0, 0];
    this.obp1Shades_ = [0, 0, 0, 0];
    this.spriteSize_ = 8;
    this.Buffer = [];
    this.pixels_ = [];
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
    if (!this.LCDEnable) {
      return;
    }
    while (cycles > 0) {
      this.cycles_++;
      cycles--;
      if (this.cycles_ >= ModeCycles[this.ScreenMode]) {
        this.cycles_ -= ModeCycles[this.ScreenMode];
        let mode = this.ScreenMode;
        if (mode === Modes.HBLANK) {
          this.Line = this.Reg[Registers.LY] + 1;
          if (this.Reg[Registers.LY] === 144) {
            this.ScreenMode = Modes.VBLANK;
            this.GB.CPU.FlagVBlankRequest = true;
          } else {
            this.ScreenMode = Modes.OAM;
          }
        } else if (mode === Modes.VBLANK) {
          this.Line = this.Reg[Registers.LY] + 1;
          if (this.Reg[Registers.LY] == 154) {
            this.ScreenMode = Modes.OAM;
            this.Line = 0;
            this.Buffer = this.pixels_;
            this.pixels_ = [];
          }
        } else if (mode === Modes.OAM) {
          this.sprites_ = [];
          if (this.SpriteEnable) {
            //Get sprites. Up to 10 sprites to be displayed on this line
            for (let i = 0xFE00; i < 0xFE9F; i += 4) {
              let sprite = this.GB.M.get(i, 4, false);
              let flags = (sprite >>> (8 * 3)) & 0xFF;
              let number = (sprite >>> (8 * 2)) & 0xFF;
              let x = ((sprite >>> 8) & 0xFF) - 8; //0 is -8 on the plane
              let y = (sprite & 0xFF) - 16; //0 is -16 on the plane
              if (this.Reg[Registers.LY] >= y && this.Reg[Registers.LY] < y + this.spriteSize_) {
                //Online insertion sort the sprites array in descending order of priority
                let middle = false;
                for (let j = 0; j < this.sprites_.length; j += 4) {
                  if (x < this.sprites_[j + 2] || x === this.sprites_[j + 2] && number < this.sprites_[j + 1]) {
                    middle = true;
                    this.sprites_.splice(j, 0, flags, number, x, y);
                    break;
                  }
                }
                if (!middle) {
                  this.sprites_.push(flags, number, x, y);
                }
              }
              if (this.sprites_.length === 40) {
                //Only 10 sprites can be displayed on a line, where each sprite has 4 bytes of data
                break;
              }
            }
          }
          this.ScreenMode = Modes.VRAM;
        } else if (mode === Modes.VRAM) {
          //TODO: Make this cycle-accurate instead of rendering the entire line at the end of mode 3
          if (this.Reg[Registers.LY] < 144) {
            for (let x = 0; x < 160; x++) {
              //Use OAM and the BG/window map to determine the final color to be displayed at this pixel
              //Get the background/window color existing at this pixel

              //BG COLOR START
              let bgcolor = null;

              if (!this.BGWindowEnable) {
                bgcolor = 0;
              }
          
              //Determine which map to use for this pixel and calculate the offset from that map
              let start = null;
              let offsetX = null;
              let offsetY = null;
              if (this.WindowEnable && x >= this.Reg[Registers.WX] - 7 && this.Reg[Registers.LY] >= this.Reg[Registers.WY]) {
                start = this.WindowMapStart;
                offsetX = x - (this.Reg[Registers.WX] - 7);
                offsetY = this.Reg[Registers.LY] - this.Reg[Registers.WY];
              } else {
                start = this.BGMapStart;
                //Wrap around BG map if positions overflow
                offsetX = (x + this.Reg[Registers.SCX]) % 256;
                offsetY = (this.Reg[Registers.LY] + this.Reg[Registers.SCY]) % 256;
              }
          
              //Get the tile this pixel is located in relative to the map
              let mapX = Math.floor(offsetX / 8);
              let mapY = Math.floor(offsetY / 8);
              let mapNum = 32 * mapY + mapX;
          
              //Get the starting address for the tile data using the current addressing mode
              let tileNum = this.GB.M.get(0x8000 + start + mapNum, 1, false);
              let tileStart = null;

              //all addresses are relative to the start of VRAM
              switch ((this.Reg[Registers.LCDC] >>> 4) & 0x01) {
                case 0:
                  tileStart = 0x1000 + (tileNum << 24 >> 24) * 16;
                  break;
                case 1:
                  tileStart = tileNum * 16;
                  break;
              }

              //Get the pixel relative to the start of the tile
              let tileX = offsetX - mapX * 8;
              let tileY = offsetY - mapY * 8;
          
              //Get the relevant tile data
              let lineByte0 = this.GB.M.get(0x8000 + tileStart + tileY * 2, 1, false);
              let lineByte1 = this.GB.M.get(0x8000 + tileStart + tileY * 2 + 1, 1, false);
          
              //Get the color for this pixel
              let shift = 8 - tileX - 1;
              let ms = (lineByte1 & (0x01 << shift)) >> shift;
              let ls = (lineByte0 & (0x01 << shift)) >> shift;
              bgcolor = (ms << 1) | ls;
              //BG COLOR END

              //Get the highest priority sprite with non-zero color at this pixel
              let color = null;
              let behind = null;
              let palette = null;
              for (let i = 0; i < this.sprites_.length; i += 4) {
                if (x < this.sprites_[i + 2] || x >= this.sprites_[i + 2] + 8) {
                  continue;
                }
                
                //Unpack the flags for the sprite
                behind = (this.sprites_[i] >>> 7) & 0x01;
                palette = (this.sprites_[i] >>> 4) & 0x01;
                let yFlip = (this.sprites_[i] >>> 6) & 0x01;
                let xFlip = (this.sprites_[i] >>> 5) & 0x01;

                //Get the tile start positions for the sprite
                //(Tile numbers are always unsigned in sprites)
                let start = this.sprites_[i + 1] * 16;

                //Using the flipped state of the sprite, find the corresponding pixel in the sprite that will map to this x and y on the screen.
                let tileX = null;
                if (xFlip) {
                  tileX = this.sprites_[i + 2] + 7 - x;
                } else {
                  tileX = x - this.sprites_[i + 2];
                }
                let tileY = null
                if (yFlip) {
                  tileY = this.sprites_[i + 3] + this.spriteSize_ - 1 - this.Reg[Registers.LY];
                } else {
                  tileY = this.Reg[Registers.LY] - this.sprites_[i + 3];
                }

                //Get the tile data for this line
                let lineByte0 = this.GB.M.get(0x8000 + start + tileY * 2, 1, false);
                let lineByte1 = this.GB.M.get(0x8000 + start + tileY * 2 + 1, 1, false);

                //Get the color for this pixel
                let shift = 8 - tileX - 1;
                let ms = (lineByte1 & (0x01 << shift)) >> shift;
                let ls = (lineByte0 & (0x01 << shift)) >> shift;
                color = (ms << 1) | ls;

                if (color !== 0) {
                  break;
                }
              }

              if (color === null || color === 0 || behind && bgcolor !== 0) {
                this.pixels_.push(this.bgShades_[bgcolor]);
              } else {
                if (palette === 0) {
                  this.pixels_.push(this.obp0Shades_[color]);
                } else if (palette === 1) {
                  this.pixels_.push(this.obp1Shades_[color]);
                }
              }
            }
          }
          this.ScreenMode = Modes.HBLANK;
        }
      }

      //STAT IRQ START
      //cases documented in The Cycle-Accurate Game Boy Docs by AntonioND
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
      if (this.prev_ === false && bool === true) {
        this.GB.CPU.FlagLCDSTATRequest = true;
      }
      this.prev_ = bool;
      //STAT IRQ END

      //DMA START
      if (this.dmaRemain_ > 0) {
        this.dmaRemain_--;
        this.dmaThreshold_--;
        if (this.dmaThreshold_ === -1) {
          this.dmaThreshold_ = 3;
          let byte = (DMA_TOTAL - this.dmaRemain_ - 5) / 4;
          this.GB.M.set(0xFE00 + byte, this.GB.M.get(this.DMASourceAddr + byte, 1, false), 1, false);
        }
      }
      //DMA END
    }
  }

  set LCDC(val) {
    this.Reg[Registers.LCDC] = val;
    switch((val >>> 2) & 0x01) {
      case 0:
        this.spriteSize_ = 8;
        break;
      case 1:
        this.spriteSize_ = 16;
        break;
    }
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
    this.bgShades_ = [val & 0x03, (val & 0x0C) >>> 2, (val & 0x30) >>> 4, (val & 0xC0) >>> 6];
  }

  set OBP0(val) {
    this.Reg[Registers.OBP0] = val;
    this.obp0Shades_ = [val & 0x03, (val & 0x0C) >>> 2, (val & 0x30) >>> 4, (val & 0xC0) >>> 6];
  }

  set OBP1(val) {
    this.Reg[Registers.OBP1] = val;
    this.obp1Shades_ = [val & 0x03, (val & 0x0C) >>> 2, (val & 0x30) >>> 4, (val & 0xC0) >>> 6];
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

  get SpriteEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x02);
  }

  set SpriteEnable(bool) {
    bool ? this.LCDC = this.Reg[Registers.LCDC] | 0x02 : this.LCDC = this.Reg[Registers.LCDC] & ~0x02;
  }

  get BGWindowEnable() {
    return !!(this.Reg[Registers.LCDC] & 0x01);
  }

  set BGWindowEnable(bool) {
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

  get WindowMapStart() {
    switch((this.Reg[Registers.LCDC] >>> 6) & 0x01) {
      case 0:
        return 0x1800;
      case 1:
        return 0x1C00;
    }
  }
}
