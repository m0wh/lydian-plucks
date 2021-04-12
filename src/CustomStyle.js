import React, { useRef } from 'react'
import Sketch from 'react-p5'
import MersenneTwister from 'mersenne-twister'
import * as Tone from 'tone'

const DEFAULT_SIZE = 1000

const state = {
  DEFAULT_SIZE: undefined,
  playing: undefined,
  synth: undefined,
  ponks: undefined,
  ponksHistory: undefined,
  scale: undefined,
  width: undefined,
  height: undefined,
  depth: undefined,
  perspective: undefined,
  rad: undefined
}

const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  // distorsion = 0.1,
  // distorsion_wet = 0.1,
  reverb_wet = 0.1,
  reverb_decay = 0.1,
  color_env = '#ffffff',
  color_plucks = '#ffffff',
  background = '#000000',
}) => {
  const shuffleBag = useRef()
  const hoistedValue = useRef()

  let seed = parseInt(block.hash.slice(0, 16), 16);
  shuffleBag.current = new MersenneTwister(seed);
  state.random = (min, max) => {
    console.log()
    if ((typeof min === 'number') && (typeof max === 'number')) return shuffleBag.current.random() * (max - min) + min
    if ((typeof min === 'number') && !(typeof max === 'number')) return shuffleBag.current.random() * min
    if (min instanceof Array) return min[Math.round(shuffleBag.current.random() * (min.length - 1))]
    return shuffleBag.current.random()
  }

  state.DEFAULT_SIZE = DEFAULT_SIZE

  state.playing = true
  state.width = width
  state.height = height
  state.depth = Math.max(width, height)
  state.perspective = 1 / (0.001 * state.depth + 1)
  Tone.start()
  const reverb = new Tone.Reverb()
  const dist = new Tone.Distortion(0.1)
  const st = new Tone.StereoWidener(0.6)
  const comp = new Tone.Compressor(-30, 10);
  const limiter = new Tone.Limiter(-5)
  dist.set({ wet: 0.1 })
  reverb.set({ decay: reverb_decay * 10, wet: reverb_wet })
  state.synth = new Tone.PolySynth().chain(reverb, dist, st, comp, limiter, Tone.Destination)
  state.synth.set({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0,
      decay: state.random() * 10,
      sustain: 0,
      release: 1
    }
  })

  state.ponks = []
  state.ponksHistory = []
  state.rad = 20
  state.scale = [
    ['C3', 'E3', 'G3'],
    ['D3', 'F#3', 'A3'],
    ['E3', 'G3', 'B3'],
    ['F#3', 'A4', 'C3'],
    ['G3', 'B4', 'D3'],
    ['A4', 'C4', 'E3'],
    ['B4', 'D4', 'F#3'],
    ['C4', 'E4', 'G3'],
    ['D4', 'F#4', 'A4'],
    ['E4', 'G4', 'B4'],
    ['F#4', 'A4', 'C4'],
    ['G4', 'A4', 'D4'],
    ['G4', 'A4', 'D4']
  ] // lydian scale

  for (let i = 0; i < state.random(2, 8); i++) {
    state.ponks.push(new Ponk({
      note: state.random(state.scale),
      color: '#ffffff',
      pos: { x: state.random(state.rad, state.width - state.rad), y: state.random(state.rad, state.height - state.rad), z: state.random(state.rad, state.depth - state.rad) },
      speed: state.random() * 2,
      angle: [state.random(0, Math.PI * 2), state.random(0, Math.PI * 2)]
    }))
  }

  const setup = (p5, canvasParentRef) => {
    const _p5 = p5.createCanvas(width, height).parent(canvasParentRef)
    canvasRef.current = p5
    if (_p5) { }

    p5.background(background)

    attributesRef.current = () => {
      return { // https://docs.opensea.io/docs/metadata-standards
        attributes: [
          {
            display_type: 'number',
            trait_type: 'your trait here number',
            value: hoistedValue.current, // using the hoisted value from within the draw() method, stored in the ref.
          },

          {
            trait_type: 'your trait here text',
            value: 'replace me',
          },
        ],
      }
    }
  }

  const draw = (p5) => {
    state.depth = Math.max(p5.width, p5.height) 
    state.perspective = 1 / (0.001 * state.depth + 1)
  
    p5.background(background)
    p5.fill(background)
    p5.stroke(color_env)
  
    p5.line(0, 0, p5.width, p5.height)
    p5.line(0, p5.height, p5.width, 0)
    p5.rect(p5.width * (1 - state.perspective) / 2, p5.height * (1 - state.perspective) / 2, p5.width * state.perspective, p5.height * state.perspective)
    
    state.ponks.forEach(ponk => {
      ponk.update()
      ponk.draw()
    })
  
    while (state.ponksHistory.length > 300) state.ponksHistory.shift()
    const hist = [...state.ponksHistory]
    hist.sort((a, b) => b.z - a.z).forEach(({ x, y, z, color }) => {
      const X = p5.map(
        x, 0, p5.width,
        p5.map(z, 0, state.depth, 0, p5.width * (1 - state.perspective) / 2),
        p5.map(z, 0, state.depth, p5.width, p5.width * (state.perspective + (1 - state.perspective) / 2))
      )
      const Y = p5.map(
        y, 0, p5.height,
        p5.map(z, 0, state.depth, 0, p5.height * (1 - state.perspective) / 2),
        p5.map(z, 0, state.depth, p5.height, p5.height * (state.perspective + (1 - state.perspective) / 2))
      )
      const Z = p5.map(z, 0, state.depth, state.rad, state.rad * state.perspective)
  
      p5.fill(background)
      p5.stroke(color_plucks)
      p5.ellipse(X, Y, Z)
    })
  }

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />
}


class Ponk {
  constructor ({ note, pos, speed, angle, color }) {
    this.note = note
    this.color = color
    this.pos = pos
    this.speed = speed
    this.vel = {
      x: speed * 3 + 3 * Math.cos(angle[0]),
      y: speed * 3 + 3 * Math.sin(angle[0]),
      z: speed * 3 + 3 * Math.cos(angle[1])
    }
  }

  update () {
    if (this.pos.x + this.vel.x >  (state.width - state.rad) || this.pos.x + this.vel.x < state.rad) {
      this.vel.x = -this.vel.x
      this.pos.x = Math.max(Math.min(this.pos.x, state.width - state.rad), state.rad)
      this.sing()
    }

    if (this.pos.y + this.vel.y >  (state.height - state.rad) || this.pos.y + this.vel.y < state.rad) {
      this.vel.y = -this.vel.y
      this.pos.y = Math.max(Math.min(this.pos.y, state.height - state.rad), state.rad)
      this.sing()
    }

    if (this.pos.z + this.vel.z >  (state.depth - state.rad) || this.pos.z + this.vel.z < state.rad) {
      this.vel.z = -this.vel.z
      this.pos.z = Math.max(Math.min(this.pos.z, state.depth - state.rad), state.rad)
      this.sing()
    }

    this.pos = {
      x: this.pos.x + (state.playing ? this.vel.x : 0),
      y: this.pos.y + (state.playing ? this.vel.y : 0),
      z: this.pos.z + (state.playing ? this.vel.z : 0)
    }
  }

  draw () {
    state.ponksHistory.push({ ...this.pos, color: this.color })
  }

  sing () {
    if (state.synth) {
      state.synth.triggerAttackRelease(this.note, '8n', undefined, (1 - this.pos.z / state.depth) * 0.8 + 0.2) // , 0.01, 0, 1 - this.pos.z / state.depth)
    }
  }
}

export default CustomStyle

const styleMetadata = {
  name: 'Lydian Plucks',
  description: 'Generative Rythm Composer',
  image: '',
  creator_name: 'Nèr Arfer',
  options: {
    // distorsion: 0.1,
    // distorsion_wet: 0.1,
    reverb_wet: 0.1,
    reverb_decay: 0.1,
    color_env: '#ffffff',
    color_plucks: '#ffffff',
    background: '#000000'
  }
}

export { styleMetadata }
