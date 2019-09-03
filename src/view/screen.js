export class Screen {
  constructor(canvas, gameBoy) {
    this.canvas_ = canvas;
    this.gameBoy_ = gameBoy;
    this.onUpdate_ = on_update.bind(this);
  }

  get GB() {
    return this.gameBoy_;
  }

  get Canvas() {
    return this.canvas_;
  }

  get Context() {
    return this.canvas_.getContext("2d");
  }

  blank() {
    this.Context.fillStyle = "#82A61E";
    this.Context.fillRect(0, 0, this.Canvas.width, this.Canvas.height);
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
  this.update();
}
