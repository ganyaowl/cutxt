export function basenameNoExt(file) {
  if (!file?.name) return "";
  return file.name.replace(/\.[^/.]+$/, "") || file.name;
}
