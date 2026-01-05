import * as THREE from "three";
import { ARSessionManager } from "./ARSessionManager";
import { ARConfig, ARHitTestResult } from "./types";


export class ARHitTestManager extends ARSessionManager {
  protected hitTestSource: XRHitTestSource | null = null;
  protected hitTestSourceRequestMode: "point" | "plane" | "mesh";

  constructor(config: ARConfig = {}) {
    super(config);
    
    this.hitTestSourceRequestMode = (config.hitTestSourceRequestMode || "plane") as "point" | "plane" | "mesh";
  }


  public async initialize(renderer: THREE.WebGLRenderer): Promise<void> {
    await super.initialize(renderer);

    await this.initializeHitTestSource();
  }

  protected setupSessionHandlers(): void {
    super.setupSessionHandlers();

    if (!this.session) return;

    this.session.addEventListener("end", () => {
      this.cleanupHitTestSource();
    });
  }

  protected async initializeHitTestSource(): Promise<void> {
    if (!this.session || !this.referenceSpace) {
      throw new Error("AR session or reference space not initialized");
    }

    const session = this.session;

    try {
      const viewerSpace = await session.requestReferenceSpace("viewer");
      const hitTestOptions: XRHitTestOptionsInit = {
        space: viewerSpace
      };

      if (typeof XRRay !== "undefined") {
        hitTestOptions.offsetRay = new XRRay();
      }
      
      try {
        if (session.requestHitTestSource) {
          const hitTestSource = await session.requestHitTestSource(hitTestOptions);
          if (hitTestSource) {
            this.hitTestSource = hitTestSource;
          } else {
            this.hitTestSource = null;
          }
        } else {
          console.warn("Hit test source not supported");
          this.hitTestSource = null;
        }
      } catch (err) {
        console.warn("Hit test source request failed:", err);
        this.hitTestSource = null;
      }

    } catch (error) {
      console.warn("Failed to initialize hit test source:", error);
    }
  }

  public performHitTest(
    frame: XRFrame
  ): ARHitTestResult[] | null {
    if (!this.hitTestSource || !this.referenceSpace) {
      return null;
    }

    try {
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (hitTestResults.length === 0) {
        return null;
      }

      const results: ARHitTestResult[] = [];

      for (const hit of hitTestResults) {
        const pose = hit.getPose(this.referenceSpace);
        if (!pose) continue;

        const position = new THREE.Vector3(
          pose.transform.position.x,
          pose.transform.position.y,
          pose.transform.position.z
        );

        const rotation = new THREE.Quaternion(
          pose.transform.orientation.x,
          pose.transform.orientation.y,
          pose.transform.orientation.z,
          pose.transform.orientation.w
        );

        const matrix = new THREE.Matrix4().compose(
          position,
          rotation,
          new THREE.Vector3(1, 1, 1)
        );

        const distance = position.length();

        // Extract surface normal from rotation
        const upVector = new THREE.Vector3(0, 1, 0);
        const normal = upVector.applyQuaternion(rotation).normalize();

        results.push({
          position,
          rotation,
          matrix,
          distance,
          normal
        });
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.error("Error performing hit test:", error);
      return null;
    }
  }

  public getFirstHitTestResult(frame: XRFrame): ARHitTestResult | null {
    const results = this.performHitTest(frame);
    return results && results.length > 0 ? results[0] : null;
  }

  public isHitTestAvailable(): boolean {
    return this.hitTestSource !== null && this.referenceSpace !== null;
  }


  protected cleanupHitTestSource(): void {
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }
  }

  protected handleSessionEnd(): void {
    this.cleanupHitTestSource();
    super.handleSessionEnd();
  }

  public dispose(): void {
    this.cleanupHitTestSource();
    super.dispose();
  }
}

