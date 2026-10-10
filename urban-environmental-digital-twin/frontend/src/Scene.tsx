import { SylvaLivingWorldScene } from "./shaders/sylva-living-world/SylvaLivingWorldScene";
import "./shaders/threeui.css";

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
