import { Screen } from "../screen.js";

export function Canvas(props) {
  let canvas = null;

  React.useEffect(() => {
    new Screen(canvas, props.gameBoy).run();
  }, []);

  return /*#__PURE__*/React.createElement("canvas", {
    id: "screen",
    width: 160,
    height: 144,
    ref: ref => canvas = ref,
    tabIndex: 1
  });
}
