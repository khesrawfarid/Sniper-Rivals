import React, { Component, ErrorInfo, ReactNode } from "react";
import * as THREE from "three";
import { RigidBody } from "@react-three/rapier";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MapErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Map loading error caught:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      return (
        <group>
          <RigidBody type="fixed" colliders="hull">
            <mesh receiveShadow position={[0, -0.5, 0]}>
              <boxGeometry args={[100, 1, 100]} />
              <meshStandardMaterial color="#3a404a" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh receiveShadow position={[0, 2, -10]}>
              <boxGeometry args={[10, 4, 1]} />
              <meshStandardMaterial color="#ff4444" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh receiveShadow position={[10, 2, 0]}>
              <boxGeometry args={[1, 4, 10]} />
              <meshStandardMaterial color="#44ff44" />
            </mesh>
          </RigidBody>
          <RigidBody type="fixed" colliders="cuboid">
            <mesh receiveShadow position={[-10, 2, 0]}>
              <boxGeometry args={[1, 4, 10]} />
              <meshStandardMaterial color="#4444ff" />
            </mesh>
          </RigidBody>
        </group>
      );
    }

    return this.props.children;
  }
}
