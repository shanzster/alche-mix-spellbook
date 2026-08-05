// MindAR ships no TypeScript types. We only touch a handful of members, so a
// loose ambient declaration for the prod bundle we dynamically import is enough.
declare module "mind-ar/dist/mindar-image-three.prod.js" {
  import type * as THREE from "three";

  export interface MindARAnchor {
    group: THREE.Group;
    onTargetFound?: () => void;
    onTargetLost?: () => void;
  }

  export class MindARThree {
    constructor(opts: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: string;
      uiScanning?: string;
      uiError?: string;
      filterMinCF?: number;
      filterBeta?: number;
    });
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    addAnchor(targetIndex: number): MindARAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}
