const vs_src = `
attribute vec4 a_position;
attribute vec4 a_color;
attribute vec2 a_texCoord;

varying vec4 v_color;
varying vec2 v_texCoord;

void main()
{
    gl_Position = a_position;
    v_color = a_color;
    v_texCoord = a_texCoord;
}
`;
const fs_src = `
precision mediump float;
varying vec4 v_color;
varying vec2 v_texCoord;
uniform sampler2D u_sampler;
void main()
{
    vec4 color = texture2D(u_sampler, v_texCoord);
    gl_FragColor = color;
}
`;
interface Item {
  x: number;
  y: number;
  w: number;
  h: number;
}
function main() {
  const canvas: HTMLElement | null = document.getElementById("canvas");
  if (!canvas) return;

  const gl = (canvas as HTMLCanvasElement).getContext("webgl");
  if (!gl) {
    return;
  }

  const program = shader(gl);
  if (!program) {
    return;
  }
  const items: Array<Item> = [];
  items.push({ x: -0.5, y: 0.5, w: 1, h: 1 });
  items.push({ x: -0.6, y: 0.6, w: 0.5, h: 0.5 });
  fillVertices(items, gl, program);
  const original_texture = createTexture(gl);
  gl.bindTexture(gl.TEXTURE_2D, original_texture);

  gl.activeTexture(gl.TEXTURE0);
  const local = gl.getUniformLocation(program, "u_sampler");
  gl.uniform1i(local, 0);

  gl.clearColor(0.5, 0.5, 0.5, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const useFbo = true;
  let fboTexture = null;
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  if (useFbo) {
    const ret = doFbo(gl, width, height);
    const fbo = ret.fbo;
    fboTexture = ret.texture;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }
  gl.drawElements(gl.TRIANGLES, 6 * items.length, gl.UNSIGNED_SHORT, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (useFbo) {
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    console.log(pixels);
    download(pixels, width, height);
  }

  if (useFbo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // 切换到默认的frameBuffer
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, fboTexture);
    fillVertices([{ x: -0.9, y: 0.5, w: 1, h: 1 }], gl, program);
    gl.useProgram(program);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  //   gl.deleteFramebuffer(fbo);
  //   gl.deleteTexture(texture);
}
function download(pixels: Uint8Array, width: number, height: number) {
  var canvas = document.createElement("canvas");
  canvas.width = width; // 设置Canvas宽度
  canvas.height = height; // 设置Canvas高度

  // 获取Canvas上下文
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  // 创建ImageData对象，该对象包含指定宽度和高度的空像素数据
  var imageData = ctx.createImageData(width, height);

  for (var i = 0; i < pixels.length; i++) {
    var index = i; // 每个像素占据4个位置，分别是RGBA
    imageData.data[index] = pixels[i + 0]; // 红色
    imageData.data[index + 1] = pixels[i + 1]; // 绿色
    imageData.data[index + 2] = pixels[i + 2]; // 蓝色
    imageData.data[index + 3] = pixels[i + 3]; // 不透明度
  }

  ctx.putImageData(imageData, 0, 0);

  // 创建一个新的图像对象
  var img = new Image();

  // 将Canvas的内容复制到图像对象中
  img.src = canvas.toDataURL("image/png");

  // 将图像对象添加到页面中（可选）
  document.body.appendChild(img);

  // 如果需要保存图片，可以使用以下代码
  var link = document.createElement("a");
  link.download = "image.png";
  link.href = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
  link.click();
}
function shader(gl: WebGLRenderingContext) {
  // 顶点着色器
  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) return;
  gl.shaderSource(vs, vs_src);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(vs));
    gl.deleteShader(vs);
    return null;
  }
  // 片段着色器
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) return;
  gl.shaderSource(fs, fs_src);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.log(gl.getShaderInfoLog(fs));
    gl.deleteShader(fs);
    return null;
  }
  // 链接使用shader
  const program = gl.createProgram();
  if (!program) {
    return;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log(gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);
  return program;
}

function fillVertices(items: Array<Item>, gl: WebGLRenderingContext, program: WebGLProgram) {
  const verticesTexCoords = new Float32Array(items.length * 4 * 4);
  const indicesTexCoords = new Uint16Array(items.length * 6);
  for (let i = 0; i < items.length; i++) {
    const { x, y, w, h } = items[i];
    const left = x,
      right = x + w,
      top = y,
      bottom = y - h;
    /**
     * 0    2
     *
     * 1    3
     */
    indicesTexCoords.set(
      [0, 1, 3, 3, 2, 0].map((item) => item + i * 4),
      i * 6
    );
    verticesTexCoords.set(
      [
        left,
        top,
        0.0,
        1.0, //
        left,
        bottom,
        0.0,
        0.0, //
        right,
        top,
        1.0,
        1.0, //
        right,
        bottom,
        1.0,
        0.0, //
      ],
      i * 4 * 4
    );
  }

  const buffer_vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer_vertices);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);
  const size = verticesTexCoords.BYTES_PER_ELEMENT;
  const local_position = gl.getAttribLocation(program, "a_position");
  gl.vertexAttribPointer(local_position, 2, gl.FLOAT, false, size * 4, 0);
  gl.enableVertexAttribArray(local_position);

  const local_texCoord = gl.getAttribLocation(program, "a_texCoord");
  gl.vertexAttribPointer(local_texCoord, 2, gl.FLOAT, false, size * 4, size * 2);
  gl.enableVertexAttribArray(local_texCoord);

  const buffer_indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer_indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesTexCoords, gl.STATIC_DRAW);
}
function createTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}

function doFbo(gl: WebGLRenderingContext, width: number, height: number) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const stat = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (stat !== gl.FRAMEBUFFER_COMPLETE) {
    console.error("framebuffer error", stat);
  }
  return { fbo, texture };
}
const btn = document.getElementById("btn");
const img = new Image();
img.onload = () => {
  main();
};
img.src = "./wall.jpeg";
btn?.addEventListener("click", () => {});
