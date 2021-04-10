import state from './state'

state.ponks = []
state.playing = true
state.synth = null
state.ponksHistory = []
state.rad = 20
state.scale = ['A4', 'A5','B4', 'B5','C4', 'C5','D3', 'D4', 'D5','E3', 'E4','F#3', 'F#4','G3', 'G4']

export function b ({ width, height }) {
  state.depth = Math.max(width, height)
  state.perspective = 1 / (0.001 * state.depth + 1)
}

export function s (p5, { hash }) {
  p5.randomSeed(hash)
  p5.background(0)

  document.body.addEventListener('click', () => {
    state.playing = !state.playing

    if (state.synth) return
    state.playing = !state.playing
    // state.synth = new p5.PolySynth(p5.MonoSynth, 16)
    // state.synth.setADSR(0.1, p5.random(), 0, p5.random())
  })

  for (let i = 0; i < p5.random(2, 8); i++) {
    state.ponks.push(new Ponk(p5, {
      note: p5.random(state.scale),
      color: '#ffffff',
      pos: { x: p5.random(state.rad, p5.width - state.rad), y: p5.random(state.rad, p5.height - state.rad), z: p5.random(state.rad, state.depth - state.rad) },
      speed: p5.random() * 2,
      angle: [p5.random(0, Math.PI * 2), p5.random(0, Math.PI * 2)]
    }))
  }
}

export function d (p5) {
  state.depth = Math.max(p5.width, p5.height) 
  state.perspective = 1 / (0.001 * state.depth + 1)

  p5.background(0)
  p5.fill(0)
  p5.stroke(255)

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

    p5.fill(0)
    p5.stroke(color)
    p5.ellipse(X, Y, Z)

    // shadows
    // fill(50)
    // noStroke()
    // ellipse(X, map(z, 0, depth, height, height - (perspective / 2 * height)), Z, Z / 2)
  })
}

class Ponk {
  constructor (p5, { note, pos, speed, angle, color }) {
    this.p5 = p5
    this.note = note

    this.color = color
    this.pos = pos
    this.speed = speed
    this.vel = {
      x: p5.map(speed, 0, 1, 3, 6) * Math.cos(angle[0]),
      y: p5.map(speed, 0, 1, 3, 6) * Math.sin(angle[0]),
      z: p5.map(speed, 0, 1, 3, 6) * Math.cos(angle[1])
    }
  }

  update () {
    if (this.pos.x + this.vel.x >  (this.p5.width - state.rad) || this.pos.x + this.vel.x < state.rad) {
      this.vel.x = -this.vel.x
      this.pos.x = Math.max(Math.min(this.pos.x, this.p5.width - state.rad), state.rad)
      this.sing()
    }

    if (this.pos.y + this.vel.y >  (this.p5.height - state.rad) || this.pos.y + this.vel.y < state.rad) {
      this.vel.y = -this.vel.y
      this.pos.y = Math.max(Math.min(this.pos.y, this.p5.height - state.rad), state.rad)
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
    // if (state.synth) {
    //   state.synth.play(this.note, this.p5.map(1 - this.pos.z / state.depth, 0, 1, 0, 1), 0, .1)
    // }
  }
}
