export class Screen {
  constructor(canvas) {
    this.canvas_ = canvas;
  }

  get Canvas() {
    return this.canvas_;
  }

  get Context() {
    return this.canvas_.getContext("2d");
  }

  pinkScreen() {
    this.Context.fillStyle = "#82A61E";
    this.Context.fillRect(0, 0, this.Canvas.width, this.Canvas.height);
  }
}
