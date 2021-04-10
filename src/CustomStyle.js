import React, { useRef } from 'react'
import Sketch from 'react-p5'
// import MersenneTwister from 'mersenne-twister'
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
  mod1 = 0.75,
  mod2 = 0.5,
  mod3 = 0.25,
  mod4 = 0.1,
  color1 = '#4f83f1',
  color2 = '#4f00f1',
  background = '#ccc',
}) => {
  // const shuffleBag = useRef()
  const hoistedValue = useRef()

  state.DEFAULT_SIZE = DEFAULT_SIZE
  b({ width, height })

  const setup = (p5, canvasParentRef) => {
    const _p5 = p5.createCanvas(width, height).parent(canvasParentRef)
    canvasRef.current = p5
    if (_p5) { }

    s(p5, { hash: block.hash })

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
    d(p5, {})
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
    mod1: 0.4,
    mod2: 0.1,
    mod3: 0.2,
    mod4: 0.2,
    color1: '#FF0022',
    color2: '#FFF000',
    background: '#111122'
  }
}

export { styleMetadata }
