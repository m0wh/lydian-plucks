import React, { useRef } from 'react'
import Sketch from 'react-p5'
import MersenneTwister from 'mersenne-twister'
import { b, s, d } from './sketch/sketch'
import state from './sketch/state'

const DEFAULT_SIZE = 1000

const CustomStyle = ({
  block,
  canvasRef,
  attributesRef,
  width,
  height,
  handleResize,
  distorsion = 0.1,
  distorsion_wet = 0.1,
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
  b({ width, height, distorsion, reverb_wet, reverb_decay, distorsion_wet })

  const setup = (p5, canvasParentRef) => {
    const _p5 = p5.createCanvas(width, height).parent(canvasParentRef)
    canvasRef.current = p5
    if (_p5) { }

    s(p5, { color_env, color_plucks, background })

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
    d(p5, { color_env, color_plucks, background })
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
    distorsion: 0.1,
    distorsion_wet: 0.1,
    reverb_wet: 0.1,
    reverb_decay: 0.1,
    color_env: '#ffffff',
    color_plucks: '#ffffff',
    background: '#000000'
  }
}

export { styleMetadata }
