export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // 1 = uncompressed PCM
  const bitDepth = 16

  const channelData: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channelData.push(buffer.getChannelData(i))
  }

  const length = buffer.length * numChannels * 2
  const wavBuffer = new ArrayBuffer(44 + length)
  const view = new DataView(wavBuffer)

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // RIFF Chunk
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  writeString(8, 'WAVE')

  // fmt Subchunk
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size
  view.setUint16(20, format, true) // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true) // ByteRate
  view.setUint16(32, numChannels * 2, true) // BlockAlign
  view.setUint16(34, bitDepth, true) // BitsPerSample

  // data Subchunk
  writeString(36, 'data')
  view.setUint32(40, length, true)

  // Write Interleaved 16-bit PCM Audio
  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return new Blob([view], { type: 'audio/wav' })
}

export async function extractAudioFromVideo(
  videoFile: File
): Promise<{ blob: Blob; name: string; duration: number }> {
  const arrayBuffer = await videoFile.arrayBuffer()
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioContext = new AudioCtx()
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    const wavBlob = audioBufferToWav(audioBuffer)
    const baseName = videoFile.name.replace(/\.[^/.]+$/, '')
    return {
      blob: wavBlob,
      name: `${baseName}_audio.wav`,
      duration: audioBuffer.duration,
    }
  } finally {
    audioContext.close()
  }
}
