import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DragControls } from 'three/addons/controls/DragControls.js'
import Stats from 'stats.js'
import GUI from 'lil-gui'
import { resizeRendererToDisplaySize } from './helpers/responsiveness'
import { toggleFullScreen } from './helpers/fullscreen'
import './style.css'

const CANVAS_ID = 'scene'

let canvas: HTMLCanvasElement
let renderer: THREE.WebGLRenderer
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let cameraControls: OrbitControls
let dragControls: DragControls
let stats: Stats
let gui: GUI

const animation = { enabled: true, play: true }

const connections: { line: THREE.Line; from: THREE.Mesh; to: THREE.Mesh }[] = []
const serviceBoxes: THREE.Mesh[] = []
const boxLabels: { mesh: THREE.Mesh; element: HTMLDivElement }[] = []

init()
animate()

function init() {
  canvas = document.querySelector(`canvas#${CANVAS_ID}`)!

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  document.body.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#1a1a1a')

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(4, 5, 10)

  cameraControls = new OrbitControls(camera, canvas)
  cameraControls.enableDamping = true
  cameraControls.autoRotate = false

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 1)
  pointLight.position.set(5, 5, 5)
  pointLight.castShadow = true
  scene.add(pointLight)

  const gridHelper = new THREE.GridHelper(20, 20)
  scene.add(gridHelper)

  const axesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)


  const services = [
    { name: 'Tätigkeit',       color: '#f69f1f', position: new THREE.Vector3(-2, 0, -2) },
    { name: 'Dienst',          color: '#1f9ff6', position: new THREE.Vector3(2, 0, -2) },
    { name: 'Rolle',           color: '#9f1ff6', position: new THREE.Vector3(-2, 0, 2) },
    { name: 'Aufgabe',         color: '#9f1ff6', position: new THREE.Vector3(2, 0, 2) },
    { name: 'Bedarf',          color: '#00cc66', position: new THREE.Vector3(-2, 4, -2) },
    { name: 'Verfügbarkeit',   color: '#00ccee', position: new THREE.Vector3(2, 4, -2) },
    { name: 'Schicht',         color: '#ff3366', position: new THREE.Vector3(0, 4, 0) }, // oben Mitte
  ]
  

  const labelContainer = document.createElement('div')
  labelContainer.style.position = 'absolute'
  labelContainer.style.top = '0'
  labelContainer.style.left = '0'
  labelContainer.style.pointerEvents = 'none'
  labelContainer.style.zIndex = '10'
  document.body.appendChild(labelContainer)

  for (const service of services) {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({
      color: service.color,
      metalness: 0.4,
      roughness: 0.6,
    })
    const box = new THREE.Mesh(geometry, material)
    box.position.copy(service.position)
    box.castShadow = true
    box.name = service.name
    scene.add(box)
    serviceBoxes.push(box)

    const label = document.createElement('div')
    label.textContent = service.name
    label.style.position = 'absolute'
    label.style.color = 'white'
    label.style.fontSize = '14px'
    label.style.background = 'rgba(0,0,0,0.6)'
    label.style.padding = '2px 6px'
    label.style.borderRadius = '4px'
    labelContainer.appendChild(label)
    boxLabels.push({ mesh: box, element: label })
  }

  const connectionPairs = [
    ['Tätigkeit', 'Dienst'],
    ['Dienst', 'Rolle'],
    ['Rolle', 'Aufgabe'],
    ['Aufgabe', 'Rolle'],
    ['Aufgabe', 'Dienst'],
    ['Tätigkeit', 'Rolle'],
    ['Bedarf', 'Tätigkeit'],
    ['Bedarf', 'Dienst'],
    ['Bedarf', 'Rolle'],
    ['Bedarf', 'Aufgabe'],
    ['Bedarf', 'Verfügbarkeit'],
    ['Verfügbarkeit', 'Tätigkeit'],
    ['Verfügbarkeit', 'Dienst'],
    ['Verfügbarkeit', 'Rolle'],
    ['Verfügbarkeit', 'Aufgabe'],
    ['Verfügbarkeit', 'Bedarf'],
    // Verbindungen von Schicht zu allen anderen
    ['Schicht', 'Tätigkeit'],
    ['Schicht', 'Dienst'],
    ['Schicht', 'Rolle'],
    ['Schicht', 'Aufgabe'],
    ['Schicht', 'Bedarf'],
    ['Schicht', 'Verfügbarkeit'],
  ]


  const lineMaterial = new THREE.LineBasicMaterial({ color: 'white' })



  for (const [fromName, toName] of connectionPairs) {
    const from = serviceBoxes.find((b) => b.name === fromName)
    const to = serviceBoxes.find((b) => b.name === toName)
    if (!from || !to) continue

    const points = [from.position.clone(), to.position.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const line = new THREE.Line(geometry, lineMaterial)
    scene.add(line)
    connections.push({ line, from, to })
  }

  dragControls = new DragControls(serviceBoxes, camera, renderer.domElement)

  dragControls.addEventListener('dragstart', () => {
    cameraControls.enabled = false
    animation.play = false
  })

  dragControls.addEventListener('dragend', () => {
    cameraControls.enabled = true
    animation.play = true
  })

  window.addEventListener('dblclick', (event) => {
    if (event.target === canvas) {
      toggleFullScreen(canvas)
    }
  })

  stats = new Stats()
  document.body.appendChild(stats.dom)

  gui = new GUI()
  gui.add(cameraControls, 'autoRotate').name('Auto-Rotate')
  
  // Helfer-Folder
  const helpersFolder = gui.addFolder('Helfer')
  helpersFolder.add(gridHelper, 'visible').name('Gitterebene')
  helpersFolder.add(axesHelper, 'visible').name('XYZ-Achsen')
  helpersFolder.open()
  
}


function animate() {
  requestAnimationFrame(animate)

  stats.begin()

  if (resizeRendererToDisplaySize(renderer)) {
    const canvas = renderer.domElement
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  }

  connections.forEach(({ line, from, to }) => {
    const positions = (line.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute
    positions.setXYZ(0, from.position.x, from.position.y, from.position.z)
    positions.setXYZ(1, to.position.x, to.position.y, to.position.z)
    positions.needsUpdate = true
  })

  boxLabels.forEach(({ mesh, element }) => {
    const vector = mesh.position.clone().project(camera)
    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth
    const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight
    element.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`
    element.style.display = vector.z < 1 ? 'block' : 'none'
  })

  cameraControls.update()
  renderer.render(scene, camera)

  stats.end()
}