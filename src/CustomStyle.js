import React, { useRef } from 'react'
import Sketch from 'react-p5'
import MersenneTwister from 'mersenne-twister'
import * as Tone from 'tone'

const plucksMinMax = [2, 8]
const maxEllipses = 200
const maxPolyphony = 16
const rad = 20 // rad * Mius of each ball
const notes = [
  { name: 'G', octave: 2 },
  { name: 'A', octave: 3 },
  { name: 'B', octave: 3 },
  { name: 'C', octave: 3 },
  { name: 'D', octave: 3 },
  { name: 'E', octave: 3 },
  { name: 'F#', octave: 3 },
  { name: 'G', octave: 3 },
  { name: 'A', octave: 4 },
  { name: 'B', octave: 4 }
]

/* ============================ */

// initial values
let plucks
let M, DEPTH, WIDTH, HEIGHT, CENTER
let perspective
let synth


const CustomStyle = ({
  canvasRef, attributesRef, handleResize,
  block, width, height,
  
  mod1 = 0.5,
  mod2 = 0.5,
  mod3 = 0.5,
  mod4 = 0.5,
  mod5 = 0.5,
  color1 = '#ffffff',
  color2 = '#ffffff',
  background = '#000000'
}) => {
  const shuffleBag = useRef()
  // const hoistedValue = useRef()
  
  // seeded random function
  let seed = parseInt(block.hash.slice(0, 16), 16);
  shuffleBag.current = new MersenneTwister(seed);
  function random (min, max) {
    if ((typeof min === 'number') && (typeof max === 'number')) return shuffleBag.current.random() * (max - min) + min
    if ((typeof min === 'number') && !(typeof max === 'number')) return shuffleBag.current.random() * min
    if (min instanceof Array) return min[Math.round(shuffleBag.current.random() * (min.length - 1))]
    return shuffleBag.current.random()
  }

  document.addEventListener('click', () => {
    if (Tone.context.rawContext.state !== 'running') {
      Tone.context.rawContext.resume()
      Tone.start()
    }
  })

  let waveform = 'Sine'
  if (random() < 5 / 100) { waveform = 'Triangle' } // rare property

  const scaleName = random([
    'Unison',
    'Third',
    'Fourth',
    'Fifth',
    'Triad',
    'Seventh',
    '6/9',
    'Ninth',
  ])

  DEPTH = Math.min(width, height)
  WIDTH = Math.min(width, height) * 0.9 * (mod5 > 0.5 ? 1 - (mod5 - 0.5) : 1)
  HEIGHT = Math.min(width, height) * 0.9 * (mod5 < 0.5 ? 0.5 + mod5 : 1)
  CENTER = { x: (width - WIDTH) / 2, y: (height - HEIGHT) / 2 }
  M = Math.min(width, height) / 450
  perspective = 1 / (0.005 * mod2 * mod2 * DEPTH + 1)

  if (synth) synth.set({
    oscillator: { type: waveform.toLowerCase() },
    envelope: { decay: random(10) }
  })

  const scale = notes.map((_, i) => createChord(i + 1, scaleName))

  plucks = []
  for (let i = 0; i < random(...plucksMinMax); i++) {
    const pluck = new Pluck({ width: WIDTH, height: HEIGHT, depth: DEPTH }, {
      note: random(scale),
      pos: { x: random(rad * M, WIDTH - rad * M), y: random(rad * M, HEIGHT - rad * M), z: random(rad * M, DEPTH - rad * M) },
      speed: random(.15, .6), // px / ms
      angle: [random(0, Math.PI * 2), random(0, Math.PI * 2)]
    })
    plucks.push(pluck)
  }

  attributesRef.current = () => ({ // https://docs.opensea.io/docs/metadata-standards
    attributes: [
      {
        trait_type: "Waveform",
        value: waveform
      },
      {
        trait_type: "Chords Interval",
        value: scaleName
      },
      {
        display_type: "number",
        trait_type: "Plucks Population",
        value: plucks.length
      }
    ]
  })

  const setup = (p5, canvasParentRef) => {
    const _p5 = p5.createCanvas(width, height).parent(canvasParentRef)
    canvasRef.current = p5
    if (_p5) { }

    p5.background(background)

    const reverb = new Tone.Reverb()
    const dist = new Tone.Distortion(0.15)
    const limiter = new Tone.Limiter(-12)
    dist.set({ wet: 0.05 })
    reverb.set({ decay: 4, wet: 0.2, preDelay: 0.1 })

    Tone.Destination.volume.value = -24
    synth = new Tone.PolySynth({ maxPolyphony })
    synth.set({
      oscillator: { type: waveform.toLowerCase() },
      envelope: {
        attack: 0.0008,
        decay: random(10),
        sustain: 0,
        release: 1
      }
    })

    synth.chain(reverb, dist, limiter, Tone.Destination)
  }

  let oldTime = 0

  const draw = (p5) => {
    const time = p5.millis()

    p5.translate(CENTER.x, CENTER.y)

    // draw environment
    p5.background(background)
    p5.fill(background)
    p5.stroke(color1)
    p5.strokeWeight(M)

    p5.line(-M, -M, WIDTH * mod3 - M, HEIGHT * mod4 - M) // top left
    p5.line(WIDTH, -M, WIDTH * mod3, HEIGHT * mod4 - M) // top right
    p5.line(-M, HEIGHT, WIDTH * mod3 - M, HEIGHT * mod4) // bottom left
    p5.line(WIDTH, HEIGHT, WIDTH * mod3, HEIGHT * mod4) // bottom right

    p5.rect(WIDTH * (1 - perspective) * mod3 - M, HEIGHT * (1 - perspective) * mod4 - M, WIDTH * perspective + M, HEIGHT * perspective + M)

    p5.noFill()

    p5.rect(-M, -M, WIDTH + M, HEIGHT + M)

    // draw plucks and their trails
    plucks.map(pluck => {
      if (
        Math.sign(pluck.getVelocityAt(oldTime).x) !== Math.sign(pluck.getVelocityAt(time).x) ||
        Math.sign(pluck.getVelocityAt(oldTime).y) !== Math.sign(pluck.getVelocityAt(time).y) ||
        Math.sign(pluck.getVelocityAt(oldTime).z) !== Math.sign(pluck.getVelocityAt(time).z)
      ) {
        synth.triggerAttackRelease(pluck.note, '8n', undefined, p5.map(pluck.getPositionAt(time).z, 0, DEPTH, 1, 0.05))
      }

      const pluckAndTrail = []
      for (let i = 0; i < Math.round(maxEllipses / plucks.length); i++) {
        if (time - i * mod1 * 15 * M / pluck.speed >= 0) {
          pluckAndTrail.push({...pluck.getPositionAt(
            Math.max(0, time - i * mod1 * 15 * M / pluck.speed)
          )})
        }
      }
      
      return pluckAndTrail
    }).flat()
      .sort((a, b) => b.z - a.z)
      .forEach(({ x, y, z }) => {
        p5.fill(background)
        p5.stroke(color2)

        p5.ellipse(
          p5.map(
            x, 0, WIDTH,
            p5.map(z, 0, DEPTH, 0, WIDTH * (1 - perspective) * mod3),
            p5.map(z, 0, DEPTH, WIDTH, WIDTH * (perspective + (1 - perspective) * mod3))
          ),
          p5.map(
            y, 0, HEIGHT,
            p5.map(z, 0, DEPTH, 0, HEIGHT * (1 - perspective) * mod4),
            p5.map(z, 0, DEPTH, HEIGHT, HEIGHT * (perspective + (1 - perspective) * mod4))
          ),
          p5.map(z, 0, DEPTH, rad * M, rad * M * perspective)
        )
      })

    oldTime = time
  }

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />
}

export default CustomStyle

const styleMetadata = {
  name: 'Lydian Plucks',
  description: 'Observe and listen to these primitive crypto-life forms bouncing inside Ethereum blocks. As the chain is evolving, they compose rhythms and melodies from another space.',
  image: '',
  creator_name: 'Nèr Arfer',
  options: {
    mod1: 0.5, // trail_length
    mod2: 0.5, // fov
    mod3: 0.5, // persp_x
    mod4: 0.5, // persp_y
    mod5: 0.5, // ratio
    color1: '#ffffff', // color_env
    color2: '#ffffff', // color_plucks
    background: '#000000' // background
  }
}

export { styleMetadata }

function getChord (root, intervals) {
  return [
    notes[root - 1].name + notes[root - 1].octave,
    ...intervals.map(interval => {
      const index = (root + interval - 1) - 1
      return notes[index % notes.length].name + (notes[index % notes.length].octave + Math.floor(index / notes.length))
    })
  ]
}

function createChord (root, name) {
  switch (name.toLowerCase()) {
    case 'third': return getChord(root, [3])
    case 'fourth': return getChord(root, [4])
    case 'fifth': return getChord(root, [5])
    case 'triad': return getChord(root, [3, 5])
    case 'seventh': return getChord(root, [3, 5, 7])
    case 'ninth': return getChord(root, [3, 5, 9])
    case '6/9': return getChord(root, [3, 6, 9])
    case 'unison': return getChord(root, [])
    default: return getChord(root, [])
  }
}

class Pluck {
  constructor ({ width, height, depth }, { note, pos, speed, angle }) {
    this.boxWidth = width
    this.boxHeight = height
    this.boxDepth = depth

    this.speed = speed * M
    this.note = note
    this.pos = pos
    this.vel = {
      x: speed * M * Math.cos(angle[0]),
      y: speed * M * Math.sin(angle[0]),
      z: speed * M * Math.cos(angle[1])
    }
  }

  getPositionAt (t) {
    // triangle function (bounce) : f(x) = |(pos + vel * x + size * sign(speed)) % (2 * size) - size * sign(speed) |
    const calculatePosWithBounces = (pos, vel, boxSize) =>
      rad * M / 2 + Math.abs((pos + vel * t + Math.sign(vel) * (boxSize - rad * M)) % (2 * (boxSize - rad * M)) - Math.sign(vel) * (boxSize - rad * M))

    return {
      x: calculatePosWithBounces(this.pos.x, this.vel.x,this.boxWidth),
      y: calculatePosWithBounces(this.pos.y, this.vel.y,this.boxHeight),
      z: calculatePosWithBounces(this.pos.z, this.vel.z,this.boxDepth)
    }
  }

  getVelocityAt (t) {
    const calculateVelWithBounces = (pos, vel, boxSize) =>
      Math.sign((pos + vel * t + Math.sign(vel) * (boxSize - rad * M)) % (2 * (boxSize - rad * M)) - Math.sign(vel) * (boxSize - rad * M)) * vel

    return {
      x: calculateVelWithBounces(this.pos.x, this.vel.x,this.boxWidth),
      y: calculateVelWithBounces(this.pos.y, this.vel.y,this.boxHeight),
      z: calculateVelWithBounces(this.pos.z, this.vel.z,this.boxDepth)
    }
  }
}
