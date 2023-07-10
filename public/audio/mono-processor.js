/**
 * A simple audio worklet processor that converts stereo audio to mono and converts it to 16bit
 */
class MonoProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    // By default, the node has single input and output
    const input = inputs[0]
    const outputChannel = outputs[0][0]

    if (input.length === 2) {
      // The input is stereo
      const left = input[0]
      const right = input[1]
      for (let i = 0; i < left.length; ++i) {
        // Convert stereo to mono by averaging the two channels
        outputChannel[i] = floatTo16BitPCM((left[i] + right[i]) / 2)
      }
    } else if (input.length === 1) {
      // The input is already mono
      for (let i = 0; i < left.length; ++i) {
        outputChannel[i] = floatTo16BitPCM(input[0])
      }
    }
    this.port.postMessage(outputChannel)

    return true
  }
}

function floatTo16BitPCM(inputValue) {
  let s = Math.max(-1, Math.min(1, inputValue))
  return s < 0 ? s * 0x8000 : s * 0x7fff
}

registerProcessor('MonoProcessor', MonoProcessor)
