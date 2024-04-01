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

const items: Array<{ x: number; y: number; w: number; h: number }> = [];
function main() {
  const canvas: HTMLElement | null = document.getElementById("canvas");
  if (!canvas) return;

  const gl = (canvas as HTMLCanvasElement).getContext("webgl");
  if (!gl) {
    return;
  }
  // 背景色
  gl.clearColor(0.5, 0.5, 0.5, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const program = shader(gl);
  if (!program) {
    return;
  }
  fillVertices(gl, program);
  createTexture(gl);
  const local = gl.getUniformLocation(program, "u_sampler");
  gl.uniform1i(local, 0);
  // 绘制
  gl.drawElements(gl.TRIANGLES, 6 * items.length, gl.UNSIGNED_SHORT, 0);
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

function fillVertices(gl: WebGLRenderingContext, program: WebGLProgram) {
  items.push({ x: -0.5, y: 0.5, w: 1, h: 1 });
  items.push({ x: -0.6, y: 0.6, w: 1, h: 1 });
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
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return texture;
}
const img = new Image();
img.onload = () => {
  main();
};
img.src = "./wall.jpeg";
