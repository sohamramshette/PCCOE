import { SylvaLivingWorldScene } from "@designcodeio/threeui";
import "@designcodeio/threeui/style.css";

export function Scene() {
  return (
    <div className="shader-frame">
      <SylvaLivingWorldScene
        variant="living-green"
      />
    </div>
  );
}

export default Scene;
