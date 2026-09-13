function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const sourceLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const source = new Float32Array(sourceLength);
  let offset = 0;
  for (const chunk of chunks) {
    source.set(chunk, offset);
    offset += chunk.length;
  }
  const targetRate = 16000;
  const ratio = sampleRate / targetRate;
  const outputLength = Math.max(1, Math.floor(source.length / ratio));
  const buffer = new ArrayBuffer(44 + outputLength * 2);
  const view = new DataView(buffer);
  const write = (at: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(at + index, value.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + outputLength * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, outputLength * 2, true);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(source.length, Math.floor((index + 1) * ratio));
    let sample = 0;
    for (let cursor = start; cursor < end; cursor += 1) sample += source[cursor] ?? 0;
    sample /= Math.max(1, end - start);
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function startAudioRecording(): Promise<() => Promise<Blob>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Audio recording is not supported in this browser.");
  }
  const context = new Context();
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
  source.connect(processor);
  processor.connect(context.destination);
  return async () => {
    stream.getTracks().forEach((track) => track.stop());
    processor.disconnect();
    source.disconnect();
    const blob = encodeWav(chunks, context.sampleRate);
    await context.close();
    if (blob.size < 2048) throw new Error("That recording was empty. Please try again.");
    return blob;
  };
}