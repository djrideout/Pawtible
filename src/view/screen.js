const HexColors = ["#FFFFFF", "#C7C7C7", "#6E6E6E", "#000000"]; //colours for each shade
  //white, light grey, dark grey, black

export class Screen {
  constructor(canvas, gameBoy) {
    this.canvas_ = canvas;
    this.context_ = this.canvas_.getContext('2d');
    this.GB = gameBoy;
    this.onUpdate_ = on_update.bind(this);
  }

  run() {
    this.update();
  }

  update() {
    window.requestAnimationFrame(this.onUpdate_);
  }
}

function on_update(now) {
  this.GB.CPU.runFrame();
  let b = this.GB.PPU.Buffer;
  this.context_.clearRect(0, 0, this.canvas_.width, this.canvas_.height);
  for(let i = 1; i < b.length; i++) {
    let shade = b[i];
    this.context_.beginPath();
    this.context_.fillStyle = HexColors[i];
    for(let j = 0; j < shade.length; j += 4) {
      this.context_.rect(shade[j], shade[j + 1], shade[j + 2], shade[j + 3]);
    }
    this.context_.fill();
  }
  this.update();
}
