/**
 * A simple audio worklet processor that converts stereo audio to mono and converts it to 16bit
 */
class MonoProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    // By default, the node has single input and output
    const input = inputs[0]
    let buffer

    if (input.length === 2) {
      // The input is stereo
      const left = input[0],
        right = input[1],
        newLeft = new Int16Array(left.length),
        newRight = new Int16Array(left.length)
      buffer = new Int16Array(left.length)
      for (let i = 0; i < left.length; ++i) {
        // Convert stereo to mono by averaging the two channels
        newLeft[i] = floatTo16BitPCM(left[i])
        newRight[i] = floatTo16BitPCM(right[i])
        buffer[i] = (newLeft[i] + newRight[i]) / 2
      }
      this.port.postMessage({ type: 'interm', buffers: [newLeft, newRight] })
    } else if (input.length === 1) {
      const mono = input[0]
      buffer = new Int16Array(mono.length)
      // The input is already mono
      for (let i = 0; i < mono.length; ++i) {
        buffer[i] = floatTo16BitPCM(mono[i])
      }
      this.port.postMessage({ type: 'interm', buffers: [buffer] })
    }
    if (buffer) {
      // Posts ArrayBuffer
      this.port.postMessage({ type: 'final', buffer: buffer.buffer })
    }

    return true
  }
}

function floatTo16BitPCM(inputValue) {
  let s = Math.max(-1, Math.min(1, inputValue))
  return s < 0 ? s * 0x8000 : s * 0x7fff
}

registerProcessor('MonoProcessor', MonoProcessor)
