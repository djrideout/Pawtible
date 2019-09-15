export class Screen {
  constructor(canvas, gameBoy) {
    this.canvas_ = canvas;
    this.context_ = canvas.getContext("2d");
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
  this.context_.fillStyle = "#FFFFFF";
  this.context_.fillRect(0, 0, this.canvas_.width, this.canvas_.height);
  let b = this.GB.PPU.Buffer;
  for(let i = 0; i < b.length; i++) {
    let row = b[i];
    for(let j = 0; j < row.length; j++) {
      this.context_.fillStyle = row[j];
      this.context_.fillRect(j, i, 1, 1);
    }
  }
  this.update();
}
