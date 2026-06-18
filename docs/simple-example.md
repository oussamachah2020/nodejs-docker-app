# Simple Example

**Threejs** is a framework js that allows you to build, create and style 3D shapes on a canvas

To Start , install the deps

```bash
npm install three @react-three/fiber @react-three/drei
```

- **three** — the core 3D engine (math, rendering, geometries)
- **@react-three/fiber** — lets you write Three.js using React components instead of raw JS
- **@react-three/drei** — a helper library with useful extras (orbit controls, lighting presets, etc.)

## **First Code:**

```js
import { Canvas } from '@react-three/fiber'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial color="royalblue" />
        </mesh>
      </Canvas>
    </div>
  )
}
```
## Make The cube Rotate

To animate in React Three Fiber, you use a special hook called useFrame. It runs on every frame (60 times per second), like a game loop.

```js
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function Box() {
  const ref = useRef()

  useFrame((state, delta) => {
    ref.current.rotation.y += delta
  })

  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <Box />
      </Canvas>
    </div>
  )
}
```

### What's new and why:

- **useRef()** — gives you a direct reference to the 3D mesh object. You need this to change its rotation each frame

- **useFrame((state, delta) => {...})** — runs every frame. delta is the time since the last frame in seconds (usually ~0.016). Using delta instead of a fixed number keeps the speed consistent on all devices

- **ref.current.rotation.y += delta** — increments the Y-axis rotation each frame

- **Box is its own component** — this is the React Three Fiber pattern. Keep 3D objects as separate components, not inline in Canvas

---

# More Shapres

```js
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'

function Box() {
  const ref = useRef()
  useFrame((_, delta) => { ref.current.rotation.y += delta })
  return (
    <mesh ref={ref} position={[-3, 0, 0]}>
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  )
}

function Sphere() {
  const ref = useRef()
  useFrame((_, delta) => { ref.current.rotation.y += delta })
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

function Torus() {
  const ref = useRef()
  useFrame((_, delta) => { ref.current.rotation.x += delta })
  return (
    <mesh ref={ref} position={[3, 0, 0]}>
      <torusGeometry args={[1, 0.4, 16, 100]} />
      <meshStandardMaterial color="limegreen" />
    </mesh>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Box />
        <Sphere />
        <Torus />
      </Canvas>
    </div>
  )
}
```

- **`position={[ x, y, z ]}`** : places shape in 3D space.
- **`args={[...}`** :   passes size values into the geometry. Each shape has different args:

      boxGeometry:  args={[width, height, depth]}
      sphereGeometry:  args={[radius, widthSegments, heightSegments]} — higher segments = smoother sphere
      torusGeometry:  args={[radius, tubeRadius, radialSegments, tubularSegments]}

- **`camera={{ position: [0, 0, 8] }}`** : moved the camera back so all 3 shapes fit in view
- **`<pointLight>`** : a light that shines from a point in space, like a light bulb. Adds more depth than ambient light alone 

--- 

# OrbitControls
```js
 <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        ---
        <OrbitControls />
        ---
        <Shape
          position={[-3, 0, 0]}
          color="royalblue"
          geometry={<boxGeometry args={[1.5, 1.5, 1.5]} />}
        />
        <Shape
          position={[0, 0, 0]}
          color="hotpink"
          geometry={<sphereGeometry args={[1, 32, 32]} />}
        />
        <Shape
          position={[3, 0, 0]}
          color="limegreen"
          geometry={<torusGeometry args={[1, 0.4, 16, 100]} />}
        />
      </Canvas>
    </div>
```
allows the user to interact with and navigate around a 3D scene using a mouse, keyboard, or touch.

---

# Floor

```js
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#888888" />
    </mesh>
  )
}
```

- **`castShadow`** on each shape — tells Three.js this object should cast a shadow onto other surfaces
receiveShadow on the floor — tells Three.js this surface should show shadows cast onto it
- **`<directionalLight>`** — a light that shines in one direction like the sun, replaces pointLight because it supports shadows better
- **`shadow-mapSize={[1024, 1024]}`** — controls shadow quality. Higher = sharper shadows but more GPU cost. Try [256, 256] to see blurry shadows vs [2048, 2048] for crisp ones
- **`<Floor>`** component — a flat planeGeometry rotated 90 degrees. By default planes are vertical, rotation={[-Math.PI / 2, 0, 0]} tips it flat. -Math.PI / 2 is just -90 degrees in radians






