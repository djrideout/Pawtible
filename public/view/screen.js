import { GameController } from "./controller.js";

export class Screen {
  constructor(canvas, gameBoy) {
    this.canvas_ = canvas;
    this.controller_ = new GameController(gameBoy);
    this.context_ = this.canvas_.getContext('2d');
    this.GB = gameBoy;
    this.canvas_.addEventListener('keydown', this.controller_.onKeyDown);
    this.canvas_.addEventListener('keyup', this.controller_.onKeyUp);
    this.colors_ = ["#FFFFFF", "#A9A9A9", "#686868", "#000000"].map((b) => {
      this.context_.fillStyle = b;
      this.context_.fillRect(0, 0, this.canvas_.width, this.canvas_.height);
      return this.context_.getImageData(0, 0, 1, 1).data;
    });
    this.run = this.run.bind(this);
  }

  run() {
    window.requestAnimationFrame(this.run);
    this.controller_.update();
    this.GB.CPU.runFrame();
    let b = this.GB.PPU.Buffer;
    //Fill with basic color
    this.context_.fillStyle = "black";
    this.context_.fillRect(0, 0, this.canvas_.width, this.canvas_.height);
    //Prepare ImageData
    let frame = new ImageData(this.canvas_.width, this.canvas_.height);
    for (let i = 0; i < b.length; i++) {
      let dataPoint = b[i];
      //Skip base color
      if (dataPoint == 0) {
        continue;
      }
      //Set color from palette
      frame.data.set(this.colors_[dataPoint], i * 4);
    }
    //Put ImageData on canvas
    this.context_.putImageData(frame, 0, 0);
  }
}
