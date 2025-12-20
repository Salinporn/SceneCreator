import * as THREE from "three";
import { ARConfig, ARSessionState } from "./types";

export class ARSessionManager {
  protected session: XRSession | null = null;
  protected referenceSpace: XRReferenceSpace | null = null;
  protected state: ARSessionState = ARSessionState.Idle;
  protected config: ARConfig;
  protected renderer: THREE.WebGLRenderer | null = null;
  protected initializationPromise: Promise<void> | null = null;

  constructor(config: ARConfig = {}) {
    this.config = {
      requiredFeatures: ["local-floor"],
      optionalFeatures: ["hit-test"],
      hitTestSourceRequestMode: "plane",
      ...config
    };
  }

  public async initialize(renderer: THREE.WebGLRenderer): Promise<void> {
    if (this.state === ARSessionState.Running && this.session !== null) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.state !== ARSessionState.Idle) {
      throw new Error(`Cannot initialize AR session. Current state: ${this.state}`);
    }

    this.state = ARSessionState.Initializing;
    this.renderer = renderer;

    this.initializationPromise = (async () => {
      try {
        if (!navigator.xr) {
          throw new Error("WebXR is not supported in this browser");
        }

        const sessionInit: XRSessionInit = {
          requiredFeatures: this.config.requiredFeatures || [],
          optionalFeatures: this.config.optionalFeatures || []
        };
        
        if (this.config.domOverlay) {
          sessionInit.domOverlay = this.config.domOverlay;
        }

        this.session = await navigator.xr.requestSession("immersive-ar", sessionInit);

        this.setupSessionHandlers();

        this.referenceSpace = await this.session.requestReferenceSpace("local-floor");

        await renderer.xr.setSession(this.session);

        this.state = ARSessionState.Running;
        this.initializationPromise = null;
      } catch (error) {
        this.state = ARSessionState.Error;
        this.initializationPromise = null;
        console.error("Failed to initialize AR session:", error);
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  protected setupSessionHandlers(): void {
    if (!this.session) return;

    this.session.addEventListener("end", () => {
      this.handleSessionEnd();
    });

    this.session.addEventListener("visibilitychange", () => {
      this.handleVisibilityChange();
    });
  }

  protected handleSessionEnd(): void {
    this.state = ARSessionState.Ended;
    this.session = null;
    this.referenceSpace = null;
    this.initializationPromise = null;
  }

  protected handleVisibilityChange(): void {
    if (this.session && this.session.visibilityState === "visible-blurred") {
      this.state = ARSessionState.Paused;
    } else if (this.session && this.session.visibilityState === "visible") {
      this.state = ARSessionState.Running;
    }
  }

  public async end(): Promise<void> {
    if (this.session) {
      await this.session.end();
      this.session = null;
      this.referenceSpace = null;
      this.state = ARSessionState.Ended;
      this.initializationPromise = null;
    }
  }

  public getState(): ARSessionState {
    return this.state;
  }

  public getSession(): XRSession | null {
    return this.session;
  }

  public getReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }

  public isActive(): boolean {
    return this.state === ARSessionState.Running && this.session !== null;
  }

  public dispose(): void {
    if (this.session) {
      this.end().catch(console.error);
    }
    this.renderer = null;
    this.state = ARSessionState.Idle;
    this.initializationPromise = null;
  }
}

