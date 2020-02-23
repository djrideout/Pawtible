import { Screen } from "../screen";
import React, { useEffect } from "react";

export function Canvas(props) {
  let canvas = null;

  useEffect(() => {
    new Screen(canvas, props.gameBoy).run();
  }, []);

  return (
    <canvas id={"screen"} width={160} height={144} ref={ref => canvas = ref} tabIndex={1} />
  );
}
