import React, { useRef } from 'react'
import Sketch from 'react-p5'
import MersenneTwister from 'mersenne-twister'
import * as Tone from 'tone'

const maxEllipses = 300
const rad = 20 // radius of each ball
const scale = [ // chords used by plucks (lydian scale)
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
]

/* ============================ */

// initial values
let plucks
let depth
let perspective
let synth

class Pluck {
  constructor ({ width, height, depth }, { note, pos, speed, angle }) {
    this.boxWidth = width
    this.boxHeight = height
    this.boxDepth = depth

    this.speed = speed
    this.note = note
    this.pos = pos
    this.vel = {
      x: speed * Math.cos(angle[0]),
      y: speed * Math.sin(angle[0]),
      z: speed * Math.cos(angle[1])
    }
  }

  getPositionAt (t) {
    // triangle function (bounce) : f(x) = |(pos + vel * x + size * sign(speed)) % (2 * size) - size * sign(speed) |
    const calculatePosWithBounces = (pos, vel, boxSize) =>
      rad / 2 + Math.abs((pos + vel * t + Math.sign(vel) * (boxSize - rad)) % (2 * (boxSize - rad)) - Math.sign(vel) * (boxSize - rad))

    return {
      x: calculatePosWithBounces(this.pos.x, this.vel.x,this.boxWidth),
      y: calculatePosWithBounces(this.pos.y, this.vel.y,this.boxHeight),
      z: calculatePosWithBounces(this.pos.z, this.vel.z,this.boxDepth)
    }
  }

  getVelocityAt (t) {
    const calculateVelWithBounces = (pos, vel, boxSize) =>
      Math.sign((pos + vel * t + Math.sign(vel) * (boxSize - rad)) % (2 * (boxSize - rad)) - Math.sign(vel) * (boxSize - rad)) * vel

    return {
      x: calculateVelWithBounces(this.pos.x, this.vel.x,this.boxWidth),
      y: calculateVelWithBounces(this.pos.y, this.vel.y,this.boxHeight),
      z: calculateVelWithBounces(this.pos.z, this.vel.z,this.boxDepth)
    }
  }
}

const CustomStyle = ({
  canvasRef, attributesRef, handleResize,
  block, width, height,

  trail_length = 0.5,
  lens = 0.5,
  color_env = '#ffffff',
  color_plucks = '#ffffff',
  background = '#000000'
}) => {
  const shuffleBag = useRef()
  const hoistedValue = useRef()

  // seeded random function
  let seed = parseInt(block.hash.slice(0, 16), 16);
  shuffleBag.current = new MersenneTwister(seed);
  function random (min, max) {
    if ((typeof min === 'number') && (typeof max === 'number')) return shuffleBag.current.random() * (max - min) + min
    if ((typeof min === 'number') && !(typeof max === 'number')) return shuffleBag.current.random() * min
    if (min instanceof Array) return min[Math.round(shuffleBag.current.random() * (min.length - 1))]
    return shuffleBag.current.random()
  }

  depth = Math.max(width, height)
  perspective = 1 / (0.005 * lens * lens * depth + 1)

  plucks = []
  for (let i = 0; i < random(2, 8); i++) {
    const pluck = new Pluck({ width, height, depth }, {
      note: random(scale),
      pos: { x: random(rad, width - rad), y: random(rad, height - rad), z: random(rad, depth - rad) },
      speed: random(.2, .8), // px / ms
      angle: [random(0, Math.PI * 2), random(0, Math.PI * 2)]
    })
    plucks.push(pluck)
  }

  const setup = (p5, canvasParentRef) => {
    const _p5 = p5.createCanvas(width, height).parent(canvasParentRef)
    canvasRef.current = p5
    if (_p5) { }

    p5.background(background)

    const reverb = new Tone.Reverb()
    const dist = new Tone.Distortion(0.2)
    const st = new Tone.StereoWidener(0.6)
    const comp = new Tone.Compressor(-30, 10);
    const limiter = new Tone.Limiter(-5)
    dist.set({ wet: 0.05 })
    reverb.set({ decay: 5, wet: 0.3 })

    synth = new Tone.PolySynth()
    synth.set({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0,
        decay: random() * 10,
        sustain: 0,
        release: 1
      }
    })

    synth.chain(reverb, dist, st, comp, limiter, Tone.Destination)

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

  let oldTime = 0

  const draw = (p5) => {
    const time = p5.millis()

    // draw environment
    p5.background(background)
    p5.fill(background)
    p5.stroke(color_env)
    p5.line(0, 0, p5.width, p5.height)
    p5.line(0, p5.height, p5.width, 0)
    p5.rect(p5.width * (1 - perspective) / 2, p5.height * (1 - perspective) / 2, p5.width * perspective, p5.height * perspective)

    // draw plucks and their trails
    plucks.map(pluck => {
      const pluckAndTrail = []
      for (let i = 0; i < Math.round(maxEllipses / plucks.length); i++) {
        if (time - i * trail_length * 15 / pluck.speed >= 0) {
          pluckAndTrail.push(pluck.getPositionAt(
            Math.max(0, time - i * trail_length * 15 / pluck.speed)
          ))
        }
      }

      if (
        Math.sign(pluck.getVelocityAt(oldTime).x) !== Math.sign(pluck.getVelocityAt(time).x) ||
        Math.sign(pluck.getVelocityAt(oldTime).y) !== Math.sign(pluck.getVelocityAt(time).y) ||
        Math.sign(pluck.getVelocityAt(oldTime).z) !== Math.sign(pluck.getVelocityAt(time).z)
      ) {
        synth.triggerAttackRelease(pluck.note, '8n', undefined, p5.map(pluck.getPositionAt(time).z, 0, depth, 1, 0.2))
      }
      
      return pluckAndTrail
    }).flat()
      .sort((a, b) => b.z - a.z)
      .forEach(({ x, y, z }) => {
        p5.fill(background)
        p5.stroke(color_plucks)

        p5.ellipse(
          p5.map(
            x, 0, p5.width,
            p5.map(z, 0, depth, 0, p5.width * (1 - perspective) / 2),
            p5.map(z, 0, depth, p5.width, p5.width * (perspective + (1 - perspective) / 2))
          ),
          p5.map(
            y, 0, p5.height,
            p5.map(z, 0, depth, 0, p5.height * (1 - perspective) / 2),
            p5.map(z, 0, depth, p5.height, p5.height * (perspective + (1 - perspective) / 2))
          ),
          p5.map(z, 0, depth, rad, rad * perspective)
        )
      })

    oldTime = time
  }

  return <Sketch setup={setup} draw={draw} windowResized={handleResize} />
}

export default CustomStyle

const styleMetadata = {
  name: 'Lydian Plucks',
  description: 'Generative Rythm Composer',
  image: '',
  creator_name: 'Nèr Arfer',
  options: {
    trail_length: 0.5,
    lens: 0.5,
    color_env: '#ffffff',
    color_plucks: '#ffffff',
    background: '#000000'
  }
}

export { styleMetadata }
