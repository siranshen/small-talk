/**
 * A lot of inspiration from https://github.com/mattdiamond/Recorderjs/blob/master/src/recorder.js
 */

export function exportAudioInWav(sampleRate: number, buffers: Int16Array[][]): Blob {
  if (buffers.length === 0) {
    return new Blob()
  }
  const numChannels = buffers[0].length
  const newBuffers: Int16Array[] = []
  let totalLength = 0
  for (let i = 0; i < buffers.length; i++) {
    if (numChannels == 1) {
      newBuffers[i] = buffers[i][0]
      totalLength += buffers[i][0].length
    } else {
      const interleaved = interleave(buffers[i][0], buffers[i][1])
      newBuffers[i] = interleaved
      totalLength += interleaved.length
    }
  }
  const merged = mergeBuffers(newBuffers, totalLength)
  const dataview = encodeWavSamples(sampleRate, numChannels, merged)
  return new Blob([dataview], { type: 'audio/wav' })
}

export function exportBufferInWav(sampleRate: number, numChannels: number, buffer: ArrayBuffer): Blob {
  const newBuffer = new Uint8Array(44 + buffer.byteLength)
  newBuffer.set(new Uint8Array(buffer), 44)
  const view = new DataView(newBuffer.buffer)
  writeHeader(view, sampleRate, numChannels, buffer.byteLength)
  return new Blob([view], { type: 'audio/wav' })
}

export function exportBuffersInWav(sampleRate: number, numChannels: number, buffers: ArrayBuffer[]): Blob {
  const totalBytes = buffers.reduce((partialSum, b) => partialSum + b.byteLength, 0)
  const newBuffer = new Uint8Array(44 + totalBytes)
  let offset = 44
  for (let i = 0; i < buffers.length; i++) {
    newBuffer.set(new Uint8Array(buffers[i]), offset)
    offset += buffers[i].byteLength
  }
  const view = new DataView(newBuffer.buffer)
  writeHeader(view, sampleRate, numChannels, totalBytes)
  return new Blob([view], { type: 'audio/wav' })
}

function encodeWavSamples(sampleRate: number, numChannels: number, samples: Int16Array): DataView {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  writeHeader(view, sampleRate, numChannels, samples.length * 2)
  for (let i = 0, offset = 44; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, samples[i], true)
  }

  return view
}

function writeHeader(view: DataView, sampleRate: number, numChannels: number, dataChunkLength: number) {
  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataChunkLength, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, 1, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 4, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numChannels * 2, true)
  /* bits per sample */
  view.setUint16(34, 16, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, dataChunkLength, true)
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function mergeBuffers(buffers: Int16Array[], totalLength: number): Int16Array {
  let result = new Int16Array(totalLength)
  let offset = 0
  for (let i = 0; i < buffers.length; i++) {
    result.set(buffers[i], offset)
    offset += buffers[i].length
  }
  return result
}

function interleave(leftChannel: Int16Array, rightChannel: Int16Array): Int16Array {
  const length = leftChannel.length + rightChannel.length
  let result = new Int16Array(length),
    index = 0,
    inputIndex = 0
  while (index < length) {
    result[index++] = leftChannel[inputIndex]
    result[index++] = rightChannel[inputIndex]
    inputIndex++
  }
  return result
}

export interface AudioPlayTask {
  audioData: ArrayBuffer
}