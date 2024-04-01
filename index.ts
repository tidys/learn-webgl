console.log(1);
function main() {
  const canvas: HTMLElement | null = document.getElementById("canvas");
  if (!canvas) return;

  const gl = (canvas as HTMLCanvasElement).getContext("webgl");
  if (!gl) {
    return;
  }
  // 背景色
  gl.clearColor(0, 1, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  // 顶点着色器
  const vs = gl.createShader(gl.VERTEX_SHADER);
  if (!vs) return;
  gl.shaderSource(
    vs,
    `void main()
    {
        gl_Position = vec4(0.0,0.0,0.0, 1.0);
        gl_PointSize = 10.0;
    }`
  );
  gl.compileShader(vs);
  // 片段着色器
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  if (!fs) return;
  gl.shaderSource(
    fs,
    `void main()
    {
       gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }`
  );
  gl.compileShader(fs);
  // 链接使用shader
  const program = gl.createProgram();
  if (!program) {
    return;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  // 绘制
  gl.drawArrays(gl.POINTS, 0, 1);
}
main();
