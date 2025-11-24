function toFloat32Array(source) {
  if (!source) {
    return null;
  }
  if (source instanceof Float32Array) {
    return source.slice();
  }
  if (ArrayBuffer.isView(source)) {
    return new Float32Array(source);
  }
  if (Array.isArray(source)) {
    return Float32Array.from(source);
  }
  if (typeof source.length === "number") {
    try {
      return Float32Array.from(Array.from(source));
    } catch {
      return null;
    }
  }
  return null;
}

export function extractFeatureVector(result) {
  if (!Array.isArray(result) || !result.length) {
    return null;
  }
  const tensorMap = result[0];
  if (!tensorMap) {
    return null;
  }
  const tensor =
    tensorMap.output ??
    tensorMap[Object.keys(tensorMap)[0] ?? ""] ??
    null;
  if (!tensor) {
    return null;
  }
  if (tensor.data?.length) {
    return toFloat32Array(tensor.data);
  }
  if (typeof tensor.values === "function") {
    const iterator = tensor.values();
    const entry = iterator?.next?.();
    if (entry?.value?.length) {
      return toFloat32Array(entry.value);
    }
  }
  return null;
}

export function cloneFeatureVector(vector) {
  if (!vector?.length) {
    return null;
  }
  const typed = vector instanceof Float32Array ? vector : toFloat32Array(vector);
  if (!typed?.length) {
    return null;
  }
  return typed.slice();
}
